using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Procurement.Api.Data;
using Procurement.Api.DTOs.Projects;
using Procurement.Api.Models;

namespace Procurement.Api.Controllers.Projects
{
    [ApiController]
    [Route("api/[controller]")]
    public class ProjectsController : Controller
    {


        private readonly AppDbContext _context;

        public ProjectsController(AppDbContext context)
        {
            _context = context;
        }

        // ✅ GET PROJECTS BY COMPANY
        [HttpGet("company/{companyId}")]
        public async Task<IActionResult> GetProjectsByCompany(
            Guid companyId
        )
        {
            var data = await _context.Projects

                .Where(p =>
                    p.CompanyId == companyId)

                .Select(p => new
                {
                    id = p.Id,

                    name = p.Name,

                    companyId = p.CompanyId,

                    departmentId = p.DepartmentId,

                    externalCode = p.ExternalCode,

                    source = p.SourceType
                })

                .ToListAsync();

            return Ok(data);
        }

        // ✅ CREATE PROJECT
        [HttpPost]
        public async Task<IActionResult> CreateProject(CreateProjectDto dto)
        {
            var project = new Project
            {
                Id = Guid.NewGuid(),

                Name = dto.Name,

                CompanyId = dto.CompanyId,

                DepartmentId = dto.DepartmentId,

                SourceType = "MANUAL",

                ExternalCode = null,

                CreatedAt = DateTime.UtcNow
            };

            _context.Projects.Add(project);

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Project created ✅"
            });
        }

        // ✅ GET PROJECTS
        [HttpGet]
        public async Task<IActionResult> GetProjects()
        {
            var data = await _context.Projects

            .Select(p => new
            {
                id = p.Id,

                name = p.Name,

                companyId = p.CompanyId,

                departmentId = p.DepartmentId,

                externalCode = p.ExternalCode,

                source = p.SourceType,

                // ✅ ADDED: needed for Project Master grid's "Created" date column
                createdAt = p.CreatedAt,

                companyName = _context.Companies
                    .Where(c => c.Id == p.CompanyId)
                    .Select(c => c.Name)
                    .FirstOrDefault(),

                departmentName = _context.Departments
                    .Where(d => d.Id == p.DepartmentId)
                    .Select(d => d.Name)
                    .FirstOrDefault()
            })

               // ✅ ADDED: newest projects show first
               .OrderByDescending(p => p.createdAt)

                .ToListAsync();

            return Ok(data);
        }
    }


}