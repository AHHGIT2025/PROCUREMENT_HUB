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

        // GET api/menu-permissions/items
        // FIXED (2026-09-16): full menu item definitions (key, label, route,
        // icon, which sidebar group it belongs to, display order) --
        // previously this was a hardcoded array here AND a second hardcoded
        // array of {key,route,icon} in AppLayout.tsx AND a third hardcoded
        // label dictionary in MenuPermissions.tsx, so adding one new menu
        // item meant editing three places and redeploying. Now it's rows in
        // the MenuItems table: AppLayout fetches this to build its sidebar
        // groups, and the admin "+ Add Menu Item" form (see AddMenuItem
        // below) inserts new rows here with zero code changes, as long as
        // the item slots into one of the existing sidebar groups with one
        // of the already-available icons.
        [HttpGet("items")]
        public async Task<IActionResult> GetItems()
        {
            var items = await _db.MenuItems
                .Where(mi => mi.IsActive)
                .OrderBy(mi => mi.GroupKey).ThenBy(mi => mi.DisplayOrder)
                .Select(mi => new
                {
                    mi.MenuKey,
                    mi.Label,
                    mi.Route,
                    mi.IconName,
                    mi.GroupKey,
                    mi.DisplayOrder
                })
                .ToListAsync();

            return Ok(ApiResponse<object>.Ok(items));
        }

        // POST api/menu-permissions/items
        // Adds a new menu item (admin "+ Add Menu Item" form). MenuKey must
        // be unique and match the route the frontend page already lives at
        // -- this only wires an EXISTING page into the sidebar/permission
        // system, it does not create the page itself.
        [HttpPost("items")]
        public async Task<IActionResult> AddMenuItem([FromBody] AddMenuItemDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.MenuKey) || string.IsNullOrWhiteSpace(dto.Label)
                || string.IsNullOrWhiteSpace(dto.Route) || string.IsNullOrWhiteSpace(dto.IconName)
                || string.IsNullOrWhiteSpace(dto.GroupKey))
                return BadRequest(ApiResponse<object>.Fail("All fields are required."));

            var exists = await _db.MenuItems.AnyAsync(mi => mi.MenuKey == dto.MenuKey);
            if (exists)
                return BadRequest(ApiResponse<object>.Fail($"Menu key '{dto.MenuKey}' already exists."));

            var maxOrder = await _db.MenuItems
                .Where(mi => mi.GroupKey == dto.GroupKey)
                .Select(mi => (int?)mi.DisplayOrder)
                .MaxAsync() ?? 0;

            _db.MenuItems.Add(new MenuItem
            {
                Id = Guid.NewGuid(),
                MenuKey = dto.MenuKey.Trim(),
                Label = dto.Label.Trim(),
                Route = dto.Route.Trim(),
                IconName = dto.IconName.Trim(),
                GroupKey = dto.GroupKey.Trim(),
                DisplayOrder = maxOrder + 1,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            });
            await _db.SaveChangesAsync();

            return Ok(ApiResponse<object>.Ok(null, "Menu item added."));
        }

        // GET api/menu-permissions/matrix
        // Full Role x MenuKey grid for the admin management screen. Labels
        // now come from MenuItems (see GetItems) instead of a hardcoded
        // dictionary, so a newly-added menu item's label shows up here
        // automatically.
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

            var menuKeys = await _db.MenuItems
                .Where(mi => mi.IsActive)
                .OrderBy(mi => mi.GroupKey).ThenBy(mi => mi.DisplayOrder)
                .Select(mi => new { key = mi.MenuKey, label = mi.Label })
                .ToListAsync();

            return Ok(ApiResponse<object>.Ok(new
            {
                roles,
                menuKeys,
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

    public class AddMenuItemDto
    {
        public string MenuKey { get; set; } = "";
        public string Label { get; set; } = "";
        public string Route { get; set; } = "";
        public string IconName { get; set; } = "";
        public string GroupKey { get; set; } = "";
    }
}


//using Microsoft.AspNetCore.Authorization;
//using Microsoft.AspNetCore.Mvc;
//using Microsoft.EntityFrameworkCore;
//using Procurement.Api.Common;
//using Procurement.Api.Data;
//using Procurement.Api.Models;
//using Procurement.Api.Models.InternationalPO;
//using Procurement.Api.Models.Menu;

//using System.Security.Claims;

//namespace Procurement.Api.Controllers
//{
//    [Authorize]
//    [ApiController]
//    [Route("api/menu-permissions")]
//    public class MenuPermissionsController : ControllerBase
//    {
//        private readonly AppDbContext _db;

//        public MenuPermissionsController(AppDbContext db)
//        {
//            _db = db;
//        }

//        // GET api/menu-permissions/my-menus
//        // Returns the distinct set of MenuKeys visible to the current user,
//        // based on all roles assigned to them. Frontend uses this to filter
//        // AppLayout's menu tree instead of checking hardcoded role arrays.
//        [HttpGet("my-menus")]
//        public async Task<IActionResult> GetMyMenus()
//        {
//            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
//            if (!Guid.TryParse(userIdClaim, out var userId))
//                return Unauthorized(ApiResponse<object>.Fail("Invalid user token."));

//            var menuKeys = await _db.UserRoles
//                .Where(ur => ur.UserId == userId)
//                .Join(_db.MenuPermissions, ur => ur.RoleId, mp => mp.RoleId, (ur, mp) => mp.MenuKey)
//                .Distinct()
//                .ToListAsync();

//            return Ok(ApiResponse<List<string>>.Ok(menuKeys));
//        }

//        // GET api/menu-permissions/matrix
//        // Full Role x MenuKey grid for the admin management screen.
//        [HttpGet("matrix")]
//        public async Task<IActionResult> GetMatrix()
//        {
//            var roles = await _db.Roles
//                .OrderBy(r => r.Name)
//                .Select(r => new { r.Id, r.Name })
//                .ToListAsync();

//            var permissions = await _db.MenuPermissions
//                .Select(mp => new { mp.RoleId, mp.MenuKey })
//                .ToListAsync();

//            var allMenuKeys = new[]
//            {
//                "dashboard", "purchase-requests", "create-request", "my-requests",
//                "approvals", "materials", "materials-create", "projects", "projects-create", "indent-transfer","procurement", "upload-center",
//                "category-flow", "oracle-monitor", "item-categories","approval-history",
//                "workflows", "users", "organization", "audit-logs","international-po","suppliers","rfq", "departments", "roles", "menu-permissions", "company-categories", "store-verification","po-settings"
//            };

//            return Ok(ApiResponse<object>.Ok(new
//            {
//                roles,
//                menuKeys = allMenuKeys,
//                permissions = permissions.Select(p => new { p.RoleId, p.MenuKey })
//            }));
//        }

//        // POST api/menu-permissions/toggle
//        // Add or remove a single RoleId+MenuKey mapping (checkbox click).
//        [HttpPost("toggle")]
//        public async Task<IActionResult> Toggle([FromBody] ToggleMenuPermissionDto dto)
//        {
//            var existing = await _db.MenuPermissions
//                .FirstOrDefaultAsync(mp => mp.RoleId == dto.RoleId && mp.MenuKey == dto.MenuKey);

//            if (existing != null)
//            {
//                _db.MenuPermissions.Remove(existing);
//                await _db.SaveChangesAsync();
//                return Ok(ApiResponse<object>.Ok(new { enabled = false }, "Menu access removed."));
//            }

//            _db.MenuPermissions.Add(new MenuPermission
//            {
//                Id = Guid.NewGuid(),
//                RoleId = dto.RoleId,
//                MenuKey = dto.MenuKey,
//                CreatedAt = DateTime.UtcNow
//            });
//            await _db.SaveChangesAsync();
//            return Ok(ApiResponse<object>.Ok(new { enabled = true }, "Menu access granted."));
//        }
//    }

//    public class ToggleMenuPermissionDto
//    {
//        public Guid RoleId { get; set; }
//        public string MenuKey { get; set; } = "";
//    }
//}