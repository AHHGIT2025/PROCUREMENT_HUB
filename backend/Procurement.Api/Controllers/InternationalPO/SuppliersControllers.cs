// ===== FILE: SuppliersController.cs =====
// Place under: Controllers/InternationalPO/SuppliersController.cs

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Procurement.Api.Common;
using Procurement.Api.Data;
using Procurement.Api.DTOs.InternationalPO;
using Procurement.Api.Models.InternationalPO;
using System.Security.Claims;

namespace Procurement.Api.Controllers.InternationalPO
{
    [Authorize]
    [ApiController]
    [Route("api/suppliers")]
    public class SuppliersController : ControllerBase
    {
        private readonly AppDbContext _db;

        public SuppliersController(AppDbContext db)
        {
            _db = db;
        }

        // GET /api/suppliers — all active suppliers
        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] Guid? companyId, [FromQuery] string? search, [FromQuery] int top = 100)
        {
            var query = _db.Suppliers.Where(s => s.IsActive);

            if (companyId.HasValue)
                query = query.Where(s => s.CompanyId == companyId.Value);
            // ✅ CHANGED: strict company filter — selecting a company now
            // shows ONLY suppliers explicitly assigned to it. Unassigned
            // suppliers (CompanyId == null) no longer show up under every
            // company's filter, since that was confusing in the UI (looked
            // like suppliers belonged to a company they didn't).

            if (!string.IsNullOrWhiteSpace(search))
                query = query.Where(s => s.Name.Contains(search) || s.SupplierCode.Contains(search));

            var cappedTop = top <= 0 || top > 500 ? 100 : top;

            var companyIds = await query.Where(s => s.CompanyId != null)
                .Select(s => s.CompanyId!.Value).Distinct().ToListAsync();

            var companyNames = await _db.Companies
                .Where(c => companyIds.Contains(c.Id))
                .ToDictionaryAsync(c => c.Id, c => c.Name);

            var suppliers = await query.OrderBy(s => s.Name).Take(cappedTop).ToListAsync();

            var data = suppliers.Select(s => new SupplierDto
            {
                Id = s.Id,
                SupplierCode = s.SupplierCode,
                Name = s.Name,
                Country = s.Country,
                Address = s.Address,
                ContactPerson = s.ContactPerson,
                Landline = s.Landline,
                Email = s.Email,
                Mobile = s.Mobile,
                DefaultCurrency = s.DefaultCurrency,
                BankAccountName = s.BankAccountName,
                BankAddress = s.BankAddress,
                BankName = s.BankName,
                Iban = s.Iban,
                SourceType = s.SourceType,
                Rating = s.Rating,
                CompanyId = s.CompanyId,
                CompanyName = s.CompanyId.HasValue ? companyNames.GetValueOrDefault(s.CompanyId.Value) : null,
                IsActive = s.IsActive
            }).ToList();

            return Ok(ApiResponse<List<SupplierDto>>.Ok(data));
        }

        // GET /api/suppliers/{id}
        [HttpGet("{id:guid}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var s = await _db.Suppliers.FindAsync(id);
            if (s == null)
                return NotFound(ApiResponse<object>.Fail("Supplier not found."));

            // ── FIX: CompanyId/CompanyName were missing here even though
            // GetAll() already returned them — the Edit panel (which loads
            // via this endpoint) had no company data to show or pre-fill.
            var companyName = s.CompanyId.HasValue
                ? await _db.Companies.Where(c => c.Id == s.CompanyId.Value).Select(c => c.Name).FirstOrDefaultAsync()
                : null;

            var dto = new SupplierDto
            {
                Id = s.Id,
                SupplierCode = s.SupplierCode,
                Name = s.Name,
                Country = s.Country,
                Address = s.Address,
                ContactPerson = s.ContactPerson,
                Landline = s.Landline,
                Email = s.Email,
                Mobile = s.Mobile,
                DefaultCurrency = s.DefaultCurrency,
                BankAccountName = s.BankAccountName,
                BankAddress = s.BankAddress,
                BankName = s.BankName,
                Iban = s.Iban,
                SourceType = s.SourceType,
                IsActive = s.IsActive,
                Rating = s.Rating,
                CompanyId = s.CompanyId,
                CompanyName = companyName,
            };

            return Ok(ApiResponse<SupplierDto>.Ok(dto));
        }

        // POST /api/suppliers — manual entry (Oracle sync will populate SourceType=ORACLE_* separately)
        [HttpPost]
        public async Task<IActionResult> Create(CreateSupplierDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.SupplierCode))
                return BadRequest(ApiResponse<object>.Fail("Supplier code is required."));

            if (string.IsNullOrWhiteSpace(dto.Name))
                return BadRequest(ApiResponse<object>.Fail("Supplier name is required."));

            var exists = await _db.Suppliers.AnyAsync(s => s.SupplierCode == dto.SupplierCode && s.IsActive);
            if (exists)
                return BadRequest(ApiResponse<object>.Fail("A supplier with this code already exists."));

            var supplier = new Supplier
            {
                Id = Guid.NewGuid(),
                SupplierCode = dto.SupplierCode,
                Name = dto.Name,
                Country = dto.Country,
                Address = dto.Address,
                ContactPerson = dto.ContactPerson,
                Landline = dto.Landline,
                Email = dto.Email,
                Mobile = dto.Mobile,
                DefaultCurrency = dto.DefaultCurrency,
                BankAccountName = dto.BankAccountName,
                BankAddress = dto.BankAddress,
                BankName = dto.BankName,
                Iban = dto.Iban,
                CompanyId = dto.CompanyId,   // ← NEW — optional, null means "not tied to a specific company"
                SourceType = "MANUAL",
                CreatedAt = DateTime.UtcNow,
                IsActive = true
            };

            _db.Suppliers.Add(supplier);
            await _db.SaveChangesAsync();

            return Ok(ApiResponse<object>.Ok(new { supplier.Id }, "Supplier created."));
        }

        // PUT /api/suppliers/{id}
        [HttpPut("{id:guid}")]
        public async Task<IActionResult> Update(Guid id, CreateSupplierDto dto)
        {
            var supplier = await _db.Suppliers.FindAsync(id);
            if (supplier == null)
                return NotFound(ApiResponse<object>.Fail("Supplier not found."));

            supplier.Name = dto.Name;
            supplier.Country = dto.Country;
            supplier.Address = dto.Address;
            supplier.ContactPerson = dto.ContactPerson;
            supplier.Landline = dto.Landline;
            supplier.Email = dto.Email;
            supplier.Mobile = dto.Mobile;
            supplier.DefaultCurrency = dto.DefaultCurrency;
            supplier.BankAccountName = dto.BankAccountName;
            supplier.BankAddress = dto.BankAddress;
            supplier.BankName = dto.BankName;
            supplier.Iban = dto.Iban;
            supplier.CompanyId = dto.CompanyId;   // ← NEW — lets admin assign/reassign/clear the company later
            supplier.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();
            return Ok(ApiResponse<object>.Ok(null, "Supplier updated."));
        }

        // DELETE /api/suppliers/{id} — soft delete
        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var supplier = await _db.Suppliers.FindAsync(id);
            if (supplier == null)
                return NotFound(ApiResponse<object>.Fail("Supplier not found."));

            supplier.IsActive = false;
            supplier.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            return Ok(ApiResponse<object>.Ok(null, "Supplier deactivated."));
        }

        // PUT /api/suppliers/{id}/rating
        [HttpPut("{id:guid}/rating")]
        public async Task<IActionResult> UpdateRating(Guid id, UpdateSupplierRatingDto dto)
        {
            var supplier = await _db.Suppliers.FindAsync(id);
            if (supplier == null)
                return NotFound(ApiResponse<object>.Fail("Supplier not found."));

            if (dto.Rating < 1 || dto.Rating > 5)
                return BadRequest(ApiResponse<object>.Fail("Rating must be between 1 and 5."));

            supplier.Rating = dto.Rating;
            supplier.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            return Ok(ApiResponse<object>.Ok(new { supplier.Rating }, "Rating updated."));
        }

        // GET /api/suppliers/{id}/documents
        [HttpGet("{id:guid}/documents")]
        public async Task<IActionResult> GetDocuments(Guid id)
        {
            var docs = await _db.SupplierDocuments
                .Where(d => d.SupplierId == id && d.IsActive)
                .OrderByDescending(d => d.CreatedAt)
                .Select(d => new SupplierDocumentDto
                {
                    Id = d.Id,
                    DocumentType = d.DocumentType,
                    FileName = d.FileName,
                    StorageKey = d.StorageKey,
                    FileUrl = $"/api/attachments/file/{d.StorageKey}",
                    Notes = d.Notes,
                    UploadedByName = d.UploadedByName,
                    CreatedAt = d.CreatedAt
                })
                .ToListAsync();

            return Ok(ApiResponse<List<SupplierDocumentDto>>.Ok(docs));
        }

        // POST /api/suppliers/{id}/documents
        [HttpPost("{id:guid}/documents")]
        public async Task<IActionResult> AddDocument(Guid id, AddSupplierDocumentDto dto)
        {
            var supplier = await _db.Suppliers.FindAsync(id);
            if (supplier == null)
                return NotFound(ApiResponse<object>.Fail("Supplier not found."));

            if (string.IsNullOrWhiteSpace(dto.StorageKey))
                return BadRequest(ApiResponse<object>.Fail("File must be uploaded first."));

            var userName = User.FindFirst(ClaimTypes.Name)?.Value
    ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            var doc = new SupplierDocument
            {
                Id = Guid.NewGuid(),
                SupplierId = id,
                DocumentType = dto.DocumentType,
                FileName = dto.FileName,
                StorageKey = dto.StorageKey,
                Notes = dto.Notes,
                UploadedByName = userName,
                CreatedAt = DateTime.UtcNow,
                IsActive = true
            };

            _db.SupplierDocuments.Add(doc);
            await _db.SaveChangesAsync();

            return Ok(ApiResponse<object>.Ok(new { doc.Id }, "Document attached."));
        }

        // DELETE /api/suppliers/documents/{docId}
        [HttpDelete("documents/{docId:guid}")]
        public async Task<IActionResult> DeleteDocument(Guid docId)
        {
            var doc = await _db.SupplierDocuments.FindAsync(docId);
            if (doc == null)
                return NotFound(ApiResponse<object>.Fail("Document not found."));

            doc.IsActive = false;
            doc.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            return Ok(ApiResponse<object>.Ok(null, "Document removed."));
        }
    }
}