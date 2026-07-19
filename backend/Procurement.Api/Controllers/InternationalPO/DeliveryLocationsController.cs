
 
namespace Procurement.Api.Controllers.InternationalPO
{
    using Microsoft.AspNetCore.Authorization;
    using Microsoft.AspNetCore.Mvc;
    using Microsoft.EntityFrameworkCore;
    using Procurement.Api.Common;
    using Procurement.Api.Data;
    using Procurement.Api.DTOs.InternationalPO;
    using Procurement.Api.Models.InternationalPO;

    [Authorize]
    [ApiController]
    [Route("api/delivery-locations")]
    public class DeliveryLocationsController : ControllerBase
    {
        private readonly AppDbContext _db;

        public DeliveryLocationsController(AppDbContext db)
        {
            _db = db;
        }

        // GET /api/delivery-locations
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var data = await _db.DeliveryLocations
                .Where(d => d.IsActive)
                .Join(_db.Companies, d => d.CompanyId, c => c.Id, (d, c) => new DeliveryLocationDto
                {
                    Id = d.Id,
                    CompanyId = d.CompanyId,
                    CompanyName = c.Name,
                    Code = d.Code,
                    Name = d.Name,
                    IsActive = d.IsActive
                })
                .OrderBy(d => d.CompanyName).ThenBy(d => d.Name)
                .ToListAsync();

            return Ok(ApiResponse<List<DeliveryLocationDto>>.Ok(data));
        }

        // GET /api/delivery-locations/by-company/{companyId}
        [HttpGet("by-company/{companyId:guid}")]
        public async Task<IActionResult> GetByCompany(Guid companyId)
        {
            var data = await _db.DeliveryLocations
                .Where(d => d.CompanyId == companyId && d.IsActive)
                .Select(d => new { d.Id, d.Code, d.Name })
                .OrderBy(d => d.Name)
                .ToListAsync();

            return Ok(ApiResponse<object>.Ok(data));
        }

        // POST /api/delivery-locations
        [HttpPost]
        public async Task<IActionResult> Create(CreateDeliveryLocationDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Name))
                return BadRequest(ApiResponse<object>.Fail("Location name is required."));

            var loc = new DeliveryLocation
            {
                Id = Guid.NewGuid(),
                CompanyId = dto.CompanyId,
                Code = dto.Code,
                Name = dto.Name,
                CreatedAt = DateTime.UtcNow,
                IsActive = true
            };

            _db.DeliveryLocations.Add(loc);
            await _db.SaveChangesAsync();

            return Ok(ApiResponse<object>.Ok(new { loc.Id }, "Delivery location created."));
        }

        // DELETE /api/delivery-locations/{id} — soft delete
        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var loc = await _db.DeliveryLocations.FindAsync(id);
            if (loc == null)
                return NotFound(ApiResponse<object>.Fail("Delivery location not found."));

            loc.IsActive = false;
            loc.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            return Ok(ApiResponse<object>.Ok(null, "Delivery location deactivated."));
        }
    }
}
