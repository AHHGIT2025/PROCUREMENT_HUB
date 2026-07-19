using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Procurement.Api.Data;
using Procurement.Api.Models;

namespace Procurement.Api.Controllers.Workflow
{
    [Authorize]
    [ApiController]
    [Route("api/workflows")]
    public class WorkflowsController : ControllerBase
    {
        private readonly AppDbContext _db;
        public WorkflowsController(AppDbContext db) => _db = db;

        // GET /api/workflows
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var data = await _db.WorkflowDefinitions
                .Include(w => w.Conditions)
                .Include(w => w.Steps)
                .Where(w => w.IsActive || !w.IsActive)
                .OrderByDescending(w => w.Priority)
                .Select(w => new
                {
                    id = w.Id,
                    name = w.Name,
                    code = w.Code,
                    entityType = w.EntityType,
                    isDefault = w.IsDefault,
                    priority = w.Priority,
                    isActive = w.IsActive,
                    companyId = w.CompanyId,
                    conditionMatchLogic = w.ConditionMatchLogic,   // ✅ NEW
                    conditions = w.Conditions.Select(c => new { c.Field, c.Operator, c.Value }),
                    steps = w.Steps.OrderBy(s => s.StepOrder)
                                    .Select(s => new { s.StepOrder, s.Name, s.RoleName, s.ApproverType })
                })
                .ToListAsync();

            return Ok(new { success = true, data });
        }

        // GET /api/workflows/{id}
        [HttpGet("{id:guid}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var wf = await _db.WorkflowDefinitions
                .Include(w => w.Conditions)
                .Include(w => w.Steps)
                .FirstOrDefaultAsync(w => w.Id == id);

            if (wf == null) return NotFound();

            return Ok(new
            {
                success = true,
                data = new
                {
                    id = wf.Id,
                    name = wf.Name,
                    code = wf.Code,
                    description = (string?)null,
                    entityType = wf.EntityType,
                    isDefault = wf.IsDefault,
                    priority = wf.Priority,
                    isActive = wf.IsActive,
                    companyId = wf.CompanyId,
                    conditionMatchLogic = wf.ConditionMatchLogic,   // ✅ NEW
                    conditions = wf.Conditions.Select(c => new
                    {
                        id = c.Id,
                        field = c.Field,
                        @operator = c.Operator,
                        value = c.Value,
                        valueType = c.ValueType
                    }),
                    steps = wf.Steps.OrderBy(s => s.StepOrder).Select(s => new
                    {
                        id = s.Id,
                        stepOrder = s.StepOrder,
                        name = s.Name,
                        roleName = s.RoleName,
                        roleId = s.RoleId,
                        approverType = s.ApproverType,
                        stepType = s.StepType,
                        timeoutHours = s.TimeoutHours,
                        isRequired = s.IsRequired
                    })
                }
            });
        }

        // POST /api/workflows
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] WorkflowUpsertDto dto)
        {
            var wf = new WorkflowDefinition
            {
                Id = Guid.NewGuid(),
                Name = dto.Name,
                Code = dto.Code,
                EntityType = dto.EntityType ?? "PURCHASE_REQUEST",
                IsDefault = dto.IsDefault,
                Priority = dto.Priority,
                CompanyId = dto.CompanyId,
                IsActive = dto.IsActive,
                ConditionMatchLogic = dto.ConditionMatchLogic ?? "ANY",   // ✅ NEW
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _db.WorkflowDefinitions.Add(wf);

            foreach (var c in dto.Conditions ?? new())
            {
                _db.WorkflowConditions.Add(new WorkflowCondition
                {
                    Id = Guid.NewGuid(),
                    WorkflowDefinitionId = wf.Id,
                    Field = c.Field,
                    Operator = c.Operator,
                    Value = c.Value,
                    ValueType = c.ValueType ?? "STRING",
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                });
            }

            int order = 1;
            foreach (var s in dto.Steps ?? new())
            {
                _db.WorkflowSteps.Add(new WorkflowStep
                {
                    Id = Guid.NewGuid(),
                    WorkflowDefinitionId = wf.Id,
                    StepOrder = s.StepOrder > 0 ? s.StepOrder : order++,
                    Name = s.Name,
                    RoleName = s.RoleName ?? "",
                    RoleId = s.RoleId,
                    ApproverType = s.ApproverType ?? "ROLE",
                    StepType = s.StepType ?? "SEQUENTIAL",
                    TimeoutHours = s.TimeoutHours,
                    IsRequired = s.IsRequired,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                });
            }

            await _db.SaveChangesAsync();
            return Ok(new { success = true, message = "Workflow created.", id = wf.Id });
        }

        // PUT /api/workflows/{id}
        [HttpPut("{id:guid}")]
        public async Task<IActionResult> Update(Guid id, [FromBody] WorkflowUpsertDto dto)
        {
            var wf = await _db.WorkflowDefinitions.FindAsync(id);
            if (wf == null) return NotFound();

            wf.Name = dto.Name;
            wf.Code = dto.Code;
            wf.IsDefault = dto.IsDefault;
            wf.Priority = dto.Priority;
            wf.IsActive = dto.IsActive;
            wf.CompanyId = dto.CompanyId;
            wf.ConditionMatchLogic = dto.ConditionMatchLogic ?? "ANY";   // ✅ NEW
            wf.UpdatedAt = DateTime.UtcNow;

            var oldConds = _db.WorkflowConditions.Where(c => c.WorkflowDefinitionId == id);
            _db.WorkflowConditions.RemoveRange(oldConds);

            foreach (var c in dto.Conditions ?? new())
            {
                _db.WorkflowConditions.Add(new WorkflowCondition
                {
                    Id = Guid.NewGuid(),
                    WorkflowDefinitionId = id,
                    Field = c.Field,
                    Operator = c.Operator,
                    Value = c.Value,
                    ValueType = c.ValueType ?? "STRING",
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                });
            }


            var oldSteps = _db.WorkflowSteps.Where(s => s.WorkflowDefinitionId == id);
            _db.WorkflowSteps.RemoveRange(oldSteps);

            int order = 1;
            foreach (var s in dto.Steps ?? new())
            {
                _db.WorkflowSteps.Add(new WorkflowStep
                {
                    Id = Guid.NewGuid(),
                    WorkflowDefinitionId = id,
                    StepOrder = s.StepOrder > 0 ? s.StepOrder : order++,
                    Name = s.Name,
                    RoleName = s.RoleName ?? "",
                    RoleId = s.RoleId,
                    ApproverType = s.ApproverType ?? "ROLE",
                    StepType = s.StepType ?? "SEQUENTIAL",
                    TimeoutHours = s.TimeoutHours,
                    IsRequired = s.IsRequired,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                });
            }

            await _db.SaveChangesAsync();
            return Ok(new { success = true, message = "Workflow updated." });
        }

        // DELETE /api/workflows/{id}
        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var wf = await _db.WorkflowDefinitions.FindAsync(id);
            if (wf == null) return NotFound();
            wf.IsActive = false;
            wf.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return Ok(new { success = true, message = "Workflow deleted." });
        }
    }

    // DTOs
    public class WorkflowUpsertDto
    {
        public string Name { get; set; } = "";
        public string? Code { get; set; }
        public string? EntityType { get; set; }
        public bool IsDefault { get; set; }
        public int Priority { get; set; }
        public bool IsActive { get; set; } = true;
        public Guid? CompanyId { get; set; }
        public string? ConditionMatchLogic { get; set; }   // ✅ NEW — "ANY" or "ALL"
        public List<ConditionDto>? Conditions { get; set; }
        public List<StepDto>? Steps { get; set; }
    }

    public class ConditionDto
    {
        public string Field { get; set; } = "";
        public string Operator { get; set; } = "EQUALS";
        public string Value { get; set; } = "";
        public string? ValueType { get; set; }
    }

    public class StepDto
    {
        public int StepOrder { get; set; }
        public string Name { get; set; } = "";
        public string? RoleName { get; set; }
        public Guid? RoleId { get; set; }
        public string? ApproverType { get; set; }
        public string? StepType { get; set; }
        public int? TimeoutHours { get; set; }
        public bool IsRequired { get; set; } = true;
    }
}