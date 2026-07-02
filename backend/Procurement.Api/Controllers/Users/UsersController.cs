using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Procurement.Api.Data;
using Procurement.Api.DTOs.Users;
using Procurement.Api.Models;
namespace Procurement.Api.Controllers.Users
{
    [ApiController]
    [Route("api/users")]
  
    public class UsersController : ControllerBase
    {
        private readonly AppDbContext _db;

        public UsersController(AppDbContext db)
        {
            _db = db;
        }



      
        [HttpGet]
        public async Task<IActionResult> GetUsers()
        {
            var users = await _db.Users
                .Select(u => new
                {
                    u.Id,
                    u.EmployeeCode,
                    u.FullName,
                    u.Email,
                    u.IsActive,

                    Company = _db.Companies
                        .Where(c => c.Id == u.CompanyId)
                        .Select(c => c.Name)
                        .FirstOrDefault(),

                    Department = _db.Departments
                        .Where(d => d.Id == u.DepartmentId)
                        .Select(d => d.Name)
                        .FirstOrDefault(),

                    Role = _db.UserRoles
                        .Where(ur => ur.UserId == u.Id)
                        .Join(_db.Roles,
                              ur => ur.RoleId,
                              r => r.Id,
                              (ur, r) => r.Name)
                        .FirstOrDefault(),

                    Manager = _db.Users
                        .Where(m => m.Id == u.ManagerId)
                        .Select(m => m.FullName)
                        .FirstOrDefault()
                })
                .ToListAsync();

            return Ok(users);
        }

        [HttpGet("{id:guid}")]
        public async Task<IActionResult> GetUser(Guid id)
        {
            var user = await _db.Users
                .Where(u => u.Id == id)
                .Select(u => new
                {
                    u.Id,
                    u.EmployeeCode,
                    u.FullName,
                    u.Email,
                    u.IsActive,
                    u.CompanyId,
                    u.DepartmentId,
                    u.ManagerId,
                    u.SubManagerId,
                    RoleName = _db.UserRoles
                        .Where(ur => ur.UserId == u.Id)
                        .Join(_db.Roles, ur => ur.RoleId, r => r.Id, (ur, r) => r.Name)
                        .FirstOrDefault(),
                    ManagerName = _db.Users.Where(m => m.Id == u.ManagerId).Select(m => m.FullName).FirstOrDefault(),
                    SubManagerName = _db.Users.Where(m => m.Id == u.SubManagerId).Select(m => m.FullName).FirstOrDefault(),
                    AdditionalCompanyIds = _db.UserCompanies
                        .Where(uc => uc.UserId == u.Id && uc.CompanyId != u.CompanyId)
                        .Select(uc => uc.CompanyId).ToList()
                })
                .FirstOrDefaultAsync();

            if (user == null) return NotFound();
            return Ok(user);
        }
        // 3. CREATE USER

        [Authorize(Roles = "System Admin")]
        [HttpPost]
        public async Task<IActionResult> CreateUser(CreateUserDto dto)
        {
            try
            {
                // ✅ VALIDATIONS
                if (string.IsNullOrWhiteSpace(dto.EmployeeCode))
                    return BadRequest("EmployeeCode is required ❌");

                if (dto.CompanyId == null)
                    return BadRequest("Company is required ❌");

                // ✅ CHECK DUPLICATE EMP CODE
                var exists = await _db.Users
                    .AnyAsync(u => u.EmployeeCode == dto.EmployeeCode);

                if (exists)
                    return BadRequest("EmployeeCode already exists ❌");

                // ✅ CHECK ROLE FIRST
                var role = await _db.Roles
                    .FirstOrDefaultAsync(r => r.Name == dto.RoleName);

                if (role == null)
                    return BadRequest("Invalid role ❌");

                // ✅ CREATE USER
                var user = new AppUser
                {
                    Id = Guid.NewGuid(),
                    EmployeeCode = dto.EmployeeCode,

                    FullName = dto.FullName,
                    Email = dto.Email,
                    PasswordHash = dto.Password,

                    CompanyId = dto.CompanyId.Value,
                    DepartmentId = dto.DepartmentId,

                    ManagerId = dto.ManagerId,
                    SubManagerId = dto.SubManagerId,

                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                };

                _db.Users.Add(user);

                // ✅ USER ROLE
                _db.UserRoles.Add(new UserRole
                {
                    Id = Guid.NewGuid(),
                    UserId = user.Id,
                    RoleId = role.Id
                });

                // ✅ MAIN COMPANY (avoid duplicate)
                _db.UserCompanies.Add(new UserCompany
                {
                    Id = Guid.NewGuid(),
                    UserId = user.Id,
                    CompanyId = dto.CompanyId.Value
                });

                // ✅ ADDITIONAL COMPANIES (avoid duplicate main)
                if (dto.AdditionalCompanyIds != null)
                {
                    foreach (var compId in dto.AdditionalCompanyIds)
                    {
                        if (compId != dto.CompanyId)   // avoid duplicate
                        {
                            _db.UserCompanies.Add(new UserCompany
                            {
                                Id = Guid.NewGuid(),
                                UserId = user.Id,
                                CompanyId = compId
                            });
                        }
                    }
                }

                // ✅ DEPARTMENT (only if applicable for this company)
                if (dto.DepartmentId.HasValue)
                {
                    _db.UserDepartments.Add(new UserDepartment
                    {
                        Id = Guid.NewGuid(),
                        UserId = user.Id,
                        DepartmentId = dto.DepartmentId.Value
                    });
                }

                await _db.SaveChangesAsync();

                return Ok("✅ User created successfully");
            }


            catch (Exception ex)
            {
                return BadRequest(new
                {
                    message = ex.Message,
                    inner = ex.InnerException?.Message,
                    stack = ex.StackTrace
                });
            }

            //return BadRequest(ex.InnerException?.Message ?? ex.Message);  // SHOW REAL ERROR

        }



        [HttpPut("{id:guid}")]
        public async Task<IActionResult> UpdateUser(Guid id, UpdateUserDto dto)
        {
            var user = await _db.Users.FindAsync(id);
            if (user == null) return NotFound();

            user.EmployeeCode = dto.EmployeeCode;
            user.FullName = dto.FullName;
            user.Email = dto.Email;
            user.CompanyId = dto.CompanyId;
            user.DepartmentId = dto.DepartmentId;
            user.ManagerId = dto.ManagerId;
            user.SubManagerId = dto.SubManagerId;
            user.UpdatedAt = DateTime.UtcNow;

            var role = await _db.Roles.FirstOrDefaultAsync(r => r.Name == dto.RoleName);
            if (role != null)
            {
                _db.UserRoles.RemoveRange(_db.UserRoles.Where(ur => ur.UserId == id));
                _db.UserRoles.Add(new UserRole { Id = Guid.NewGuid(), UserId = id, RoleId = role.Id });
            }

            _db.UserCompanies.RemoveRange(_db.UserCompanies.Where(uc => uc.UserId == id));
            _db.UserCompanies.Add(new UserCompany { Id = Guid.NewGuid(), UserId = id, CompanyId = dto.CompanyId });
            if (dto.AdditionalCompanyIds != null)
            {
                foreach (var compId in dto.AdditionalCompanyIds)
                    if (compId != dto.CompanyId)
                        _db.UserCompanies.Add(new UserCompany { Id = Guid.NewGuid(), UserId = id, CompanyId = compId });
            }

            await _db.SaveChangesAsync();
            return Ok(new { success = true, message = "✅ Updated successfully" });
        }

        // ✅ 5. ACTIVATE / DEACTIVATE (NOT DELETE ✅)
        [HttpPut("{id:guid}/status")]
        public async Task<IActionResult> ToggleStatus(Guid id)
        {
            var user = await _db.Users.FindAsync(id);
            if (user == null) return NotFound();

            user.IsActive = !user.IsActive;

            await _db.SaveChangesAsync();

            return Ok(new
            {
                message = user.IsActive ? "✅ Activated" : "❌ Deactivated"
            });
        }


        // ✅ 5. DELETE USER
        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> DeleteUser(Guid id)
        {
            var user = await _db.Users.FindAsync(id);
            if (user == null) return NotFound();

            user.IsActive = false;

            await _db.SaveChangesAsync();

            return Ok("Deleted ✅");
        }
    }
}
