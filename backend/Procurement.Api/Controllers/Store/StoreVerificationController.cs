using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Procurement.Api.Common;
using Procurement.Api.Data;
using Procurement.Api.Models;
using Procurement.Api.Services.Workflow;
using System.Security.Claims;

namespace Procurement.Api.Controllers.Store
{
    // ✅ This lives alongside your existing Approvals controller (ApproverInbox
    // backend). Store Verification steps show up in the SAME pending list as
    // any other approval (GetPendingAsync) — filter on the frontend using the
    // new ApproverType field. This endpoint is only for SUBMITTING the
    // store-verification decision; it does not create a separate inbox.
    [Authorize]
    [ApiController]
    [Route("api/approvals/store-verification")]
    public class StoreVerificationController : ControllerBase
    {
        private readonly IApprovalEngineService _engine;
        private readonly AppDbContext _db;
        public StoreVerificationController(IApprovalEngineService engine, AppDbContext db)
        {
            _engine = engine;
            _db = db;
        }

        public class SubmitStoreVerificationDto
        {
            public List<StoreVerifyItemInput> Items { get; set; } = new();
        }

        public class StoreVerificationItemDto
        {
            public Guid Id { get; set; }
            public string MaterialCode { get; set; } = "";
            public string MaterialName { get; set; } = "";
            public string Uom { get; set; } = "";
            public decimal RequestedQty { get; set; }
        }

        // GET /api/approvals/store-verification/{instanceId}/items
        // Returns the item list to verify, resolved from the instance's
        // underlying request — used to render the verification form.
        [HttpGet("{instanceId:guid}/items")]
        public async Task<IActionResult> GetItems(Guid instanceId)
        {
            var instance = await _db.ApprovalInstances.FindAsync(instanceId);
            if (instance == null)
                return NotFound(ApiResponse<object>.Fail("Approval instance not found."));

            var items = await _db.PurchaseRequestItems
                .Where(i => i.PurchaseRequestId == instance.EntityId && i.IsActive)
                .ToListAsync();

            var result = new List<StoreVerificationItemDto>();
            foreach (var item in items)
            {
                var material = await _db.Materials.FindAsync(item.MaterialId);
                result.Add(new StoreVerificationItemDto
                {
                    Id = item.Id,
                    MaterialCode = material?.MaterialCode ?? "",
                    MaterialName = material?.Name ?? "",
                    Uom = item.Uom,
                    RequestedQty = item.Quantity
                });
            }

            return Ok(ApiResponse<List<StoreVerificationItemDto>>.Ok(result));
        }

        // POST /api/approvals/store-verification/{instanceId}
        [HttpPost("{instanceId:guid}")]
        public async Task<IActionResult> Submit(Guid instanceId, SubmitStoreVerificationDto dto)
        {
            var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!Guid.TryParse(userIdClaim, out var userId))
                return Unauthorized(ApiResponse<object>.Fail("Invalid token."));

            var result = await _engine.ProcessStoreVerificationAsync(instanceId, userId, dto.Items);

            if (!result.Success)
                return BadRequest(ApiResponse<object>.Fail(result.Message));

            return Ok(ApiResponse<object>.Ok(result.Data, result.Message));
        }
    }
}