using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Procurement.Api.Data;

namespace Procurement.Api.Controllers.Organization
{
    [ApiController]
    [Route("api/departments")]
    public class DepartmentsController : ControllerBase
    {
        private readonly AppDbContext _db;

        public DepartmentsController(AppDbContext db)
        {
            _db = db;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var data = await _db.Departments
                .Select(d => new { d.Id, d.Name, d.CompanyId })
                .ToListAsync();
            return Ok(data);
        }

        [HttpGet("by-company/{companyId:guid}")]
        public async Task<IActionResult> GetByCompany(Guid companyId)
        {
            var data = await _db.Departments
                .Where(d => d.CompanyId == companyId)
                .Select(d => new { d.Id, d.Name, d.CompanyId })
                .ToListAsync();
            return Ok(data);
        }
    }
}