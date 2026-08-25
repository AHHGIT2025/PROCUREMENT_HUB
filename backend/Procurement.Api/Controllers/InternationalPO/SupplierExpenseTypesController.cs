// ===== FILE: Controllers/InternationalPO/SupplierExpenseTypesController.cs =====

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Procurement.Api.Common;
using Procurement.Api.Data;
using Procurement.Api.DTOs.InternationalPO;
using Procurement.Api.Models.InternationalPO;

namespace Procurement.Api.Controllers.InternationalPO
{
    [Authorize]
    [ApiController]
    [Route("api/supplier-expense-types")]
    public class SupplierExpenseTypesController : ControllerBase
    {
        private readonly AppDbContext _db;

        public SupplierExpenseTypesController(AppDbContext db) => _db = db;

        // GET /api/supplier-expense-types — all active types, sorted
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var data = await _db.SupplierExpenseTypes
                .Where(t => t.IsActive)
                .OrderBy(t => t.SortOrder)
                .Select(t => new SupplierExpenseTypeDto
                {
                    Id = t.Id,
                    Code = t.Code,
                    Description = t.Description,
                    SortOrder = t.SortOrder
                })
                .ToListAsync();

            return Ok(ApiResponse<List<SupplierExpenseTypeDto>>.Ok(data));
        }

        // POST /api/supplier-expense-types — add new type (admin)
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] SupplierExpenseTypeDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Description))
                return BadRequest(ApiResponse<object>.Fail("Description is required."));

            var entity = new SupplierExpenseType
            {
                Id = Guid.NewGuid(),
                Code = dto.Code?.Trim() ?? "",
                Description = dto.Description.Trim(),
                SortOrder = dto.SortOrder,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            _db.SupplierExpenseTypes.Add(entity);
            await _db.SaveChangesAsync();

            return Ok(ApiResponse<object>.Ok(new { entity.Id }, "Expense type created."));
        }

        // PUT /api/supplier-expense-types/{id} — update (admin)
        [HttpPut("{id:guid}")]
        public async Task<IActionResult> Update(Guid id, [FromBody] SupplierExpenseTypeDto dto)
        {
            var entity = await _db.SupplierExpenseTypes.FindAsync(id);
            if (entity == null)
                return NotFound(ApiResponse<object>.Fail("Expense type not found."));

            entity.Code = dto.Code?.Trim() ?? entity.Code;
            entity.Description = dto.Description?.Trim() ?? entity.Description;
            entity.SortOrder = dto.SortOrder;

            await _db.SaveChangesAsync();

            return Ok(ApiResponse<object>.Ok(null, "Expense type updated."));
        }

        // DELETE /api/supplier-expense-types/{id} — soft delete (admin)
        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var entity = await _db.SupplierExpenseTypes.FindAsync(id);
            if (entity == null)
                return NotFound(ApiResponse<object>.Fail("Expense type not found."));

            entity.IsActive = false;
            await _db.SaveChangesAsync();

            return Ok(ApiResponse<object>.Ok(null, "Expense type deactivated."));
        }
    }
}