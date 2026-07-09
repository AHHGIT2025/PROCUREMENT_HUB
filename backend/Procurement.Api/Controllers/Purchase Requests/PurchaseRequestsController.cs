using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Procurement.Api.Data;
using Procurement.Api.DTOs.PurchaseRequests;
using Procurement.Api.Models;
using Procurement.Api.Models.PurchaseRequests;
using Procurement.Api.Services.Common;
using Procurement.Api.Services.Workflow;
using static Microsoft.EntityFrameworkCore.DbLoggerCategory.Database;

namespace Procurement.Api.Controllers.PurchaseRequests
{
    [Authorize]
    [ApiController]
    [Route("api/purchase-requests")]
    public class PurchaseRequestsController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly IApprovalEngineService _engine;
        private readonly RequestNumberGeneratorService _numberGenerator;
        public PurchaseRequestsController(
      AppDbContext db,
      IApprovalEngineService engine,
      RequestNumberGeneratorService numberGenerator)
        {
            _db = db;
            _engine = engine;
            _numberGenerator = numberGenerator;
        }
        // ── CREATE ────────────────────────────────────────────
        [HttpPost]
        public async Task<IActionResult> Create(CreatePurchaseRequestDto dto)
        {
            try
            {
                if (dto.CompanyId == Guid.Empty)
                    return BadRequest(new { message = "Company required" });

                if (dto.DepartmentId == Guid.Empty)
                    return BadRequest(new { message = "Department required" });

                if (dto.Items == null || !dto.Items.Any())
                    return BadRequest(new { message = "At least one item required" });

                if (string.IsNullOrWhiteSpace(dto.DeliveryLocation))
                    return BadRequest(new { message = "Delivery Location is required" });

                if (string.IsNullOrWhiteSpace(dto.ContactNumber))
                    return BadRequest(new { message = "Contact Number is required" });

                var company = await _db.Companies
                    .FirstOrDefaultAsync(x => x.Id == dto.CompanyId);

                if (company == null)
                    return BadRequest(new { message = "Invalid Company" });

                var yy = DateTime.UtcNow.Year.ToString().Substring(2);
                var count = await _db.PurchaseRequests
                    .CountAsync(x => x.CompanyId == dto.CompanyId);
                var requestNumber = await _numberGenerator.GenerateRequestNumber(company.Code);
                var pr = new PurchaseRequest
                {
                    Id = Guid.NewGuid(),
                    RequestNumber = requestNumber,
                    CompanyId = dto.CompanyId,
                    ProjectId = dto.ProjectId,
                    DepartmentId = dto.DepartmentId,
                    RequestedById = dto.RequestedById,
                    Justification = dto.Justification,
                    Status = RequestStatus.Draft,
                    TotalAmount = dto.Items.Sum(i => i.Quantity * i.EstimatedUnitPrice),
                    DeliveryLocation = dto.DeliveryLocation,
                    ContactNumber = dto.ContactNumber,
                    CreatedAt = DateTime.UtcNow
                };

                _db.PurchaseRequests.Add(pr);

                foreach (var i in dto.Items)
                {
                    _db.PurchaseRequestItems.Add(new PurchaseRequestItem
                    {
                        Id = Guid.NewGuid(),
                        PurchaseRequestId = pr.Id,
                        MaterialId = i.MaterialId,
                        Quantity = i.Quantity,
                        Uom = i.Uom,
                        RequiredDate = i.RequiredDate,
                        Justification = i.Justification,
                        EstimatedUnitPrice = i.EstimatedUnitPrice,
                        AttachmentUrl = i.AttachmentUrl,
                        AttachmentFileName = i.AttachmentFileName,
                        CreatedAt = DateTime.UtcNow
                    });
                }

                _db.AuditLogs.Add(new AuditLog
                {
                    Id = Guid.NewGuid(),
                    Module = "Purchase Requests",
                    Action = "Draft",
                    UserName = dto.RequestedById.ToString(),
                    Details = requestNumber,
                    CreatedAt = DateTime.UtcNow
                });

                await _db.SaveChangesAsync();

                // Auto-submit if requested
                if (dto.Submit)
                {
                    var submitResult = await _engine.StartWorkflowAsync(pr.Id);
                    return Ok(new
                    {
                        pr.Id,
                        pr.RequestNumber,
                        status = submitResult.Success
                                    ? RequestStatus.PendingApproval.ToString()
                                    : RequestStatus.Draft.ToString(),
                        message = submitResult.Message,
                        data = submitResult.Data
                    });
                }

                return Ok(new
                {
                    pr.Id,
                    pr.RequestNumber,
                    status = pr.Status.ToString(),
                    message = "Draft Saved ✅"
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    error = ex.Message,
                    inner = ex.InnerException?.Message
                });

            }
        }

        // ── SUBMIT ────────────────────────────────────────────
        [HttpPost("{id:guid}/submit")]
        public async Task<IActionResult> Submit(Guid id)
        {
            try
            {
                var pr = await _db.PurchaseRequests
                    .FirstOrDefaultAsync(x => x.Id == id);

                if (pr == null)
                    return NotFound(new { message = "Purchase Request Not Found" });

                if (pr.Status != RequestStatus.Draft &&
                    pr.Status != RequestStatus.Returned)
                    return BadRequest(new { message = "Only Draft or Returned can be submitted" });

                var hasItems = await _db.PurchaseRequestItems
                    .AnyAsync(i => i.PurchaseRequestId == id);

                if (!hasItems)
                    return BadRequest(new { message = "Add items before submitting" });

                var result = await _engine.StartWorkflowAsync(id);

                if (!result.Success)
                    return BadRequest(new { success = false, message = result.Message });

                _db.AuditLogs.Add(new AuditLog
                {
                    Id = Guid.NewGuid(),
                    Module = "Purchase Requests",
                    Action = "Submit",
                    UserName = pr.RequestedById.ToString(),
                    Details = pr.RequestNumber,
                    CreatedAt = DateTime.UtcNow
                });

                await _db.SaveChangesAsync();

                return Ok(new
                {
                    success = true,
                    message = result.Message,
                    requestNumber = pr.RequestNumber,
                    status = RequestStatus.PendingApproval.ToString(),
                    data = result.Data
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    error = ex.Message,
                    inner = ex.InnerException?.Message
                });
            }
        }

        // ── GET ALL ───────────────────────────────────────────
        [HttpGet]
        public async Task<IActionResult> Get()
        {
            var data = await _db.PurchaseRequests
                .OrderByDescending(x => x.CreatedAt)
                .Select(pr => new
                {
                    pr.Id,
                    pr.RequestNumber,
                    status = pr.Status.ToString(),
                    pr.Justification,
                    pr.TotalAmount,
                    pr.CreatedAt,
                    pr.DeliveryLocation,
                    pr.ContactNumber,
                    Company = _db.Companies
                                    .Where(c => c.Id == pr.CompanyId)
                                    .Select(c => c.Name).FirstOrDefault(),
                    Department = _db.Departments
                                    .Where(d => d.Id == pr.DepartmentId)
                                    .Select(d => d.Name).FirstOrDefault(),
                    Project = _db.Projects
                                    .Where(p => p.Id == pr.ProjectId)
                                    .Select(p => p.Name).FirstOrDefault(),
                    RequestedBy = _db.Users
                                    .Where(u => u.Id == pr.RequestedById)
                                    .Select(u => u.FullName).FirstOrDefault()
                })
                .ToListAsync();

            return Ok(data);
        }

        // ── GET BY ID ─────────────────────────────────────────
        [HttpGet("{id:guid}")]
        public async Task<IActionResult> Get(Guid id)
        {
            var request = await _db.PurchaseRequests
                .Where(x => x.Id == id)
                .Select(x => new
                {
                    id = x.Id,
                    requestNumber = x.RequestNumber,
                    status = x.Status.ToString(),
                    justification = x.Justification,
                    totalAmount = x.TotalAmount,
                    createdAt = x.CreatedAt,
                    companyId = x.CompanyId,
                    projectId = x.ProjectId,
                    departmentId = x.DepartmentId,
                    deliveryLocation = x.DeliveryLocation,
                    contactNumber = x.ContactNumber,

                    companyName = _db.Companies
                        .Where(c => c.Id == x.CompanyId)
                        .Select(c => c.Name).FirstOrDefault(),

                    projectName = _db.Projects
                        .Where(p => p.Id == x.ProjectId)
                        .Select(p => p.Name).FirstOrDefault(),

                    departmentName = _db.Departments
                        .Where(d => d.Id == x.DepartmentId)
                        .Select(d => d.Name).FirstOrDefault(),

                    requestedBy = _db.Users
                        .Where(u => u.Id == x.RequestedById)
                        .Select(u => u.FullName).FirstOrDefault(),

                    currentStage = x.Status == RequestStatus.Draft ? "Draft"
                                 : x.Status == RequestStatus.Submitted ? "Submitted"
                                 : x.Status == RequestStatus.PendingApproval ? "Pending Approval"
                                 : x.Status == RequestStatus.Approved ? "Approved"
                                 : x.Status == RequestStatus.Rejected ? "Rejected"
                                 : x.Status == RequestStatus.Returned ? "Returned For Correction"
                                 : x.Status == RequestStatus.OracleReady ? "Ready For Oracle"
                                 : x.Status == RequestStatus.OraclePosted ? "Posted To Oracle"
                                 : x.Status == RequestStatus.Deleted ? "Deleted"
                                 : x.Status == RequestStatus.FulfilledFromStock ? "Fulfilled From Stock"
                                 : "Unknown",

                    canEdit = x.Status == RequestStatus.Draft || x.Status == RequestStatus.Returned,
                    canSubmit = x.Status == RequestStatus.Draft || x.Status == RequestStatus.Returned,
                    canDelete = x.Status == RequestStatus.Draft,

                    // ── Current pending stage ────────────────────────────
                    currentPendingStage = _db.ApprovalInstances
                        .Where(ai => ai.EntityId == x.Id)
                        .OrderByDescending(ai => ai.StepOrder)
                        .Join(_db.WorkflowSteps,
                              ai => ai.WorkflowStepId,
                              ws => ws.Id,
                              (ai, ws) => ws.Name)
                        .FirstOrDefault(),

                    // ── Latest rejection / return comment ────────────────
                    rejectionComment = _db.ApprovalActions
                        .Where(aa =>
                            _db.ApprovalInstances.Any(ai =>
                                ai.Id == aa.ApprovalInstanceId &&
                                ai.EntityId == x.Id)
                            && (aa.ActionType == "REJECT" || aa.ActionType == "RETURN"))
                        .OrderByDescending(aa => aa.CreatedAt)
                        .Select(aa => new
                        {
                            comment = aa.Comments,
                            action = aa.ActionType,
                            stageName = _db.ApprovalInstances
                                .Where(ai => ai.Id == aa.ApprovalInstanceId)
                                .Join(_db.WorkflowSteps,
                                      ai => ai.WorkflowStepId,
                                      ws => ws.Id,
                                      (ai, ws) => ws.Name)
                                .FirstOrDefault(),
                            byUser = _db.Users
                                .Where(u => u.Id == aa.ActionBy)
                                .Select(u => u.FullName)
                                .FirstOrDefault(),
                            at = aa.CreatedAt
                        })
                        .FirstOrDefault(),

                    // ── Items (✅ now includes store verification outcome) ──
                    items = _db.PurchaseRequestItems
                        .Where(i => i.PurchaseRequestId == x.Id)
                        .Select(i => new
                        {
                            id = i.Id,
                            materialId = i.MaterialId,
                            materialCode = _db.Items
                                                    .Where(m => m.Id == i.MaterialId)
                                                    .Select(m => m.ItemCode).FirstOrDefault(),
                            materialName = _db.Items
                                                    .Where(m => m.Id == i.MaterialId)
                                                    .Select(m => m.Name).FirstOrDefault(),
                            itemGroup = _db.Items
                                                    .Where(m => m.Id == i.MaterialId)
                                                    .Join(_db.ItemGroups,
                                                        item => item.GroupId,
                                                        g => g.Id,
                                                        (item, g) => g.Name)
                                                    .FirstOrDefault(),
                            quantity = i.Quantity,                       // original requested qty — never changes
                            uom = i.Uom,
                            estimatedUnitPrice = i.EstimatedUnitPrice,
                            lineTotal = i.Quantity * i.EstimatedUnitPrice,
                            requiredDate = i.RequiredDate,
                            justification = i.Justification,
                            attachmentUrl = i.AttachmentUrl,
                            attachmentFileName = i.AttachmentFileName,

                            // ✅ NEW — store verification outcome (0 = not yet checked)
                            storeStatus = (int)i.StoreStatus,
                            availableQty = i.AvailableQty,
                            purchaseQty = i.PurchaseQty,                 // qty that still needs purchasing after store check
                            storeRemarks = i.StoreRemarks
                        })
                        .ToList(),

                    // ── Approval trail ───────────────────────────────────
                    approvals = _db.ApprovalInstances
                        .Where(ai => ai.EntityId == x.Id && ai.IsActive)
                        .OrderBy(ai => ai.StepOrder)
                        .Select(ai => new
                        {
                            stepOrder = ai.StepOrder,
                            status = ai.Status,
                            approverName = _db.Users
                                              .Where(u => u.Id == ai.AssignedToId)
                                              .Select(u => u.FullName).FirstOrDefault(),
                            stepName = _db.WorkflowSteps
                                              .Where(s => s.Id == ai.WorkflowStepId)
                                              .Select(s => s.Name).FirstOrDefault(),
                            completedAt = ai.CompletedAt
                        })
                        .ToList()
                })
                .FirstOrDefaultAsync();

            if (request == null) return NotFound();
            return Ok(request);
        }

        // POST /api/purchase-requests/{id}/resubmit
        [HttpPost("{id}/resubmit")]
        public async Task<IActionResult> Resubmit(Guid id)
        {
            var pr = await _db.PurchaseRequests.FindAsync(id);
            if (pr == null)
                return NotFound(new { success = false, message = "Request not found." });

            if (pr.Status != RequestStatus.Returned)
                return BadRequest(new { success = false, message = "Only RETURNED requests can be resubmitted." });

            // Cancel old instances
            var oldInstances = await _db.ApprovalInstances
                .Where(i => i.EntityId == id && i.IsActive)
                .ToListAsync();

            foreach (var inst in oldInstances)
            {
                inst.IsActive = false;
                inst.UpdatedAt = DateTime.UtcNow;
            }

            // Fresh workflow start
            var result = await _engine.StartWorkflowAsync(id);
            if (!result.Success)
                return BadRequest(new { success = false, message = result.Message });

            return Ok(new { success = true, message = result.Message, data = result.Data });
        }

        // -- GET BY USER ---------------------------------------
        [HttpGet("user/{userId:guid}")]
        public async Task<IActionResult> GetUserRequests(Guid userId)
        {
            var data = await _db.PurchaseRequests
                .Where(x => x.RequestedById == userId)
                .OrderByDescending(x => x.CreatedAt)
                .Select(x => new
                {
                    id = x.Id,
                    requestNumber = x.RequestNumber,
                    status = x.Status.ToString(),
                    justification = x.Justification,
                    createdAt = x.CreatedAt,
                    totalAmount = x.TotalAmount,
                    deliveryLocation = x.DeliveryLocation,
                    contactNumber = x.ContactNumber,

                    companyName = _db.Companies
                        .Where(c => c.Id == x.CompanyId)
                        .Select(c => c.Name)
                        .FirstOrDefault(),

                    projectName = _db.Projects
                        .Where(p => p.Id == x.ProjectId)
                        .Select(p => p.Name)
                        .FirstOrDefault(),

                    departmentName = _db.Departments
                        .Where(d => d.Id == x.DepartmentId)
                        .Select(d => d.Name)
                        .FirstOrDefault(),

                    // ── Current pending approval stage name ──────────────
                    currentPendingStage = _db.ApprovalInstances
                        .Where(ai => ai.EntityId == x.Id)
                        .OrderByDescending(ai => ai.StepOrder)
                        .Join(_db.WorkflowSteps,
                              ai => ai.WorkflowStepId,
                              ws => ws.Id,
                              (ai, ws) => ws.Name)
                        .FirstOrDefault(),

                    // ── Latest rejection / return comment ────────────────
                    rejectionComment = _db.ApprovalActions
                        .Where(aa =>
                            _db.ApprovalInstances.Any(ai =>
                                ai.Id == aa.ApprovalInstanceId &&
                                ai.EntityId == x.Id)
                            && (aa.ActionType == "REJECT" || aa.ActionType == "RETURN"))
                        .OrderByDescending(aa => aa.CreatedAt)
                        .Select(aa => new
                        {
                            comment = aa.Comments,
                            action = aa.ActionType,
                            byUser = _db.Users
                                         .Where(u => u.Id == aa.ActionBy)
                                         .Select(u => u.FullName)
                                         .FirstOrDefault(),
                            at = aa.CreatedAt
                        })
                        .FirstOrDefault(),

                    // ── Items with individual justification (✅ store fields added) ──
                    items = _db.PurchaseRequestItems
                        .Where(i => i.PurchaseRequestId == x.Id)
                        .Select(i => new
                        {
                            id = i.Id,
                            materialId = i.MaterialId,
                            materialCode = _db.Items
                                                    .Where(m => m.Id == i.MaterialId)
                                                    .Select(m => m.ItemCode)
                                                    .FirstOrDefault(),
                            materialName = _db.Items
                                                    .Where(m => m.Id == i.MaterialId)
                                                    .Select(m => m.Name)
                                                    .FirstOrDefault(),
                            quantity = i.Quantity,
                            uom = i.Uom,
                            estimatedUnitPrice = i.EstimatedUnitPrice,
                            lineTotal = i.Quantity * i.EstimatedUnitPrice,
                            requiredDate = i.RequiredDate,
                            justification = i.Justification,
                            attachmentUrl = i.AttachmentUrl,
                            attachmentFileName = i.AttachmentFileName,

                            // ✅ NEW
                            storeStatus = (int)i.StoreStatus,
                            availableQty = i.AvailableQty,
                            purchaseQty = i.PurchaseQty,
                            storeRemarks = i.StoreRemarks
                        })
                        .ToList(),

                    // ── Button permissions ───────────────────────────────
                    canEdit = x.Status == RequestStatus.Draft || x.Status == RequestStatus.Returned,
                    canSubmit = x.Status == RequestStatus.Draft || x.Status == RequestStatus.Returned,
                    canDelete = x.Status == RequestStatus.Draft,

                })
                .ToListAsync();

            return Ok(data);
        }

        // ── UPDATE ────────────────────────────────────────────
        [HttpPut("{id:guid}")]
        public async Task<IActionResult> Update(Guid id, CreatePurchaseRequestDto dto)
        {
            var pr = await _db.PurchaseRequests
                .FirstOrDefaultAsync(x => x.Id == id);

            if (pr == null) return NotFound();

            if (pr.Status != RequestStatus.Draft &&
                pr.Status != RequestStatus.Returned)
                return BadRequest(new { message = "Editing not allowed" });

            if (string.IsNullOrWhiteSpace(dto.DeliveryLocation))
                return BadRequest(new { message = "Delivery Location is required" });

            if (string.IsNullOrWhiteSpace(dto.ContactNumber))
                return BadRequest(new { message = "Contact Number is required" });

            pr.CompanyId = dto.CompanyId;
            pr.ProjectId = dto.ProjectId;
            pr.DepartmentId = dto.DepartmentId;
            pr.Justification = dto.Justification;
            pr.TotalAmount = dto.Items.Sum(x => x.Quantity * x.EstimatedUnitPrice);
            pr.DeliveryLocation = dto.DeliveryLocation;
            pr.ContactNumber = dto.ContactNumber;
            pr.UpdatedAt = DateTime.UtcNow;

            var oldItems = await _db.PurchaseRequestItems
                .Where(x => x.PurchaseRequestId == id).ToListAsync();
            _db.PurchaseRequestItems.RemoveRange(oldItems);

            foreach (var i in dto.Items)
            {
                _db.PurchaseRequestItems.Add(new PurchaseRequestItem
                {
                    Id = Guid.NewGuid(),
                    PurchaseRequestId = pr.Id,
                    MaterialId = i.MaterialId,
                    Quantity = i.Quantity,
                    Uom = i.Uom,
                    EstimatedUnitPrice = i.EstimatedUnitPrice,
                    AttachmentUrl = i.AttachmentUrl,
                    AttachmentFileName = i.AttachmentFileName,
                    RequiredDate = i.RequiredDate,
                    Justification = i.Justification,
                    CreatedAt = DateTime.UtcNow
                });
            }

            await _db.SaveChangesAsync();
            return Ok(new { message = "Request Updated ✅" });
        }

        // ── DELETE ────────────────────────────────────────────
        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var pr = await _db.PurchaseRequests
                .FirstOrDefaultAsync(x => x.Id == id);

            if (pr == null) return NotFound();

            if (pr.Status != RequestStatus.Draft)
                return BadRequest(new { message = "Only Draft can be deleted" });

            pr.Status = RequestStatus.Deleted;
            pr.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            return Ok(new { message = "Deleted ✅" });
        }

        // ── PENDING LIST ──────────────────────────────────────
        [HttpGet("pending")]
        public async Task<IActionResult> Pending()
        {
            var data = await _db.PurchaseRequests
                .Where(x => x.Status == RequestStatus.Submitted ||
                            x.Status == RequestStatus.PendingApproval)
                .OrderByDescending(x => x.CreatedAt)
                .ToListAsync();

            return Ok(data);
        }
    }
}