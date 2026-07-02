using Microsoft.EntityFrameworkCore;
using Procurement.Api.Data;
using Procurement.Api.Models;

namespace Procurement.Api.Services.Workflow
{
    public interface IApprovalEngineService
    {
        Task<EngineResult> StartWorkflowAsync(Guid prId);
        Task<EngineResult> ProcessActionAsync(Guid instanceId, Guid userId, string action, string? comments);
        Task<List<PendingApprovalDto>> GetPendingAsync(Guid userId);
        Task<WorkflowStatusDto> GetStatusAsync(Guid prId);
    }

    public class ApprovalEngineService : IApprovalEngineService
    {
        private readonly AppDbContext _db;
        public ApprovalEngineService(AppDbContext db) => _db = db;

        // ── START WORKFLOW ────────────────────────────────────
        public async Task<EngineResult> StartWorkflowAsync(Guid prId)
        {
            var pr = await _db.PurchaseRequests.FirstOrDefaultAsync(p => p.Id == prId);
            if (pr == null) return Fail("Purchase request not found.");

            var groupNames = await _db.PurchaseRequestItems
                .Where(i => i.PurchaseRequestId == prId)
                .Join(_db.Items,
                    pri => pri.MaterialId,
                    item => item.Id,
                    (pri, item) => item.GroupId)
                .Join(_db.ItemGroups,
                    gid => gid,
                    g => g.Id,
                    (gid, g) => g.Name.ToUpper())
                .Distinct()
                .ToListAsync();

            var workflow = await ResolveWorkflowAsync(pr.CompanyId, groupNames);
            if (workflow == null)
                return Fail("No workflow configured. Please contact IT admin.");

            var steps = await _db.WorkflowSteps
                .Where(s => s.WorkflowDefinitionId == workflow.Id && s.IsActive)
                .OrderBy(s => s.StepOrder)
                .ToListAsync();

            if (!steps.Any())
                return Fail("Workflow has no steps. Please contact IT admin.");

            var firstStep = steps.First();
            var assignedTo = await ResolveApproverAsync(firstStep, pr.CompanyId, pr.RequestedById);
            if (assignedTo == null)
                return Fail($"Cannot find approver for: {firstStep.Name}. Check user roles.");

            _db.ApprovalInstances.Add(new ApprovalInstance
            {
                Id = Guid.NewGuid(),
                EntityId = prId,
                EntityType = "PURCHASE_REQUEST",
                WorkflowDefinitionId = workflow.Id,
                WorkflowStepId = firstStep.Id,
                AssignedToId = assignedTo.Value,
                StepOrder = firstStep.StepOrder,
                Status = "PENDING",
                DueDate = firstStep.TimeoutHours.HasValue
                    ? DateTime.UtcNow.AddHours(firstStep.TimeoutHours.Value)
                    : null,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });

            pr.Status = RequestStatus.PendingApproval;
            pr.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            var approverName = await _db.Users
                .Where(u => u.Id == assignedTo.Value)
                .Select(u => u.FullName)
                .FirstOrDefaultAsync();

            return Ok($"Submitted. Pending approval from {approverName}.", new
            {
                workflowName = workflow.Name,
                firstApprover = approverName,
                totalSteps = steps.Select(s => s.StepOrder).Distinct().Count()
            });
        }

        // ── PROCESS ACTION ────────────────────────────────────
        public async Task<EngineResult> ProcessActionAsync(
            Guid instanceId, Guid userId, string action, string? comments)
        {
            var instance = await _db.ApprovalInstances
                .Include(i => i.WorkflowDefinition)
                    .ThenInclude(w => w!.Steps)
                .FirstOrDefaultAsync(i => i.Id == instanceId);

            if (instance == null) return Fail("Approval instance not found.");
            if (instance.Status != "PENDING") return Fail("This step is no longer pending.");

            if (instance.AssignedToId != userId)
            {
                var stepRoleId = await _db.WorkflowSteps
                    .Where(s => s.Id == instance.WorkflowStepId)
                    .Select(s => s.RoleId)
                    .FirstOrDefaultAsync();

                if (stepRoleId.HasValue)
                {
                    var hasRole = await _db.UserRoles
                        .AnyAsync(ur => ur.UserId == userId && ur.RoleId == stepRoleId.Value);
                    if (!hasRole)
                        return Fail("You are not authorised to act on this request.");
                }
                else return Fail("You are not authorised to act on this request.");
            }

            _db.ApprovalActions.Add(new ApprovalAction
            {
                Id = Guid.NewGuid(),
                ApprovalInstanceId = instanceId,
                ActionBy = userId,
                ActionType = action.ToUpper(),
                Comments = comments,
                CreatedAt = DateTime.UtcNow
            });

            if (action.ToUpper() == "REJECT")
            {
                instance.Status = "REJECTED";
                instance.CompletedAt = DateTime.UtcNow;
                instance.UpdatedAt = DateTime.UtcNow;
                await CancelOtherPendingAsync(instance.EntityId, instanceId);
                await UpdatePrStatusAsync(instance.EntityId, RequestStatus.Rejected);
                await SendNotificationAsync(
                    instance.EntityId,
                    "❌ Request Rejected",
                    $"Your purchase request has been rejected at step '{GetStepName(instance)}'. Reason: {comments ?? "No comments"}. Please create a new request.");
                await _db.SaveChangesAsync();
                return Ok("Request rejected.");
            }

            if (action.ToUpper() == "RETURN")
            {
                instance.Status = "RETURNED";
                instance.CompletedAt = DateTime.UtcNow;
                instance.UpdatedAt = DateTime.UtcNow;
                await CancelOtherPendingAsync(instance.EntityId, instanceId);
                await UpdatePrStatusAsync(instance.EntityId, RequestStatus.Returned);
                await SendNotificationAsync(
                    instance.EntityId,
                    "↩ Request Returned for Correction",
                    $"Your purchase request has been returned at step '{GetStepName(instance)}'. Comments: {comments ?? "No comments"}. Please correct and resubmit.");
                await _db.SaveChangesAsync();
                return Ok("Request returned to requester.");
            }

            // APPROVE
            instance.Status = "APPROVED";
            instance.CompletedAt = DateTime.UtcNow;
            instance.UpdatedAt = DateTime.UtcNow;

            var allSteps = instance.WorkflowDefinition!.Steps
                .Where(s => s.IsActive)
                .OrderBy(s => s.StepOrder)
                .ToList();

            var nextStepOrder = allSteps
                .Where(s => s.StepOrder > instance.StepOrder)
                .Select(s => s.StepOrder)
                .DefaultIfEmpty(0)
                .Min();

            if (nextStepOrder == 0)
            {
                await UpdatePrStatusAsync(instance.EntityId, RequestStatus.Approved);
                await SendNotificationAsync(
                    instance.EntityId,
                    "✅ Request Fully Approved",
                    "Your purchase request has been approved by all approvers.");
                await _db.SaveChangesAsync();
                return Ok("Request fully approved! ✅", new { completed = true });
            }

            var nextStep = allSteps.First(s => s.StepOrder == nextStepOrder);
            var pr = await _db.PurchaseRequests.FindAsync(instance.EntityId);
            var nextUser = await ResolveApproverAsync(nextStep, pr!.CompanyId, pr.RequestedById);

            if (nextUser == null)
            {
                await _db.SaveChangesAsync();
                return Fail($"Cannot find approver for next step: {nextStep.Name}");
            }

            _db.ApprovalInstances.Add(new ApprovalInstance
            {
                Id = Guid.NewGuid(),
                EntityId = instance.EntityId,
                EntityType = "PURCHASE_REQUEST",
                WorkflowDefinitionId = instance.WorkflowDefinitionId,
                WorkflowStepId = nextStep.Id,
                AssignedToId = nextUser.Value,
                StepOrder = nextStep.StepOrder,
                Status = "PENDING",
                DueDate = nextStep.TimeoutHours.HasValue
                    ? DateTime.UtcNow.AddHours(nextStep.TimeoutHours.Value)
                    : null,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });

            await _db.SaveChangesAsync();

            var nextApproverName = await _db.Users
                .Where(u => u.Id == nextUser.Value)
                .Select(u => u.FullName)
                .FirstOrDefaultAsync();

            return Ok($"Approved. Forwarded to {nextApproverName}.", new
            {
                nextApprover = nextApproverName,
                nextStep = nextStep.Name
            });
        }

        // ── GET PENDING ───────────────────────────────────────
        public async Task<List<PendingApprovalDto>> GetPendingAsync(Guid userId)
        {
            var instances = await _db.ApprovalInstances
                .Where(i => i.AssignedToId == userId
                         && i.Status == "PENDING"
                         && i.IsActive)
                .OrderBy(i => i.DueDate ?? DateTime.MaxValue)
                .ToListAsync();

            var result = new List<PendingApprovalDto>();

            foreach (var inst in instances)
            {
                var pr = await _db.PurchaseRequests
                    .Where(p => p.Id == inst.EntityId)
                    .Select(p => new
                    {
                        p.RequestNumber,
                        p.TotalAmount,
                        p.CreatedAt,
                        RequesterName = _db.Users
                            .Where(u => u.Id == p.RequestedById)
                            .Select(u => u.FullName).FirstOrDefault(),
                        CompanyName = _db.Companies
                            .Where(c => c.Id == p.CompanyId)
                            .Select(c => c.Name).FirstOrDefault(),
                        ProjectName = _db.Projects
                            .Where(proj => proj.Id == p.ProjectId)
                            .Select(proj => proj.Name).FirstOrDefault() ?? "-"
                    })
                    .FirstOrDefaultAsync();

                if (pr == null) continue;

                var stepName = await _db.WorkflowSteps
                    .Where(s => s.Id == inst.WorkflowStepId)
                    .Select(s => s.Name)
                    .FirstOrDefaultAsync() ?? "Approval";

                result.Add(new PendingApprovalDto
                {
                    InstanceId = inst.Id,
                    PrId = inst.EntityId,
                    RequestNumber = pr.RequestNumber,
                    RequesterName = pr.RequesterName ?? "-",
                    CompanyName = pr.CompanyName ?? "-",
                    ProjectName = pr.ProjectName,
                    TotalAmount = pr.TotalAmount,
                    StepName = stepName,
                    StepOrder = inst.StepOrder,
                    DueDate = inst.DueDate,
                    DaysWaiting = (int)(DateTime.UtcNow - inst.CreatedAt).TotalDays
                });
            }

            return result;
        }

        // ── GET STATUS ────────────────────────────────────────
        public async Task<WorkflowStatusDto> GetStatusAsync(Guid prId)
        {
            var pr = await _db.PurchaseRequests
                .Where(p => p.Id == prId)
                .Select(p => new { p.RequestNumber, p.Status })
                .FirstOrDefaultAsync();

            var instances = await _db.ApprovalInstances
                .Where(i => i.EntityId == prId && i.IsActive)
                .OrderBy(i => i.StepOrder)
                .ToListAsync();

            var steps = new List<StepStatusDto>();

            foreach (var inst in instances)
            {
                var stepName = await _db.WorkflowSteps
                    .Where(s => s.Id == inst.WorkflowStepId)
                    .Select(s => s.Name)
                    .FirstOrDefaultAsync() ?? $"Step {inst.StepOrder}";

                var approverName = await _db.Users
                    .Where(u => u.Id == inst.AssignedToId)
                    .Select(u => u.FullName)
                    .FirstOrDefaultAsync() ?? "-";

                var lastAction = await _db.ApprovalActions
                    .Where(a => a.ApprovalInstanceId == inst.Id)
                    .OrderByDescending(a => a.CreatedAt)
                    .Select(a => new { a.ActionType, a.Comments, a.CreatedAt })
                    .FirstOrDefaultAsync();

                steps.Add(new StepStatusDto
                {
                    StepOrder = inst.StepOrder,
                    StepName = stepName,
                    ApproverName = approverName,
                    Status = inst.Status,
                    Comments = lastAction?.Comments,
                    ActedAt = lastAction?.CreatedAt,
                    IsCurrent = inst.Status == "PENDING",
                    IsDone = inst.Status == "APPROVED"
                });
            }

            return new WorkflowStatusDto
            {
                PrId = prId,
                RequestNumber = pr?.RequestNumber ?? "-",
                Status = pr?.Status.ToString() ?? "-",
                Steps = steps,
                CurrentStep = steps.FirstOrDefault(s => s.IsCurrent)?.StepName
                    ?? (pr?.Status == RequestStatus.Approved ? "Completed ✅" : "-")
            };
        }

        private async Task<WorkflowDefinition?> ResolveWorkflowAsync(
    Guid companyId, List<string> groupNames)
        {
            var allWorkflows = await _db.WorkflowDefinitions
                .Include(w => w.Conditions)
                .Include(w => w.Steps.Where(s => s.IsActive))
                .Where(w => w.IsActive && w.EntityType == "PURCHASE_REQUEST" &&
                            (w.CompanyId == null || w.CompanyId == companyId))
                .ToListAsync();

            // ── NEW: Category-based routing (primary) ──────────────────────────
            // Get distinct category codes for all items in this PR's groups
            var categoryCodes = await _db.ItemGroups
                .Where(g => groupNames.Contains(g.Name.ToUpper()) && g.CategoryId != null)
                .Select(g => g.Category!.Code.ToUpper())
                .Distinct()
                .ToListAsync();

            if (categoryCodes.Any())
            {
                foreach (var workflow in allWorkflows.OrderByDescending(w => w.Priority))
                {
                    var match = workflow.Conditions.Any(c =>
                        c.Field == "ItemCategory" &&
                        c.Operator == "EQUALS" &&
                        categoryCodes.Contains(c.Value.ToUpper()));

                    if (match)
                    {
                        // Company-specific wins over global
                        var companySpecific = allWorkflows
                            .Where(w => w.CompanyId == companyId)
                            .OrderByDescending(w => w.Priority)
                            .FirstOrDefault(w => w.Conditions.Any(c =>
                                c.Field == "ItemCategory" &&
                                c.Operator == "EQUALS" &&
                                categoryCodes.Contains(c.Value.ToUpper())));

                        return companySpecific ?? workflow;
                    }
                }
            }

            // ── FALLBACK: existing group-name-based routing (unchanged) ────────
            foreach (var workflow in allWorkflows.OrderByDescending(w => w.Priority))
            {
                if (!workflow.Conditions.Any()) continue;

                var allMatch = workflow.Conditions.All(condition =>
                {
                    if (condition.Field == "ItemGroup" && condition.Operator == "EQUALS")
                        return groupNames.Contains(condition.Value.ToUpper());
                    return true;
                });

                if (allMatch)
                    return workflow;
            }

            // ── DEFAULT: IsDefault = true workflow ─────────────────────────────
            return allWorkflows
                .Where(w => w.IsDefault)
                .OrderByDescending(w => w.CompanyId == companyId)
                .ThenByDescending(w => w.Priority)
                .FirstOrDefault();
        }

        // ── PRIVATE HELPERS ───────────────────────────────────

        //   private async Task<WorkflowDefinition?> ResolveWorkflowAsync(
        //       Guid companyId, List<string> groupNames)
        //   {
        //       var workflows = await _db.WorkflowDefinitions
        //           .Include(w => w.Conditions)
        //           .Include(w => w.Steps)
        //           .Where(w => w.IsActive
        //                    && w.EntityType == "PURCHASE_REQUEST"
        //                    && (w.CompanyId == companyId || w.CompanyId == null))
        //           .OrderByDescending(w => w.Priority)
        //           .ToListAsync();

        //       foreach (var wf in workflows.Where(w => !w.IsDefault))
        //       {
        //           if (!wf.Conditions.Any()) continue;

        //           bool match = wf.Conditions.Any(c =>
        //               c.Field == "ItemGroup" &&
        //               c.Operator == "EQUALS" &&
        //               groupNames.Contains(c.Value.ToUpper()));

        //           if (match) return wf;
        //       }

        //       return workflows
        //.Where(w => w.IsDefault)
        //.OrderByDescending(w => w.CompanyId == companyId)   // ✅ company-specific default wins over global default
        //.ThenByDescending(w => w.Priority)
        //.FirstOrDefault();
        //   }

        private async Task<Guid?> ResolveApproverAsync(
            WorkflowStep step, Guid companyId, Guid requestedById)
        {
            if (step.ApproverType == "DEPARTMENT_MANAGER")
            {
                return await _db.Users
                    .Where(u => u.Id == requestedById)
                    .Select(u => u.ManagerId)
                    .FirstOrDefaultAsync();
            }

            if (step.RoleId.HasValue)
                return await ResolveByRoleAsync(step.RoleId.Value, companyId);

            if (!string.IsNullOrEmpty(step.RoleName))
            {
                var roleId = await _db.Roles
                    .Where(r => r.Name == step.RoleName && r.IsActive)
                    .Select(r => r.Id)
                    .FirstOrDefaultAsync();

                if (roleId == Guid.Empty) return null;

                return await ResolveByRoleAsync(roleId, companyId);
            }

            return null;
        }

        //private async Task<Guid?> ResolveByRoleAsync(Guid roleId, Guid companyId)
        //{
        //    var usersWithRole = await _db.UserRoles
        //        .Where(ur => ur.RoleId == roleId && ur.IsActive)
        //        .Select(ur => ur.UserId)
        //        .ToListAsync();

        //    if (!usersWithRole.Any()) return null;

        //    var user = await _db.UserCompanies
        //        .Where(uc =>
        //            usersWithRole.Contains(uc.UserId) &&
        //            uc.CompanyId == companyId &&
        //            uc.IsActive)
        //        .Select(uc => (Guid?)uc.UserId)
        //        .FirstOrDefaultAsync();

        //    if (user == null)
        //    {
        //        user = await _db.Users
        //            .Where(u =>
        //                usersWithRole.Contains(u.Id) &&
        //                u.CompanyId == companyId &&
        //                u.IsActive)
        //            .Select(u => (Guid?)u.Id)
        //            .FirstOrDefaultAsync();
        //    }

        //    return user;
        //}
        private async Task<Guid?> ResolveByRoleAsync(Guid roleId, Guid companyId)
        {
            var usersWithRole = await _db.UserRoles
                .Where(ur => ur.RoleId == roleId && ur.IsActive)
                .Select(ur => ur.UserId)
                .ToListAsync();

            if (!usersWithRole.Any()) return null;

            // Tier 1: exact company match
            var user = await _db.UserCompanies
                .Where(uc =>
                    usersWithRole.Contains(uc.UserId) &&
                    uc.CompanyId == companyId &&
                    uc.IsActive)
                .Select(uc => (Guid?)uc.UserId)
                .FirstOrDefaultAsync();

            if (user != null) return user;

            // Tier 2: legacy direct Company.Id match on Users (kept for backward compat)
            user = await _db.Users
                .Where(u =>
                    usersWithRole.Contains(u.Id) &&
                    u.CompanyId == companyId &&
                    u.IsActive)
                .Select(u => (Guid?)u.Id)
                .FirstOrDefaultAsync();

            if (user != null) return user;

            // Tier 3: Holding-level fallback — small/single-person companies (e.g. Hayak Cafe,
            // Archi Cafe) often share one Budget Manager / Purchase Officer based at the
            // holding's head office (HLD01) rather than having a dedicated person per company.
            var holdingId = await _db.Companies
                .Where(c => c.Id == companyId)
                .Select(c => (Guid?)c.HoldingId)
                .FirstOrDefaultAsync();

            if (holdingId == null) return null;

            var headOfficeCompanyId = await _db.Holdings
                .Where(h => h.Id == holdingId.Value)
                .Select(h => h.HeadOfficeCompanyId)
                .FirstOrDefaultAsync();

            if (headOfficeCompanyId == null || headOfficeCompanyId == companyId)
                return null;   // no head office configured, or we already checked it above

            user = await _db.UserCompanies
                .Where(uc =>
                    usersWithRole.Contains(uc.UserId) &&
                    uc.CompanyId == headOfficeCompanyId.Value &&
                    uc.IsActive)
                .Select(uc => (Guid?)uc.UserId)
                .FirstOrDefaultAsync();

            return user;
        }
        private async Task CancelOtherPendingAsync(Guid entityId, Guid excludeId)
        {
            var others = await _db.ApprovalInstances
                .Where(i => i.EntityId == entityId
                         && i.Status == "PENDING"
                         && i.Id != excludeId)
                .ToListAsync();

            foreach (var o in others)
            {
                o.Status = "SKIPPED";
                o.CompletedAt = DateTime.UtcNow;
                o.UpdatedAt = DateTime.UtcNow;
            }
        }

        private async Task UpdatePrStatusAsync(Guid prId, RequestStatus status)
        {
            var pr = await _db.PurchaseRequests.FindAsync(prId);
            if (pr != null) { pr.Status = status; pr.UpdatedAt = DateTime.UtcNow; }
        }

        private string GetStepName(ApprovalInstance instance)
        {
            return _db.WorkflowSteps
                .Where(s => s.Id == instance.WorkflowStepId)
                .Select(s => s.Name)
                .FirstOrDefault() ?? $"Step {instance.StepOrder}";
        }

        private async Task SendNotificationAsync(Guid prId, string title, string message)
        {
            var requestedById = await _db.PurchaseRequests
                .Where(p => p.Id == prId)
                .Select(p => p.RequestedById)
                .FirstOrDefaultAsync();

            if (requestedById == Guid.Empty) return;

            _db.Notifications.Add(new Procurement.Api.Models.Notification
            {
                Id = Guid.NewGuid(),
                UserId = requestedById,
                Title = title,
                Message = message,
                IsRead = false,
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });
        }

        private static EngineResult Ok(string message, object? data = null) =>
            new() { Success = true, Message = message, Data = data };

        private static EngineResult Fail(string message) =>
            new() { Success = false, Message = message };

    } // ← ApprovalEngineService class close

    // ── DTOs ─────────────────────────────────────────────────

    public class EngineResult
    {
        public bool Success { get; set; }
        public string Message { get; set; } = "";
        public object? Data { get; set; }
    }

    public class PendingApprovalDto
    {
        public Guid InstanceId { get; set; }
        public Guid PrId { get; set; }
        public string RequestNumber { get; set; } = "";
        public string RequesterName { get; set; } = "";
        public string CompanyName { get; set; } = "";
        public string ProjectName { get; set; } = "";
        public decimal TotalAmount { get; set; }
        public string StepName { get; set; } = "";
        public int StepOrder { get; set; }
        public DateTime? DueDate { get; set; }
        public int DaysWaiting { get; set; }
    }

    public class WorkflowStatusDto
    {
        public Guid PrId { get; set; }
        public string RequestNumber { get; set; } = "";
        public string Status { get; set; } = "";
        public string CurrentStep { get; set; } = "";
        public List<StepStatusDto> Steps { get; set; } = new();
    }

    public class StepStatusDto
    {
        public int StepOrder { get; set; }
        public string StepName { get; set; } = "";
        public string ApproverName { get; set; } = "";
        public string Status { get; set; } = "";
        public string? Comments { get; set; }
        public DateTime? ActedAt { get; set; }
        public bool IsCurrent { get; set; }
        public bool IsDone { get; set; }
    }

} // ← namespace close