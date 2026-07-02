
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Procurement.Api.Data;
using Procurement.Api.Models;

namespace Procurement.Api.Controllers.Organization
{
    [ApiController]
    [Route("api/companies")]
    public class CompaniesController : CrudController<Company>
    {
        private readonly AppDbContext _context;

        public CompaniesController(AppDbContext db) : base(db)
        {
            _context = db;
        }
        // ✅ GET COMPANIES BY USER
        [HttpGet("user/{userId}")]
        public async Task<IActionResult> GetUserCompanies(Guid userId)
        {
            // System Admin → ALL active companies
            var isAdmin = await _context.UserRoles
                .Where(ur => ur.UserId == userId)
                .Join(_context.Roles, ur => ur.RoleId, r => r.Id, (ur, r) => r.Name)
                .AnyAsync(name => name == "System Admin");

            if (isAdmin)
            {
                var allCompanies = await _context.Companies
                    .Where(c => c.IsActive)
                    .Select(c => new { c.Id, c.Name, c.Code })
                    .ToListAsync();

                return Ok(allCompanies);
            }

            // Regular user → only their accessible companies
            var companies = await _context.UserCompanies
                .Where(x => x.UserId == userId)
                .Join(
                    _context.Companies,
                    uc => uc.CompanyId,
                    c => c.Id,
                    (uc, c) => new { c.Id, c.Name, c.Code })
                .ToListAsync();

            return Ok(companies);
        }
        // ✅ GET COMPANIES BY USER
        //[HttpGet("user/{userId}")]
        //public async Task<IActionResult> GetUserCompanies(Guid userId)
        //{
        //    var companies = await _context.UserCompanies

        //        .Where(x => x.UserId == userId)

        //        .Join(
        //            _context.Companies,

        //            uc => uc.CompanyId,

        //            c => c.Id,

        //            (uc, c) => new
        //            {
        //                c.Id,
        //                c.Name,
        //                c.Code
        //            })

        //        .ToListAsync();

        //    return Ok(companies);
        //}
    }
}
