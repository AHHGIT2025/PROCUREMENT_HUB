using Microsoft.EntityFrameworkCore;
using Procurement.Api.Data;
using Procurement.Api.Models;
namespace Procurement.Api.Services.Workflow
{
   
 
        public class WorkflowSeedService
        {
            private readonly AppDbContext _db;
            public WorkflowSeedService(AppDbContext db) => _db = db;

            public async Task SeedAsync()
            {
                if (await _db.WorkflowDefinitions.AnyAsync()) return;

                var roles = await _db.Roles.ToListAsync();

                Guid? managerRoleId = roles.FirstOrDefault(r => r.Name == "Manager")?.Id;
                Guid? itMgrRoleId = roles.FirstOrDefault(r => r.Name == "IT Manager")?.Id;
                Guid? budgetRoleId = roles.FirstOrDefault(r => r.Name == "Budget Manager")?.Id;
                Guid? purchaseRoleId = roles.FirstOrDefault(r => r.Name == "Procurement Officer")?.Id;
                Guid? assetRoleId = roles.FirstOrDefault(r => r.Name == "Asset Manager")?.Id;
                Guid? ceoRoleId = roles.FirstOrDefault(r => r.Name == "CEO")?.Id;

                // ── GENERAL FLOW (default) ────────────────────────
                var generalFlow = new WorkflowDefinition
                {
                    Id = Guid.NewGuid(),
                    Code = "WF-GENERAL",
                    Name = "General Purchase Request Flow",
                    EntityType = "PURCHASE_REQUEST",
                    IsDefault = true,
                    Priority = 0,
                    CompanyId = null,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                _db.WorkflowDefinitions.Add(generalFlow);

                _db.WorkflowSteps.AddRange(
                    new WorkflowStep
                    {
                        Id = Guid.NewGuid(),
                        WorkflowDefinitionId = generalFlow.Id,
                        StepOrder = 1,
                        Name = "Manager Approval",
                        RoleName = "Manager",
                        RoleId = managerRoleId,
                        ApproverType = "DEPARTMENT_MANAGER",
                        StepType = "SEQUENTIAL",
                        TimeoutHours = 48,
                        IsRequired = true,
                        IsActive = true,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    },
                    new WorkflowStep
                    {
                        Id = Guid.NewGuid(),
                        WorkflowDefinitionId = generalFlow.Id,
                        StepOrder = 2,
                        Name = "Budget Approval",
                        RoleName = "Budget Manager",
                        RoleId = budgetRoleId,
                        ApproverType = "ROLE",
                        StepType = "SEQUENTIAL",
                        TimeoutHours = 48,
                        IsRequired = true,
                        IsActive = true,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    },
                    new WorkflowStep
                    {
                        Id = Guid.NewGuid(),
                        WorkflowDefinitionId = generalFlow.Id,
                        StepOrder = 3,
                        Name = "Procurement Officer Approval",
                        RoleName = "Procurement Officer",
                        RoleId = purchaseRoleId,
                        ApproverType = "ROLE",
                        StepType = "SEQUENTIAL",
                        TimeoutHours = 72,
                        IsRequired = true,
                        IsActive = true,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    }
                );

                // ── IT FLOW ───────────────────────────────────────
                var itFlow = new WorkflowDefinition
                {
                    Id = Guid.NewGuid(),
                    Code = "WF-IT",
                    Name = "IT Purchase Request Flow",
                    EntityType = "PURCHASE_REQUEST",
                    IsDefault = false,
                    Priority = 10,
                    CompanyId = null,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                _db.WorkflowDefinitions.Add(itFlow);

                _db.WorkflowConditions.Add(new WorkflowCondition
                {
                    Id = Guid.NewGuid(),
                    WorkflowDefinitionId = itFlow.Id,
                    Field = "ItemGroup",
                    Operator = "EQUALS",
                    Value = "IT",
                    ValueType = "STRING",
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                });

                _db.WorkflowSteps.AddRange(
                    new WorkflowStep
                    {
                        Id = Guid.NewGuid(),
                        WorkflowDefinitionId = itFlow.Id,
                        StepOrder = 1,
                        Name = "Manager Approval",
                        RoleName = "Manager",
                        RoleId = managerRoleId,
                        ApproverType = "DEPARTMENT_MANAGER",
                        StepType = "SEQUENTIAL",
                        TimeoutHours = 48,
                        IsRequired = true,
                        IsActive = true,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    },
                    new WorkflowStep
                    {
                        Id = Guid.NewGuid(),
                        WorkflowDefinitionId = itFlow.Id,
                        StepOrder = 2,
                        Name = "IT Manager Approval",
                        RoleName = "IT Manager",
                        RoleId = itMgrRoleId,
                        ApproverType = "ROLE",
                        StepType = "SEQUENTIAL",
                        TimeoutHours = 48,
                        IsRequired = true,
                        IsActive = true,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    },
                    new WorkflowStep
                    {
                        Id = Guid.NewGuid(),
                        WorkflowDefinitionId = itFlow.Id,
                        StepOrder = 3,
                        Name = "Budget Approval",
                        RoleName = "Budget Manager",
                        RoleId = budgetRoleId,
                        ApproverType = "ROLE",
                        StepType = "SEQUENTIAL",
                        TimeoutHours = 48,
                        IsRequired = true,
                        IsActive = true,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    },
                    new WorkflowStep
                    {
                        Id = Guid.NewGuid(),
                        WorkflowDefinitionId = itFlow.Id,
                        StepOrder = 4,
                        Name = "Procurement Officer Approval",
                        RoleName = "Procurement Officer",
                        RoleId = purchaseRoleId,
                        ApproverType = "ROLE",
                        StepType = "SEQUENTIAL",
                        TimeoutHours = 72,
                        IsRequired = true,
                        IsActive = true,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    }
                );

                // ── ASSET FLOW ────────────────────────────────────
                var assetFlow = new WorkflowDefinition
                {
                    Id = Guid.NewGuid(),
                    Code = "WF-ASSET",
                    Name = "Asset Purchase Request Flow",
                    EntityType = "PURCHASE_REQUEST",
                    IsDefault = false,
                    Priority = 8,
                    CompanyId = null,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                _db.WorkflowDefinitions.Add(assetFlow);

                _db.WorkflowConditions.Add(new WorkflowCondition
                {
                    Id = Guid.NewGuid(),
                    WorkflowDefinitionId = assetFlow.Id,
                    Field = "ItemGroup",
                    Operator = "EQUALS",
                    Value = "ASSET",
                    ValueType = "STRING",
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                });

                _db.WorkflowSteps.AddRange(
                    new WorkflowStep
                    {
                        Id = Guid.NewGuid(),
                        WorkflowDefinitionId = assetFlow.Id,
                        StepOrder = 1,
                        Name = "Manager Approval",
                        RoleName = "Manager",
                        RoleId = managerRoleId,
                        ApproverType = "DEPARTMENT_MANAGER",
                        StepType = "SEQUENTIAL",
                        TimeoutHours = 48,
                        IsRequired = true,
                        IsActive = true,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    },
                    new WorkflowStep
                    {
                        Id = Guid.NewGuid(),
                        WorkflowDefinitionId = assetFlow.Id,
                        StepOrder = 2,
                        Name = "Asset Manager Approval",
                        RoleName = "Asset Manager",
                        RoleId = assetRoleId,
                        ApproverType = "ROLE",
                        StepType = "SEQUENTIAL",
                        TimeoutHours = 48,
                        IsRequired = true,
                        IsActive = true,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    },
                    new WorkflowStep
                    {
                        Id = Guid.NewGuid(),
                        WorkflowDefinitionId = assetFlow.Id,
                        StepOrder = 3,
                        Name = "Budget Approval",
                        RoleName = "Budget Manager",
                        RoleId = budgetRoleId,
                        ApproverType = "ROLE",
                        StepType = "SEQUENTIAL",
                        TimeoutHours = 48,
                        IsRequired = true,
                        IsActive = true,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    },
                    new WorkflowStep
                    {
                        Id = Guid.NewGuid(),
                        WorkflowDefinitionId = assetFlow.Id,
                        StepOrder = 4,
                        Name = "Procurement Officer Approval",
                        RoleName = "Procurement Officer",
                        RoleId = purchaseRoleId,
                        ApproverType = "ROLE",
                        StepType = "SEQUENTIAL",
                        TimeoutHours = 72,
                        IsRequired = true,
                        IsActive = true,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    }
                );

                await _db.SaveChangesAsync();
            }
        }
    }
 