
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

                    companyName = _db.Companies
                        .Where(c => c.Id == x.CompanyId)
                        .Select(c => c.Name)
                        .FirstOrDefault() ?? "-",

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

                    canUpdatePO = x.Status == RequestStatus.Approved ||
                                  x.Status == RequestStatus.OracleReady ||
                                  x.Status == RequestStatus.OraclePosted,

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
        //public async Task<IActionResult> GetQueue()
        //{
        //    var userId = CurrentUserId();
        //    if (userId == null) return Unauthorized();

        //    var currentUser = await _db.Users.FindAsync(userId);
        //    if (currentUser == null) return Unauthorized();

        //    var userRoles = await _db.UserRoles
        //        .Where(ur => ur.UserId == userId)
        //        .Join(_db.Roles, ur => ur.RoleId, r => r.Id, (ur, r) => r.Name)
        //        .ToListAsync();

        //    bool isPurchaseManager = userRoles.Any(r =>
        //        r == "Purchase Officer" || r == "Procurement Officer" || r == "Manager");

        //    // Purchase Officer role IDs
        //    //var procRoleIds = await _db.Roles
        //    //    .Where(r => r.Name == "Purchase Officer" || r.Name == "Procurement Officer")
        //    //    .Select(r => r.Id)
        //    //    .ToListAsync();
        //    var procRoleIds = await _db.Roles
        //        .Where(r => r.Name == "Purchase Officer" ||
        //                    r.Name == "Procurement Officer" ||
        //                    r.Name == "Manager")  // ← Manager add
        //        .Select(r => r.Id)
        //        .ToListAsync();

        //    // Purchase Officer users in same company
        //    var procUserIds = await _db.UserRoles
        //        .Where(ur => procRoleIds.Contains(ur.RoleId))
        //        .Join(_db.Users.Where(u => u.CompanyId == currentUser.CompanyId || u.IsActive),
        //              ur => ur.UserId, u => u.Id, (ur, u) => u.Id)
        //        .ToListAsync();

        //    // PRs where approval instance assigned to procurement users
        //    var procPrIds = await _db.ApprovalInstances
        //        .Where(i => i.IsActive && procUserIds.Contains(i.AssignedToId))
        //        .Select(i => i.EntityId)
        //        .Distinct()
        //        .ToListAsync();

        //    // Company filter — only their accessible companies
        //    var accessibleCompanyIds = await _db.Users
        //        .Where(u => u.Id == userId)
        //        .Select(u => u.CompanyId)
        //        .ToListAsync();

        //    var list = await _db.PurchaseRequests
        //        .Where(x => x.IsActive &&
        //                    x.Status != RequestStatus.Deleted &&
        //                    procPrIds.Contains(x.Id) &&
        //                    accessibleCompanyIds.Contains(x.CompanyId))
        //        .OrderByDescending(x => x.CreatedAt)
        //        .Select(x => new
        //        {
        //            id = x.Id,
        //            requestNumber = x.RequestNumber,
        //            status = x.Status == RequestStatus.Draft ? "Draft"
        //                          : x.Status == RequestStatus.Submitted ? "Submitted"
        //                          : x.Status == RequestStatus.PendingApproval ? "Pending Approval"
        //                          : x.Status == RequestStatus.Approved ? "Approved"
        //                          : x.Status == RequestStatus.Rejected ? "Rejected"
        //                          : x.Status == RequestStatus.Returned ? "Returned"
        //                          : x.Status == RequestStatus.OracleReady ? "Oracle Ready"
        //                          : x.Status == RequestStatus.OraclePosted ? "PO Issued"
        //                          : "Unknown",
        //            totalAmount = x.TotalAmount,
        //            createdAt = x.CreatedAt,
        //            justification = x.Justification,

        //            companyName = _db.Companies
        //                .Where(c => c.Id == x.CompanyId)
        //                .Select(c => c.Name)
        //                .FirstOrDefault() ?? "-",

        //            requesterName = _db.Users
        //                .Where(u => u.Id == x.RequestedById)
        //                .Select(u => u.FullName)
        //                .FirstOrDefault() ?? "-",

        //            approvalInstanceId = _db.ApprovalInstances
        //                .Where(i => i.EntityId == x.Id &&
        //                            i.Status == "PENDING" &&
        //                            i.IsActive &&
        //                            procUserIds.Contains(i.AssignedToId))
        //                .Select(i => (Guid?)i.Id)
        //                .FirstOrDefault(),

        //            assignmentStatus = x.AssignmentStatus,
        //            assignmentNote = x.AssignmentNote,
        //            assignedAt = x.AssignedAt,

        //            assignedToName = x.AssignedToId != null
        //                ? _db.Users.Where(u => u.Id == x.AssignedToId)
        //                           .Select(u => u.FullName).FirstOrDefault()
        //                : null,

        //            poNumber = x.PoNumber,
        //            poStatus = x.PoStatus,
        //            poRemarks = x.PoRemarks,
        //            poUpdatedAt = x.PoUpdatedAt,

        //            canUpdatePO = x.Status == RequestStatus.Approved ||
        //                          x.Status == RequestStatus.OracleReady ||
        //                          x.Status == RequestStatus.OraclePosted,

        //            poUpdatedByName = x.PoUpdatedById != null
        //                ? _db.Users.Where(u => u.Id == x.PoUpdatedById)
        //                           .Select(u => u.FullName).FirstOrDefault()
        //                : null,
        //        })
        //        .ToListAsync();

        //    return Ok(new { success = true, data = list });
        //}
        //[HttpGet("team-members")]
        //public async Task<IActionResult> GetTeamMembers()
        //{
        //    var procRoleIds = await _db.Roles
        //        .Where(r => r.Name == "Purchase Officer" ||
        //                    r.Name == "Procurement Officer" ||
        //                    r.Name == "Manager" ||
        //                    r.Name == "System Admin")
        //        .Select(r => r.Id)
        //        .ToListAsync();


        //    var members = await _db.Users
        //        .Where(u => u.IsActive &&
        //                    !_db.UserRoles.Any(ur =>
        //                        ur.UserId == u.Id &&
        //                        procRoleIds.Contains(ur.RoleId)))
        //        .Select(u => new
        //        {
        //            id = u.Id,
        //            fullName = u.FullName,
        //            email = u.Email,
        //            role = _db.UserRoles
        //                .Where(ur => ur.UserId == u.Id)
        //                .Join(_db.Roles, ur => ur.RoleId, r => r.Id, (ur, r) => r.Name)
        //                .FirstOrDefault() ?? "Staff"
        //        })
        //        .ToListAsync();

        //    return Ok(new { success = true, data = members });
        //}

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