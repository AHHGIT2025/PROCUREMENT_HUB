using global::Procurement.Api.Common;
using global::Procurement.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Procurement.Api.Common;
using Procurement.Api.Data;


namespace Procurement.Api.Controllers.Purchase_Requests
{ 
        // ── "My Approval History" ────────────────────────────────────────
        // Shows every action a user has personally taken (Approve / Reject /
        // Return / Store Verified) across all requests, regardless of role.
        // Solves: "did I approve this yesterday or not" — searchable, company
        // filterable, with store-verification item detail where relevant.
        [Authorize]
        [ApiController]
        [Route("api/approval-actions")]
        public class ApprovalActionsController : ControllerBase
        {
            private readonly AppDbContext _db;
            public ApprovalActionsController(AppDbContext db) => _db = db;

            // GET /api/approval-actions/my-history/{userId}?companyId=&search=
            [HttpGet("my-history/{userId:guid}")]
            public async Task<IActionResult> GetMyHistory(
                Guid userId,
                [FromQuery] Guid? companyId,
                [FromQuery] string? search,
                [FromQuery] DateTime? fromDate,
                [FromQuery] DateTime? toDate)
            {
                var actionsQuery = _db.ApprovalActions.Where(a => a.ActionBy == userId);

                // toDate is treated as inclusive of the whole day (end-of-day)
                // since the frontend sends plain dates without a time component.
                if (fromDate.HasValue)
                    actionsQuery = actionsQuery.Where(a => a.CreatedAt >= fromDate.Value.Date);
                if (toDate.HasValue)
                    actionsQuery = actionsQuery.Where(a => a.CreatedAt < toDate.Value.Date.AddDays(1));

                var actions = await actionsQuery
                    .OrderByDescending(a => a.CreatedAt)
                    .ToListAsync();

                if (actions.Count == 0)
                    return Ok(ApiResponse<object>.Ok(new List<object>()));

                var instanceIds = actions.Select(a => a.ApprovalInstanceId).Distinct().ToList();
                var instances = await _db.ApprovalInstances
                    .Where(i => instanceIds.Contains(i.Id))
                    .ToListAsync();

                var entityIds = instances.Select(i => i.EntityId).Distinct().ToList();
                var requests = await _db.PurchaseRequests
                    .Where(pr => entityIds.Contains(pr.Id))
                    .ToListAsync();

                var companyIds = requests.Select(r => r.CompanyId).Distinct().ToList();
                var companies = await _db.Companies
                    .Where(c => companyIds.Contains(c.Id))
                    .ToListAsync();

                // Pre-fetch store-verification item details in one shot (avoids
                // N+1 queries) — keyed by PurchaseRequestId for lookup below.
                var requestIdsWithVerification = requests.Select(r => r.Id).ToList();
                var verifiedItemsRaw = await _db.PurchaseRequestItems
                    .Where(i => requestIdsWithVerification.Contains(i.PurchaseRequestId)
                             && i.StoreVerifiedById == userId)
                    .ToListAsync();

                var materialIds = verifiedItemsRaw.Select(i => i.MaterialId).Distinct().ToList();
                // NOTE: PurchaseRequestItem.MaterialId resolves against the Items
                // table elsewhere in this codebase (see PurchaseRequestsController
                // .GetUserRequests) — matching that pattern here for consistency.
                // If your schema actually uses a separate Materials table for
                // this FK, swap _db.Items for _db.Materials below.
                var materials = await _db.Items
                    .Where(m => materialIds.Contains(m.Id))
                    .ToListAsync();

                var result = new List<object>();

                foreach (var action in actions)
                {
                    var instance = instances.FirstOrDefault(i => i.Id == action.ApprovalInstanceId);
                    if (instance == null) continue;

                    var pr = requests.FirstOrDefault(r => r.Id == instance.EntityId);
                    if (pr == null) continue;

                    if (companyId.HasValue && pr.CompanyId != companyId.Value) continue;
                    if (!string.IsNullOrWhiteSpace(search) &&
                        !pr.RequestNumber.Contains(search, StringComparison.OrdinalIgnoreCase))
                        continue;

                    var company = companies.FirstOrDefault(c => c.Id == pr.CompanyId);

                    List<object>? verifiedItems = null;
                    if (action.ActionType == "STORE_VERIFIED")
                    {
                        verifiedItems = verifiedItemsRaw
                            .Where(i => i.PurchaseRequestId == pr.Id)
                            .Select(i =>
                            {
                                var material = materials.FirstOrDefault(m => m.Id == i.MaterialId);
                                return (object)new
                                {
                                    materialCode = material?.ItemCode ?? "",
                                    materialName = material?.Name ?? "",
                                    requestedQty = i.Quantity,
                                    availableQty = i.AvailableQty,
                                    purchaseQty = i.PurchaseQty,
                                    storeStatus = i.StoreStatus.ToString(),
                                    storeRemarks = i.StoreRemarks
                                };
                            })
                            .ToList();
                    }

                    result.Add(new
                    {
                        id = action.Id,
                        requestId = pr.Id,
                        requestNumber = pr.RequestNumber,
                        companyId = pr.CompanyId,
                        companyName = company?.Name ?? "Unknown",
                        actionType = action.ActionType,
                        comments = action.Comments,
                        actionDate = action.CreatedAt,
                        verifiedItems
                    });
                }

                return Ok(ApiResponse<object>.Ok(result));
            }
        }
    }