using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Procurement.Api.Data;
using Procurement.Api.Models;

namespace Procurement.Api.Controllers.Users
{
    [ApiController]
    [Route("api/roles")]
    public class RolesController : CrudController<Role>
    {
        private readonly AppDbContext _db;
        public RolesController(AppDbContext db) : base(db) { _db = db; }

        // ✅ Override: only return active roles (base Get() ignores IsActive entirely)
        [HttpGet]
        public override async Task<IActionResult> Get()
        {
            var roles = await _db.Roles
                .Where(r => r.IsActive)
                .OrderBy(r => r.Name)
                .ToListAsync();

            return Ok(roles);
        }

        // ✅ NEW: GET /api/roles/by-company/{companyId}
        // Returns only roles that have at least one active user who:
        //   - holds that role (UserRoles, active)
        //   - AND has access to the given company (UserCompanies, active)
        // A role with zero qualifying users in this company is simply omitted —
        // no warning flag needed, per confirmed requirement.
        [HttpGet("by-company/{companyId:guid}")]
        public async Task<IActionResult> GetByCompany(Guid companyId)
        {
            var roleIds = await _db.UserCompanies
                .Where(uc => uc.CompanyId == companyId && uc.IsActive)
                .Join(_db.UserRoles.Where(ur => ur.IsActive),
                      uc => uc.UserId,
                      ur => ur.UserId,
                      (uc, ur) => ur.RoleId)
                .Distinct()
                .ToListAsync();

            var roles = await _db.Roles
                .Where(r => r.IsActive && roleIds.Contains(r.Id))
                .OrderBy(r => r.Name)
                .ToListAsync();

            return Ok(roles);
        }
    }
}