using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Procurement.Api.Common;
using Procurement.Api.Data;
using Procurement.Api.DTOs.Integration;
using Procurement.Api.Services.Integration;

namespace Procurement.Api.Controllers.Integration
{
    [Authorize]
    [ApiController]
    [Route("api/oracle-source-mappings")]
    public class OracleSourceMappingsController : ControllerBase
    {
        private readonly AppDbContext _db;

        public OracleSourceMappingsController(AppDbContext db)
        {
            _db = db;
        }

        // GET api/oracle-source-mappings?oracleSource=BrightOracle-HQ&activeOnly=true
        [HttpGet]
        public async Task<IActionResult> Get([FromQuery] string? oracleSource, [FromQuery] bool? activeOnly)
        {
            var query = _db.OracleSourceMappings.AsQueryable();

            if (!string.IsNullOrWhiteSpace(oracleSource))
            {
                var src = oracleSource.Trim();
                query = query.Where(m => m.OracleSource == src);
            }

            if (activeOnly == true)
            {
                query = query.Where(m => m.IsActive);
            }

            var data = await query
                .Join(_db.Companies, m => m.CompanyId, c => c.Id, (m, c) => new OracleSourceMappingDto
                {
                    Id = m.Id,
                    OracleSource = m.OracleSource,
                    BranchId = m.BranchId,
                    CompanyId = m.CompanyId,
                    EntityType = m.EntityType,
                    CompanyCode = c.Code,
                    CompanyName = c.Name,
                    EffectiveFrom = m.EffectiveFrom,
                    EffectiveTo = m.EffectiveTo,
                    Notes = m.Notes,
                    IsActive = m.IsActive,
                    IsCurrent = m.EffectiveTo == null && m.IsActive,
                    CreatedAt = m.CreatedAt,
                    UpdatedAt = m.UpdatedAt
                })
                .OrderBy(d => d.OracleSource)
                .ThenBy(d => d.BranchId)
                .ThenByDescending(d => d.EffectiveFrom)
                .ToListAsync();

            return Ok(ApiResponse<List<OracleSourceMappingDto>>.Ok(data));
        }

        // GET api/oracle-source-mappings/current
        // Exactly the rows ErpSyncOrchestrator.ResolveCompanyAsync will pick up right now.
        [HttpGet("current")]
        public async Task<IActionResult> GetCurrent()
        {
            var data = await _db.OracleSourceMappings
                .Where(m => m.EffectiveTo == null && m.IsActive)
                .Join(_db.Companies, m => m.CompanyId, c => c.Id, (m, c) => new OracleSourceMappingDto
                {
                    Id = m.Id,
                    OracleSource = m.OracleSource,
                    BranchId = m.BranchId,
                    CompanyId = m.CompanyId,
                    EntityType = m.EntityType,
                    CompanyCode = c.Code,
                    CompanyName = c.Name,
                    EffectiveFrom = m.EffectiveFrom,
                    EffectiveTo = m.EffectiveTo,
                    Notes = m.Notes,
                    IsActive = m.IsActive,
                    IsCurrent = true,
                    CreatedAt = m.CreatedAt,
                    UpdatedAt = m.UpdatedAt
                })
                .OrderBy(d => d.OracleSource)
                .ThenBy(d => d.BranchId)
                .ToListAsync();

            return Ok(ApiResponse<List<OracleSourceMappingDto>>.Ok(data));
        }

        // GET api/oracle-source-mappings/sources
        // Distinct OracleSource values already in use — feeds a dropdown in the admin UI
        // while still allowing a brand-new source to be typed in (no hardcoded list).
        [HttpGet("sources")]
        public async Task<IActionResult> GetSources()
        {
            var sources = await _db.OracleSourceMappings
                .Select(m => m.OracleSource)
                .Distinct()
                .OrderBy(s => s)
                .ToListAsync();

            return Ok(ApiResponse<List<string>>.Ok(sources));
        }

        // GET api/oracle-source-mappings/{id}
        [HttpGet("{id:guid}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var mapping = await _db.OracleSourceMappings.FirstOrDefaultAsync(m => m.Id == id);

            if (mapping == null)
            {
                return NotFound(ApiResponse<object>.Fail("Mapping not found."));
            }

            var company = await _db.Companies.FirstOrDefaultAsync(c => c.Id == mapping.CompanyId);

            var dto = new OracleSourceMappingDto
            {
                Id = mapping.Id,
                OracleSource = mapping.OracleSource,
                BranchId = mapping.BranchId,
                CompanyId = mapping.CompanyId,
                EntityType = mapping.EntityType,
                CompanyCode = company?.Code ?? "",
                CompanyName = company?.Name ?? "",
                EffectiveFrom = mapping.EffectiveFrom,
                EffectiveTo = mapping.EffectiveTo,
                Notes = mapping.Notes,
                IsActive = mapping.IsActive,
                IsCurrent = mapping.EffectiveTo == null && mapping.IsActive,
                CreatedAt = mapping.CreatedAt,
                UpdatedAt = mapping.UpdatedAt
            };

            return Ok(ApiResponse<OracleSourceMappingDto>.Ok(dto));
        }

        // POST api/oracle-source-mappings
        // Creates a new mapping. If a branch already has an open current mapping
        // (EffectiveTo == null) under the same OracleSource pointing to a DIFFERENT
        // company, that old row is closed (EffectiveTo set) rather than left dangling —
        // this keeps full history and guarantees ErpSyncOrchestrator.ResolveCompanyAsync
        // never finds two "current" rows for the same OracleSource + BranchId.
        //
        // ✅ NOTE: EntityType is NOT part of this uniqueness check — it's purely a
        // display/filter tag (Items / Suppliers / null=applies to all). Matching logic
        // for sync still only looks at OracleSource + BranchId, exactly as before.
        [HttpPost]
        public async Task<IActionResult> Create(CreateOracleSourceMappingDto dto)
        {
            var errors = new List<string>();

            if (string.IsNullOrWhiteSpace(dto.OracleSource))
                errors.Add("OracleSource is required.");

            if (string.IsNullOrWhiteSpace(dto.BranchId))
                errors.Add("BranchId is required.");

            if (dto.CompanyId == Guid.Empty)
                errors.Add("CompanyId is required.");

            if (errors.Count > 0)
                return BadRequest(ApiResponse<object>.Fail("Validation failed.", errors));

            var company = await _db.Companies.FirstOrDefaultAsync(c => c.Id == dto.CompanyId);
            if (company == null)
                return BadRequest(ApiResponse<object>.Fail($"Company with Id {dto.CompanyId} was not found."));

            var oracleSource = dto.OracleSource.Trim();
            var branchId = dto.BranchId.Trim();
            var effectiveFrom = dto.EffectiveFrom ?? DateTime.UtcNow;

            var currentMapping = await _db.OracleSourceMappings
                .FirstOrDefaultAsync(m =>
                    m.OracleSource == oracleSource &&
                    m.BranchId == branchId &&
                    m.EffectiveTo == null &&
                    m.IsActive);

            if (currentMapping != null)
            {
                if (currentMapping.CompanyId == dto.CompanyId)
                {
                    return BadRequest(ApiResponse<object>.Fail(
                        $"Branch '{branchId}' under source '{oracleSource}' is already mapped to '{company.Name}'. No change needed."));
                }

                currentMapping.EffectiveTo = effectiveFrom;
                currentMapping.UpdatedAt = DateTime.UtcNow;
            }

            var mapping = new OracleSourceMapping
            {
                Id = Guid.NewGuid(),
                OracleSource = oracleSource,
                BranchId = branchId,
                CompanyId = dto.CompanyId,
                EntityType = dto.EntityType,
                EffectiveFrom = effectiveFrom,
                EffectiveTo = null,
                Notes = dto.Notes,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            _db.OracleSourceMappings.Add(mapping);
            await _db.SaveChangesAsync();

            var resultDto = new OracleSourceMappingDto
            {
                Id = mapping.Id,
                OracleSource = mapping.OracleSource,
                BranchId = mapping.BranchId,
                CompanyId = mapping.CompanyId,
                EntityType = mapping.EntityType,
                CompanyCode = company.Code,
                CompanyName = company.Name,
                EffectiveFrom = mapping.EffectiveFrom,
                EffectiveTo = mapping.EffectiveTo,
                Notes = mapping.Notes,
                IsActive = mapping.IsActive,
                IsCurrent = true,
                CreatedAt = mapping.CreatedAt,
                UpdatedAt = mapping.UpdatedAt
            };

            var message = currentMapping != null
                ? $"Mapping created. Previous mapping to a different company was closed as of {effectiveFrom:yyyy-MM-dd}."
                : "Mapping created.";

            return Ok(ApiResponse<OracleSourceMappingDto>.Ok(resultDto, message));
        }

        // PUT api/oracle-source-mappings/{id}
        // Edits an existing row directly (fix a typo, change Notes, manually close it by
        // setting EffectiveTo, or toggle IsActive). OracleSource/BranchId/EntityType are
        // intentionally NOT editable here — changing OracleSource/BranchId would break
        // sync history identity; create a new mapping instead if the branch genuinely
        // needs a different source/branch/entity-type pairing.
        [HttpPut("{id:guid}")]
        public async Task<IActionResult> Update(Guid id, UpdateOracleSourceMappingDto dto)
        {
            var mapping = await _db.OracleSourceMappings.FirstOrDefaultAsync(m => m.Id == id);

            if (mapping == null)
                return NotFound(ApiResponse<object>.Fail("Mapping not found."));

            if (dto.CompanyId == Guid.Empty)
                return BadRequest(ApiResponse<object>.Fail("CompanyId is required."));

            var company = await _db.Companies.FirstOrDefaultAsync(c => c.Id == dto.CompanyId);
            if (company == null)
                return BadRequest(ApiResponse<object>.Fail($"Company with Id {dto.CompanyId} was not found."));

            if (dto.EffectiveTo.HasValue && dto.EffectiveTo.Value < dto.EffectiveFrom)
                return BadRequest(ApiResponse<object>.Fail("EffectiveTo cannot be earlier than EffectiveFrom."));

            var wouldBeCurrent = dto.EffectiveTo == null && dto.IsActive;

            if (wouldBeCurrent)
            {
                var conflict = await _db.OracleSourceMappings
                    .AnyAsync(m =>
                        m.Id != id &&
                        m.OracleSource == mapping.OracleSource &&
                        m.BranchId == mapping.BranchId &&
                        m.EffectiveTo == null &&
                        m.IsActive);

                if (conflict)
                    return BadRequest(ApiResponse<object>.Fail(
                        $"Another current mapping already exists for source '{mapping.OracleSource}', branch '{mapping.BranchId}'. " +
                        "Close that one first, or create a new mapping instead of editing this one."));
            }

            mapping.CompanyId = dto.CompanyId;
            mapping.EffectiveFrom = dto.EffectiveFrom;
            mapping.EffectiveTo = dto.EffectiveTo;
            mapping.Notes = dto.Notes;
            mapping.IsActive = dto.IsActive;
            mapping.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();

            var resultDto = new OracleSourceMappingDto
            {
                Id = mapping.Id,
                OracleSource = mapping.OracleSource,
                BranchId = mapping.BranchId,
                CompanyId = mapping.CompanyId,
                EntityType = mapping.EntityType,
                CompanyCode = company.Code,
                CompanyName = company.Name,
                EffectiveFrom = mapping.EffectiveFrom,
                EffectiveTo = mapping.EffectiveTo,
                Notes = mapping.Notes,
                IsActive = mapping.IsActive,
                IsCurrent = mapping.EffectiveTo == null && mapping.IsActive,
                CreatedAt = mapping.CreatedAt,
                UpdatedAt = mapping.UpdatedAt
            };

            return Ok(ApiResponse<OracleSourceMappingDto>.Ok(resultDto, "Mapping updated."));
        }

        // DELETE api/oracle-source-mappings/{id}
        // Soft delete only, consistent with the rest of the system.
        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var mapping = await _db.OracleSourceMappings.FirstOrDefaultAsync(m => m.Id == id);

            if (mapping == null)
                return NotFound(ApiResponse<object>.Fail("Mapping not found."));

            mapping.IsActive = false;
            mapping.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();

            return Ok(ApiResponse<object>.Ok(new { id = mapping.Id }, "Mapping deactivated."));
        }
    }
}

//// above updated code 07/19/2026

//using Microsoft.AspNetCore.Authorization;
//using Microsoft.AspNetCore.Mvc;
//using Microsoft.EntityFrameworkCore;
//using Procurement.Api.Common;
//using Procurement.Api.Data;
//using Procurement.Api.DTOs.Integration;
//using Procurement.Api.Services.Integration;

//namespace Procurement.Api.Controllers.Integration
//{
//    [Authorize]
//    [ApiController]
//    [Route("api/oracle-source-mappings")]
//    public class OracleSourceMappingsController : ControllerBase
//    {
//        private readonly AppDbContext _db;

//        public OracleSourceMappingsController(AppDbContext db)
//        {
//            _db = db;
//        }

//        // GET api/oracle-source-mappings?oracleSource=BrightOracle-HQ&activeOnly=true
//        [HttpGet]
//        public async Task<IActionResult> Get([FromQuery] string? oracleSource, [FromQuery] bool? activeOnly)
//        {
//            var query = _db.OracleSourceMappings.AsQueryable();

//            if (!string.IsNullOrWhiteSpace(oracleSource))
//            {
//                var src = oracleSource.Trim();
//                query = query.Where(m => m.OracleSource == src);
//            }

//            if (activeOnly == true)
//            {
//                query = query.Where(m => m.IsActive);
//            }

//            var data = await query
//                .Join(_db.Companies, m => m.CompanyId, c => c.Id, (m, c) => new OracleSourceMappingDto
//                {
//                    Id = m.Id,
//                    OracleSource = m.OracleSource,
//                    BranchId = m.BranchId,
//                    CompanyId = m.CompanyId,
//                    CompanyCode = c.Code,
//                    CompanyName = c.Name,
//                    EffectiveFrom = m.EffectiveFrom,
//                    EffectiveTo = m.EffectiveTo,
//                    Notes = m.Notes,
//                    IsActive = m.IsActive,
//                    IsCurrent = m.EffectiveTo == null && m.IsActive,
//                    CreatedAt = m.CreatedAt,
//                    UpdatedAt = m.UpdatedAt
//                })
//                .OrderBy(d => d.OracleSource)
//                .ThenBy(d => d.BranchId)
//                .ThenByDescending(d => d.EffectiveFrom)
//                .ToListAsync();

//            return Ok(ApiResponse<List<OracleSourceMappingDto>>.Ok(data));
//        }

//        // GET api/oracle-source-mappings/current
//        // Exactly the rows ErpSyncOrchestrator.ResolveCompanyAsync will pick up right now.
//        [HttpGet("current")]
//        public async Task<IActionResult> GetCurrent()
//        {
//            var data = await _db.OracleSourceMappings
//                .Where(m => m.EffectiveTo == null && m.IsActive)
//                .Join(_db.Companies, m => m.CompanyId, c => c.Id, (m, c) => new OracleSourceMappingDto
//                {
//                    Id = m.Id,
//                    OracleSource = m.OracleSource,
//                    BranchId = m.BranchId,
//                    CompanyId = m.CompanyId,
//                    CompanyCode = c.Code,
//                    CompanyName = c.Name,
//                    EffectiveFrom = m.EffectiveFrom,
//                    EffectiveTo = m.EffectiveTo,
//                    Notes = m.Notes,
//                    IsActive = m.IsActive,
//                    IsCurrent = true,
//                    CreatedAt = m.CreatedAt,
//                    UpdatedAt = m.UpdatedAt
//                })
//                .OrderBy(d => d.OracleSource)
//                .ThenBy(d => d.BranchId)
//                .ToListAsync();

//            return Ok(ApiResponse<List<OracleSourceMappingDto>>.Ok(data));
//        }

//        // GET api/oracle-source-mappings/sources
//        // Distinct OracleSource values already in use — feeds a dropdown in the admin UI
//        // while still allowing a brand-new source to be typed in (no hardcoded list).
//        [HttpGet("sources")]
//        public async Task<IActionResult> GetSources()
//        {
//            var sources = await _db.OracleSourceMappings
//                .Select(m => m.OracleSource)
//                .Distinct()
//                .OrderBy(s => s)
//                .ToListAsync();

//            return Ok(ApiResponse<List<string>>.Ok(sources));
//        }

//        // GET api/oracle-source-mappings/{id}
//        [HttpGet("{id:guid}")]
//        public async Task<IActionResult> GetById(Guid id)
//        {
//            var mapping = await _db.OracleSourceMappings.FirstOrDefaultAsync(m => m.Id == id);

//            if (mapping == null)
//            {
//                return NotFound(ApiResponse<object>.Fail("Mapping not found."));
//            }

//            var company = await _db.Companies.FirstOrDefaultAsync(c => c.Id == mapping.CompanyId);

//            var dto = new OracleSourceMappingDto
//            {
//                Id = mapping.Id,
//                OracleSource = mapping.OracleSource,
//                BranchId = mapping.BranchId,
//                CompanyId = mapping.CompanyId,
//                CompanyCode = company?.Code ?? "",
//                CompanyName = company?.Name ?? "",
//                EffectiveFrom = mapping.EffectiveFrom,
//                EffectiveTo = mapping.EffectiveTo,
//                Notes = mapping.Notes,
//                IsActive = mapping.IsActive,
//                IsCurrent = mapping.EffectiveTo == null && mapping.IsActive,
//                CreatedAt = mapping.CreatedAt,
//                UpdatedAt = mapping.UpdatedAt
//            };

//            return Ok(ApiResponse<OracleSourceMappingDto>.Ok(dto));
//        }

//        // POST api/oracle-source-mappings
//        // Creates a new mapping. If a branch already has an open current mapping
//        // (EffectiveTo == null) under the same OracleSource pointing to a DIFFERENT
//        // company, that old row is closed (EffectiveTo set) rather than left dangling —
//        // this keeps full history and guarantees ErpSyncOrchestrator.ResolveCompanyAsync
//        // never finds two "current" rows for the same OracleSource + BranchId.
//        [HttpPost]
//        public async Task<IActionResult> Create(CreateOracleSourceMappingDto dto)
//        {
//            var errors = new List<string>();

//            if (string.IsNullOrWhiteSpace(dto.OracleSource))
//                errors.Add("OracleSource is required.");

//            if (string.IsNullOrWhiteSpace(dto.BranchId))
//                errors.Add("BranchId is required.");

//            if (dto.CompanyId == Guid.Empty)
//                errors.Add("CompanyId is required.");

//            if (errors.Count > 0)
//                return BadRequest(ApiResponse<object>.Fail("Validation failed.", errors));

//            var company = await _db.Companies.FirstOrDefaultAsync(c => c.Id == dto.CompanyId);
//            if (company == null)
//                return BadRequest(ApiResponse<object>.Fail($"Company with Id {dto.CompanyId} was not found."));

//            var oracleSource = dto.OracleSource.Trim();
//            var branchId = dto.BranchId.Trim();
//            var effectiveFrom = dto.EffectiveFrom ?? DateTime.UtcNow;

//            var currentMapping = await _db.OracleSourceMappings
//                .FirstOrDefaultAsync(m =>
//                    m.OracleSource == oracleSource &&
//                    m.BranchId == branchId &&
//                    m.EffectiveTo == null &&
//                    m.IsActive);

//            if (currentMapping != null)
//            {
//                if (currentMapping.CompanyId == dto.CompanyId)
//                {
//                    return BadRequest(ApiResponse<object>.Fail(
//                        $"Branch '{branchId}' under source '{oracleSource}' is already mapped to '{company.Name}'. No change needed."));
//                }

//                currentMapping.EffectiveTo = effectiveFrom;
//                currentMapping.UpdatedAt = DateTime.UtcNow;
//            }

//            var mapping = new OracleSourceMapping
//            {
//                Id = Guid.NewGuid(),
//                OracleSource = oracleSource,
//                BranchId = branchId,
//                CompanyId = dto.CompanyId,
//                EffectiveFrom = effectiveFrom,
//                EffectiveTo = null,
//                Notes = dto.Notes,
//                IsActive = true,
//                CreatedAt = DateTime.UtcNow
//            };

//            _db.OracleSourceMappings.Add(mapping);
//            await _db.SaveChangesAsync();

//            var resultDto = new OracleSourceMappingDto
//            {
//                Id = mapping.Id,
//                OracleSource = mapping.OracleSource,
//                BranchId = mapping.BranchId,
//                CompanyId = mapping.CompanyId,
//                CompanyCode = company.Code,
//                CompanyName = company.Name,
//                EffectiveFrom = mapping.EffectiveFrom,
//                EffectiveTo = mapping.EffectiveTo,
//                Notes = mapping.Notes,
//                IsActive = mapping.IsActive,
//                IsCurrent = true,
//                CreatedAt = mapping.CreatedAt,
//                UpdatedAt = mapping.UpdatedAt
//            };

//            var message = currentMapping != null
//                ? $"Mapping created. Previous mapping to a different company was closed as of {effectiveFrom:yyyy-MM-dd}."
//                : "Mapping created.";

//            return Ok(ApiResponse<OracleSourceMappingDto>.Ok(resultDto, message));
//        }

//        // PUT api/oracle-source-mappings/{id}
//        // Edits an existing row directly (fix a typo, change Notes, manually close it by
//        // setting EffectiveTo, or toggle IsActive). OracleSource/BranchId are intentionally
//        // NOT editable here — changing them would break sync history identity; create a new
//        // mapping instead if the branch genuinely needs a different source/branch pairing.
//        [HttpPut("{id:guid}")]
//        public async Task<IActionResult> Update(Guid id, UpdateOracleSourceMappingDto dto)
//        {
//            var mapping = await _db.OracleSourceMappings.FirstOrDefaultAsync(m => m.Id == id);

//            if (mapping == null)
//                return NotFound(ApiResponse<object>.Fail("Mapping not found."));

//            if (dto.CompanyId == Guid.Empty)
//                return BadRequest(ApiResponse<object>.Fail("CompanyId is required."));

//            var company = await _db.Companies.FirstOrDefaultAsync(c => c.Id == dto.CompanyId);
//            if (company == null)
//                return BadRequest(ApiResponse<object>.Fail($"Company with Id {dto.CompanyId} was not found."));

//            if (dto.EffectiveTo.HasValue && dto.EffectiveTo.Value < dto.EffectiveFrom)
//                return BadRequest(ApiResponse<object>.Fail("EffectiveTo cannot be earlier than EffectiveFrom."));

//            var wouldBeCurrent = dto.EffectiveTo == null && dto.IsActive;

//            if (wouldBeCurrent)
//            {
//                var conflict = await _db.OracleSourceMappings
//                    .AnyAsync(m =>
//                        m.Id != id &&
//                        m.OracleSource == mapping.OracleSource &&
//                        m.BranchId == mapping.BranchId &&
//                        m.EffectiveTo == null &&
//                        m.IsActive);

//                if (conflict)
//                    return BadRequest(ApiResponse<object>.Fail(
//                        $"Another current mapping already exists for source '{mapping.OracleSource}', branch '{mapping.BranchId}'. " +
//                        "Close that one first, or create a new mapping instead of editing this one."));
//            }

//            mapping.CompanyId = dto.CompanyId;
//            mapping.EffectiveFrom = dto.EffectiveFrom;
//            mapping.EffectiveTo = dto.EffectiveTo;
//            mapping.Notes = dto.Notes;
//            mapping.IsActive = dto.IsActive;
//            mapping.UpdatedAt = DateTime.UtcNow;

//            await _db.SaveChangesAsync();

//            var resultDto = new OracleSourceMappingDto
//            {
//                Id = mapping.Id,
//                OracleSource = mapping.OracleSource,
//                BranchId = mapping.BranchId,
//                CompanyId = mapping.CompanyId,
//                CompanyCode = company.Code,
//                CompanyName = company.Name,
//                EffectiveFrom = mapping.EffectiveFrom,
//                EffectiveTo = mapping.EffectiveTo,
//                Notes = mapping.Notes,
//                IsActive = mapping.IsActive,
//                IsCurrent = mapping.EffectiveTo == null && mapping.IsActive,
//                CreatedAt = mapping.CreatedAt,
//                UpdatedAt = mapping.UpdatedAt
//            };

//            return Ok(ApiResponse<OracleSourceMappingDto>.Ok(resultDto, "Mapping updated."));
//        }

//        // DELETE api/oracle-source-mappings/{id}
//        // Soft delete only, consistent with the rest of the system.
//        [HttpDelete("{id:guid}")]
//        public async Task<IActionResult> Delete(Guid id)
//        {
//            var mapping = await _db.OracleSourceMappings.FirstOrDefaultAsync(m => m.Id == id);

//            if (mapping == null)
//                return NotFound(ApiResponse<object>.Fail("Mapping not found."));

//            mapping.IsActive = false;
//            mapping.UpdatedAt = DateTime.UtcNow;

//            await _db.SaveChangesAsync();

//            return Ok(ApiResponse<object>.Ok(new { id = mapping.Id }, "Mapping deactivated."));
//        }
//    }
//}