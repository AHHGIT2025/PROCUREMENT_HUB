using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Procurement.Api.Data;
using Procurement.Api.DTOs.Materials;
using Procurement.Api.Models;
namespace Procurement.Api.Controllers.Materials
{
    [ApiController]
    [Route("api/[controller]")]
    public class MaterialsController : Controller
    {


        private readonly AppDbContext _context;

        public MaterialsController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> Get(
        [FromQuery] Guid? companyId,
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
        {
            if (pageSize > 200) pageSize = 200;

            // No company selected — force user to select company first.
            // Loading all 42,000+ items at once causes browser slowness/timeout.
            if (!companyId.HasValue)
            {
                return Ok(new
                {
                    items = new List<object>(),
                    total = 0,
                    page,
                    pageSize,
                    totalPages = 0,
                    message = "Please select a company to load items."
                });
            }

            var query = _context.Items
                .Where(i => _context.ItemCompanies.Any(ic =>
                    ic.ItemId == i.Id &&
                    ic.CompanyId == companyId.Value))
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.Trim().ToLower();
                query = query.Where(i =>
                    i.Name.ToLower().Contains(s) ||
                    i.ItemCode.ToLower().Contains(s));
            }

            var total = await query.CountAsync();

            var data = await query
                .OrderBy(i => i.Name)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(i => new
                {
                    id = i.Id,
                    materialCode = i.ItemCode,
                    name = i.Name,
                    mainGroup = _context.ItemGroups
                        .Where(g => g.Id == i.GroupId)
                        .Select(g => g.Name)
                        .FirstOrDefault(),
                    subGroup = _context.ItemSubGroups
                        .Where(s => s.Id == i.SubGroupId)
                        .Select(s => s.Name)
                        .FirstOrDefault(),
                    source = i.SourceType,
                    uom = _context.ItemUnits
                        .Where(u => u.ItemId == i.Id && u.IsDefault)
                        .Select(u => u.Unit.Name)
                        .FirstOrDefault(),
                    estimatedPrice = 0
                })
                .ToListAsync();

            return Ok(new
            {
                items = data,
                total,
                page,
                pageSize,
                totalPages = (int)Math.Ceiling((double)total / pageSize)
            });
        }

        [HttpPost]
        public async Task<IActionResult> Create(CreateItemDto dto)
        {
            try
            {
                var item = new Item
                {
                    Id = Guid.NewGuid(),

                    ItemCode = dto.ItemCode,

                    Name = dto.Name,

                    Description = dto.Description,

                    GroupId = dto.GroupId,

                    SubGroupId = dto.SubGroupId,

                    SourceType = "MANUAL",

                    CreatedAt = DateTime.UtcNow
                };

                // ✅ SAVE ITEM FIRST
                _context.Items.Add(item);

                await _context.SaveChangesAsync();

                // ✅ THEN COMPANY MAPPING

                _context.ItemCompanies.Add(new ItemCompany
                {
                    Id = Guid.NewGuid(),

                    ItemId = item.Id,

                    CompanyId = dto.CompanyId
                });


                // ✅ DEFAULT UNIT
                if (dto.UnitId.HasValue)
                {

                    _context.ItemUnits.Add(new ItemUnit
                    {
                        Id = Guid.NewGuid(),

                        ItemId = item.Id,

                        UnitId = dto.UnitId.Value,

                        IsDefault = true
                    });

                }

                await _context.SaveChangesAsync();

                return Ok(new
                {
                    message = "✅ Item Created Successfully"
                });
            }

            catch (Exception ex)
            {
                return BadRequest(new
                {
                    message = ex.Message,
                    inner = ex.InnerException?.Message
                });
            }
        }


        // GET /api/materials/{id} — single item details for edit form
        [HttpGet("{id:guid}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var item = await _context.Items.FirstOrDefaultAsync(i => i.Id == id);
            if (item == null)
                return NotFound(new { message = "Item not found." });

            var defaultUnit = await _context.ItemUnits
                .FirstOrDefaultAsync(u => u.ItemId == id && u.IsDefault);

            var activeRequestCount = await _context.PurchaseRequestItems
                .Where(pri => pri.MaterialId == id)
                .Join(_context.PurchaseRequests,
                    pri => pri.PurchaseRequestId,
                    pr => pr.Id,
                    (pri, pr) => pr)
                .Where(pr => pr.Status != RequestStatus.Approved &&
                             pr.Status != RequestStatus.Rejected)
                .CountAsync();

            return Ok(new
            {
                id = item.Id,
                itemCode = item.ItemCode,
                name = item.Name,
                description = item.Description,
                groupId = item.GroupId,
                subGroupId = item.SubGroupId,
                unitId = defaultUnit?.UnitId,
                sourceType = item.SourceType,
                hasActiveMRs = activeRequestCount > 0,
                activeMRCount = activeRequestCount,
                createdAt = item.CreatedAt,        // ✅ ADD
                updatedAt = item.UpdatedAt         // ✅ ADD
            });
        }



        // ===== ADD THIS INSIDE MaterialsController.cs =====
        // Route: api/[controller] → api/materials
        // Add this method inside the MaterialsController class

        // PUT /api/materials/{id}/category
        // Update a single item's CategoryId — individual override per item
        [HttpPut("{id:guid}/category")]
        public async Task<IActionResult> UpdateCategory(Guid id, [FromBody] UpdateItemCategoryDto dto)
        {
            var item = await _context.Items.FindAsync(id);
            if (item == null)
                return NotFound(new { success = false, message = "Item not found." });

            var category = await _context.ItemCategories.FindAsync(dto.CategoryId);
            if (category == null)
                return NotFound(new { success = false, message = "Category not found." });

            var oldCategoryId = item.CategoryId;
            item.CategoryId = dto.CategoryId;
            item.IsManualCategoryOverride = true;
            item.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(new
            {
                success = true,
                message = $"Category updated to '{category.Name}'.",
                itemCode = item.ItemCode,
                itemName = item.Name,
                //oldCategory = oldCategoryId,
                oldCategory = oldCategoryId != null
    ? await _context.ItemCategories
        .Where(c => c.Id == oldCategoryId)
        .Select(c => c.Name)
        .FirstOrDefaultAsync()
    : "None",
                newCategory = category.Name,
                newCategoryCode = category.Code
            });
        }

       


        // PUT /api/materials/{id} — edit item
        [HttpPut("{id:guid}")]
        public async Task<IActionResult> Update(Guid id, UpdateItemDto dto)
        {
            var item = await _context.Items.FirstOrDefaultAsync(i => i.Id == id);
            if (item == null)
                return NotFound(new { message = "Item not found." });

            // Check if item is used in any active (non-final) purchase requests
            var activeRequestCount = await _context.PurchaseRequestItems
                .Where(pri => pri.MaterialId == id)
                .Join(_context.PurchaseRequests,
                    pri => pri.PurchaseRequestId,
                    pr => pr.Id,
                    (pri, pr) => pr)
                .Where(pr => pr.Status != RequestStatus.Approved &&
                             pr.Status != RequestStatus.Rejected)
                .CountAsync();

            bool hasActiveMRs = activeRequestCount > 0;

            // Group and UOM changes are blocked if item is in active MRs —
            // changing these would silently redirect existing requests to a
            // different approval flow or change the unit mid-approval.
            if (hasActiveMRs && (dto.GroupId != item.GroupId || dto.SubGroupId != item.SubGroupId))
            {
                return BadRequest(new
                {
                    message = $"Cannot change Group/Sub-Group — this item is used in {activeRequestCount} active request(s). " +
                              "Ask the approver to Return those requests first, then retry."
                });
            }

            if (hasActiveMRs && dto.UnitId != (await _context.ItemUnits
                    .Where(u => u.ItemId == id && u.IsDefault)
                    .Select(u => (Guid?)u.UnitId)
                    .FirstOrDefaultAsync()))
            {
                return BadRequest(new
                {
                    message = $"Cannot change UOM — this item is used in {activeRequestCount} active request(s). " +
                              "Ask the approver to Return those requests first, then retry."
                });
            }

            // Apply updates
            item.Name = dto.Name;
            item.Description = dto.Description ?? "";
            item.GroupId = dto.GroupId;
            item.SubGroupId = dto.SubGroupId;

            // Update default ItemUnit if UOM changed
            if (dto.UnitId.HasValue)
            {
                var defaultUnit = await _context.ItemUnits
                    .FirstOrDefaultAsync(u => u.ItemId == id && u.IsDefault);

                if (defaultUnit == null)
                {
                    _context.ItemUnits.Add(new ItemUnit
                    {
                        Id = Guid.NewGuid(),
                        ItemId = id,
                        UnitId = dto.UnitId.Value,
                        ConversionFactor = 1,
                        IsDefault = true
                    });
                }
                else
                {
                    defaultUnit.UnitId = dto.UnitId.Value;
                }

                item.UnitId = dto.UnitId.Value;
            }

            await _context.SaveChangesAsync();

            // Warn if Oracle item — next sync may override manual changes
            var warning = item.SourceType == "ORACLE"
                ? "⚠️ This is an Oracle-synced item. Changes may be overwritten on next sync if Oracle data differs."
                : null;

            return Ok(new
            {
                message = "Item updated successfully.",
                warning,
                id = item.Id
            });
        }


    }

}
 
