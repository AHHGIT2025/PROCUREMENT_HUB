using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Procurement.Api.Common;
using Procurement.Api.Data;
using Procurement.Api.Models;
using Procurement.Api.Services.Integration;
using System.Security.Claims;

namespace Procurement.Api.Controllers.IndentTransfer
{
    [Authorize]
    [ApiController]
    [Route("api/indent-transfer")]
    public class IndentTransferController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly OracleIndentTransferService _transferService;

        public IndentTransferController(AppDbContext db, OracleIndentTransferService transferService)
        {
            _db = db;
            _transferService = transferService;
        }

        private Guid? CurrentUserId()
        {
            var c = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return c != null ? Guid.Parse(c) : null;
        }

        // GET api/indent-transfer/eligible
        // Approved PRs for Oracle-integrated companies, with items not yet transferred.
        [HttpGet("eligible")]
        public async Task<IActionResult> GetEligible()
        {
            var oracleCompanyIds = await _db.Companies
                .Where(c => c.IsOracleIntegrated)
                .Select(c => c.Id)
                .ToListAsync();

            var list = await _db.PurchaseRequests
                .Where(x => x.IsActive
                    && oracleCompanyIds.Contains(x.CompanyId)
                    && (x.Status == RequestStatus.Approved || x.Status == RequestStatus.OracleReady))
                .OrderByDescending(x => x.CreatedAt)
                .Select(x => new
                {
                    id = x.Id,
                    requestNumber = x.RequestNumber,
                    companyName = _db.Companies.Where(c => c.Id == x.CompanyId).Select(c => c.Name).FirstOrDefault(),
                    requesterName = _db.Users.Where(u => u.Id == x.RequestedById).Select(u => u.FullName).FirstOrDefault(),
                    projectName = _db.Projects.Where(p => p.Id == x.ProjectId).Select(p => p.Name).FirstOrDefault(),
                    createdAt = x.CreatedAt,
                    totalAmount = x.TotalAmount,
                    externalReferenceNo = x.ExternalReferenceNo,
                    items = _db.PurchaseRequestItems
                        .Where(i => i.PurchaseRequestId == x.Id && i.OracleTransferredAt == null)
                        .Select(i => new
                        {
                            id = i.Id,
                            materialId = i.MaterialId,
                            itemCode = _db.Items.Where(m => m.Id == i.MaterialId).Select(m => m.ItemCode).FirstOrDefault(),
                            name = _db.Items.Where(m => m.Id == i.MaterialId).Select(m => m.Name).FirstOrDefault(),
                            quantity = i.Quantity,
                            uom = i.Uom,
                            justification = i.Justification
                        })
                        .ToList()
                })
                .ToListAsync();

            var filtered = list.Where(x => x.items.Any()).ToList();

            return Ok(ApiResponse<object>.Ok(filtered));
        }

        // POST api/indent-transfer/{purchaseRequestId}/transfer
        [HttpPost("{purchaseRequestId:guid}/transfer")]
        public async Task<IActionResult> Transfer(Guid purchaseRequestId, [FromBody] TransferRequestDto dto)
        {
            var userId = CurrentUserId();
            if (userId == null) return Unauthorized();

            if (dto.SelectedItemIds == null || dto.SelectedItemIds.Count == 0)
                return BadRequest(ApiResponse<object>.Fail("Select at least one item to transfer."));

            var result = await _transferService.TransferAsync(
                purchaseRequestId, dto.SelectedItemIds, dto.ProcRemark ?? "", dto.XpeRefNo, userId.Value);

            if (!result.Success)
                return BadRequest(ApiResponse<object>.Fail(result.ErrorMessage ?? "Transfer failed."));

            return Ok(ApiResponse<object>.Ok(
                new { oracleDocumentId = result.OracleDocumentId },
                $"Transferred successfully. Oracle Document ID: {result.OracleDocumentId}"));
        }
    }

    public class TransferRequestDto
    {
        public List<Guid> SelectedItemIds { get; set; } = new();
        public string? ProcRemark { get; set; }
        public string? XpeRefNo { get; set; }
    }
}