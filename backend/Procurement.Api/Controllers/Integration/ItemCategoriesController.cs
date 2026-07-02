
// ===== FILE: Controllers/Integration/ItemCategoriesController.cs =====
// REPLACE your existing ItemCategoriesController.cs with this complete file
// Added: GET group-items endpoint at the bottom

using Procurement.Api.Common;
using Procurement.Api.Data;
using Procurement.Api.DTOs.Integration;
using Procurement.Api.DTOs.Integration.Procurement.Api.DTOs.Integration;
using Procurement.Api.Models;
using Procurement.Api.Models.Categories;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Procurement.Api.Controllers.Integration
{
    [Authorize]
    [ApiController]
    [Route("api/item-categories")]
    public class ItemCategoriesController : ControllerBase
    {
        private readonly AppDbContext _db;
        public ItemCategoriesController(AppDbContext db) => _db = db;

        // ── GET /api/item-categories ────────────────────────────────────────
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var cats = await _db.ItemCategories
                .OrderBy(c => c.SortOrder)
                .Select(c => new ItemCategoryDto
                {
                    Id = c.Id,
                    Code = c.Code,
                    Name = c.Name,
                    Description = c.Description,
                    SortOrder = c.SortOrder,
                    IsActive = c.IsActive,
                    GroupsMapped = _db.ItemGroupCategoryMaps
                                      .Count(m => m.ItemCategoryId == c.Id),
                    ItemsMapped = _db.Items
                                      .Count(i => i.CategoryId == c.Id),
                })
                .ToListAsync();

            return Ok(ApiResponse<List<ItemCategoryDto>>.Ok(cats));
        }

        // ── GET /api/item-categories/{id}/mappings ──────────────────────────
        [HttpGet("{id:guid}/mappings")]
        public async Task<IActionResult> GetMappings(Guid id)
        {
            var maps = await _db.ItemGroupCategoryMaps
                .Where(m => m.ItemCategoryId == id)
                .OrderBy(m => m.OracleGroupName)
                .Select(m => new ItemCategoryGroupMapDto
                {
                    Id = m.Id,
                    OracleGroupName = m.OracleGroupName,
                    CreatedAt = m.CreatedAt,
                    ItemCount = _db.Items
                        .Join(_db.ItemGroups,
                            i => i.GroupId,
                            g => g.Id,
                            (i, g) => new { i, g })
                        .Count(x => x.g.Name == m.OracleGroupName)
                })
                .ToListAsync();

            return Ok(ApiResponse<List<ItemCategoryGroupMapDto>>.Ok(maps));
        }

        // ── GET /api/item-categories/unmapped-groups ────────────────────────
        [HttpGet("unmapped-groups")]
        public async Task<IActionResult> GetUnmappedGroups()
        {
            var unmapped = await _db.ItemGroups
                .Where(g => g.CategoryId == null)
                .OrderBy(g => g.Name)
                .Select(g => new UnmappedGroupDto
                {
                    GroupId = g.Id,
                    GroupName = g.Name,
                    ItemCount = _db.Items.Count(i => i.GroupId == g.Id)
                })
                .ToListAsync();

            return Ok(ApiResponse<List<UnmappedGroupDto>>.Ok(unmapped));
        }
        public class BulkMoveDto
        {
            public Guid CompanyId { get; set; }
            public Guid? FromCategoryId { get; set; }
            public Guid ToCategoryId { get; set; }
        }

        // GET /api/item-categories/company-breakdown?companyId=xxx
        [HttpGet("company-breakdown")]
        public async Task<IActionResult> GetCompanyBreakdown([FromQuery] Guid companyId)
        {
            var breakdown = await _db.Items
                .Where(i => _db.ItemCompanies.Any(ic => ic.ItemId == i.Id && ic.CompanyId == companyId))
                .GroupBy(i => i.CategoryId)
                .Select(g => new
                {
                    categoryId = g.Key,
                    categoryCode = g.Key != null
                        ? _db.ItemCategories.Where(c => c.Id == g.Key).Select(c => c.Code).FirstOrDefault()
                        : "GENERAL",
                    categoryName = g.Key != null
                        ? _db.ItemCategories.Where(c => c.Id == g.Key).Select(c => c.Name).FirstOrDefault()
                        : "General (Uncategorized)",
                    itemCount = g.Count()
                })
                .OrderByDescending(x => x.itemCount)
                .ToListAsync();

            return Ok(ApiResponse<object>.Ok(breakdown));
        }

        // GET /api/item-categories/company-items?companyId=xxx&categoryId=yyy&fromDate=xxx&toDate=xxx
        [HttpGet("company-items")]
        public async Task<IActionResult> GetCompanyItems(
            [FromQuery] Guid companyId,
            [FromQuery] Guid? categoryId,
            [FromQuery] DateTime? fromDate,
            [FromQuery] DateTime? toDate)
        {
            var query = _db.Items
                .Where(i => _db.ItemCompanies.Any(ic => ic.ItemId == i.Id && ic.CompanyId == companyId));

            query = categoryId.HasValue
                ? query.Where(i => i.CategoryId == categoryId.Value)
                : query.Where(i => i.CategoryId == null);

            if (fromDate.HasValue)
                query = query.Where(i => i.CreatedAt >= fromDate.Value);
            if (toDate.HasValue)
                query = query.Where(i => i.CreatedAt <= toDate.Value.AddDays(1).AddTicks(-1));

            var items = await query
                .Select(i => new
                {
                    id = i.Id,
                    code = i.ItemCode,
                    name = i.Name,
                    groupName = _db.ItemGroups.Where(g => g.Id == i.GroupId).Select(g => g.Name).FirstOrDefault(),
                    createdAt = i.CreatedAt,
                    updatedAt = i.UpdatedAt,
                    isManualOverride = i.IsManualCategoryOverride
                })
                .OrderByDescending(i => i.createdAt)
                .Take(500)
                .ToListAsync();

            return Ok(ApiResponse<object>.Ok(items));
        }
        // POST /api/item-categories/bulk-move
        [HttpPost("bulk-move")]
        public async Task<IActionResult> BulkMove(BulkMoveDto dto)
        {
            var toCategory = await _db.ItemCategories.FindAsync(dto.ToCategoryId);
            if (toCategory == null)
                return NotFound(ApiResponse<object>.Fail("Target category not found."));

            var items = await _db.Items
                .Where(i => _db.ItemCompanies.Any(ic => ic.ItemId == i.Id && ic.CompanyId == dto.CompanyId))
                .Where(i => i.CategoryId == dto.FromCategoryId)
                .ToListAsync();

            foreach (var item in items)
            {


                item.CategoryId = dto.ToCategoryId;
                item.IsManualCategoryOverride = true;
            }

            await _db.SaveChangesAsync();

            return Ok(ApiResponse<object>.Ok(new { moved = items.Count },
                $"{items.Count} items moved to '{toCategory.Name}'."));
        }
        [HttpGet("group-items")]
        public async Task<IActionResult> GetGroupItems([FromQuery] string groupName)
        {
            if (string.IsNullOrWhiteSpace(groupName))
                return BadRequest(ApiResponse<object>.Fail("groupName is required."));

            // Step 1: Get group IDs for this name (fast)
            var groupIds = await _db.ItemGroups
                .Where(g => g.Name.ToUpper() == groupName.Trim().ToUpper())
                .Select(g => g.Id)
                .ToListAsync();

            if (!groupIds.Any())
                return Ok(ApiResponse<object>.Ok(new List<object>()));

            // Step 2: Get all category codes in one shot (avoid per-row subquery)
            var categoryLookup = await _db.ItemCategories
                .Select(c => new { c.Id, c.Code, c.Name })
                .ToListAsync();

            // Step 3: Get items with company — simple join, no subqueries
            var items = await _db.Items
                .Where(i => i.GroupId != null && groupIds.Contains(i.GroupId.Value))
                .Join(_db.ItemCompanies,
                    i => i.Id,
                    ic => ic.ItemId,
                    (i, ic) => new { Item = i, ic.CompanyId })
                .Join(_db.Companies,
                    x => x.CompanyId,
                    c => c.Id,
                    (x, c) => new
                    {
                        id = x.Item.Id,
                        code = x.Item.ItemCode,
                        name = x.Item.Name,
                        companyCode = c.Code,
                        companyName = c.Name,
                        categoryId = x.Item.CategoryId,
                    })
                .OrderBy(x => x.companyCode)
                .ThenBy(x => x.code)
                .ToListAsync();

            // Step 4: Join category in memory (no DB roundtrip per row)
            var result = items.Select(i =>
            {
                var cat = i.categoryId != null
                    ? categoryLookup.FirstOrDefault(c => c.Id == i.categoryId)
                    : null;
                return new
                {
                    i.id,
                    i.code,
                    i.name,
                    i.companyCode,
                    i.companyName,
                    i.categoryId,
                    categoryCode = cat?.Code ?? "GENERAL",
                    categoryName = cat?.Name ?? "General",
                };
            }).ToList();

            return Ok(ApiResponse<object>.Ok(result));
        }
        // ── GET /api/item-categories/group-items?groupName=TISSUE ──────────
        // NEW: Returns all items in a given Oracle group
        // Used by GroupDetailModal to show items + allow individual category override
        //[HttpGet("group-items")]
        //public async Task<IActionResult> GetGroupItems([FromQuery] string groupName)
        //{
        //    if (string.IsNullOrWhiteSpace(groupName))
        //        return BadRequest(ApiResponse<object>.Fail("groupName is required."));

        //    var items = await _db.Items
        //        .Join(_db.ItemGroups,
        //            i => i.GroupId,
        //            g => g.Id,
        //            (i, g) => new { Item = i, Group = g })
        //        .Where(x => x.Group.Name.ToUpper() == groupName.Trim().ToUpper())
        //        .Join(_db.ItemCompanies,
        //            x => x.Item.Id,
        //            ic => ic.ItemId,
        //            (x, ic) => new { x.Item, x.Group, ic.CompanyId })
        //        .Join(_db.Companies,
        //            x => x.CompanyId,
        //            c => c.Id,
        //            (x, c) => new { x.Item, x.Group, Company = c })
        //        .OrderBy(x => x.Company.Code)
        //        .ThenBy(x => x.Item.ItemCode)
        //        .Select(x => new
        //        {
        //            id = x.Item.Id,
        //            code = x.Item.ItemCode,
        //            name = x.Item.Name,
        //            companyCode = x.Company.Code,
        //            companyName = x.Company.Name,
        //            categoryId = x.Item.CategoryId,
        //            categoryCode = x.Item.CategoryId != null
        //                ? _db.ItemCategories
        //                      .Where(c => c.Id == x.Item.CategoryId)
        //                      .Select(c => c.Code)
        //                      .FirstOrDefault()
        //                : "GENERAL",
        //            categoryName = x.Item.CategoryId != null
        //                ? _db.ItemCategories
        //                      .Where(c => c.Id == x.Item.CategoryId)
        //                      .Select(c => c.Name)
        //                      .FirstOrDefault()
        //                : "General",
        //        })
        //        .ToListAsync();

        //    return Ok(ApiResponse<object>.Ok(items));
        //}

        // ── POST /api/item-categories/{id}/mappings ─────────────────────────
        [HttpPost("{id:guid}/mappings")]
        public async Task<IActionResult> AddMapping(Guid id, MapGroupDto dto)
        {
            var category = await _db.ItemCategories.FindAsync(id);
            if (category == null)
                return NotFound(ApiResponse<object>.Fail("Category not found."));

            var groupName = dto.OracleGroupName.Trim();

            var exists = await _db.ItemGroupCategoryMaps
                .AnyAsync(m => m.OracleGroupName.ToUpper() == groupName.ToUpper());
            if (exists)
                return BadRequest(ApiResponse<object>.Fail(
                    $"'{groupName}' is already mapped to a category. Remove the old mapping first."));

            _db.ItemGroupCategoryMaps.Add(new ItemGroupCategoryMap
            {
                Id = Guid.NewGuid(),
                OracleGroupName = groupName,
                ItemCategoryId = id,
                CreatedAt = DateTime.UtcNow
            });

            // Update ItemGroups.CategoryId
            var groups = await _db.ItemGroups
                .Where(g => g.Name.ToUpper() == groupName.ToUpper())
                .ToListAsync();
            foreach (var g in groups)
                g.CategoryId = id;

            // Update Items.CategoryId for all items in these groups
            var groupIds = groups.Select(g => g.Id).ToList();
            var items = await _db.Items
                .Where(i => groupIds.Contains(i.GroupId ?? Guid.Empty))
                .ToListAsync();
            foreach (var item in items)
                item.CategoryId = id;

            await _db.SaveChangesAsync();

            return Ok(ApiResponse<object>.Ok(new
            {
                mapped = items.Count,
                groupName = groupName,
                category = category.Name
            }, $"'{groupName}' mapped to '{category.Name}'. {items.Count} items updated."));
        }

        // ── DELETE /api/item-categories/mappings/{mapId} ────────────────────
        [HttpDelete("mappings/{mapId:guid}")]
        public async Task<IActionResult> RemoveMapping(Guid mapId)
        {
            var map = await _db.ItemGroupCategoryMaps.FindAsync(mapId);
            if (map == null)
                return NotFound(ApiResponse<object>.Fail("Mapping not found."));

            var groupName = map.OracleGroupName;
            _db.ItemGroupCategoryMaps.Remove(map);

            // Clear CategoryId from ItemGroups
            var groups = await _db.ItemGroups
                .Where(g => g.Name.ToUpper() == groupName.ToUpper())
                .ToListAsync();
            foreach (var g in groups)
                g.CategoryId = null;

            // Clear CategoryId from Items
            var groupIds = groups.Select(g => g.Id).ToList();
            var items = await _db.Items
                .Where(i => groupIds.Contains(i.GroupId ?? Guid.Empty))
                .ToListAsync();
            foreach (var item in items)
                item.CategoryId = null;

            await _db.SaveChangesAsync();

            return Ok(ApiResponse<object>.Ok(
                new { unmapped = items.Count },
                $"Mapping removed. {items.Count} items are now uncategorized."));
        }
        public class MoveItemsDto
        {
            public List<Guid> ItemIds { get; set; } = new();
            public Guid ToCategoryId { get; set; }
        }

        // POST /api/item-categories/move-items
        [HttpPost("move-items")]
        public async Task<IActionResult> MoveItems(MoveItemsDto dto)
        {
            if (dto.ItemIds == null || dto.ItemIds.Count == 0)
                return BadRequest(ApiResponse<object>.Fail("No items selected."));

            var toCategory = await _db.ItemCategories.FindAsync(dto.ToCategoryId);
            if (toCategory == null)
                return NotFound(ApiResponse<object>.Fail("Target category not found."));

            var items = await _db.Items
                .Where(i => dto.ItemIds.Contains(i.Id))
                .ToListAsync();

            foreach (var item in items)
            {
                item.CategoryId = dto.ToCategoryId;
                item.IsManualCategoryOverride = true;
            }

            await _db.SaveChangesAsync();

            return Ok(ApiResponse<object>.Ok(new { moved = items.Count },
                $"{items.Count} item(s) moved to '{toCategory.Name}'."));
        }
        // ── POST /api/item-categories ───────────────────────────────────────
        [HttpPost]
        public async Task<IActionResult> Create(CreateItemCategoryDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Code))
                return BadRequest(ApiResponse<object>.Fail("Code is required."));

            var exists = await _db.ItemCategories
                .AnyAsync(c => c.Code.ToUpper() == dto.Code.ToUpper());
            if (exists)
                return BadRequest(ApiResponse<object>.Fail(
                    $"Category code '{dto.Code}' already exists."));

            var category = new ItemCategory
            {
                Id = Guid.NewGuid(),
                Code = dto.Code.Trim().ToUpper(),
                Name = dto.Name.Trim(),
                Description = dto.Description?.Trim(),
                SortOrder = dto.SortOrder,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            _db.ItemCategories.Add(category);
            await _db.SaveChangesAsync();

            return Ok(ApiResponse<ItemCategoryDto>.Ok(new ItemCategoryDto
            {
                Id = category.Id,
                Code = category.Code,
                Name = category.Name,
                Description = category.Description,
                SortOrder = category.SortOrder,
                IsActive = category.IsActive,
                GroupsMapped = 0,
                ItemsMapped = 0
            }, "Category created."));
        }
    }
}













///updated code above 06/29/2026
//using global::Procurement.Api.Common;
//using global::Procurement.Api.Data;
//using global::Procurement.Api.DTOs.Integration.Procurement.Api.DTOs.Integration;
//using global::Procurement.Api.Models.Categories;
//using Microsoft.AspNetCore.Authorization;
//using Microsoft.AspNetCore.Mvc;
//using Microsoft.EntityFrameworkCore;
//using Procurement.Api.Common;
//using Procurement.Api.Data;
//using Procurement.Api.DTOs.Integration;
//using Procurement.Api.Models;

//namespace Procurement.Api.Controllers.Integration
//{


//        [Authorize]
//        [ApiController]
//        [Route("api/item-categories")]
//        public class ItemCategoriesController : ControllerBase
//        {
//            private readonly AppDbContext _db;
//            public ItemCategoriesController(AppDbContext db) => _db = db;

//            // GET /api/item-categories
//            [HttpGet]
//            public async Task<IActionResult> GetAll()
//            {
//                var categories = await _db.ItemCategories
//                    .Where(c => c.IsActive)
//                    .OrderBy(c => c.SortOrder)
//                    .Select(c => new ItemCategoryDto
//                    {
//                        Id = c.Id,
//                        Code = c.Code,
//                        Name = c.Name,
//                        Description = c.Description,
//                        SortOrder = c.SortOrder,
//                        IsActive = c.IsActive,
//                        GroupsMapped = _db.ItemGroupCategoryMaps
//                            .Count(m => m.ItemCategoryId == c.Id),
//                        ItemsMapped = _db.Items
//                            .Count(i => i.CategoryId == c.Id)
//                    })
//                    .ToListAsync();

//                return Ok(ApiResponse<List<ItemCategoryDto>>.Ok(categories));
//            }

//            // GET /api/item-categories/{id}/mappings
//            [HttpGet("{id:guid}/mappings")]
//            public async Task<IActionResult> GetMappings(Guid id)
//            {
//                var maps = await _db.ItemGroupCategoryMaps
//                    .Where(m => m.ItemCategoryId == id)
//                    .OrderBy(m => m.OracleGroupName)
//                    .Select(m => new ItemCategoryGroupMapDto
//                    {
//                        Id = m.Id,
//                        OracleGroupName = m.OracleGroupName,
//                        CreatedAt = m.CreatedAt,
//                        ItemCount = _db.Items
//                            .Join(_db.ItemGroups,
//                                i => i.GroupId,
//                                g => g.Id,
//                                (i, g) => new { i, g })
//                            .Count(x => x.g.Name == m.OracleGroupName)
//                    })
//                    .ToListAsync();

//                return Ok(ApiResponse<List<ItemCategoryGroupMapDto>>.Ok(maps));
//            }

//            // GET /api/item-categories/unmapped-groups
//            // Groups with no category mapping — shown in admin UI for manual mapping
//            [HttpGet("unmapped-groups")]
//            public async Task<IActionResult> GetUnmappedGroups()
//            {
//                var mappedNames = await _db.ItemGroupCategoryMaps
//                    .Select(m => m.OracleGroupName.ToUpper())
//                    .ToListAsync();

//                var unmapped = await _db.ItemGroups
//                    .Where(g => g.CategoryId == null)
//                    .OrderBy(g => g.Name)
//                    .Select(g => new UnmappedGroupDto
//                    {
//                        GroupId = g.Id,
//                        GroupName = g.Name,
//                        ItemCount = _db.Items.Count(i => i.GroupId == g.Id)
//                    })
//                    .ToListAsync();

//                return Ok(ApiResponse<List<UnmappedGroupDto>>.Ok(unmapped));
//            }

//            // POST /api/item-categories/{id}/mappings
//            // Map an Oracle group name to this category
//            [HttpPost("{id:guid}/mappings")]
//            public async Task<IActionResult> AddMapping(Guid id, MapGroupDto dto)
//            {
//                var category = await _db.ItemCategories.FindAsync(id);
//                if (category == null)
//                    return NotFound(ApiResponse<object>.Fail("Category not found."));

//                var groupName = dto.OracleGroupName.Trim();

//                // Check duplicate (case-insensitive)
//                var exists = await _db.ItemGroupCategoryMaps
//                    .AnyAsync(m => m.OracleGroupName.ToUpper() == groupName.ToUpper());
//                if (exists)
//                    return BadRequest(ApiResponse<object>.Fail(
//                        $"'{groupName}' is already mapped to a category. Remove the old mapping first."));

//                // Add mapping
//                _db.ItemGroupCategoryMaps.Add(new ItemGroupCategoryMap
//                {
//                    Id = Guid.NewGuid(),
//                    OracleGroupName = groupName,
//                    ItemCategoryId = id,
//                    CreatedAt = DateTime.UtcNow
//                });

//                // Update ItemGroups.CategoryId
//                var groups = await _db.ItemGroups
//                    .Where(g => g.Name.ToUpper() == groupName.ToUpper())
//                    .ToListAsync();
//                foreach (var g in groups)
//                    g.CategoryId = id;

//                // Update Items.CategoryId for items in these groups
//                var groupIds = groups.Select(g => g.Id).ToList();
//                var items = await _db.Items
//                    .Where(i => groupIds.Contains(i.GroupId ?? Guid.Empty))
//                    .ToListAsync();
//                foreach (var item in items)
//                    item.CategoryId = id;

//                await _db.SaveChangesAsync();

//                return Ok(ApiResponse<object>.Ok(new
//                {
//                    mapped = items.Count,
//                    groupName = groupName,
//                    category = category.Name
//                }, $"'{groupName}' mapped to '{category.Name}'. {items.Count} items updated."));
//            }

//            // DELETE /api/item-categories/mappings/{mapId}
//            [HttpDelete("mappings/{mapId:guid}")]
//            public async Task<IActionResult> RemoveMapping(Guid mapId)
//            {
//                var map = await _db.ItemGroupCategoryMaps.FindAsync(mapId);
//                if (map == null)
//                    return NotFound(ApiResponse<object>.Fail("Mapping not found."));

//                var groupName = map.OracleGroupName;

//                _db.ItemGroupCategoryMaps.Remove(map);

//                // Clear CategoryId from ItemGroups and Items
//                var groups = await _db.ItemGroups
//                    .Where(g => g.Name.ToUpper() == groupName.ToUpper())
//                    .ToListAsync();
//                foreach (var g in groups)
//                    g.CategoryId = null;

//                var groupIds = groups.Select(g => g.Id).ToList();
//                var items = await _db.Items
//                    .Where(i => groupIds.Contains(i.GroupId ?? Guid.Empty))
//                    .ToListAsync();
//                foreach (var item in items)
//                    item.CategoryId = null;

//                await _db.SaveChangesAsync();

//                return Ok(ApiResponse<object>.Ok(new { unmapped = items.Count },
//                    $"Mapping removed. {items.Count} items are now uncategorized."));
//            }

//            // POST /api/item-categories
//            // Create a new category (e.g. Sweet House adds "WOOD & PLYWOOD")
//            [HttpPost]
//            public async Task<IActionResult> Create(CreateItemCategoryDto dto)
//            {
//                if (string.IsNullOrWhiteSpace(dto.Code))
//                    return BadRequest(ApiResponse<object>.Fail("Code is required."));

//                var exists = await _db.ItemCategories
//                    .AnyAsync(c => c.Code.ToUpper() == dto.Code.ToUpper());
//                if (exists)
//                    return BadRequest(ApiResponse<object>.Fail($"Category code '{dto.Code}' already exists."));

//                var category = new ItemCategory
//                {
//                    Id = Guid.NewGuid(),
//                    Code = dto.Code.Trim().ToUpper(),
//                    Name = dto.Name.Trim(),
//                    Description = dto.Description?.Trim(),
//                    SortOrder = dto.SortOrder,
//                    IsActive = true,
//                    CreatedAt = DateTime.UtcNow
//                };

//                _db.ItemCategories.Add(category);
//                await _db.SaveChangesAsync();

//                return Ok(ApiResponse<ItemCategoryDto>.Ok(new ItemCategoryDto
//                {
//                    Id = category.Id,
//                    Code = category.Code,
//                    Name = category.Name,
//                    Description = category.Description,
//                    SortOrder = category.SortOrder,
//                    IsActive = category.IsActive,
//                    GroupsMapped = 0,
//                    ItemsMapped = 0
//                }, "Category created."));
//            }
//        }
//    }

