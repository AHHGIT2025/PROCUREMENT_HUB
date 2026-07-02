using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Procurement.Api.Data;
using Procurement.Api.Models;
using System.Security.Claims;

namespace Procurement.Api.Controllers.Dashboard
{
    [Authorize, ApiController, Route("api/dashboard")]
    public class DashboardController : ControllerBase
    {


        private readonly AppDbContext _db;

        public DashboardController(AppDbContext db) => _db = db;

        // GET /api/dashboard
        [HttpGet]
        public async Task<IActionResult> Get()
        {
            var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!Guid.TryParse(userIdClaim, out var userId))
                return Unauthorized(new { success = false, message = "Invalid token." });

            // Resolve roles for the current user
            var userRoles = await _db.UserRoles
                .Where(ur => ur.UserId == userId)
                .Join(_db.Roles, ur => ur.RoleId, r => r.Id, (ur, r) => r.Name)
                .ToListAsync();

            var isAdmin = userRoles.Contains("System Admin");
            var isApprover = userRoles.Any(r =>
                r is "Manager" or "IT Manager" or "Budget Manager" or
                    "Asset Manager" or "Finance Approver" or "Purchase Officer" or
                    "CEO" or "Approver" or "System Admin");

            // ── SUMMARY COUNTS ─────────────────────────────────────────────────────
            var totalRequests = await _db.PurchaseRequests
                .Where(x => x.IsActive && x.Status != RequestStatus.Deleted)
                .CountAsync();

            var draftCount = await _db.PurchaseRequests
                .CountAsync(x => x.IsActive && x.Status == RequestStatus.Draft);

            var pendingCount = await _db.PurchaseRequests
                .CountAsync(x => x.IsActive &&
                    (x.Status == RequestStatus.Submitted ||
                     x.Status == RequestStatus.PendingApproval));

            var approvedCount = await _db.PurchaseRequests
                .CountAsync(x => x.IsActive &&
                    (x.Status == RequestStatus.Approved ||
                     x.Status == RequestStatus.OracleReady ||
                     x.Status == RequestStatus.OraclePosted));

            var rejectedCount = await _db.PurchaseRequests
                .CountAsync(x => x.IsActive && x.Status == RequestStatus.Rejected);

            var returnedCount = await _db.PurchaseRequests
                .CountAsync(x => x.IsActive && x.Status == RequestStatus.Returned);

            // ── MY PENDING APPROVALS (for approver badge) ──────────────────────────
            var myPendingApprovals = isApprover
                ? await _db.ApprovalInstances
                    .CountAsync(i => i.AssignedToId == userId &&
                                     i.Status == "PENDING" &&
                                     i.IsActive)
                : 0;

            // ── MY REQUESTS (for requester) ────────────────────────────────────────
            var myRequestsTotal = await _db.PurchaseRequests
                .CountAsync(x => x.RequestedById == userId &&
                                  x.IsActive &&
                                  x.Status != RequestStatus.Deleted);

            var myRequestsPending = await _db.PurchaseRequests
                .CountAsync(x => x.RequestedById == userId &&
                                  x.IsActive &&
                                  (x.Status == RequestStatus.Submitted ||
                                   x.Status == RequestStatus.PendingApproval));

            var myRequestsDraft = await _db.PurchaseRequests
                .CountAsync(x => x.RequestedById == userId &&
                                  x.IsActive &&
                                  x.Status == RequestStatus.Draft);

            // ── STATUS BREAKDOWN (Bar Chart) ───────────────────────────────────────
            var statusChart = new List<object>
            {
                new { name = "Draft",    value = draftCount,    color = "#94a3b8" },
                new { name = "Pending",  value = pendingCount,  color = "#f59e0b" },
                new { name = "Approved", value = approvedCount, color = "#10b981" },
                new { name = "Rejected", value = rejectedCount, color = "#ef4444" },
                new { name = "Returned", value = returnedCount, color = "#8b5cf6" },
            };

            // ── MONTHLY TREND (Line Chart — last 6 months) ─────────────────────────
            var sixMonthsAgo = DateTime.UtcNow.AddMonths(-5);
            var monthlyRaw = await _db.PurchaseRequests
                .Where(x => x.IsActive &&
                             x.Status != RequestStatus.Deleted &&
                             x.CreatedAt >= new DateTime(sixMonthsAgo.Year, sixMonthsAgo.Month, 1))
                .GroupBy(x => new { x.CreatedAt.Year, x.CreatedAt.Month })
                .Select(g => new
                {
                    year = g.Key.Year,
                    month = g.Key.Month,
                    total = g.Count(),
                    approved = g.Count(x =>
                        x.Status == RequestStatus.Approved ||
                        x.Status == RequestStatus.OracleReady ||
                        x.Status == RequestStatus.OraclePosted),
                    pending = g.Count(x =>
                        x.Status == RequestStatus.Submitted ||
                        x.Status == RequestStatus.PendingApproval)
                })
                .OrderBy(x => x.year).ThenBy(x => x.month)
                .ToListAsync();

            var monthNames = new[] { "", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
                                          "Jul", "Aug", "Sep", "Oct", "Nov", "Dec" };
            var monthlyTrend = monthlyRaw.Select(x => new
            {
                name = $"{monthNames[x.month]} {x.year}",
                total = x.total,
                approved = x.approved,
                pending = x.pending
            }).ToList<object>();

            // ── TOTAL VALUE ────────────────────────────────────────────────────────
            var totalValue = await _db.PurchaseRequests
                .Where(x => x.IsActive && x.Status != RequestStatus.Deleted)
                .SumAsync(x => (decimal?)x.TotalAmount) ?? 0;

            var approvedValue = await _db.PurchaseRequests
                .Where(x => x.IsActive &&
                    (x.Status == RequestStatus.Approved ||
                     x.Status == RequestStatus.OracleReady ||
                     x.Status == RequestStatus.OraclePosted))
                .SumAsync(x => (decimal?)x.TotalAmount) ?? 0;

            // ── RECENT REQUESTS (last 10) ──────────────────────────────────────────
            // Admins see all; requesters see their own
            var recentQuery = _db.PurchaseRequests
                .Where(x => x.IsActive && x.Status != RequestStatus.Deleted);

            if (!isAdmin && !isApprover)
                recentQuery = recentQuery.Where(x => x.RequestedById == userId);

            var recentRequests = await recentQuery
                .OrderByDescending(x => x.CreatedAt)
                .Take(10)
                .Select(x => new
                {
                    id = x.Id,
                    requestNumber = x.RequestNumber,
                    status = x.Status == RequestStatus.Draft ? "Draft"
                           : x.Status == RequestStatus.Submitted ? "Submitted"
                           : x.Status == RequestStatus.PendingApproval ? "Pending Approval"
                           : x.Status == RequestStatus.Approved ? "Approved"
                           : x.Status == RequestStatus.Rejected ? "Rejected"
                           : x.Status == RequestStatus.Returned ? "Returned"
                           : x.Status == RequestStatus.OracleReady ? "Oracle Ready"
                           : x.Status == RequestStatus.OraclePosted ? "Posted"
                           : "Unknown",
                    statusCode = (int)x.Status,
                    totalAmount = x.TotalAmount,
                    justification = x.Justification,
                    createdAt = x.CreatedAt,
                    companyName = _db.Companies
                        .Where(c => c.Id == x.CompanyId)
                        .Select(c => c.Name)
                        .FirstOrDefault() ?? "-",
                    requesterName = _db.Users
                        .Where(u => u.Id == x.RequestedById)
                        .Select(u => u.FullName)
                        .FirstOrDefault() ?? "-"
                })
                .ToListAsync();

            // ── PENDING APPROVALS QUEUE (for approver inbox summary) ───────────────
            var pendingApprovalQueue = isApprover
                ? await _db.ApprovalInstances
                    .Where(i => i.AssignedToId == userId &&
                                 i.Status == "PENDING" &&
                                 i.IsActive)
                    .OrderBy(i => i.DueDate ?? DateTime.MaxValue)
                    .Take(5)
                    .Select(i => new
                    {
                        instanceId = i.Id,
                        prId = i.EntityId,
                        requestNumber = _db.PurchaseRequests
                            .Where(p => p.Id == i.EntityId)
                            .Select(p => p.RequestNumber)
                            .FirstOrDefault() ?? "-",
                        requesterName = _db.PurchaseRequests
                            .Where(p => p.Id == i.EntityId)
                            .Join(_db.Users, p => p.RequestedById, u => u.Id, (p, u) => u.FullName)
                            .FirstOrDefault() ?? "-",
                        totalAmount = _db.PurchaseRequests
                            .Where(p => p.Id == i.EntityId)
                            .Select(p => p.TotalAmount)
                            .FirstOrDefault(),
                        stepName = _db.WorkflowSteps
                            .Where(s => s.Id == i.WorkflowStepId)
                            .Select(s => s.Name)
                            .FirstOrDefault() ?? $"Step {i.StepOrder}",
                        daysWaiting = (int)(DateTime.UtcNow - i.CreatedAt).TotalDays,
                        dueDate = i.DueDate
                    })
                    .ToListAsync<object>()
                : new List<object>();

            // ── TOP COMPANIES BY REQUEST VALUE ─────────────────────────────────────
            var topCompanies = await _db.PurchaseRequests
                .Where(x => x.IsActive && x.Status != RequestStatus.Deleted)
                .GroupBy(x => x.CompanyId)
                .Select(g => new
                {
                    companyId = g.Key,
                    count = g.Count(),
                    totalValue = g.Sum(x => x.TotalAmount)
                })
                .OrderByDescending(x => x.totalValue)
                .Take(5)
                .ToListAsync();

            var topCompaniesWithNames = topCompanies.Select(x => new
            {
                name = _db.Companies
                    .Where(c => c.Id == x.companyId)
                    .Select(c => c.Name)
                    .FirstOrDefault() ?? "Unknown",
                count = x.count,
                totalValue = x.totalValue
            }).ToList<object>();

            return Ok(new
            {
                success = true,
                data = new
                {
                    // Summary cards
                    totalRequests,
                    draftCount,
                    pendingCount,
                    approvedCount,
                    rejectedCount,
                    returnedCount,
                    totalValue,
                    approvedValue,

                    // Approver-specific
                    myPendingApprovals,
                    isApprover,

                    // My requests (requester view)
                    myRequestsTotal,
                    myRequestsPending,
                    myRequestsDraft,

                    // Charts
                    statusChart,
                    monthlyTrend,

                    // Tables
                    recentRequests,
                    pendingApprovalQueue,
                    topCompanies = topCompaniesWithNames,

                    // Meta
                    generatedAt = DateTime.UtcNow,
                    userRoles
                }
            });
        }
    }
}
     
