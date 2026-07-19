using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Procurement.Api.Common;
using Procurement.Api.Data;
using Procurement.Api.Models;
using Procurement.Api.Models.InternationalPO;
using Procurement.Api.Models.Menu;

using System.Security.Claims;

namespace Procurement.Api.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/menu-permissions")]
    public class MenuPermissionsController : ControllerBase
    {
        private readonly AppDbContext _db;

        public MenuPermissionsController(AppDbContext db)
        {
            _db = db;
        }

        // GET api/menu-permissions/my-menus
        // Returns the distinct set of MenuKeys visible to the current user,
        // based on all roles assigned to them. Frontend uses this to filter
        // AppLayout's menu tree instead of checking hardcoded role arrays.
        [HttpGet("my-menus")]
        public async Task<IActionResult> GetMyMenus()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!Guid.TryParse(userIdClaim, out var userId))
                return Unauthorized(ApiResponse<object>.Fail("Invalid user token."));

            var menuKeys = await _db.UserRoles
                .Where(ur => ur.UserId == userId)
                .Join(_db.MenuPermissions, ur => ur.RoleId, mp => mp.RoleId, (ur, mp) => mp.MenuKey)
                .Distinct()
                .ToListAsync();

            return Ok(ApiResponse<List<string>>.Ok(menuKeys));
        }

        // GET api/menu-permissions/matrix
        // Full Role x MenuKey grid for the admin management screen.
        [HttpGet("matrix")]
        public async Task<IActionResult> GetMatrix()
        {
            var roles = await _db.Roles
                .OrderBy(r => r.Name)
                .Select(r => new { r.Id, r.Name })
                .ToListAsync();

            var permissions = await _db.MenuPermissions
                .Select(mp => new { mp.RoleId, mp.MenuKey })
                .ToListAsync();

            var allMenuKeys = new[]
            {
                "dashboard", "purchase-requests", "create-request", "my-requests",
                "approvals", "materials", "projects", "indent-transfer","procurement", "upload-center",
                "category-flow", "oracle-monitor", "item-categories","approval-history",
                "workflows", "users", "organization", "audit-logs","international-po","suppliers","rfq"
            };

            return Ok(ApiResponse<object>.Ok(new
            {
                roles,
                menuKeys = allMenuKeys,
                permissions = permissions.Select(p => new { p.RoleId, p.MenuKey })
            }));
        }

        // POST api/menu-permissions/toggle
        // Add or remove a single RoleId+MenuKey mapping (checkbox click).
        [HttpPost("toggle")]
        public async Task<IActionResult> Toggle([FromBody] ToggleMenuPermissionDto dto)
        {
            var existing = await _db.MenuPermissions
                .FirstOrDefaultAsync(mp => mp.RoleId == dto.RoleId && mp.MenuKey == dto.MenuKey);

            if (existing != null)
            {
                _db.MenuPermissions.Remove(existing);
                await _db.SaveChangesAsync();
                return Ok(ApiResponse<object>.Ok(new { enabled = false }, "Menu access removed."));
            }

            _db.MenuPermissions.Add(new MenuPermission
            {
                Id = Guid.NewGuid(),
                RoleId = dto.RoleId,
                MenuKey = dto.MenuKey,
                CreatedAt = DateTime.UtcNow
            });
            await _db.SaveChangesAsync();
            return Ok(ApiResponse<object>.Ok(new { enabled = true }, "Menu access granted."));
        }
    }

    public class ToggleMenuPermissionDto
    {
        public Guid RoleId { get; set; }
        public string MenuKey { get; set; } = "";
    }
}