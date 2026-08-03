using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Procurement.Api.Data;
using Procurement.Api.Models;
using System.Security.Claims;

namespace Procurement.Api.Controllers.PurchaseRequests
{
    [Authorize]
    [ApiController]
    [Route("api/procurement")]
    public class ProcurementController : ControllerBase
    {
        private readonly AppDbContext _db;
        public ProcurementController(AppDbContext db) => _db = db;

        private Guid? CurrentUserId()
        {
            var c = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return c != null ? Guid.Parse(c) : null;
        }

        // ── GET: All approved PRs for procurement team ────────
        // GET /api/procurement/queue

        [HttpGet("queue")]
        
        public async Task<IActionResult> GetQueue()
        {
            var userId = CurrentUserId();
            if (userId == null) return Unauthorized();

            // All PRs that are approved or beyond — procurement team manages these
            var list = await _db.PurchaseRequests
                .Where(x => x.IsActive &&
                           (x.Status == RequestStatus.Approved ||
                            x.Status == RequestStatus.OracleReady ||
                            x.Status == RequestStatus.OraclePosted))
                .OrderByDescending(x => x.CreatedAt)
                .Select(x => new
                {
                    id = x.Id,
                    requestNumber = x.RequestNumber,
                    status = x.Status == RequestStatus.Approved ? "Approved"
                           : x.Status == RequestStatus.OracleReady ? "Oracle Ready"
                           : x.Status == RequestStatus.OraclePosted ? "PO Issued"
                           : "Unknown",
                    totalAmount = x.TotalAmount,
                    createdAt = x.CreatedAt,
                    justification = x.Justification,
                    companyId = x.CompanyId,
                    companyName = _db.Companies
                        .Where(c => c.Id == x.CompanyId)
                        .Select(c => c.Name)
                        .FirstOrDefault() ?? "-",
                    projectId = x.ProjectId,
                    requesterName = _db.Users
                        .Where(u => u.Id == x.RequestedById)
                        .Select(u => u.FullName)
                        .FirstOrDefault() ?? "-",

                    // No pending approval instance needed — already approved
                    approvalInstanceId = (Guid?)null,

                    assignmentStatus = x.AssignmentStatus ?? "UNASSIGNED",
                    assignmentNote = x.AssignmentNote,
                    assignedAt = x.AssignedAt,
                    assignedToId = x.AssignedToId,
                    assignedToName = x.AssignedToId != null
                        ? _db.Users.Where(u => u.Id == x.AssignedToId)
                                   .Select(u => u.FullName).FirstOrDefault()
                        : null,

                    poNumber = x.PoNumber,
                    poStatus = x.PoStatus ?? "PENDING",
                    poRemarks = x.PoRemarks,
                    poUpdatedAt = x.PoUpdatedAt,

                    // ── canUpdatePO now also checks whether this MR still has
                    // any unconverted quantity left. Previously this was based
                    // on PR status alone, so "Convert to PO" kept showing even
                    // after every item had already been fully pulled into POs.
                    //
                    // ── FIXED: added po.SupersededByPoId == null — without
                    // this, a superseded PO's qty was still being counted as
                    // "allocated" (double-counted alongside its replacement
                    // revision), pushing the allocated sum past the original
                    // qty and wrongly making the MR look fully converted even
                    // when real remaining quantity existed.
                    canUpdatePO = (x.Status == RequestStatus.Approved ||
                                   x.Status == RequestStatus.OracleReady ||
                                   x.Status == RequestStatus.OraclePosted)
                                  &&
                                  _db.PurchaseRequestItems
                                      .Where(pi => pi.PurchaseRequestId == x.Id)
                                      .Any(pi =>
                                          pi.Quantity - (
                                              _db.InternationalPOItems
                                                  .Where(poi => poi.SourcePurchaseRequestItemId == pi.Id
                                                              && poi.IsActive
                                                              && _db.InternationalPurchaseOrders
                                                                    .Any(po => po.Id == poi.InternationalPoId
                                                                             && po.IsActive
                                                                             && po.Status != "Cancelled"
                                                                             && po.SupersededByPoId == null))
                                                  .Sum(poi => (decimal?)poi.Qty) ?? 0
                                          ) > 0),

                    // ── lets the frontend show a "Fully Converted" badge
                    // instead of silently hiding the button, so it's clear
                    // why there's no Convert to PO action here.
                    //
                    // ── FIXED: same po.SupersededByPoId == null exclusion.
                    isFullyConverted = (x.Status == RequestStatus.Approved ||
                                        x.Status == RequestStatus.OracleReady ||
                                        x.Status == RequestStatus.OraclePosted)
                                       &&
                                       _db.PurchaseRequestItems.Any(pi => pi.PurchaseRequestId == x.Id)
                                       &&
                                       !_db.PurchaseRequestItems
                                           .Where(pi => pi.PurchaseRequestId == x.Id)
                                           .Any(pi =>
                                               pi.Quantity - (
                                                   _db.InternationalPOItems
                                                       .Where(poi => poi.SourcePurchaseRequestItemId == pi.Id
                                                                   && poi.IsActive
                                                                   && _db.InternationalPurchaseOrders
                                                                         .Any(po => po.Id == poi.InternationalPoId
                                                                                  && po.IsActive
                                                                                  && po.Status != "Cancelled"
                                                                                  && po.SupersededByPoId == null))
                                                       .Sum(poi => (decimal?)poi.Qty) ?? 0
                                               ) > 0),

                    poUpdatedByName = x.PoUpdatedById != null
                        ? _db.Users.Where(u => u.Id == x.PoUpdatedById)
                                   .Select(u => u.FullName).FirstOrDefault()
                        : null,
                })
                .ToListAsync();

            return Ok(new { success = true, data = list });
        }

        [HttpGet("team-members")]
        public async Task<IActionResult> GetTeamMembers()
        {
            // Procurement department-ile active users mathram team members aayi kaanikkuka
            var procDeptIds = await _db.Departments
                .Where(d => d.Name.ToUpper().Contains("PROCUREMENT"))
                .Select(d => d.Id)
                .ToListAsync();

            var members = await _db.Users
                .Where(u => u.IsActive &&
                            u.DepartmentId != null &&
                            procDeptIds.Contains(u.DepartmentId.Value))
                .Select(u => new
                {
                    id = u.Id,
                    fullName = u.FullName,
                    email = u.Email,
                    role = _db.UserRoles
                        .Where(ur => ur.UserId == u.Id)
                        .Join(_db.Roles, ur => ur.RoleId, r => r.Id, (ur, r) => r.Name)
                        .FirstOrDefault() ?? "Staff"
                })
                .ToListAsync();

            return Ok(new { success = true, data = members });
        }

        // ── POST: Assign PR to team member ────────────────────
        // POST /api/procurement/{id}/assign
        [HttpPost("{id:guid}/assign")]
        public async Task<IActionResult> Assign(Guid id, [FromBody] AssignDto dto)
        {
            var userId = CurrentUserId();
            if (userId == null) return Unauthorized();

            var pr = await _db.PurchaseRequests.FindAsync(id);
            if (pr == null)
                return NotFound(new { success = false, message = "Request not found." });

            var assignee = await _db.Users.FindAsync(dto.AssignedToId);
            if (assignee == null)
                return BadRequest(new { success = false, message = "Assignee not found." });

            pr.AssignedToId = dto.AssignedToId;
            pr.AssignedById = userId;
            pr.AssignedAt = DateTime.UtcNow;
            pr.AssignmentNote = dto.Note;
            pr.AssignmentStatus = "ASSIGNED";
            pr.UpdatedAt = DateTime.UtcNow;

            // Notify assignee
            _db.Notifications.Add(new Procurement.Api.Models.Notification
            {
                Id = Guid.NewGuid(),
                UserId = dto.AssignedToId,
                Title = "New Task Assigned",
                Message = $"You have been assigned to handle request {pr.RequestNumber}. Note: {dto.Note ?? "No notes"}",
                IsRead = false,
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });

            await _db.SaveChangesAsync();

            return Ok(new { success = true, message = $"Assigned to {assignee.FullName} successfully." });
        }

        // ── POST: Update assignment status ────────────────────
        // POST /api/procurement/{id}/update-status
        [HttpPost("{id:guid}/update-status")]
        public async Task<IActionResult> UpdateAssignmentStatus(Guid id, [FromBody] UpdateStatusDto dto)
        {
            var pr = await _db.PurchaseRequests.FindAsync(id);
            if (pr == null)
                return NotFound(new { success = false, message = "Request not found." });

            var validStatuses = new[] { "ASSIGNED", "IN_PROGRESS", "COMPLETED" };
            if (!validStatuses.Contains(dto.AssignmentStatus.ToUpper()))
                return BadRequest(new { success = false, message = "Invalid status." });

            pr.AssignmentStatus = dto.AssignmentStatus.ToUpper();
            pr.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();

            return Ok(new { success = true, message = "Status updated." });
        }

        // ── POST: Update PO from Bright ───────────────────────
        // POST /api/procurement/{id}/po-update
        [HttpPost("{id:guid}/po-update")]
        public async Task<IActionResult> UpdatePO(Guid id, [FromBody] PoUpdateDto dto)
        {
            var userId = CurrentUserId();
            if (userId == null) return Unauthorized();

            var pr = await _db.PurchaseRequests.FindAsync(id);
            if (pr == null)
                return NotFound(new { success = false, message = "Request not found." });

            var validPoStatuses = new[] { "ISSUED", "HOLD", "REJECTED" };
            if (!validPoStatuses.Contains(dto.PoStatus.ToUpper()))
                return BadRequest(new { success = false, message = "PO Status must be: ISSUED, HOLD, or REJECTED." });

            pr.PoNumber = dto.PoNumber?.Trim();
            pr.PoStatus = dto.PoStatus.ToUpper();
            pr.PoRemarks = dto.Remarks;
            pr.PoUpdatedAt = DateTime.UtcNow;
            pr.PoUpdatedById = userId;
            pr.UpdatedAt = DateTime.UtcNow;

            // Update PR status based on PO status
            if (dto.PoStatus.ToUpper() == "ISSUED")
                pr.Status = RequestStatus.OraclePosted;

            // Log it
            _db.IntegrationLogs.Add(new IntegrationLog
            {
                Id = Guid.NewGuid(),
                Direction = "Outbound",
                Module = "Bright ERP - PO",
                Status = dto.PoStatus.ToUpper() == "ISSUED"
                              ? IntegrationStatus.Success
                              : IntegrationStatus.Failed,
                Message = $"PR {pr.RequestNumber} → PO {dto.PoNumber ?? "N/A"} | Status: {dto.PoStatus} | {dto.Remarks}",
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });

            // Notify requester
            _db.Notifications.Add(new Procurement.Api.Models.Notification
            {
                Id = Guid.NewGuid(),
                UserId = pr.RequestedById,
                Title = dto.PoStatus.ToUpper() == "ISSUED"
                              ? "PO Issued in Bright ERP"
                              : $"PO {dto.PoStatus} in Bright ERP",
                Message = dto.PoStatus.ToUpper() == "ISSUED"
                              ? $"Your request {pr.RequestNumber} has been issued as PO {dto.PoNumber} in Bright ERP."
                              : $"Your request {pr.RequestNumber} PO status: {dto.PoStatus}. Remarks: {dto.Remarks ?? "-"}",
                IsRead = false,
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });

            await _db.SaveChangesAsync();

            return Ok(new { success = true, message = $"PO updated — {dto.PoStatus}." });
        }
    }

    // ── DTOs ──────────────────────────────────────────────────
    public class AssignDto
    {
        public Guid AssignedToId { get; set; }
        public string? Note { get; set; }
    }

    public class UpdateStatusDto
    {
        public string AssignmentStatus { get; set; } = "";
    }

    public class PoUpdateDto
    {
        public string? PoNumber { get; set; }
        public string PoStatus { get; set; } = "ISSUED";
        public string? Remarks { get; set; }
    }
}