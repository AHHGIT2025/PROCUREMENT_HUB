using Microsoft.EntityFrameworkCore;
using Procurement.Api.Data;
using Procurement.Api.Models;
using Procurement.Api.Models.PurchaseRequests;

namespace Procurement.Api.Services.Workflow
{
    public interface IApprovalEngineService
    {
        Task<EngineResult> StartWorkflowAsync(Guid prId);
        Task<EngineResult> ProcessActionAsync(Guid instanceId, Guid userId, string action, string? comments);
        Task<List<PendingApprovalDto>> GetPendingAsync(Guid userId);
        Task<WorkflowStatusDto> GetStatusAsync(Guid prId);

        // ✅ NEW — dedicated path for STORE_VERIFICATION steps.
        // Does not touch StartWorkflowAsync / ProcessActionAsync at all.
        Task<EngineResult> ProcessStoreVerificationAsync(
            Guid instanceId, Guid userId, List<StoreVerifyItemInput> items);
    }

    public class ApprovalEngineService : IApprovalEngineService
    {
        private readonly AppDbContext _db;
        public ApprovalEngineService(AppDbContext db) => _db = db;

        // ── START WORKFLOW ──────────────────────────────────── (UNCHANGED)
        public async Task<EngineResult> StartWorkflowAsync(Guid prId)
        {
            var pr = await _db.PurchaseRequests.FirstOrDefaultAsync(p => p.Id == prId);
            if (pr == null) return Fail("Purchase request not found.");

            var itemCategoryData = await _db.PurchaseRequestItems
                .Where(pri => pri.PurchaseRequestId == prId)
                .Join(_db.Items,
                    pri => pri.MaterialId,
                    item => item.Id,
                    (pri, item) => new { item.CategoryId, item.GroupId })
                .ToListAsync();

            var directCategoryIds = itemCategoryData
                .Where(x => x.CategoryId != null)
                .Select(x => x.CategoryId!.Value)
                .Distinct()
                .ToList();

            var groupIdsNeedingFallback = itemCategoryData
                .Where(x => x.CategoryId == null && x.GroupId != null)
                .Select(x => x.GroupId!.Value)
                .Distinct()
                .ToList();

            var fallbackCategoryIds = groupIdsNeedingFallback.Any()
                ? await _db.ItemGroups
                    .Where(g => groupIdsNeedingFallback.Contains(g.Id) && g.CategoryId != null)
                    .Select(g => g.CategoryId!.Value)
                    .Distinct()
                    .ToListAsync()
                : new List<Guid>();

            var allCategoryIds = directCategoryIds.Union(fallbackCategoryIds).Distinct().ToList();

            var categoryCodes = allCategoryIds.Any()
                ? await _db.ItemCategories
                    .Where(c => allCategoryIds.Contains(c.Id))
                    .Select(c => c.Code.ToUpper())
                    .Distinct()
                    .ToListAsync()
                : new List<string>();

            var groupNames = await _db.PurchaseRequestItems
                .Where(i => i.PurchaseRequestId == prId)
                .Join(_db.Items, pri => pri.MaterialId, item => item.Id, (pri, item) => item.GroupId)
                .Join(_db.ItemGroups, gid => gid, g => g.Id, (gid, g) => g.Name.ToUpper())
                .Distinct()
                .ToListAsync();

            var workflow = await ResolveWorkflowAsync(pr.CompanyId, categoryCodes, groupNames);
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

        // ── PROCESS ACTION ──────────────────────────────────── (UNCHANGED)
        public async Task<EngineResult> ProcessActionAsync(
            Guid instanceId, Guid userId, string action, string? comments)
        {
            var instance = await _db.ApprovalInstances
                .Include(i => i.WorkflowDefinition)
                    .ThenInclude(w => w!.Steps)
                .FirstOrDefaultAsync(i => i.Id == instanceId);

            if (instance == null) return Fail("Approval instance not found.");
            if (instance.Status != "PENDING") return Fail("This step is no longer pending.");

            // ✅ Guard: STORE_VERIFICATION steps must go through
            // ProcessStoreVerificationAsync (records per-item stock findings).
            // This prevents a Store Keeper from accidentally approving via
            // the normal Approvals inbox and skipping the stock check.
            var stepApproverType = await _db.WorkflowSteps
                .Where(s => s.Id == instance.WorkflowStepId)
                .Select(s => s.ApproverType)
                .FirstOrDefaultAsync();

            if (stepApproverType == "STORE_VERIFICATION")
                return Fail("This is a Store Verification step. Please use the Store Verification page to record stock findings.");

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

        // ✅ NEW — separate entry point for Store Verification steps.
        // Completely independent from ProcessActionAsync above — that method
        // is untouched. Called only when the pending step's ApproverType is
        // STORE_VERIFICATION.
        //
        // Behaviour:
        //  1. Saves per-item stock findings onto PurchaseRequestItems.
        //  2. If every active item on the request is now fully covered by
        //     stock (PurchaseQty <= 0 for all) → the request closes here:
        //     Status = FulfilledFromStock, remaining workflow steps are
        //     cancelled. No purchase approval needed.
        //  3. Otherwise → behaves exactly like a normal APPROVE: this step
        //     is marked APPROVED and the workflow advances to whatever step
        //     comes next (Budget Manager, Purchase Manager, etc. — same
        //     resolution logic as ProcessActionAsync, duplicated here only
        //     to avoid touching the tested APPROVE path above).
        public async Task<EngineResult> ProcessStoreVerificationAsync(
            Guid instanceId, Guid userId, List<StoreVerifyItemInput> items)
        {
            var instance = await _db.ApprovalInstances
                .Include(i => i.WorkflowDefinition)
                    .ThenInclude(w => w!.Steps)
                .FirstOrDefaultAsync(i => i.Id == instanceId);

            if (instance == null) return Fail("Approval instance not found.");
            if (instance.Status != "PENDING") return Fail("This step is no longer pending.");

            var step = await _db.WorkflowSteps.FindAsync(instance.WorkflowStepId);
            if (step == null || step.ApproverType != "STORE_VERIFICATION")
                return Fail("This step is not a Store Verification step.");

            if (instance.AssignedToId != userId)
            {
                var hasRole = step.RoleId.HasValue &&
                    await _db.UserRoles.AnyAsync(ur => ur.UserId == userId && ur.RoleId == step.RoleId.Value);
                if (!hasRole)
                    return Fail("You are not authorised to act on this request.");
            }

            // ── Save per-item stock findings ──────────────────────────────
            var prItems = await _db.PurchaseRequestItems
                .Where(i => i.PurchaseRequestId == instance.EntityId && i.IsActive)
                .ToListAsync();

            foreach (var input in items)
            {
                var item = prItems.FirstOrDefault(i => i.Id == input.ItemId);
                if (item == null) continue;

                if (input.AvailableQty < 0 || input.AvailableQty > item.Quantity)
                    return Fail($"Invalid available quantity for item {item.MaterialId}.");

                item.StoreStatus = (StoreItemStatus)input.StoreStatus;
                item.AvailableQty = input.AvailableQty;
                item.PurchaseQty = item.Quantity - input.AvailableQty;
                item.StoreRemarks = input.StoreRemarks;
                item.StoreVerifiedById = userId;
                item.StoreVerifiedAt = DateTime.UtcNow;
                item.UpdatedAt = DateTime.UtcNow;
            }

            var unverified = prItems.Count(i => i.StoreStatus == StoreItemStatus.NotChecked);
            if (unverified > 0)
                return Fail($"{unverified} item(s) still need to be verified before submitting.");

            _db.ApprovalActions.Add(new ApprovalAction
            {
                Id = Guid.NewGuid(),
                ApprovalInstanceId = instanceId,
                ActionBy = userId,
                ActionType = "STORE_VERIFIED",
                Comments = "Store verification recorded",
                CreatedAt = DateTime.UtcNow
            });

            instance.Status = "APPROVED";
            instance.CompletedAt = DateTime.UtcNow;
            instance.UpdatedAt = DateTime.UtcNow;

            var allFullyStocked = prItems.All(i => i.PurchaseQty <= 0);

            var pr = await _db.PurchaseRequests.FindAsync(instance.EntityId);

            if (allFullyStocked)
            {
                // Full stock — close the request here. Does not proceed to
                // Budget Manager / Purchase Manager / any remaining step.
                await CancelOtherPendingAsync(instance.EntityId, instanceId);
                pr!.Status = RequestStatus.FulfilledFromStock;
                pr.UpdatedAt = DateTime.UtcNow;
                await SendNotificationAsync(
                    instance.EntityId,
                    "📦 Fulfilled from Stock",
                    "All items were fully available in store. Your request is complete — no purchase needed.");
                await _db.SaveChangesAsync();
                return Ok("All items fully available in store. Request closed.", new { fulfilledFromStock = true });
            }

            // Partial / no stock — continue the workflow exactly like a normal approve.
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
                    "Store verification complete. Remaining quantity approved for purchase.");
                await _db.SaveChangesAsync();
                return Ok("Store verification complete. Request fully approved for purchase.", new { completed = true });
            }

            var nextStep = allSteps.First(s => s.StepOrder == nextStepOrder);
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

            return Ok($"Store verification recorded. Forwarded to {nextApproverName}.", new
            {
                nextApprover = nextApproverName,
                nextStep = nextStep.Name,
                fulfilledFromStock = false
            });
        }

        // ── GET PENDING ──────────────────────────────────────
        // ✅ EXTENDED: added ApproverType to the DTO so the frontend can tell
        // a normal approval apart from a Store Verification step. Nothing
        // else in this method changed.
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
                        p.DeliveryLocation,
                        p.ContactNumber,
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

                var stepInfo = await _db.WorkflowSteps
                    .Where(s => s.Id == inst.WorkflowStepId)
                    .Select(s => new { s.Name, s.ApproverType })
                    .FirstOrDefaultAsync();

                result.Add(new PendingApprovalDto
                {
                    InstanceId = inst.Id,
                    PrId = inst.EntityId,
                    RequestNumber = pr.RequestNumber,
                    RequesterName = pr.RequesterName ?? "-",
                    CompanyName = pr.CompanyName ?? "-",
                    ProjectName = pr.ProjectName,
                    TotalAmount = pr.TotalAmount,
                    DeliveryLocation = pr.DeliveryLocation,   // ✅ NEW
                    ContactNumber = pr.ContactNumber,         // ✅ NEW
                    StepName = stepInfo?.Name ?? "Approval",
                    ApproverType = stepInfo?.ApproverType ?? "ROLE",
                    StepOrder = inst.StepOrder,
                    DueDate = inst.DueDate,
                    DaysWaiting = (int)(DateTime.UtcNow - inst.CreatedAt).TotalDays
                });
            }

            return result;
        }

        // ── GET STATUS ─────────────────────────────────────── (UNCHANGED)
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
         Guid companyId, List<string> categoryCodes, List<string> groupNames)
        {
            var allWorkflows = await _db.WorkflowDefinitions
                .Include(w => w.Conditions)
                .Include(w => w.Steps.Where(s => s.IsActive))
                .Where(w => w.IsActive && w.EntityType == "PURCHASE_REQUEST" &&
                            (w.CompanyId == null || w.CompanyId == companyId))
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

            foreach (var workflow in allWorkflows.OrderByDescending(w => w.Priority))
            {
                var groupConditions = workflow.Conditions
                    .Where(c => c.Field == "ItemGroup" && c.Operator == "EQUALS")
                    .ToList();

                if (!groupConditions.Any()) continue;

                var allMatch = groupConditions.All(c => groupNames.Contains(c.Value.ToUpper()));

                if (allMatch)
                    return workflow;
            }

            return allWorkflows
                .Where(w => w.IsDefault)
                .OrderByDescending(w => w.CompanyId == companyId)
                .ThenByDescending(w => w.Priority)
                .FirstOrDefault();
        }

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

            // ✅ STORE_VERIFICATION falls through to the same RoleId/RoleName
            // resolution below as ROLE steps — no special-casing needed here.
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

        private async Task<Guid?> ResolveByRoleAsync(Guid roleId, Guid companyId)
        {
            var usersWithRole = await _db.UserRoles
                .Where(ur => ur.RoleId == roleId && ur.IsActive)
                .Select(ur => ur.UserId)
                .ToListAsync();

            if (!usersWithRole.Any()) return null;

            var user = await _db.UserCompanies
                .Where(uc =>
                    usersWithRole.Contains(uc.UserId) &&
                    uc.CompanyId == companyId &&
                    uc.IsActive)
                .Select(uc => (Guid?)uc.UserId)
                .FirstOrDefaultAsync();

            if (user != null) return user;

            user = await _db.Users
                .Where(u =>
                    usersWithRole.Contains(u.Id) &&
                    u.CompanyId == companyId &&
                    u.IsActive)
                .Select(u => (Guid?)u.Id)
                .FirstOrDefaultAsync();

            if (user != null) return user;

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
                return null;

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
        public string ApproverType { get; set; } = "ROLE";   // ✅ NEW
        public int StepOrder { get; set; }
        public DateTime? DueDate { get; set; }
        public int DaysWaiting { get; set; }
        public string DeliveryLocation { get; set; } = "";
        public string ContactNumber { get; set; } = "";
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

    // ✅ NEW — input shape for a single item's store verification result
    public class StoreVerifyItemInput
    {
        public Guid ItemId { get; set; }       // PurchaseRequestItem.Id
        public int StoreStatus { get; set; }   // 1=StockAvailable, 2=PartiallyAvailable, 3=NotAvailable
        public decimal AvailableQty { get; set; }
        public string? StoreRemarks { get; set; }
    }

} // ← namespace close