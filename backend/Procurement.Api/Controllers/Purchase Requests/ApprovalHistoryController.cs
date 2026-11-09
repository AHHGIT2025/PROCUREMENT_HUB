// FILE: Controllers/Purchase Requests/ApprovalHistoryController.cs
// Save under: Procurement.Api/Controllers/Purchase Requests/ApprovalHistoryController.cs
//
// GET /api/purchase-requests/{id}/approval-history
// Any authenticated user can read it (requester, approvers, admins).
// Read-only: no data is written or changed.

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Procurement.Api.Common;
using Procurement.Api.Data;
using Procurement.Api.DTOs.PurchaseRequests;

namespace Procurement.Api.Controllers.PurchaseRequests
{
    [Authorize]
    [ApiController]
    [Route("api/purchase-requests")]
    public class ApprovalHistoryController : ControllerBase
    {
        private readonly AppDbContext _db;

        public ApprovalHistoryController(AppDbContext db)
        {
            _db = db;
        }

        [HttpGet("{id:guid}/approval-history")]
        public async Task<IActionResult> GetApprovalHistory(Guid id)
        {
            var pr = await _db.PurchaseRequests
                .AsNoTracking()
                .Where(x => x.Id == id)
                .Select(x => new { x.Id, x.RequestNumber, x.Status })
                .FirstOrDefaultAsync();

            if (pr == null)
                return NotFound(ApiResponse<ApprovalHistoryDto>.Fail("Purchase request not found."));

            var currentStatus = pr.Status.ToString();

            // All recorded actions (approve / return / reject) for every cycle,
            // including cycles whose instances were deactivated on resubmit.
            var actions = await (
                from aa in _db.ApprovalActions.AsNoTracking()
                join ai in _db.ApprovalInstances.AsNoTracking()
                    on aa.ApprovalInstanceId equals ai.Id
                where ai.EntityId == id
                join ws in _db.WorkflowSteps.AsNoTracking()
                    on ai.WorkflowStepId equals ws.Id into wsj
                from ws in wsj.DefaultIfEmpty()
                join u in _db.Users.AsNoTracking()
                    on aa.ActionBy equals u.Id into uj
                from u in uj.DefaultIfEmpty()
                orderby aa.CreatedAt
                select new
                {
                    aa.ActionType,
                    aa.Comments,
                    aa.CreatedAt,
                    ai.StepOrder,
                    StepName = ws != null ? ws.Name : null,
                    PersonName = u != null ? u.FullName : null
                })
                .ToListAsync();

            // Steps currently waiting for someone (no action recorded yet).
            var pendingSteps = await (
                from ai in _db.ApprovalInstances.AsNoTracking()
                where ai.EntityId == id && ai.IsActive && ai.Status == "PENDING"
                join ws in _db.WorkflowSteps.AsNoTracking()
                    on ai.WorkflowStepId equals ws.Id into wsj
                from ws in wsj.DefaultIfEmpty()
                join u in _db.Users.AsNoTracking()
                    on ai.AssignedToId equals u.Id into uj
                from u in uj.DefaultIfEmpty()
                orderby ai.StepOrder
                select new
                {
                    ai.StepOrder,
                    StepName = ws != null ? ws.Name : null,
                    PersonName = u != null ? u.FullName : null,
                    ai.CreatedAt
                })
                .ToListAsync();

            var attempts = new List<ApprovalAttemptDto>();
            ApprovalAttemptDto? current = null;
            var returnCount = 0;
            var rejectCount = 0;
            ApprovalHistoryLastReturnDto? lastReturn = null;

            foreach (var a in actions)
            {
                if (current == null)
                {
                    current = new ApprovalAttemptDto
                    {
                        AttemptNumber = attempts.Count + 1,
                        StartedAt = a.CreatedAt
                    };
                    attempts.Add(current);
                }

                var actionType = (a.ActionType ?? string.Empty).ToUpperInvariant();

                current.Entries.Add(new ApprovalHistoryEntryDto
                {
                    StepOrder = a.StepOrder,
                    StepName = a.StepName ?? string.Empty,
                    Action = actionType,
                    PersonName = a.PersonName ?? string.Empty,
                    Comments = a.Comments,
                    ActionDate = a.CreatedAt,
                    IsPending = false
                });

                if (actionType == "RETURN")
                {
                    current.Outcome = "RETURNED";
                    current.EndedAt = a.CreatedAt;
                    returnCount++;
                    lastReturn = new ApprovalHistoryLastReturnDto
                    {
                        StepName = a.StepName ?? string.Empty,
                        ReturnedBy = a.PersonName ?? string.Empty,
                        Comments = a.Comments,
                        ReturnedAt = a.CreatedAt
                    };
                    current = null; // the next action belongs to a new attempt
                }
                else if (actionType == "REJECT")
                {
                    current.Outcome = "REJECTED";
                    current.EndedAt = a.CreatedAt;
                    rejectCount++;
                    current = null;
                }
            }

            if (pendingSteps.Count > 0)
            {
                if (current == null)
                {
                    current = new ApprovalAttemptDto
                    {
                        AttemptNumber = attempts.Count + 1,
                        StartedAt = pendingSteps.Min(p => p.CreatedAt)
                    };
                    attempts.Add(current);
                }

                foreach (var p in pendingSteps)
                {
                    current.Entries.Add(new ApprovalHistoryEntryDto
                    {
                        StepOrder = p.StepOrder,
                        StepName = p.StepName ?? string.Empty,
                        Action = "PENDING",
                        PersonName = p.PersonName ?? string.Empty,
                        Comments = null,
                        ActionDate = null,
                        IsPending = true
                    });
                }
            }

            // Last attempt still open: mark it Approved when the request is fully approved.
            var lastAttempt = attempts.LastOrDefault();
            if (lastAttempt != null
                && lastAttempt.Outcome == "IN_PROGRESS"
                && string.Equals(currentStatus, "Approved", StringComparison.OrdinalIgnoreCase))
            {
                lastAttempt.Outcome = "APPROVED";
                lastAttempt.EndedAt = lastAttempt.Entries
                    .Where(e => e.ActionDate.HasValue)
                    .Select(e => e.ActionDate)
                    .LastOrDefault();
            }

            var result = new ApprovalHistoryDto
            {
                RequestId = pr.Id,
                RequestNumber = pr.RequestNumber,
                CurrentStatus = currentStatus,
                TotalAttempts = attempts.Count,
                ReturnCount = returnCount,
                RejectCount = rejectCount,
                LastReturn = lastReturn,
                Attempts = attempts
            };

            return Ok(ApiResponse<ApprovalHistoryDto>.Ok(result));
        }
    }
}
