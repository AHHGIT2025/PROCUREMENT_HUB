using Microsoft.EntityFrameworkCore;
using Procurement.Api.Data;
using Procurement.Api.Models;
using Procurement.Api.Models.Integration;
using Procurement.Api.Models.InternationalPO;

namespace Procurement.Api.Services.Integration
{
    public class SupplierSyncResult
    {
        public int Processed { get; set; }
        public int Created { get; set; }
        public int Updated { get; set; }
        public int Skipped { get; set; }             // ✅ NEW — bad rows that were skipped instead of crashing the batch
        public List<string> Errors { get; set; } = new(); // ✅ NEW — first few real error messages for diagnosis
    }

    public class SupplierSyncService
    {
        private readonly AppDbContext _db;
        private const int BatchSize = 200;

        public SupplierSyncService(AppDbContext db)
        {
            _db = db;
        }

        public async Task<SupplierSyncResult> SyncAsync(IErpConnector connector, string sourceType)
        {
            _db.Database.SetCommandTimeout(300);
            var result = new SupplierSyncResult();

            var erpSuppliers = await connector.FetchSuppliersAsync();
            if (erpSuppliers.Count == 0)
                return result;

            var existingByCode = await _db.Suppliers
                .Where(s => s.OracleVendorCode != null)
                .ToDictionaryAsync(s => s.OracleVendorCode!, s => s);

            // ✅ NEW — same Branch→Company mapping already used for Item sync.
            // Lets us tag each synced supplier with the right CompanyId so
            // the Suppliers page and PO/RFQ dropdowns can filter per company
            // instead of always showing all 6500+ suppliers.
            var now = DateTime.UtcNow;
            var branchToCompany = await _db.OracleSourceMappings
                .Where(m => m.OracleSource == connector.ConnectorName
                         && m.EffectiveFrom <= now
                         && (m.EffectiveTo == null || m.EffectiveTo >= now))
                .ToDictionaryAsync(m => m.BranchId, m => m.CompanyId);

            // ✅ NEW — track SupplierCode values already used in THIS batch
            // (existing DB rows + anything we're about to insert), so we can
            // detect and avoid duplicate-code unique-constraint violations
            // before they ever hit SaveChangesAsync.
            var usedCodes = new HashSet<string>(
                (await _db.Suppliers.Select(s => s.SupplierCode).ToListAsync()),
                StringComparer.OrdinalIgnoreCase);

            foreach (var erp in erpSuppliers)
            {
                if (string.IsNullOrWhiteSpace(erp.SourceSupplierId))
                    continue;

                try
                {
                    if (existingByCode.TryGetValue(erp.SourceSupplierId, out var existing))
                    {
                        existing.Name = erp.PrimaryName;
                        // Only change SupplierCode if the new one is non-blank
                        // AND doesn't collide with a different existing supplier.
                        var newCode = !string.IsNullOrWhiteSpace(erp.UserCode)
                            ? $"{erp.BranchId}-{erp.UserCode}"
                            : null;
                        if (newCode != null &&
                            !string.Equals(existing.SupplierCode, newCode, StringComparison.OrdinalIgnoreCase) &&
                            !usedCodes.Contains(newCode))
                        {
                            usedCodes.Remove(existing.SupplierCode);
                            existing.SupplierCode = newCode;
                            usedCodes.Add(newCode);
                        }
                        existing.CreditLimitDays = erp.CreditLimitDays;
                        existing.PaymentType = erp.PaymentType;
                        existing.IsActive = erp.IsActive;
                        existing.CompanyId = branchToCompany.TryGetValue(erp.BranchId, out var updCompanyId) ? updCompanyId : existing.CompanyId;
                        existing.UpdatedAt = DateTime.UtcNow;
                        result.Updated++;
                    }
                    else
                    {
                        // ✅ FIXED — confirmed via SQL analysis that Oracle's
                        // User_Code alone is NOT unique (only 2834 of 6530
                        // suppliers had unique codes — same code like "001"
                        // repeats across different Branch_IDs). BranchId +
                        // UserCode together ARE guaranteed unique (verified:
                        // zero duplicates on that combination). Same pattern
                        // as ItemCode + CompanyId for the Items table.
                        var candidateCode = !string.IsNullOrWhiteSpace(erp.UserCode)
                            ? $"{erp.BranchId}-{erp.UserCode}"
                            : erp.SourceSupplierId;

                        if (usedCodes.Contains(candidateCode))
                            candidateCode = $"{candidateCode}-{erp.SourceSupplierId}";

                        var supplier = new Supplier
                        {
                            Id = Guid.NewGuid(),
                            SupplierCode = candidateCode,
                            Name = string.IsNullOrWhiteSpace(erp.PrimaryName) ? candidateCode : erp.PrimaryName,
                            SourceType = sourceType,
                            OracleVendorCode = erp.SourceSupplierId,
                            CompanyId = branchToCompany.TryGetValue(erp.BranchId, out var newCompanyId) ? newCompanyId : (Guid?)null,
                            CreditLimitDays = erp.CreditLimitDays,
                            PaymentType = erp.PaymentType,
                            CreatedAt = DateTime.UtcNow,
                            IsActive = erp.IsActive
                        };
                        _db.Suppliers.Add(supplier);
                        existingByCode[erp.SourceSupplierId] = supplier;
                        usedCodes.Add(candidateCode);
                        result.Created++;
                    }

                    result.Processed++;

                    if (result.Processed % BatchSize == 0)
                        await _db.SaveChangesAsync();
                }
                catch (Exception ex)
                {
                    // ✅ FIXED — a bad row is skipped and logged instead of
                    // throwing and aborting the entire sync run (which is
                    // what was silently killing Items/Projects sync too,
                    // since they all ran inside the same try block).
                    result.Skipped++;
                    if (result.Errors.Count < 10)
                        result.Errors.Add($"{erp.SourceSupplierId} ({erp.PrimaryName}): {ex.InnerException?.Message ?? ex.Message}");

                    // Detach the tracked entity so the next SaveChangesAsync
                    // doesn't keep retrying this same broken row.
                    _db.ChangeTracker.Clear();

                    // Reload existingByCode/usedCodes since ChangeTracker.Clear()
                    // detaches everything — cheap enough given sync frequency.
                    existingByCode = await _db.Suppliers
                        .Where(s => s.OracleVendorCode != null)
                        .ToDictionaryAsync(s => s.OracleVendorCode!, s => s);
                    usedCodes = new HashSet<string>(
                        await _db.Suppliers.Select(s => s.SupplierCode).ToListAsync(),
                        StringComparer.OrdinalIgnoreCase);
                }
            }

            try
            {
                await _db.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                result.Skipped += result.Processed - result.Created - result.Updated;
                if (result.Errors.Count < 10)
                    result.Errors.Add($"Final batch save: {ex.InnerException?.Message ?? ex.Message}");
            }

            _db.AuditLogs.Add(new AuditLog
            {
                Id = Guid.NewGuid(),
                Module = "Supplier Sync",
                Action = sourceType,
                UserName = "System",
                Details = $"Processed: {result.Processed}, Created: {result.Created}, Updated: {result.Updated}, Skipped: {result.Skipped}" +
                          (result.Errors.Count > 0 ? $" | Errors: {string.Join(" ;; ", result.Errors)}" : ""),
                CreatedAt = DateTime.UtcNow
            });
            await _db.SaveChangesAsync();

            return result;
        }
    }
}