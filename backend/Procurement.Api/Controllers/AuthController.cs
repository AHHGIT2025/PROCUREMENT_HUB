using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Procurement.Api.Data;
using Procurement.Api.Models;
using Procurement.Api.Services;
namespace Procurement.Api.Controllers;

[ApiController, Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _db; private readonly TokenService _tokens;
    public AuthController(AppDbContext db, TokenService tokens) { _db = db; _tokens = tokens; }
   

    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginRequest request)
    {
        var user = await _db.Users
            .FirstOrDefaultAsync(x => x.Email == request.Email);

        if (user == null)
            return Unauthorized(new { message = "Invalid email or password" });

        bool isValid = false;

        // ✅ OLD USERS (SHA256)
        if (user.PasswordHash.Length == 64)
        {
            var hash = PasswordService.Hash(request.Password);
            isValid = hash.Equals(user.PasswordHash, StringComparison.OrdinalIgnoreCase);
        }
        else
        {
            // ✅ NEW USERS (PLAIN)
            isValid = user.PasswordHash == request.Password;
        }

        if (!isValid)
            return Unauthorized(new { message = "Invalid email or password" });

        // FIXED — deactivated (IsActive = false) users could still log in and
        // receive a valid token, since this check was completely missing. Now
        // blocked immediately after password validation.
        if (!user.IsActive)
            return Unauthorized(new { message = "This account has been deactivated. Please contact your administrator." });

     
        var roleIds = await _db.UserRoles
            .Where(x => x.UserId == user.Id)
            .Select(x => x.RoleId)
            .ToListAsync();

        var roles = await _db.Roles
            .Where(x => roleIds.Contains(x.Id))
            .Select(x => x.Name)
            .ToListAsync();

        return Ok(new
        {
            token = _tokens.CreateToken(user, roles),
            user = new
            {
                user.Id,
                user.FullName,
                user.Email,
                Roles = roles
            }
        });
    }

}

