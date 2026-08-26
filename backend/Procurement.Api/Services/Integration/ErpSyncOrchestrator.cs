using Microsoft.EntityFrameworkCore;
using Procurement.Api.Data;
using Procurement.Api.Models;
using Procurement.Api.Models.Integration;

namespace Procurement.Api.Services.Integration
{
    public class ErpSyncOrchestrator
    {
        private readonly AppDbContext _db;

        // Save every N records instead of after every single one — this is the
        // single biggest speed win (one DB round-trip per batch instead of one
        // per item). If the app crashes mid-batch, the unsaved items in that
        // batch simply get reprocessed on the next run (upsert is idempotent),
        // so nothing is corrupted — worst case is re-doing up to this many items.
        private const int BatchSize = 200;

        public ErpSyncOrchestrator(AppDbContext db)
        {
            _db = db;
        }

        public async Task<SyncResult> SyncAsync(IErpConnector connector)
        {
            _db.Database.SetCommandTimeout(300);   // ✅ FIX: 30s default -> 5 minutes, large bulk syncs need more time
            var result = new SyncResult();

            var mappings = await _db.OracleSourceMappings
                .Where(m => m.OracleSource == connector.ConnectorName && m.EffectiveTo == null && m.IsActive)
                .ToDictionaryAsync(m => m.BranchId, m => m.CompanyId);

            await SyncItemsAsync(connector, mappings, result);
            await SyncProjectsAsync(connector, mappings, result);

            await _db.SaveChangesAsync();

            await LogAsync(connector.ConnectorName, "Sync", true,
                $"Items: {result.ItemsProcessed} processed, {result.ItemsSkipped} skipped. " +
                $"Projects: {result.ProjectsProcessed} processed, {result.ProjectsSkipped} skipped.");

            return result;
        }

        // -- ITEMS (optimized) ------------------------------------
        private async Task SyncItemsAsync(IErpConnector connector, Dictionary<string, Guid> mappings, SyncResult result)
        {
            var itemWatermark = await GetWatermarkAsync(connector.ConnectorName, "Item");
            var items = await connector.FetchItemsSinceAsync(itemWatermark);

            if (items.Count == 0)
                return;

            var groupsByName = (await _db.ItemGroups.ToListAsync())
                .GroupBy(g => g.Name)
                .ToDictionary(g => g.Key, g => g.First());

            var subGroupsByKey = (await _db.ItemSubGroups.ToListAsync())
                .GroupBy(sg => (sg.ItemGroupId, sg.Name))
                .ToDictionary(g => g.Key, g => g.First());



            var categoryMaps = await _db.ItemGroupCategoryMaps
    .ToDictionaryAsync(
        m => m.OracleGroupName.ToUpper(),
        m => m.ItemCategoryId);

            // ✅ FIX: case-insensitive + trimmed comparison. Previously this used the
            // default (case-sensitive, exact-match) comparer, so Oracle UOM values that
            // only differed by casing or stray whitespace (e.g. "KG" / "Kg" / "kg ")
            // were treated as different units and a new duplicate Unit row was created
            // on every sync cycle. See merge_duplicate_units.sql for the one-time cleanup
            // of rows created by the old behavior.
            var unitsByName = (await _db.Units.ToListAsync())
                .GroupBy(u => u.Name.Trim(), StringComparer.OrdinalIgnoreCase)
                .ToDictionary(g => g.Key, g => g.First(), StringComparer.OrdinalIgnoreCase);

            var relevantCompanyIds = items
                .Select(i => mappings.TryGetValue(i.BranchId, out var cid) ? cid : (Guid?)null)
                .Where(cid => cid != null)
                .Select(cid => cid!.Value)
                .Distinct()
                .ToList();

            var existingItemRows = await _db.Items
                .Join(_db.ItemCompanies, i => i.Id, ic => ic.ItemId, (i, ic) => new { Item = i, ic.CompanyId })
                .Where(x => relevantCompanyIds.Contains(x.CompanyId))
                .ToListAsync();

            var existingItemsByKey = existingItemRows
                .GroupBy(x => (x.Item.ItemCode, x.CompanyId))
                .ToDictionary(g => g.Key, g => g.First().Item);

            var existingItemIds = existingItemRows.Select(x => x.Item.Id).ToList();

            var defaultUnitsByItemId = await _db.ItemUnits
                .Where(iu => existingItemIds.Contains(iu.ItemId) && iu.IsDefault)
                .ToDictionaryAsync(iu => iu.ItemId);

            DateTime maxItemWatermark = itemWatermark;
            int unsavedCount = 0;

            // New items must be committed BEFORE their ItemCompany/ItemUnit rows are inserted,
            // because the ItemCompanies.ItemId -> Items.Id foreign key exists at the database
            // level but is not registered in the EF Core model. Without a known relationship,
            // EF Core cannot guarantee insert ordering once many rows are batched in a single
            // SaveChanges call, so we save Items first, then add+save their dependents.
            var pendingNewItemLinks = new List<(Item Item, Guid CompanyId, Unit? Unit)>();

            async Task FlushBatchAsync()
            {
                if (pendingNewItemLinks.Count == 0)
                {
                    await _db.SaveChangesAsync();
                    return;
                }

                await _db.SaveChangesAsync();

                foreach (var link in pendingNewItemLinks)
                {
                    _db.ItemCompanies.Add(new ItemCompany
                    {
                        Id = Guid.NewGuid(),
                        ItemId = link.Item.Id,
                        CompanyId = link.CompanyId
                    });

                    if (link.Unit != null)
                    {
                        var newDefaultUnit = new ItemUnit
                        {
                            Id = Guid.NewGuid(),
                            ItemId = link.Item.Id,
                            UnitId = link.Unit.Id,
                            ConversionFactor = 1,
                            IsDefault = true
                        };
                        _db.ItemUnits.Add(newDefaultUnit);
                        defaultUnitsByItemId[link.Item.Id] = newDefaultUnit;
                    }
                }

                await _db.SaveChangesAsync();
                pendingNewItemLinks.Clear();
            }

            foreach (var erpItem in items)
            {
                if (!mappings.TryGetValue(erpItem.BranchId, out var companyId))
                {
                    result.ItemsSkipped++;
                    await LogAsync(connector.ConnectorName, "Item", false,
                        $"No company mapping for BranchId={erpItem.BranchId}, ItemCode={erpItem.ItemCode}");
                    continue;
                }

                ItemGroup? group = null;
                if (!string.IsNullOrWhiteSpace(erpItem.GroupName))
                {
                    if (!groupsByName.TryGetValue(erpItem.GroupName, out group))
                    {
                        group = new ItemGroup { Id = Guid.NewGuid(), Name = erpItem.GroupName };
                        _db.ItemGroups.Add(group);
                        groupsByName[erpItem.GroupName] = group;
                    }
                }

                ItemSubGroup? subGroup = null;
                if (group != null && !string.IsNullOrWhiteSpace(erpItem.SubGroupName))
                {
                    var subKey = (group.Id, erpItem.SubGroupName);
                    if (!subGroupsByKey.TryGetValue(subKey, out subGroup))
                    {
                        subGroup = new ItemSubGroup
                        {
                            Id = Guid.NewGuid(),
                            Name = erpItem.SubGroupName,
                            ItemGroupId = group.Id
                        };
                        _db.ItemSubGroups.Add(subGroup);
                        subGroupsByKey[subKey] = subGroup;
                    }
                }

                // ✅ FIX: trim the incoming UOM before lookup/creation so it matches the
                // trimmed+case-insensitive dictionary above and doesn't spawn a duplicate.
                Unit? unit = null;
                if (!string.IsNullOrWhiteSpace(erpItem.Uom))
                {
                    var uomTrimmed = erpItem.Uom.Trim();
                    if (!unitsByName.TryGetValue(uomTrimmed, out unit))
                    {
                        unit = new Unit { Id = Guid.NewGuid(), Name = uomTrimmed };
                        _db.Units.Add(unit);
                        unitsByName[uomTrimmed] = unit;
                    }
                }

                var itemKey = (erpItem.ItemCode, companyId);

                if (!existingItemsByKey.TryGetValue(itemKey, out var existing))
                {
                    var newItem = new Item
                    {
                        Id = Guid.NewGuid(),
                        ItemCode = erpItem.ItemCode,
                        Name = erpItem.Name,
                        Description = erpItem.Description ?? "",
                        GroupId = group?.Id,
                        SubGroupId = subGroup?.Id,
                        UnitId = unit?.Id,

                        // ✅ NEW: auto-assign category from group name
                        CategoryId = group != null && categoryMaps.TryGetValue(
                    group.Name.ToUpper(), out var catId) ? catId : null,

                        SourceType = "ORACLE",
                        CreatedAt = DateTime.UtcNow
                    };
                    _db.Items.Add(newItem);

                    pendingNewItemLinks.Add((newItem, companyId, unit));

                    existingItemsByKey[itemKey] = newItem;
                }
                else
                {
                    existing.Name = erpItem.Name;
                    existing.Description = erpItem.Description ?? "";

                    bool groupChanged = existing.GroupId != group?.Id;

                    existing.GroupId = group?.Id ?? existing.GroupId;
                    existing.SubGroupId = subGroup?.Id ?? existing.SubGroupId;
                    existing.UnitId = unit?.Id ?? existing.UnitId;

                    if (group != null && categoryMaps.TryGetValue(group.Name.ToUpper(), out var updatedCatId))
                    {
                        if (groupChanged)
                        {
                            existing.CategoryId = updatedCatId;
                            existing.IsManualCategoryOverride = false;

                            _db.IntegrationLogs.Add(new IntegrationLog
                            {
                                Id = Guid.NewGuid(),
                                Direction = "Inbound",
                                Module = $"{connector.ConnectorName} - Item",
                                Status = IntegrationStatus.Success,
                                Message = $"Item {existing.ItemCode}: group changed to '{group.Name}', category auto-updated.",
                                IsActive = true,
                                CreatedAt = DateTime.UtcNow,
                                UpdatedAt = DateTime.UtcNow
                            });
                        }
                        else if (!existing.IsManualCategoryOverride)
                        {
                            existing.CategoryId = updatedCatId;
                        }
                    }
                    else if (groupChanged)
                    {
                        existing.CategoryId = null;
                        existing.IsManualCategoryOverride = false;
                    }

                    if (unit != null)
                    {
                        if (defaultUnitsByItemId.TryGetValue(existing.Id, out var defaultUnit))
                        {
                            if (defaultUnit.UnitId != unit.Id)
                                defaultUnit.UnitId = unit.Id;
                        }
                        else
                        {
                            var newDefaultUnit = new ItemUnit
                            {
                                Id = Guid.NewGuid(),
                                ItemId = existing.Id,
                                UnitId = unit.Id,
                                ConversionFactor = 1,
                                IsDefault = true
                            };
                            _db.ItemUnits.Add(newDefaultUnit);
                            defaultUnitsByItemId[existing.Id] = newDefaultUnit;
                        }
                    }
                }

                result.ItemsProcessed++;

                if (erpItem.LastModified > maxItemWatermark)
                    maxItemWatermark = erpItem.LastModified;

                unsavedCount++;
                if (unsavedCount >= BatchSize)
                {
                    await FlushBatchAsync();
                    unsavedCount = 0;
                }
            }

            if (unsavedCount > 0)
                await FlushBatchAsync();

            await SetWatermarkAsync(connector.ConnectorName, "Item", maxItemWatermark);
        }

        private async Task SyncProjectsAsync(IErpConnector connector, Dictionary<string, Guid> mappings, SyncResult result)
        {
            var projectWatermark = await GetWatermarkAsync(connector.ConnectorName, "Project");
            var projects = await connector.FetchProjectsSinceAsync(projectWatermark);

            if (projects.Count == 0)
                return;

            var relevantCompanyIds = projects
                .Select(p => mappings.TryGetValue(p.BranchId, out var cid) ? cid : (Guid?)null)
                .Where(cid => cid != null)
                .Select(cid => cid!.Value)
                .Distinct()
                .ToList();

            var existingProjectsByKey = (await _db.Projects
                    .Where(p => relevantCompanyIds.Contains(p.CompanyId))
                    .ToListAsync())
                .GroupBy(p => (p.ExternalCode, p.CompanyId))
                .ToDictionary(g => g.Key, g => g.First());

            DateTime maxProjectWatermark = projectWatermark;
            int unsavedCount = 0;

            foreach (var erpProject in projects)
            {
                if (!mappings.TryGetValue(erpProject.BranchId, out var companyId))
                {
                    result.ProjectsSkipped++;
                    await LogAsync(connector.ConnectorName, "Project", false,
                        $"No company mapping for BranchId={erpProject.BranchId}, Code={erpProject.Code}");
                    continue;
                }

                var key = (erpProject.Code, companyId);

                if (!existingProjectsByKey.TryGetValue(key, out var existing))
                {
                    var newProject = new Project
                    {
                        Id = Guid.NewGuid(),
                        ExternalCode = erpProject.Code,
                        Name = erpProject.Name,
                        CompanyId = companyId,
                        SourceType = "ORACLE",
                        CreatedAt = DateTime.UtcNow
                    };
                    _db.Projects.Add(newProject);
                    existingProjectsByKey[key] = newProject;
                }
                else
                {
                    existing.Name = erpProject.Name;
                }

                result.ProjectsProcessed++;

                if (erpProject.LastModified > maxProjectWatermark)
                    maxProjectWatermark = erpProject.LastModified;

                unsavedCount++;
                if (unsavedCount >= BatchSize)
                {
                    await _db.SaveChangesAsync();
                    unsavedCount = 0;
                }
            }

            if (unsavedCount > 0)
                await _db.SaveChangesAsync();

            await SetWatermarkAsync(connector.ConnectorName, "Project", maxProjectWatermark);
        }

        private async Task<DateTime> GetWatermarkAsync(string connectorName, string entityType)
        {
            var wm = await _db.ErpSyncWatermarks
                .FirstOrDefaultAsync(w => w.ConnectorName == connectorName && w.EntityType == entityType);

            if (wm == null) return new DateTime(1900, 1, 1);

            return DateTime.TryParse(wm.LastWatermark, out var parsed)
                ? parsed
                : new DateTime(1900, 1, 1);
        }

        private async Task SetWatermarkAsync(string connectorName, string entityType, DateTime value)
        {
            var wm = await _db.ErpSyncWatermarks
                .FirstOrDefaultAsync(w => w.ConnectorName == connectorName && w.EntityType == entityType);

            var formatted = value.ToString("yyyy-MM-dd HH:mm:ss");

            if (wm == null)
            {
                _db.ErpSyncWatermarks.Add(new ErpSyncWatermark
                {
                    Id = Guid.NewGuid(),
                    ConnectorName = connectorName,
                    EntityType = entityType,
                    LastWatermark = formatted,
                    UpdatedAt = DateTime.UtcNow
                });
            }
            else
            {
                wm.LastWatermark = formatted;
                wm.UpdatedAt = DateTime.UtcNow;
            }

            await _db.SaveChangesAsync();
        }

        private async Task LogAsync(string connectorName, string entityType, bool success, string message)
        {
            _db.IntegrationLogs.Add(new IntegrationLog
            {
                Id = Guid.NewGuid(),
                Direction = "Inbound",
                Module = $"{connectorName} - {entityType}",
                Status = success ? IntegrationStatus.Success : IntegrationStatus.Failed,
                Message = message,
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });
        }
    }

    public class SyncResult
    {
        public int ItemsProcessed { get; set; }
        public int ItemsSkipped { get; set; }
        public int ProjectsProcessed { get; set; }
        public int ProjectsSkipped { get; set; }
    }
}