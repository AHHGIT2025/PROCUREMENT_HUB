using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Procurement.Api.Data;
using Procurement.Api.Models;
using Procurement.Api.Services.Storage;

namespace Procurement.Api.Controllers.Organization
{
    [ApiController]
    [Route("api/companies")]
    public class CompaniesController : CrudController<Company>
    {
        private readonly AppDbContext _context;
        private readonly IFileStorageService _storage; // ✅ NEW

        public CompaniesController(AppDbContext db, IFileStorageService storage) : base(db)
        {
            _context = db;
            _storage = storage; // ✅ NEW
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

        // ✅ NEW — POST /api/companies/{id}/logo  (multipart/form-data: file)
        // Uploads a company logo image, saves it via the existing file storage
        // service (same one used for material request attachments, just a
        // different category folder), and stores the resulting URL on
        // Companies.LogoUrl. Reports (e.g. MR Print Report) read this field
        // to display the company's branding.
        [Authorize]
        [HttpPost("{id:guid}/logo")]
        [RequestSizeLimit(5_000_000)] // 5 MB — logos should stay small
        public async Task<IActionResult> UploadLogo(Guid id, IFormFile file)
        {
            var company = await _context.Companies.FindAsync(id);
            if (company == null)
                return NotFound(new { success = false, message = "Company not found." });

            if (file == null || file.Length == 0)
                return BadRequest(new { success = false, message = "No file uploaded." });

            var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".webp" };
            var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (!allowedExtensions.Contains(ext))
                return BadRequest(new
                {
                    success = false,
                    message = $"Logo must be an image file ({string.Join(", ", allowedExtensions)})."
                });

            using var stream = file.OpenReadStream();
            var storageKey = await _storage.SaveAsync(stream, file.FileName, id, "company-logos");

            company.LogoUrl = $"/api/attachments/file/{storageKey}";
            company.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(new
            {
                success = true,
                message = "Logo uploaded successfully.",
                logoUrl = company.LogoUrl
            });
        }
    }
}


//using Microsoft.AspNetCore.Mvc;
//using Microsoft.EntityFrameworkCore;
//using Procurement.Api.Data;
//using Procurement.Api.Models;

//namespace Procurement.Api.Controllers.Organization
//{
//    [ApiController]
//    [Route("api/companies")]
//    public class CompaniesController : CrudController<Company>
//    {
//        private readonly AppDbContext _context;

//        public CompaniesController(AppDbContext db) : base(db)
//        {
//            _context = db;
//        }
//        // ✅ GET COMPANIES BY USER
//        [HttpGet("user/{userId}")]
//        public async Task<IActionResult> GetUserCompanies(Guid userId)
//        {
//            // System Admin → ALL active companies
//            var isAdmin = await _context.UserRoles
//                .Where(ur => ur.UserId == userId)
//                .Join(_context.Roles, ur => ur.RoleId, r => r.Id, (ur, r) => r.Name)
//                .AnyAsync(name => name == "System Admin");

//            if (isAdmin)
//            {
//                var allCompanies = await _context.Companies
//                    .Where(c => c.IsActive)
//                    .Select(c => new { c.Id, c.Name, c.Code })
//                    .ToListAsync();

//                return Ok(allCompanies);
//            }

//            // Regular user → only their accessible companies
//            var companies = await _context.UserCompanies
//                .Where(x => x.UserId == userId)
//                .Join(
//                    _context.Companies,
//                    uc => uc.CompanyId,
//                    c => c.Id,
//                    (uc, c) => new { c.Id, c.Name, c.Code })
//                .ToListAsync();

//            return Ok(companies);
//        }
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
     