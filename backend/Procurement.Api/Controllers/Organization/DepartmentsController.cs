using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Procurement.Api.Common;
using Procurement.Api.Data;
using Procurement.Api.DTOs.Organization;
using Procurement.Api.Models;

namespace Procurement.Api.Controllers.Organization
{
    [Authorize]
    [ApiController]
    [Route("api/departments")]
    public class DepartmentsController : ControllerBase
    {
        private readonly AppDbContext _db;

        public DepartmentsController(AppDbContext db)
        {
            _db = db;
        }

        // GET /api/departments — all active departments, with company name joined in
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var data = await _db.Departments
                .Where(d => d.IsActive)
                .Join(_db.Companies, d => d.CompanyId, c => c.Id, (d, c) => new DepartmentDto
                {
                    Id = d.Id,
                    CompanyId = d.CompanyId,
                    CompanyName = c.Name,
                    Code = d.Code,
                    Name = d.Name,
                    IsActive = d.IsActive,
                    CreatedAt = d.CreatedAt,
                    UpdatedAt = d.UpdatedAt
                })
                .OrderBy(d => d.CompanyName)
                .ThenBy(d => d.Name)
                .ToListAsync();

            return Ok(ApiResponse<List<DepartmentDto>>.Ok(data));
        }

        // GET /api/departments/by-company/{companyId}
        [HttpGet("by-company/{companyId:guid}")]
        public async Task<IActionResult> GetByCompany(Guid companyId)
        {
            var data = await _db.Departments
                .Where(d => d.CompanyId == companyId && d.IsActive)
                .Select(d => new { d.Id, d.Name, d.Code, d.CompanyId })
                .OrderBy(d => d.Name)
                .ToListAsync();

            return Ok(data);
        }

        // GET /api/departments/{id}
        [HttpGet("{id:guid}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var dept = await _db.Departments.FindAsync(id);
            if (dept == null)
                return NotFound(ApiResponse<object>.Fail("Department not found."));

            var company = await _db.Companies.FindAsync(dept.CompanyId);

            var dto = new DepartmentDto
            {
                Id = dept.Id,
                CompanyId = dept.CompanyId,
                CompanyName = company?.Name ?? "",
                Code = dept.Code,
                Name = dept.Name,
                IsActive = dept.IsActive,
                CreatedAt = dept.CreatedAt,
                UpdatedAt = dept.UpdatedAt
            };

            return Ok(ApiResponse<DepartmentDto>.Ok(dto));
        }

        // POST /api/departments
        [HttpPost]
        public async Task<IActionResult> Create(CreateDepartmentDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Name))
                return BadRequest(ApiResponse<object>.Fail("Department name is required."));

            if (string.IsNullOrWhiteSpace(dto.Code))
                return BadRequest(ApiResponse<object>.Fail("Department code is required."));

            var companyExists = await _db.Companies.AnyAsync(c => c.Id == dto.CompanyId && c.IsActive);
            if (!companyExists)
                return BadRequest(ApiResponse<object>.Fail("Selected company is invalid or inactive."));

            // Prevent duplicate code within the same company
            var duplicate = await _db.Departments.AnyAsync(d =>
                d.CompanyId == dto.CompanyId &&
                d.Code == dto.Code &&
                d.IsActive);

            if (duplicate)
                return BadRequest(ApiResponse<object>.Fail($"A department with code '{dto.Code}' already exists for this company."));

            var department = new Department
            {
                Id = Guid.NewGuid(),
                CompanyId = dto.CompanyId,
                Code = dto.Code.Trim(),
                Name = dto.Name.Trim(),
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            _db.Departments.Add(department);
            await _db.SaveChangesAsync();

            return Ok(ApiResponse<Department>.Ok(department, "Department created successfully."));
        }

        // PUT /api/departments/{id}
        [HttpPut("{id:guid}")]
        public async Task<IActionResult> Update(Guid id, UpdateDepartmentDto dto)
        {
            var department = await _db.Departments.FindAsync(id);
            if (department == null)
                return NotFound(ApiResponse<object>.Fail("Department not found."));

            if (string.IsNullOrWhiteSpace(dto.Name))
                return BadRequest(ApiResponse<object>.Fail("Department name is required."));

            if (string.IsNullOrWhiteSpace(dto.Code))
                return BadRequest(ApiResponse<object>.Fail("Department code is required."));

            var companyExists = await _db.Companies.AnyAsync(c => c.Id == dto.CompanyId && c.IsActive);
            if (!companyExists)
                return BadRequest(ApiResponse<object>.Fail("Selected company is invalid or inactive."));

            // Prevent duplicate code within the same company (excluding this record)
            var duplicate = await _db.Departments.AnyAsync(d =>
                d.Id != id &&
                d.CompanyId == dto.CompanyId &&
                d.Code == dto.Code &&
                d.IsActive);

            if (duplicate)
                return BadRequest(ApiResponse<object>.Fail($"A department with code '{dto.Code}' already exists for this company."));

            department.CompanyId = dto.CompanyId;
            department.Code = dto.Code.Trim();
            department.Name = dto.Name.Trim();
            department.IsActive = dto.IsActive;
            department.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();

            return Ok(ApiResponse<Department>.Ok(department, "Department updated successfully."));
        }

        // DELETE /api/departments/{id} — soft delete
        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var department = await _db.Departments.FindAsync(id);
            if (department == null)
                return NotFound(ApiResponse<object>.Fail("Department not found."));

            // Guard: don't silently orphan users still assigned to this department
            var usersAssigned = await _db.Users.CountAsync(u => u.DepartmentId == id && u.IsActive);
            if (usersAssigned > 0)
                return BadRequest(ApiResponse<object>.Fail(
                    $"Cannot delete — {usersAssigned} active user(s) are still assigned to this department. Reassign them first."));

            department.IsActive = false;
            department.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            return Ok(ApiResponse<object>.Ok(new { }, "Department deactivated successfully."));
        }
    }
}