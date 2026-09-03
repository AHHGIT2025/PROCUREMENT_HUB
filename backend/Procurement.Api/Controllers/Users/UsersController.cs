//using Microsoft.AspNetCore.Authorization;
//using Microsoft.AspNetCore.Mvc;
//using Microsoft.EntityFrameworkCore;
//using Procurement.Api.Data;
//using Procurement.Api.DTOs.Users;
//using Procurement.Api.Models;
//namespace Procurement.Api.Controllers.Users
//{
//    [ApiController]
//    [Route("api/users")]

//    public class UsersController : ControllerBase
//    {
//        private readonly AppDbContext _db;

//        public UsersController(AppDbContext db)
//        {
//            _db = db;
//        }




//        [HttpGet]
//        public async Task<IActionResult> GetUsers()
//        {
//            var users = await _db.Users
//                .Select(u => new
//                {
//                    u.Id,
//                    u.EmployeeCode,
//                    u.FullName,
//                    u.Email,
//                    u.IsActive,

//                    Company = _db.Companies
//                        .Where(c => c.Id == u.CompanyId)
//                        .Select(c => c.Name)
//                        .FirstOrDefault(),

//                    Department = _db.Departments
//                        .Where(d => d.Id == u.DepartmentId)
//                        .Select(d => d.Name)
//                        .FirstOrDefault(),

//                    Role = _db.UserRoles
//                        .Where(ur => ur.UserId == u.Id)
//                        .Join(_db.Roles,
//                              ur => ur.RoleId,
//                              r => r.Id,
//                              (ur, r) => r.Name)
//                        .FirstOrDefault(),

//                    Manager = _db.Users
//                        .Where(m => m.Id == u.ManagerId)
//                        .Select(m => m.FullName)
//                        .FirstOrDefault()
//                })
//                .ToListAsync();

//            return Ok(users);
//        }

//        [HttpGet("{id:guid}")]
//        public async Task<IActionResult> GetUser(Guid id)
//        {
//            var user = await _db.Users
//                .Where(u => u.Id == id)
//                .Select(u => new
//                {
//                    u.Id,
//                    u.EmployeeCode,
//                    u.FullName,
//                    u.Email,
//                    u.IsActive,
//                    u.CompanyId,
//                    u.DepartmentId,
//                    u.ManagerId,
//                    u.SubManagerId,
//                    RoleName = _db.UserRoles
//                        .Where(ur => ur.UserId == u.Id)
//                        .Join(_db.Roles, ur => ur.RoleId, r => r.Id, (ur, r) => r.Name)
//                        .FirstOrDefault(),
//                    ManagerName = _db.Users.Where(m => m.Id == u.ManagerId).Select(m => m.FullName).FirstOrDefault(),
//                    SubManagerName = _db.Users.Where(m => m.Id == u.SubManagerId).Select(m => m.FullName).FirstOrDefault(),
//                    AdditionalCompanyIds = _db.UserCompanies
//                        .Where(uc => uc.UserId == u.Id && uc.CompanyId != u.CompanyId)
//                        .Select(uc => uc.CompanyId).ToList()
//                })
//                .FirstOrDefaultAsync();

//            if (user == null) return NotFound();
//            return Ok(user);
//        }
//        // 3. CREATE USER

//        [Authorize(Roles = "System Admin")]
//        [HttpPost]
//        public async Task<IActionResult> CreateUser(CreateUserDto dto)
//        {
//            try
//            {
//                // ✅ VALIDATIONS
//                if (string.IsNullOrWhiteSpace(dto.EmployeeCode))
//                    return BadRequest("EmployeeCode is required ❌");

//                if (dto.CompanyId == null)
//                    return BadRequest("Company is required ❌");

//                // ✅ CHECK DUPLICATE EMP CODE
//                var exists = await _db.Users
//                    .AnyAsync(u => u.EmployeeCode == dto.EmployeeCode);

//                if (exists)
//                    return BadRequest("EmployeeCode already exists ❌");

//                // ✅ CHECK ROLE FIRST
//                var role = await _db.Roles
//                    .FirstOrDefaultAsync(r => r.Name == dto.RoleName);

//                if (role == null)
//                    return BadRequest("Invalid role ❌");

//                // ✅ CREATE USER
//                var user = new AppUser
//                {
//                    Id = Guid.NewGuid(),
//                    EmployeeCode = dto.EmployeeCode,

//                    FullName = dto.FullName,
//                    Email = dto.Email,
//                    PasswordHash = dto.Password,

//                    CompanyId = dto.CompanyId.Value,
//                    DepartmentId = dto.DepartmentId,

//                    ManagerId = dto.ManagerId,
//                    SubManagerId = dto.SubManagerId,

//                    IsActive = true,
//                    CreatedAt = DateTime.UtcNow
//                };

//                _db.Users.Add(user);

//                // ✅ USER ROLE
//                _db.UserRoles.Add(new UserRole
//                {
//                    Id = Guid.NewGuid(),
//                    UserId = user.Id,
//                    RoleId = role.Id
//                });

//                // ✅ MAIN COMPANY (avoid duplicate)
//                _db.UserCompanies.Add(new UserCompany
//                {
//                    Id = Guid.NewGuid(),
//                    UserId = user.Id,
//                    CompanyId = dto.CompanyId.Value
//                });

//                // ✅ ADDITIONAL COMPANIES (avoid duplicate main)
//                if (dto.AdditionalCompanyIds != null)
//                {
//                    foreach (var compId in dto.AdditionalCompanyIds)
//                    {
//                        if (compId != dto.CompanyId)   // avoid duplicate
//                        {
//                            _db.UserCompanies.Add(new UserCompany
//                            {
//                                Id = Guid.NewGuid(),
//                                UserId = user.Id,
//                                CompanyId = compId
//                            });
//                        }
//                    }
//                }

//                // ✅ DEPARTMENT (only if applicable for this company)
//                if (dto.DepartmentId.HasValue)
//                {
//                    _db.UserDepartments.Add(new UserDepartment
//                    {
//                        Id = Guid.NewGuid(),
//                        UserId = user.Id,
//                        DepartmentId = dto.DepartmentId.Value
//                    });
//                }

//                await _db.SaveChangesAsync();

//                return Ok("✅ User created successfully");
//            }


//            catch (Exception ex)
//            {
//                return BadRequest(new
//                {
//                    message = ex.Message,
//                    inner = ex.InnerException?.Message,
//                    stack = ex.StackTrace
//                });
//            }

//            //return BadRequest(ex.InnerException?.Message ?? ex.Message);  // SHOW REAL ERROR

//        }



//        // ✅ FIXED — was missing [Authorize], meaning any logged-in user could
//        // edit anyone else's account. Now admin-only, matching CreateUser.
//        [Authorize(Roles = "System Admin")]
//        [HttpPut("{id:guid}")]
//        public async Task<IActionResult> UpdateUser(Guid id, UpdateUserDto dto)
//        {
//            var user = await _db.Users.FindAsync(id);
//            if (user == null) return NotFound();

//            user.EmployeeCode = dto.EmployeeCode;
//            user.FullName = dto.FullName;
//            user.Email = dto.Email;
//            user.CompanyId = dto.CompanyId;
//            user.DepartmentId = dto.DepartmentId;
//            user.ManagerId = dto.ManagerId;
//            user.SubManagerId = dto.SubManagerId;
//            user.UpdatedAt = DateTime.UtcNow;

//            // ✅ NEW — optional password reset. Only touched if the admin
//            // actually typed a new value on the edit form; leaving it blank
//            // keeps the existing password untouched.
//            if (!string.IsNullOrWhiteSpace(dto.Password))
//            {
//                user.PasswordHash = dto.Password;
//            }

//            var role = await _db.Roles.FirstOrDefaultAsync(r => r.Name == dto.RoleName);
//            if (role != null)
//            {
//                _db.UserRoles.RemoveRange(_db.UserRoles.Where(ur => ur.UserId == id));
//                _db.UserRoles.Add(new UserRole { Id = Guid.NewGuid(), UserId = id, RoleId = role.Id });
//            }

//            _db.UserCompanies.RemoveRange(_db.UserCompanies.Where(uc => uc.UserId == id));
//            _db.UserCompanies.Add(new UserCompany { Id = Guid.NewGuid(), UserId = id, CompanyId = dto.CompanyId });
//            if (dto.AdditionalCompanyIds != null)
//            {
//                foreach (var compId in dto.AdditionalCompanyIds)
//                    if (compId != dto.CompanyId)
//                        _db.UserCompanies.Add(new UserCompany { Id = Guid.NewGuid(), UserId = id, CompanyId = compId });
//            }

//            await _db.SaveChangesAsync();
//            return Ok(new { success = true, message = "✅ Updated successfully" });
//        }

//        // ✅ FIXED — was missing [Authorize], admin-only now.
//        [Authorize(Roles = "System Admin")]
//        [HttpPut("{id:guid}/status")]
//        public async Task<IActionResult> ToggleStatus(Guid id)
//        {
//            var user = await _db.Users.FindAsync(id);
//            if (user == null) return NotFound();

//            user.IsActive = !user.IsActive;

//            await _db.SaveChangesAsync();

//            return Ok(new
//            {
//                message = user.IsActive ? "✅ Activated" : "❌ Deactivated"
//            });
//        }


//        // ✅ FIXED — was missing [Authorize], admin-only now.
//        [Authorize(Roles = "System Admin")]
//        [HttpDelete("{id:guid}")]
//        public async Task<IActionResult> DeleteUser(Guid id)
//        {
//            var user = await _db.Users.FindAsync(id);
//            if (user == null) return NotFound();

//            user.IsActive = false;

//            await _db.SaveChangesAsync();

//            return Ok("Deleted ✅");
//        }
//    }
//}
//////////////////////////////////sep 02
///
//using Microsoft.AspNetCore.Authorization;
//using Microsoft.AspNetCore.Mvc;
//using Microsoft.EntityFrameworkCore;
//using Procurement.Api.Data;
//using Procurement.Api.DTOs.Users;
//using Procurement.Api.Models;
//using System.Security.Claims;
//using System.Security.Cryptography;
//using System.Text;
//namespace Procurement.Api.Controllers.Users
//{
//    [ApiController]
//    [Route("api/users")]

//    public class UsersController : ControllerBase
//    {
//        private readonly AppDbContext _db;

//        public UsersController(AppDbContext db)
//        {
//            _db = db;
//        }




//        [HttpGet]
//        public async Task<IActionResult> GetUsers()
//        {
//            var users = await _db.Users
//                .Select(u => new
//                {
//                    u.Id,
//                    u.EmployeeCode,
//                    u.FullName,
//                    u.Email,
//                    u.IsActive,

//                    Company = _db.Companies
//                        .Where(c => c.Id == u.CompanyId)
//                        .Select(c => c.Name)
//                        .FirstOrDefault(),

//                    Department = _db.Departments
//                        .Where(d => d.Id == u.DepartmentId)
//                        .Select(d => d.Name)
//                        .FirstOrDefault(),

//                    Role = _db.UserRoles
//                        .Where(ur => ur.UserId == u.Id)
//                        .Join(_db.Roles,
//                              ur => ur.RoleId,
//                              r => r.Id,
//                              (ur, r) => r.Name)
//                        .FirstOrDefault(),

//                    Manager = _db.Users
//                        .Where(m => m.Id == u.ManagerId)
//                        .Select(m => m.FullName)
//                        .FirstOrDefault()
//                })
//                .ToListAsync();

//            return Ok(users);
//        }

//        [HttpGet("{id:guid}")]
//        public async Task<IActionResult> GetUser(Guid id)
//        {
//            var user = await _db.Users
//                .Where(u => u.Id == id)
//                .Select(u => new
//                {
//                    u.Id,
//                    u.EmployeeCode,
//                    u.FullName,
//                    u.Email,
//                    u.IsActive,
//                    u.CompanyId,
//                    u.DepartmentId,
//                    u.ManagerId,
//                    u.SubManagerId,
//                    RoleName = _db.UserRoles
//                        .Where(ur => ur.UserId == u.Id)
//                        .Join(_db.Roles, ur => ur.RoleId, r => r.Id, (ur, r) => r.Name)
//                        .FirstOrDefault(),
//                    ManagerName = _db.Users.Where(m => m.Id == u.ManagerId).Select(m => m.FullName).FirstOrDefault(),
//                    SubManagerName = _db.Users.Where(m => m.Id == u.SubManagerId).Select(m => m.FullName).FirstOrDefault(),
//                    AdditionalCompanyIds = _db.UserCompanies
//                        .Where(uc => uc.UserId == u.Id && uc.CompanyId != u.CompanyId)
//                        .Select(uc => uc.CompanyId).ToList()
//                })
//                .FirstOrDefaultAsync();

//            if (user == null) return NotFound();
//            return Ok(user);
//        }
//        // 3. CREATE USER

//        [Authorize(Roles = "System Admin")]
//        [HttpPost]
//        public async Task<IActionResult> CreateUser(CreateUserDto dto)
//        {
//            try
//            {
//                // ✅ VALIDATIONS
//                if (string.IsNullOrWhiteSpace(dto.EmployeeCode))
//                    return BadRequest("EmployeeCode is required ❌");

//                if (dto.CompanyId == null)
//                    return BadRequest("Company is required ❌");

//                // ✅ CHECK DUPLICATE EMP CODE
//                var exists = await _db.Users
//                    .AnyAsync(u => u.EmployeeCode == dto.EmployeeCode);

//                if (exists)
//                    return BadRequest("EmployeeCode already exists ❌");

//                // ✅ CHECK ROLE FIRST
//                var role = await _db.Roles
//                    .FirstOrDefaultAsync(r => r.Name == dto.RoleName);

//                if (role == null)
//                    return BadRequest("Invalid role ❌");

//                // NEW — password is no longer taken from the admin. A random
//                // password is generated here, stored the same way passwords
//                // are already stored elsewhere in this system (plain, not
//                // changed by this patch), and returned ONCE in the response
//                // body so the frontend can show it to the admin to copy and
//                // share with the new user. It is never stored or logged
//                // anywhere else.
//                var generatedPassword = GenerateRandomPassword();

//                // ✅ CREATE USER
//                var user = new AppUser
//                {
//                    Id = Guid.NewGuid(),
//                    EmployeeCode = dto.EmployeeCode,

//                    FullName = dto.FullName,
//                    Email = dto.Email,
//                    PasswordHash = generatedPassword,

//                    CompanyId = dto.CompanyId.Value,
//                    DepartmentId = dto.DepartmentId,

//                    ManagerId = dto.ManagerId,
//                    SubManagerId = dto.SubManagerId,

//                    IsActive = true,
//                    CreatedAt = DateTime.UtcNow
//                };

//                _db.Users.Add(user);

//                // ✅ USER ROLE
//                _db.UserRoles.Add(new UserRole
//                {
//                    Id = Guid.NewGuid(),
//                    UserId = user.Id,
//                    RoleId = role.Id
//                });

//                // ✅ MAIN COMPANY (avoid duplicate)
//                _db.UserCompanies.Add(new UserCompany
//                {
//                    Id = Guid.NewGuid(),
//                    UserId = user.Id,
//                    CompanyId = dto.CompanyId.Value
//                });

//                // ✅ ADDITIONAL COMPANIES (avoid duplicate main)
//                if (dto.AdditionalCompanyIds != null)
//                {
//                    foreach (var compId in dto.AdditionalCompanyIds)
//                    {
//                        if (compId != dto.CompanyId)   // avoid duplicate
//                        {
//                            _db.UserCompanies.Add(new UserCompany
//                            {
//                                Id = Guid.NewGuid(),
//                                UserId = user.Id,
//                                CompanyId = compId
//                            });
//                        }
//                    }
//                }

//                // ✅ DEPARTMENT (only if applicable for this company)
//                if (dto.DepartmentId.HasValue)
//                {
//                    _db.UserDepartments.Add(new UserDepartment
//                    {
//                        Id = Guid.NewGuid(),
//                        UserId = user.Id,
//                        DepartmentId = dto.DepartmentId.Value
//                    });
//                }

//                await _db.SaveChangesAsync();

//                // NEW — generatedPassword returned once here. Frontend shows
//                // it in a one-time copyable modal after successful creation.
//                return Ok(new
//                {
//                    success = true,
//                    message = "✅ User created successfully",
//                    generatedPassword
//                });
//            }


//            catch (Exception ex)
//            {
//                return BadRequest(new
//                {
//                    message = ex.Message,
//                    inner = ex.InnerException?.Message,
//                    stack = ex.StackTrace
//                });
//            }

//            //return BadRequest(ex.InnerException?.Message ?? ex.Message);  // SHOW REAL ERROR

//        }



//        // ✅ FIXED — was missing [Authorize], meaning any logged-in user could
//        // edit anyone else's account. Now admin-only, matching CreateUser.
//        [Authorize(Roles = "System Admin")]
//        [HttpPut("{id:guid}")]
//        public async Task<IActionResult> UpdateUser(Guid id, UpdateUserDto dto)
//        {
//            var user = await _db.Users.FindAsync(id);
//            if (user == null) return NotFound();

//            user.EmployeeCode = dto.EmployeeCode;
//            user.FullName = dto.FullName;
//            user.Email = dto.Email;
//            user.CompanyId = dto.CompanyId;
//            user.DepartmentId = dto.DepartmentId;
//            user.ManagerId = dto.ManagerId;
//            user.SubManagerId = dto.SubManagerId;
//            user.UpdatedAt = DateTime.UtcNow;

//            // ✅ NEW — optional password reset. Only touched if the admin
//            // actually typed a new value on the edit form; leaving it blank
//            // keeps the existing password untouched.
//            if (!string.IsNullOrWhiteSpace(dto.Password))
//            {
//                user.PasswordHash = dto.Password;
//            }

//            var role = await _db.Roles.FirstOrDefaultAsync(r => r.Name == dto.RoleName);
//            if (role != null)
//            {
//                _db.UserRoles.RemoveRange(_db.UserRoles.Where(ur => ur.UserId == id));
//                _db.UserRoles.Add(new UserRole { Id = Guid.NewGuid(), UserId = id, RoleId = role.Id });
//            }

//            _db.UserCompanies.RemoveRange(_db.UserCompanies.Where(uc => uc.UserId == id));
//            _db.UserCompanies.Add(new UserCompany { Id = Guid.NewGuid(), UserId = id, CompanyId = dto.CompanyId });
//            if (dto.AdditionalCompanyIds != null)
//            {
//                foreach (var compId in dto.AdditionalCompanyIds)
//                    if (compId != dto.CompanyId)
//                        _db.UserCompanies.Add(new UserCompany { Id = Guid.NewGuid(), UserId = id, CompanyId = compId });
//            }

//            await _db.SaveChangesAsync();
//            return Ok(new { success = true, message = "✅ Updated successfully" });
//        }

//        // ✅ FIXED — was missing [Authorize], admin-only now.
//        [Authorize(Roles = "System Admin")]
//        [HttpPut("{id:guid}/status")]
//        public async Task<IActionResult> ToggleStatus(Guid id)
//        {
//            var user = await _db.Users.FindAsync(id);
//            if (user == null) return NotFound();

//            user.IsActive = !user.IsActive;

//            await _db.SaveChangesAsync();

//            return Ok(new
//            {
//                message = user.IsActive ? "✅ Activated" : "❌ Deactivated"
//            });
//        }


//        // ✅ FIXED — was missing [Authorize], admin-only now.
//        [Authorize(Roles = "System Admin")]
//        [HttpDelete("{id:guid}")]
//        public async Task<IActionResult> DeleteUser(Guid id)
//        {
//            var user = await _db.Users.FindAsync(id);
//            if (user == null) return NotFound();

//            user.IsActive = false;

//            await _db.SaveChangesAsync();

//            return Ok("Deleted ✅");
//        }

//        // NEW — self-service Change Password. Any logged-in user can change
//        // their OWN password only (no [Roles] restriction — just requires a
//        // valid token). Verifies the current password using the exact same
//        // logic AuthController.Login uses (legacy 64-char SHA256 hash vs
//        // plain-text compare), so this works for both old and new accounts
//        // without touching the existing hashing/verification scheme. The
//        // new password is stored the same way CreateUser/UpdateUser already
//        // store it (plain), so nothing about existing login logic changes.
//        [Authorize]
//        [HttpPost("change-password")]
//        public async Task<IActionResult> ChangePassword(ChangePasswordDto dto)
//        {
//            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
//            if (!Guid.TryParse(userIdClaim, out var userId))
//                return Unauthorized(new { success = false, message = "Invalid token." });

//            if (string.IsNullOrWhiteSpace(dto.CurrentPassword) || string.IsNullOrWhiteSpace(dto.NewPassword))
//                return BadRequest(new { success = false, message = "Current and new password are required." });

//            if (dto.NewPassword.Length < 6)
//                return BadRequest(new { success = false, message = "New password must be at least 6 characters." });

//            var user = await _db.Users.FindAsync(userId);
//            if (user == null) return NotFound(new { success = false, message = "User not found." });

//            bool currentIsValid;
//            if (user.PasswordHash.Length == 64)
//            {
//                // legacy SHA256 accounts — same check as AuthController.Login
//                var hash = Procurement.Api.Services.PasswordService.Hash(dto.CurrentPassword);
//                currentIsValid = hash.Equals(user.PasswordHash, StringComparison.OrdinalIgnoreCase);
//            }
//            else
//            {
//                currentIsValid = user.PasswordHash == dto.CurrentPassword;
//            }

//            // TEMP DIAGNOSTIC — remove before production deploy. Does NOT
//            // expose either actual password value, only lengths/byte counts
//            // and a trimmed-comparison flag, to pinpoint whether the
//            // mismatch is whitespace, encoding, or a genuinely different
//            // value (e.g. wrong logged-in account).
//            if (!currentIsValid)
//                return BadRequest(new
//                {
//                    success = false,
//                    message = "Current password is incorrect.",
//                    debugLoggedInUserId = userId,
//                    debugLoggedInEmployeeCode = user.EmployeeCode,
//                    debugStoredLength = user.PasswordHash.Length,
//                    debugSubmittedLength = dto.CurrentPassword.Length,
//                    debugTrimmedMatch = user.PasswordHash.Trim() == dto.CurrentPassword.Trim(),
//                    debugStoredBytes = Encoding.UTF8.GetBytes(user.PasswordHash).Length,
//                    debugSubmittedBytes = Encoding.UTF8.GetBytes(dto.CurrentPassword).Length
//                });

//            if (dto.NewPassword == dto.CurrentPassword)
//                return BadRequest(new { success = false, message = "New password must be different from the current password." });

//            user.PasswordHash = dto.NewPassword;
//            user.UpdatedAt = DateTime.UtcNow;
//            await _db.SaveChangesAsync();

//            return Ok(new { success = true, message = "Password changed successfully." });
//        }

//        // NEW — cryptographically-random password generator used by
//        // CreateUser. Excludes visually-ambiguous characters (0/O, 1/l/I)
//        // and guarantees at least one uppercase, one lowercase, one digit,
//        // and one symbol.
//        private static string GenerateRandomPassword(int length = 12)
//        {
//            const string upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
//            const string lower = "abcdefghijkmnpqrstuvwxyz";
//            const string digits = "23456789";
//            const string symbols = "!@#$%*?";
//            const string all = upper + lower + digits + symbols;

//            var chars = new char[length];
//            for (int i = 0; i < length; i++)
//                chars[i] = all[RandomNumberGenerator.GetInt32(all.Length)];

//            // guarantee at least one of each category
//            chars[0] = upper[RandomNumberGenerator.GetInt32(upper.Length)];
//            chars[1] = lower[RandomNumberGenerator.GetInt32(lower.Length)];
//            chars[2] = digits[RandomNumberGenerator.GetInt32(digits.Length)];
//            chars[3] = symbols[RandomNumberGenerator.GetInt32(symbols.Length)];

//            return new string(chars);
//        }
//    }
//}
//using Microsoft.AspNetCore.Authorization;
//using Microsoft.AspNetCore.Mvc;
//using Microsoft.EntityFrameworkCore;
//using Procurement.Api.Data;
//using Procurement.Api.DTOs.Users;
//using Procurement.Api.Models;
//using System.Security.Claims;
//using System.Security.Cryptography;
//namespace Procurement.Api.Controllers.Users
//{
//    [ApiController]
//    [Route("api/users")]

//    public class UsersController : ControllerBase
//    {
//        private readonly AppDbContext _db;

//        public UsersController(AppDbContext db)
//        {
//            _db = db;
//        }




//        [HttpGet]
//        public async Task<IActionResult> GetUsers()
//        {
//            var users = await _db.Users
//                .Select(u => new
//                {
//                    u.Id,
//                    u.EmployeeCode,
//                    u.FullName,
//                    u.Email,
//                    u.IsActive,

//                    Company = _db.Companies
//                        .Where(c => c.Id == u.CompanyId)
//                        .Select(c => c.Name)
//                        .FirstOrDefault(),

//                    Department = _db.Departments
//                        .Where(d => d.Id == u.DepartmentId)
//                        .Select(d => d.Name)
//                        .FirstOrDefault(),

//                    Role = _db.UserRoles
//                        .Where(ur => ur.UserId == u.Id)
//                        .Join(_db.Roles,
//                              ur => ur.RoleId,
//                              r => r.Id,
//                              (ur, r) => r.Name)
//                        .FirstOrDefault(),

//                    Manager = _db.Users
//                        .Where(m => m.Id == u.ManagerId)
//                        .Select(m => m.FullName)
//                        .FirstOrDefault()
//                })
//                .ToListAsync();

//            return Ok(users);
//        }

//        [HttpGet("{id:guid}")]
//        public async Task<IActionResult> GetUser(Guid id)
//        {
//            var user = await _db.Users
//                .Where(u => u.Id == id)
//                .Select(u => new
//                {
//                    u.Id,
//                    u.EmployeeCode,
//                    u.FullName,
//                    u.Email,
//                    u.IsActive,
//                    u.CompanyId,
//                    u.DepartmentId,
//                    u.ManagerId,
//                    u.SubManagerId,
//                    RoleName = _db.UserRoles
//                        .Where(ur => ur.UserId == u.Id)
//                        .Join(_db.Roles, ur => ur.RoleId, r => r.Id, (ur, r) => r.Name)
//                        .FirstOrDefault(),
//                    ManagerName = _db.Users.Where(m => m.Id == u.ManagerId).Select(m => m.FullName).FirstOrDefault(),
//                    SubManagerName = _db.Users.Where(m => m.Id == u.SubManagerId).Select(m => m.FullName).FirstOrDefault(),
//                    AdditionalCompanyIds = _db.UserCompanies
//                        .Where(uc => uc.UserId == u.Id && uc.CompanyId != u.CompanyId)
//                        .Select(uc => uc.CompanyId).ToList()
//                })
//                .FirstOrDefaultAsync();

//            if (user == null) return NotFound();
//            return Ok(user);
//        }
//        // 3. CREATE USER

//        [Authorize(Roles = "System Admin")]
//        [HttpPost]
//        public async Task<IActionResult> CreateUser(CreateUserDto dto)
//        {
//            try
//            {
//                // ✅ VALIDATIONS
//                if (string.IsNullOrWhiteSpace(dto.EmployeeCode))
//                    return BadRequest("EmployeeCode is required ❌");

//                if (dto.CompanyId == null)
//                    return BadRequest("Company is required ❌");

//                // ✅ CHECK DUPLICATE EMP CODE
//                var exists = await _db.Users
//                    .AnyAsync(u => u.EmployeeCode == dto.EmployeeCode);

//                if (exists)
//                    return BadRequest("EmployeeCode already exists ❌");

//                // ✅ CHECK ROLE FIRST
//                var role = await _db.Roles
//                    .FirstOrDefaultAsync(r => r.Name == dto.RoleName);

//                if (role == null)
//                    return BadRequest("Invalid role ❌");

//                // NEW — password is no longer taken from the admin. A random
//                // password is generated here, stored the same way passwords
//                // are already stored elsewhere in this system (plain, not
//                // changed by this patch), and returned ONCE in the response
//                // body so the frontend can show it to the admin to copy and
//                // share with the new user. It is never stored or logged
//                // anywhere else.
//                var generatedPassword = GenerateRandomPassword();

//                // ✅ CREATE USER
//                var user = new AppUser
//                {
//                    Id = Guid.NewGuid(),
//                    EmployeeCode = dto.EmployeeCode,

//                    FullName = dto.FullName,
//                    Email = dto.Email,
//                    PasswordHash = generatedPassword,

//                    CompanyId = dto.CompanyId.Value,
//                    DepartmentId = dto.DepartmentId,

//                    ManagerId = dto.ManagerId,
//                    SubManagerId = dto.SubManagerId,

//                    IsActive = true,
//                    CreatedAt = DateTime.UtcNow
//                };

//                _db.Users.Add(user);

//                // ✅ USER ROLE
//                _db.UserRoles.Add(new UserRole
//                {
//                    Id = Guid.NewGuid(),
//                    UserId = user.Id,
//                    RoleId = role.Id
//                });

//                // ✅ MAIN COMPANY (avoid duplicate)
//                _db.UserCompanies.Add(new UserCompany
//                {
//                    Id = Guid.NewGuid(),
//                    UserId = user.Id,
//                    CompanyId = dto.CompanyId.Value
//                });

//                // ✅ ADDITIONAL COMPANIES (avoid duplicate main)
//                if (dto.AdditionalCompanyIds != null)
//                {
//                    foreach (var compId in dto.AdditionalCompanyIds)
//                    {
//                        if (compId != dto.CompanyId)   // avoid duplicate
//                        {
//                            _db.UserCompanies.Add(new UserCompany
//                            {
//                                Id = Guid.NewGuid(),
//                                UserId = user.Id,
//                                CompanyId = compId
//                            });
//                        }
//                    }
//                }

//                // ✅ DEPARTMENT (only if applicable for this company)
//                if (dto.DepartmentId.HasValue)
//                {
//                    _db.UserDepartments.Add(new UserDepartment
//                    {
//                        Id = Guid.NewGuid(),
//                        UserId = user.Id,
//                        DepartmentId = dto.DepartmentId.Value
//                    });
//                }

//                await _db.SaveChangesAsync();

//                // NEW — generatedPassword returned once here. Frontend shows
//                // it in a one-time copyable modal after successful creation.
//                return Ok(new
//                {
//                    success = true,
//                    message = "✅ User created successfully",
//                    generatedPassword
//                });
//            }


//            catch (Exception ex)
//            {
//                return BadRequest(new
//                {
//                    message = ex.Message,
//                    inner = ex.InnerException?.Message,
//                    stack = ex.StackTrace
//                });
//            }

//            //return BadRequest(ex.InnerException?.Message ?? ex.Message);  // SHOW REAL ERROR

//        }



//        // ✅ FIXED — was missing [Authorize], meaning any logged-in user could
//        // edit anyone else's account. Now admin-only, matching CreateUser.
//        [Authorize(Roles = "System Admin")]
//        [HttpPut("{id:guid}")]
//        public async Task<IActionResult> UpdateUser(Guid id, UpdateUserDto dto)
//        {
//            var user = await _db.Users.FindAsync(id);
//            if (user == null) return NotFound();

//            user.EmployeeCode = dto.EmployeeCode;
//            user.FullName = dto.FullName;
//            user.Email = dto.Email;
//            user.CompanyId = dto.CompanyId;
//            user.DepartmentId = dto.DepartmentId;
//            user.ManagerId = dto.ManagerId;
//            user.SubManagerId = dto.SubManagerId;
//            user.UpdatedAt = DateTime.UtcNow;

//            // ✅ NEW — optional password reset. Only touched if the admin
//            // actually typed a new value on the edit form; leaving it blank
//            // keeps the existing password untouched.
//            if (!string.IsNullOrWhiteSpace(dto.Password))
//            {
//                user.PasswordHash = dto.Password;
//            }

//            var role = await _db.Roles.FirstOrDefaultAsync(r => r.Name == dto.RoleName);
//            if (role != null)
//            {
//                _db.UserRoles.RemoveRange(_db.UserRoles.Where(ur => ur.UserId == id));
//                _db.UserRoles.Add(new UserRole { Id = Guid.NewGuid(), UserId = id, RoleId = role.Id });
//            }

//            _db.UserCompanies.RemoveRange(_db.UserCompanies.Where(uc => uc.UserId == id));
//            _db.UserCompanies.Add(new UserCompany { Id = Guid.NewGuid(), UserId = id, CompanyId = dto.CompanyId });
//            if (dto.AdditionalCompanyIds != null)
//            {
//                foreach (var compId in dto.AdditionalCompanyIds)
//                    if (compId != dto.CompanyId)
//                        _db.UserCompanies.Add(new UserCompany { Id = Guid.NewGuid(), UserId = id, CompanyId = compId });
//            }

//            await _db.SaveChangesAsync();
//            return Ok(new { success = true, message = "✅ Updated successfully" });
//        }

//        // ✅ FIXED — was missing [Authorize], admin-only now.
//        [Authorize(Roles = "System Admin")]
//        [HttpPut("{id:guid}/status")]
//        public async Task<IActionResult> ToggleStatus(Guid id)
//        {
//            var user = await _db.Users.FindAsync(id);
//            if (user == null) return NotFound();

//            user.IsActive = !user.IsActive;

//            await _db.SaveChangesAsync();

//            return Ok(new
//            {
//                message = user.IsActive ? "✅ Activated" : "❌ Deactivated"
//            });
//        }


//        // ✅ FIXED — was missing [Authorize], admin-only now.
//        [Authorize(Roles = "System Admin")]
//        [HttpDelete("{id:guid}")]
//        public async Task<IActionResult> DeleteUser(Guid id)
//        {
//            var user = await _db.Users.FindAsync(id);
//            if (user == null) return NotFound();

//            user.IsActive = false;

//            await _db.SaveChangesAsync();

//            return Ok("Deleted ✅");
//        }

//        // NEW — self-service Change Password. Any logged-in user can change
//        // their OWN password only (no [Roles] restriction — just requires a
//        // valid token). Verifies the current password using the exact same
//        // logic AuthController.Login uses (legacy 64-char SHA256 hash vs
//        // plain-text compare), so this works for both old and new accounts
//        // without touching the existing hashing/verification scheme. The
//        // new password is stored the same way CreateUser/UpdateUser already
//        // store it (plain), so nothing about existing login logic changes.
//        [Authorize]
//        [HttpPost("change-password")]
//        public async Task<IActionResult> ChangePassword(ChangePasswordDto dto)
//        {
//            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
//            if (!Guid.TryParse(userIdClaim, out var userId))
//                return Unauthorized(new { success = false, message = "Invalid token." });

//            if (string.IsNullOrWhiteSpace(dto.CurrentPassword) || string.IsNullOrWhiteSpace(dto.NewPassword))
//                return BadRequest(new { success = false, message = "Current and new password are required." });

//            if (dto.NewPassword.Length < 6)
//                return BadRequest(new { success = false, message = "New password must be at least 6 characters." });

//            var user = await _db.Users.FindAsync(userId);
//            if (user == null) return NotFound(new { success = false, message = "User not found." });

//            bool currentIsValid;
//            if (user.PasswordHash.Length == 64)
//            {
//                // legacy SHA256 accounts — same check as AuthController.Login
//                var hash = Procurement.Api.Services.PasswordService.Hash(dto.CurrentPassword);
//                currentIsValid = hash.Equals(user.PasswordHash, StringComparison.OrdinalIgnoreCase);
//            }
//            else
//            {
//                currentIsValid = user.PasswordHash == dto.CurrentPassword;
//            }

//            if (!currentIsValid)
//                return BadRequest(new { success = false, message = "Current password is incorrect." });

//            if (dto.NewPassword == dto.CurrentPassword)
//                return BadRequest(new { success = false, message = "New password must be different from the current password." });

//            user.PasswordHash = dto.NewPassword;
//            user.UpdatedAt = DateTime.UtcNow;
//            await _db.SaveChangesAsync();

//            return Ok(new { success = true, message = "Password changed successfully." });
//        }

//        // NEW — cryptographically-random password generator used by
//        // CreateUser. Excludes visually-ambiguous characters (0/O, 1/l/I)
//        // and guarantees at least one uppercase, one lowercase, one digit,
//        // and one symbol.
//        private static string GenerateRandomPassword(int length = 12)
//        {
//            const string upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
//            const string lower = "abcdefghijkmnpqrstuvwxyz";
//            const string digits = "23456789";
//            const string symbols = "!@#$%*?";
//            const string all = upper + lower + digits + symbols;

//            var chars = new char[length];
//            for (int i = 0; i < length; i++)
//                chars[i] = all[RandomNumberGenerator.GetInt32(all.Length)];

//            // guarantee at least one of each category
//            chars[0] = upper[RandomNumberGenerator.GetInt32(upper.Length)];
//            chars[1] = lower[RandomNumberGenerator.GetInt32(lower.Length)];
//            chars[2] = digits[RandomNumberGenerator.GetInt32(digits.Length)];
//            chars[3] = symbols[RandomNumberGenerator.GetInt32(symbols.Length)];

//            return new string(chars);
//        }
//    }
//}

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Procurement.Api.Data;
using Procurement.Api.DTOs.Users;
using Procurement.Api.Models;
using System.Security.Claims;
using System.Security.Cryptography;
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

                // NEW — password is no longer taken from the admin. A random
                // password is generated here, stored the same way passwords
                // are already stored elsewhere in this system (plain, not
                // changed by this patch), and returned ONCE in the response
                // body so the frontend can show it to the admin to copy and
                // share with the new user. It is never stored or logged
                // anywhere else.
                var generatedPassword = GenerateRandomPassword();

                // ✅ CREATE USER
                var user = new AppUser
                {
                    Id = Guid.NewGuid(),
                    EmployeeCode = dto.EmployeeCode,

                    FullName = dto.FullName,
                    Email = dto.Email,
                    PasswordHash = generatedPassword,
                    // HasChangedPassword defaults to false — new user has
                    // not yet used their one-time self-change allowance.

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

                // NEW — generatedPassword returned once here. Frontend shows
                // it in a one-time copyable modal after successful creation.
                return Ok(new
                {
                    success = true,
                    message = "✅ User created successfully",
                    generatedPassword
                });
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



        // ✅ FIXED — was missing [Authorize], meaning any logged-in user could
        // edit anyone else's account. Now admin-only, matching CreateUser.
        [Authorize(Roles = "System Admin")]
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

            // ✅ NEW — optional password reset. Only touched if the admin
            // actually typed a new value on the edit form; leaving it blank
            // keeps the existing password untouched.
            if (!string.IsNullOrWhiteSpace(dto.Password))
            {
                user.PasswordHash = dto.Password;

                // NEW — an admin manually resetting the password "unlocks"
                // the user's one-time self-change allowance again, so they
                // can use Change Password once more after this reset.
                user.HasChangedPassword = false;
            }

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

        // ✅ FIXED — was missing [Authorize], admin-only now.
        [Authorize(Roles = "System Admin")]
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


        // ✅ FIXED — was missing [Authorize], admin-only now.
        [Authorize(Roles = "System Admin")]
        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> DeleteUser(Guid id)
        {
            var user = await _db.Users.FindAsync(id);
            if (user == null) return NotFound();

            user.IsActive = false;

            await _db.SaveChangesAsync();

            return Ok("Deleted ✅");
        }

        // NEW — self-service Change Password. Any logged-in user can change
        // their OWN password (no [Roles] restriction — just requires a
        // valid token). Verifies the current password using the exact same
        // logic AuthController.Login uses (legacy 64-char SHA256 hash vs
        // plain-text compare), so this works for both old and new accounts
        // without touching the existing hashing/verification scheme.
        //
        // NEW — ONE-TIME LIMIT: every role except System Admin may only use
        // this endpoint once (tracked via AppUser.HasChangedPassword). After
        // that, they must contact an admin, who resets it via Edit User —
        // which also flips HasChangedPassword back to false, granting one
        // more self-change. System Admin is fully exempt from this limit.
        [Authorize]
        [HttpPost("change-password")]
        public async Task<IActionResult> ChangePassword(ChangePasswordDto dto)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!Guid.TryParse(userIdClaim, out var userId))
                return Unauthorized(new { success = false, message = "Invalid token." });

            if (string.IsNullOrWhiteSpace(dto.CurrentPassword) || string.IsNullOrWhiteSpace(dto.NewPassword))
                return BadRequest(new { success = false, message = "Current and new password are required." });

            if (dto.NewPassword.Length < 6)
                return BadRequest(new { success = false, message = "New password must be at least 6 characters." });

            var user = await _db.Users.FindAsync(userId);
            if (user == null) return NotFound(new { success = false, message = "User not found." });

            // NEW — enforce the one-time limit for everyone except System Admin.
            var userRoles = await _db.UserRoles
                .Where(ur => ur.UserId == userId)
                .Join(_db.Roles, ur => ur.RoleId, r => r.Id, (ur, r) => r.Name)
                .ToListAsync();
            var isSystemAdmin = userRoles.Contains("System Admin");

            if (!isSystemAdmin && user.HasChangedPassword)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "You have already changed your password once. Please contact your administrator to reset it."
                });
            }

            bool currentIsValid;
            if (user.PasswordHash.Length == 64)
            {
                // legacy SHA256 accounts — same check as AuthController.Login
                var hash = Procurement.Api.Services.PasswordService.Hash(dto.CurrentPassword);
                currentIsValid = hash.Equals(user.PasswordHash, StringComparison.OrdinalIgnoreCase);
            }
            else
            {
                currentIsValid = user.PasswordHash == dto.CurrentPassword;
            }

            if (!currentIsValid)
                return BadRequest(new { success = false, message = "Current password is incorrect." });

            if (dto.NewPassword == dto.CurrentPassword)
                return BadRequest(new { success = false, message = "New password must be different from the current password." });

            user.PasswordHash = dto.NewPassword;
            user.HasChangedPassword = true;   // NEW — consumes the one-time allowance (no-op in effect for System Admin, who is exempt from the check above)
            user.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            return Ok(new { success = true, message = "Password changed successfully." });
        }

        // NEW — cryptographically-random password generator used by
        // CreateUser. Excludes visually-ambiguous characters (0/O, 1/l/I)
        // and guarantees at least one uppercase, one lowercase, one digit,
        // and one symbol.
        private static string GenerateRandomPassword(int length = 12)
        {
            const string upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
            const string lower = "abcdefghijkmnpqrstuvwxyz";
            const string digits = "23456789";
            const string symbols = "!@#$%*?";
            const string all = upper + lower + digits + symbols;

            var chars = new char[length];
            for (int i = 0; i < length; i++)
                chars[i] = all[RandomNumberGenerator.GetInt32(all.Length)];

            // guarantee at least one of each category
            chars[0] = upper[RandomNumberGenerator.GetInt32(upper.Length)];
            chars[1] = lower[RandomNumberGenerator.GetInt32(lower.Length)];
            chars[2] = digits[RandomNumberGenerator.GetInt32(digits.Length)];
            chars[3] = symbols[RandomNumberGenerator.GetInt32(symbols.Length)];

            return new string(chars);
        }
    }
}