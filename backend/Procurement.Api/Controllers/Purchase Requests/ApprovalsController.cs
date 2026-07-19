// FILE: Controllers/Purchase Requests/ApprovalsController.cs

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Procurement.Api.Services.Workflow;
using System.Security.Claims;

namespace Procurement.Api.Controllers.Purchase_Requests
{
    [Authorize]
    [ApiController]
    [Route("api/approvals")]
    public class ApprovalsController : ControllerBase
    {
        private readonly IApprovalEngineService _engine;

        public ApprovalsController(IApprovalEngineService engine)
        {
            _engine = engine;
        }


        // GET /api/approvals/pending/{userId}
        // Approver inbox — all pending requests for this user
        [HttpGet("pending/{userId:guid}")]
        public async Task<IActionResult> GetPending(Guid userId)
        {
            var data = await _engine.GetPendingAsync(userId);
            return Ok(new { success = true, data });
        }

        // GET /api/approvals/status/{prId}
        // Requester tracking — see where request is now
        [HttpGet("status/{prId:guid}")]
        public async Task<IActionResult> GetStatus(Guid prId)
        {
            var data = await _engine.GetStatusAsync(prId);
            return Ok(new { success = true, data });
        }

     
        [HttpPost("{instanceId:guid}/reject")]
        public async Task<IActionResult> Reject(Guid instanceId, [FromBody] ActionDto dto)
        {
            var userId = GetCurrentUserId();
            if (userId == null) return Unauthorized();

            var result = await _engine.ProcessActionAsync(
                instanceId, userId.Value, "REJECT", dto.Comments);

            return result.Success
                ? Ok(new { success = true, message = result.Message })
                : BadRequest(new { success = false, message = result.Message });
        }

        // POST /api/approvals/{instanceId}/return
        [HttpPost("{instanceId:guid}/return")]
        public async Task<IActionResult> Return(Guid instanceId, [FromBody] ActionDto dto)
        {
            var userId = GetCurrentUserId();
            if (userId == null) return Unauthorized();

            var result = await _engine.ProcessActionAsync(
                instanceId, userId.Value, "RETURN", dto.Comments);

            return result.Success
                ? Ok(new { success = true, message = result.Message })
                : BadRequest(new { success = false, message = result.Message });
        }

        private Guid? GetCurrentUserId()
        {
            var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return claim != null ? Guid.Parse(claim) : null;
        }
        // ═══════════════════════════════════════════════════════════
        // ✅ NEW — International PO approval endpoints.
        // Parallel to the PR endpoints above — none of them are touched.
        // ═══════════════════════════════════════════════════════════

        // GET /api/approvals/pending-po/{userId}
        [HttpGet("pending-po/{userId:guid}")]
        public async Task<IActionResult> GetPendingPo(Guid userId)
        {
            var data = await _engine.GetPendingPoAsync(userId);
            return Ok(new { success = true, data });
        }

        // POST /api/approvals/po/{instanceId}/approve
        [HttpPost("po/{instanceId:guid}/approve")]
        public async Task<IActionResult> ApprovePo(Guid instanceId, [FromBody] ActionDto dto)
        {
            var userId = GetCurrentUserId();
            if (userId == null) return Unauthorized();

            var result = await _engine.ProcessPoActionAsync(
                instanceId, userId.Value, "APPROVE", dto.Comments);

            return result.Success
                ? Ok(new { success = true, message = result.Message, data = result.Data })
                : BadRequest(new { success = false, message = result.Message });
        }

        // POST /api/approvals/po/{instanceId}/reject
        [HttpPost("po/{instanceId:guid}/reject")]
        public async Task<IActionResult> RejectPo(Guid instanceId, [FromBody] ActionDto dto)
        {
            var userId = GetCurrentUserId();
            if (userId == null) return Unauthorized();

            var result = await _engine.ProcessPoActionAsync(
                instanceId, userId.Value, "REJECT", dto.Comments);

            return result.Success
                ? Ok(new { success = true, message = result.Message })
                : BadRequest(new { success = false, message = result.Message });
        }

        // POST /api/approvals/po/{instanceId}/return
        [HttpPost("po/{instanceId:guid}/return")]
        public async Task<IActionResult> ReturnPo(Guid instanceId, [FromBody] ActionDto dto)
        {
            var userId = GetCurrentUserId();
            if (userId == null) return Unauthorized();

            var result = await _engine.ProcessPoActionAsync(
                instanceId, userId.Value, "RETURN", dto.Comments);

            return result.Success
                ? Ok(new { success = true, message = result.Message })
                : BadRequest(new { success = false, message = result.Message });
        }
        [HttpPost("{instanceId:guid}/approve")]
        public async Task<IActionResult> Approve(Guid instanceId, [FromBody] ActionDto dto)
        {
            var userId = GetCurrentUserId();
            if (userId == null) return Unauthorized();

            try
            {
                var result = await _engine.ProcessActionAsync(
                    instanceId, userId.Value, "APPROVE", dto.Comments);

                return result.Success
                    ? Ok(new { success = true, message = result.Message, data = result.Data })
                    : BadRequest(new { success = false, message = result.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    success = false,
                    error = ex.Message,
                    inner = ex.InnerException?.Message,
                    inner2 = ex.InnerException?.InnerException?.Message
                });
            }
        }
        public class ActionDto
        {
            public string? Comments { get; set; }
        }
    }
}