// ===== FILE: InternationalPurchaseOrdersController.cs =====
// Place under: Controllers/InternationalPO/InternationalPurchaseOrdersController.cs

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Procurement.Api.Common;
using Procurement.Api.Data;
using Procurement.Api.DTOs.InternationalPO;
using Procurement.Api.Models;
using Procurement.Api.Models.InternationalPO;
using System.Security.Claims;
 

namespace Procurement.Api.Controllers.InternationalPO
{
    [Authorize]
    [ApiController]
    [Route("api/international-po")]
    public class InternationalPurchaseOrdersController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly Procurement.Api.Services.Workflow.IApprovalEngineService _engine;

        public InternationalPurchaseOrdersController(AppDbContext db, Procurement.Api.Services.Workflow.IApprovalEngineService engine)
        {
            _db = db;
            _engine = engine;
        }

        // ── GET /api/international-po — list view ──────────────────────
        [HttpGet]

        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] Guid? companyId, [FromQuery] string? status, [FromQuery] Guid? linkedPurchaseRequestId)
        {
            var query = _db.InternationalPurchaseOrders.Where(p => p.IsActive);

            if (companyId.HasValue)
                query = query.Where(p => p.CompanyId == companyId.Value);

            if (!string.IsNullOrWhiteSpace(status))
                query = query.Where(p => p.Status == status);

            if (linkedPurchaseRequestId.HasValue)
                query = query.Where(p => p.LinkedPurchaseRequestId == linkedPurchaseRequestId.Value);

            var data = await query
               .Join(_db.Companies, p => p.CompanyId, c => c.Id, (p, c) => new { p, CompanyName = c.Name })
               .Join(_db.Suppliers, x => x.p.SupplierId, s => s.Id, (x, s) => new InternationalPoListItemDto
               {
                   Id = x.p.Id,
                   PoNo = x.p.PoNo,
                   CompanyName = x.CompanyName,
                   SupplierName = s.Name,
                   Currency = x.p.Currency,
                   TotalAmount = x.p.TotalAmount,
                   Status = x.p.Status,
                   BrightPoNumber = x.p.BrightPoNumber,
                   PoDate = x.p.PoDate,
                   CreatedAt = x.p.CreatedAt,
                   IsInternational = x.p.IsInternational,
                   MrReferenceNumber = x.p.MrReferenceNumber,
                   LinkedRequestNumber = x.p.LinkedPurchaseRequestId.HasValue
                       ? _db.PurchaseRequests.Where(pr => pr.Id == x.p.LinkedPurchaseRequestId.Value)
                             .Select(pr => pr.RequestNumber).FirstOrDefault()
                       : null,
                   RevisionNumber = x.p.RevisionNumber,
                   RootPoNo = x.p.RootPoNo
               })
               .OrderByDescending(p => p.CreatedAt)
               .ToListAsync();

            // ── NEW: bulk-fetch every PO's full linked-MR list in one shot,
            // instead of one query per row. Groups InternationalPOItems ->
            // PurchaseRequestItems -> PurchaseRequests by PO id, so a
            // multi-MR PO shows ALL its source MR numbers here, not just
            // the single primary one used for LinkedRequestNumber above.
            var poIds = data.Select(d => d.Id).ToList();

            var mrLookup = await _db.InternationalPOItems
                .Where(poi => poIds.Contains(poi.InternationalPoId) && poi.IsActive && poi.SourcePurchaseRequestItemId.HasValue)
                .Join(_db.PurchaseRequestItems, poi => poi.SourcePurchaseRequestItemId!.Value, pri => pri.Id,
                    (poi, pri) => new { poi.InternationalPoId, pri.PurchaseRequestId })
                .Join(_db.PurchaseRequests, x => x.PurchaseRequestId, pr => pr.Id,
                    (x, pr) => new { x.InternationalPoId, pr.RequestNumber })
                .Distinct()
                .ToListAsync();

            var mrByPoId = mrLookup
                .GroupBy(x => x.InternationalPoId)
                .ToDictionary(g => g.Key, g => g.Select(x => x.RequestNumber).ToList());

            foreach (var row in data)
            {
                row.LinkedMrNumbers = mrByPoId.TryGetValue(row.Id, out var mrs) ? mrs : new List<string>();
            }

            return Ok(ApiResponse<List<InternationalPoListItemDto>>.Ok(data));
        }

        //public async Task<IActionResult> GetAll([FromQuery] Guid? companyId, [FromQuery] string? status, [FromQuery] Guid? linkedPurchaseRequestId)
        //{
        //    var query = _db.InternationalPurchaseOrders.Where(p => p.IsActive);

        //    if (companyId.HasValue)
        //        query = query.Where(p => p.CompanyId == companyId.Value);

        //    if (!string.IsNullOrWhiteSpace(status))
        //        query = query.Where(p => p.Status == status);

        //    // ── NEW: lets Procurement Queue's "View PO" popup fetch every
        //    // PO created from a specific MR, to show their statuses.
        //    if (linkedPurchaseRequestId.HasValue)
        //        query = query.Where(p => p.LinkedPurchaseRequestId == linkedPurchaseRequestId.Value);

        //    var data = await query
        //       .Join(_db.Companies, p => p.CompanyId, c => c.Id, (p, c) => new { p, CompanyName = c.Name })
        //       .Join(_db.Suppliers, x => x.p.SupplierId, s => s.Id, (x, s) => new InternationalPoListItemDto
        //       {
        //           Id = x.p.Id,
        //           PoNo = x.p.PoNo,
        //           CompanyName = x.CompanyName,
        //           SupplierName = s.Name,
        //           Currency = x.p.Currency,
        //           TotalAmount = x.p.TotalAmount,
        //           Status = x.p.Status,
        //           BrightPoNumber = x.p.BrightPoNumber,
        //           PoDate = x.p.PoDate,
        //           CreatedAt = x.p.CreatedAt,
        //           IsInternational = x.p.IsInternational,
        //           MrReferenceNumber = x.p.MrReferenceNumber,
        //           LinkedRequestNumber = x.p.LinkedPurchaseRequestId.HasValue
        //               ? _db.PurchaseRequests.Where(pr => pr.Id == x.p.LinkedPurchaseRequestId.Value)
        //                     .Select(pr => pr.RequestNumber).FirstOrDefault()
        //               : null,
        //           RevisionNumber = x.p.RevisionNumber,
        //           RootPoNo = x.p.RootPoNo
        //       })
        //       .OrderByDescending(p => p.CreatedAt)
        //       .ToListAsync();

        //    return Ok(ApiResponse<List<InternationalPoListItemDto>>.Ok(data));
        //}
        // ── GET /api/international-po/{id} — full detail (edit screen / print) ──
        [HttpGet("{id:guid}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var po = await _db.InternationalPurchaseOrders.FindAsync(id);
            if (po == null || !po.IsActive)
                return NotFound(ApiResponse<object>.Fail("International PO not found."));

            var dto = await BuildDetailDtoAsync(po);
            return Ok(ApiResponse<InternationalPoDetailDto>.Ok(dto));
        }

        // ── POST /api/international-po — create draft ──────────────────
        [HttpPost]
        public async Task<IActionResult> Create(CreateInternationalPoDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.SupplierId.ToString()))
                return BadRequest(ApiResponse<object>.Fail("Supplier is required."));

            var company = await _db.Companies.FindAsync(dto.CompanyId);
            if (company == null)
                return BadRequest(ApiResponse<object>.Fail("Company not found."));

            // ── NEW: wrap allocation-check + insert in a transaction with a row
            // lock on the source MR items. This closes a race condition where two
            // officers converting the same MR item at nearly the same moment could
            // both read "qty still available" before either one's PO actually
            // saved, resulting in over-allocation beyond the MR's approved qty.
            using var transaction = await _db.Database.BeginTransactionAsync();
            try
            {
                var sourceItemIds = dto.Items
                    .Where(i => i.SourcePurchaseRequestItemId.HasValue)
                    .Select(i => i.SourcePurchaseRequestItemId!.Value)
                    .Distinct()
                    .ToList();

                if (sourceItemIds.Count > 0)
                {
                    // Lock these PurchaseRequestItems rows for the duration of this
                    // transaction — any other request trying to check/allocate
                    // against the same rows will wait until this one commits or
                    // rolls back, instead of reading a stale "still available" qty.
                    var idList = string.Join(",", sourceItemIds.Select(id => $"'{id}'"));
                    await _db.Database.ExecuteSqlRawAsync(
                        $"SELECT Id FROM PurchaseRequestItems WITH (UPDLOCK, ROWLOCK) WHERE Id IN ({idList})");
                }

                // ── NEW: if items come from one or more MRs, every one of
                // those MRs must belong to the same company as this PO. A PO
                // is a single-supplier, single-company document — mixing MRs
                // from different companies onto one PO would make the
                // accounting/expense attribution ambiguous. This is what makes
                // multi-MR combination safe: same-company MRs (even across
                // different departments/projects/cost centers) can be pooled
                // onto one PO, but a different-company MR is always rejected.
                if (sourceItemIds.Count > 0)
                {
                    var sourceMrCompanyIds = await _db.PurchaseRequestItems
                        .Where(pi => sourceItemIds.Contains(pi.Id))
                        .Join(_db.PurchaseRequests, pi => pi.PurchaseRequestId, pr => pr.Id, (pi, pr) => pr.CompanyId)
                        .Distinct()
                        .ToListAsync();

                    if (sourceMrCompanyIds.Any(cid => cid != dto.CompanyId))
                        return BadRequest(ApiResponse<object>.Fail(
                            "All linked MRs must belong to the same company as this PO. One or more selected items come from an MR under a different company."));
                }

                // ── Existing allocation check, unchanged ──
                foreach (var item in dto.Items.Where(i => i.SourcePurchaseRequestItemId.HasValue))
                {
                    var sourceItemId = item.SourcePurchaseRequestItemId!.Value;
                    var prItem = await _db.PurchaseRequestItems.FindAsync(sourceItemId);
                    if (prItem == null)
                        return BadRequest(ApiResponse<object>.Fail("Source MR item not found."));

                    var alreadyAllocatedQty = await _db.InternationalPOItems
                        .Where(poi => poi.SourcePurchaseRequestItemId == sourceItemId && poi.IsActive)
                        .Join(_db.InternationalPurchaseOrders.Where(p => p.Status != "Cancelled" && p.IsActive && p.SupersededByPoId == null),
                            poi => poi.InternationalPoId, p => p.Id, (poi, p) => poi)
                        .SumAsync(poi => (decimal?)poi.Qty) ?? 0;

                    var remainingQty = prItem.Quantity - alreadyAllocatedQty;
                    if (item.Qty > remainingQty)
                        return BadRequest(ApiResponse<object>.Fail(
                            $"Cannot allocate {item.Qty} for this item — only {remainingQty} remaining on the MR."));
                }

                var po = new InternationalPurchaseOrder
                {
                    Id = Guid.NewGuid(),
                    PoNo = dto.PoNo,
                    CompanyId = dto.CompanyId,
                    LinkedPurchaseRequestId = dto.LinkedPurchaseRequestId,
                    MrReferenceNumber = dto.MrReferenceNumber,
                    IsInternational = dto.IsInternational,
                    SupplierId = dto.SupplierId,
                    PoDate = DateTime.UtcNow,
                    ContactPerson = dto.ContactPerson,
                    ForDeliveryName = dto.ForDeliveryName,
                    LandlineEmail = dto.LandlineEmail,
                    Mobile = dto.Mobile,
                    DeliveryLocationId = dto.DeliveryLocationId,
                    DeliveryLocationName = dto.DeliveryLocationName,
                    ProjectId = dto.ProjectId,
                    PaymentType = dto.PaymentType,
                    Email = dto.Email,
                    OriginCountry = dto.OriginCountry,
                    DestinationPort = dto.DestinationPort,
                    Incoterm = dto.Incoterm,
                    PerformaNo = dto.PerformaNo,
                    ContainerDetails = dto.ContainerDetails,
                    DeliveryPeriodText = dto.DeliveryPeriodText,
                    RequestedById = dto.RequestedById,
                    // ── Currency: Local POs are always QAR, no manual override ──
                    Currency = !dto.IsInternational ? "QAR" : (string.IsNullOrWhiteSpace(dto.Currency) ? "USD" : dto.Currency),
                    ExchangeRate = dto.ExchangeRate,
                    ModeOfFreight = dto.ModeOfFreight,
                    TypeOfCargo = dto.TypeOfCargo,
                    PaymentTermsText = dto.PaymentTermsText,
                    TermsAndConditions = dto.TermsAndConditions,
                    Status = InternationalPoStatus.Draft,
                    CreatedAt = DateTime.UtcNow,
                    IsActive = true
                };

                _db.InternationalPurchaseOrders.Add(po);
                await _db.SaveChangesAsync();

                int lineOrder = 1;
                foreach (var item in dto.Items)
                {
                    _db.InternationalPOItems.Add(new InternationalPOItem
                    {
                        Id = Guid.NewGuid(),
                        InternationalPoId = po.Id,
                        SourcePurchaseRequestItemId = item.SourcePurchaseRequestItemId,
                        FreeTextItemCode = item.FreeTextItemCode,
                        FreeTextItemName = item.FreeTextItemName,
                        Qty = item.Qty,
                        Uom = item.Uom,
                        Rate = item.Rate,
                        DiscountAmount = item.DiscountAmount,
                        Amount = (item.Qty * item.Rate) - item.DiscountAmount,
                        LineOrder = lineOrder++,
                        CreatedAt = DateTime.UtcNow,
                        IsActive = true
                    });
                }

                await _db.SaveChangesAsync();
                await RecalculateTotalsAsync(po);
                await _db.SaveChangesAsync();

                await transaction.CommitAsync();

                var resultDto = await BuildDetailDtoAsync(po);
                return Ok(ApiResponse<InternationalPoDetailDto>.Ok(resultDto, "International PO created."));
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }
        //public async Task<IActionResult> Create(CreateInternationalPoDto dto)
        //{
        //    if (string.IsNullOrWhiteSpace(dto.SupplierId.ToString()))
        //        return BadRequest(ApiResponse<object>.Fail("Supplier is required."));

        //    var company = await _db.Companies.FindAsync(dto.CompanyId);
        //    if (company == null)
        //        return BadRequest(ApiResponse<object>.Fail("Company not found."));

        //    // ── NEW: wrap allocation-check + insert in a transaction with a row
        //    // lock on the source MR items. This closes a race condition where two
        //    // officers converting the same MR item at nearly the same moment could
        //    // both read "qty still available" before either one's PO actually
        //    // saved, resulting in over-allocation beyond the MR's approved qty.
        //    using var transaction = await _db.Database.BeginTransactionAsync();
        //    try
        //    {
        //        var sourceItemIds = dto.Items
        //            .Where(i => i.SourcePurchaseRequestItemId.HasValue)
        //            .Select(i => i.SourcePurchaseRequestItemId!.Value)
        //            .Distinct()
        //            .ToList();

        //        if (sourceItemIds.Count > 0)
        //        {
        //            // Lock these PurchaseRequestItems rows for the duration of this
        //            // transaction — any other request trying to check/allocate
        //            // against the same rows will wait until this one commits or
        //            // rolls back, instead of reading a stale "still available" qty.
        //            var idList = string.Join(",", sourceItemIds.Select(id => $"'{id}'"));
        //            await _db.Database.ExecuteSqlRawAsync(
        //                $"SELECT Id FROM PurchaseRequestItems WITH (UPDLOCK, ROWLOCK) WHERE Id IN ({idList})");
        //        }

        //        // ── Existing allocation check, unchanged ──
        //        foreach (var item in dto.Items.Where(i => i.SourcePurchaseRequestItemId.HasValue))
        //        {
        //            var sourceItemId = item.SourcePurchaseRequestItemId!.Value;
        //            var prItem = await _db.PurchaseRequestItems.FindAsync(sourceItemId);
        //            if (prItem == null)
        //                return BadRequest(ApiResponse<object>.Fail("Source MR item not found."));

        //            var alreadyAllocatedQty = await _db.InternationalPOItems
        //                .Where(poi => poi.SourcePurchaseRequestItemId == sourceItemId && poi.IsActive)
        //                .Join(_db.InternationalPurchaseOrders.Where(p => p.Status != "Cancelled" && p.IsActive && p.SupersededByPoId == null),
        //                    poi => poi.InternationalPoId, p => p.Id, (poi, p) => poi)
        //                .SumAsync(poi => (decimal?)poi.Qty) ?? 0;

        //            var remainingQty = prItem.Quantity - alreadyAllocatedQty;
        //            if (item.Qty > remainingQty)
        //                return BadRequest(ApiResponse<object>.Fail(
        //                    $"Cannot allocate {item.Qty} for this item — only {remainingQty} remaining on the MR."));
        //        }

        //        var po = new InternationalPurchaseOrder
        //        {
        //            Id = Guid.NewGuid(),
        //            PoNo = dto.PoNo,
        //            CompanyId = dto.CompanyId,
        //            LinkedPurchaseRequestId = dto.LinkedPurchaseRequestId,
        //            MrReferenceNumber = dto.MrReferenceNumber,
        //            IsInternational = dto.IsInternational,
        //            SupplierId = dto.SupplierId,
        //            PoDate = DateTime.UtcNow,
        //            ContactPerson = dto.ContactPerson,
        //            ForDeliveryName = dto.ForDeliveryName,
        //            LandlineEmail = dto.LandlineEmail,
        //            Mobile = dto.Mobile,
        //            DeliveryLocationId = dto.DeliveryLocationId,
        //            DeliveryLocationName = dto.DeliveryLocationName,
        //            ProjectId = dto.ProjectId,
        //            PaymentType = dto.PaymentType,
        //            Email = dto.Email,
        //            OriginCountry = dto.OriginCountry,
        //            DestinationPort = dto.DestinationPort,
        //            Incoterm = dto.Incoterm,
        //            PerformaNo = dto.PerformaNo,
        //            RequestedById = dto.RequestedById,
        //            // ── Currency: Local POs are always QAR, no manual override ──
        //            Currency = !dto.IsInternational ? "QAR" : (string.IsNullOrWhiteSpace(dto.Currency) ? "USD" : dto.Currency),
        //            ExchangeRate = dto.ExchangeRate,
        //            ModeOfFreight = dto.ModeOfFreight,
        //            TypeOfCargo = dto.TypeOfCargo,
        //            PaymentTermsText = dto.PaymentTermsText,
        //            TermsAndConditions = dto.TermsAndConditions,
        //            Status = InternationalPoStatus.Draft,
        //            CreatedAt = DateTime.UtcNow,
        //            IsActive = true
        //        };

        //        _db.InternationalPurchaseOrders.Add(po);
        //        await _db.SaveChangesAsync();

        //        int lineOrder = 1;
        //        foreach (var item in dto.Items)
        //        {
        //            _db.InternationalPOItems.Add(new InternationalPOItem
        //            {
        //                Id = Guid.NewGuid(),
        //                InternationalPoId = po.Id,
        //                SourcePurchaseRequestItemId = item.SourcePurchaseRequestItemId,
        //                FreeTextItemCode = item.FreeTextItemCode,
        //                FreeTextItemName = item.FreeTextItemName,
        //                Qty = item.Qty,
        //                Uom = item.Uom,
        //                Rate = item.Rate,
        //                DiscountAmount = item.DiscountAmount,
        //                Amount = (item.Qty * item.Rate) - item.DiscountAmount,
        //                LineOrder = lineOrder++,
        //                CreatedAt = DateTime.UtcNow,
        //                IsActive = true
        //            });
        //        }

        //        await _db.SaveChangesAsync();
        //        await RecalculateTotalsAsync(po);
        //        await _db.SaveChangesAsync();

        //        await transaction.CommitAsync();

        //        var resultDto = await BuildDetailDtoAsync(po);
        //        return Ok(ApiResponse<InternationalPoDetailDto>.Ok(resultDto, "International PO created."));
        //    }
        //    catch
        //    {
        //        await transaction.RollbackAsync();
        //        throw;
        //    }
        //}

        // ── PUT /api/international-po/{id} — update header ──────────────
        [HttpPut("{id:guid}")]
        public async Task<IActionResult> UpdateHeader(Guid id, UpdateInternationalPoHeaderDto dto)
        {
            var po = await _db.InternationalPurchaseOrders.FindAsync(id);
            if (po == null || !po.IsActive)
                return NotFound(ApiResponse<object>.Fail("International PO not found."));

            po.PoNo = dto.PoNo;
            po.ContactPerson = dto.ContactPerson;
            po.ForDeliveryName = dto.ForDeliveryName;
            po.LandlineEmail = dto.LandlineEmail;
            po.Mobile = dto.Mobile;
            po.DeliveryDateTime = dto.DeliveryDateTime;
            po.DeliveryLocationId = dto.DeliveryLocationId;
            po.ProjectId = dto.ProjectId;
            po.PaymentType = dto.PaymentType;
            po.Email = dto.Email;
            po.OriginCountry = dto.OriginCountry;
            po.DestinationPort = dto.DestinationPort;
            po.Incoterm = dto.Incoterm;
            po.PerformaNo = dto.PerformaNo;
            po.ContainerDetails = dto.ContainerDetails;
            po.DeliveryPeriodText = dto.DeliveryPeriodText;
            po.ModeOfFreight = dto.ModeOfFreight;
            po.TypeOfCargo = dto.TypeOfCargo;
            po.PaymentTermsText = dto.PaymentTermsText;
            po.AdvancePayment = dto.AdvancePayment;
            po.DiscountAmount = dto.DiscountAmount;
            po.InsuranceAmount = dto.InsuranceAmount;
            po.OthersAmount = dto.OthersAmount;
            po.TermsAndConditions = dto.TermsAndConditions;
            po.Notes = dto.Notes;

            if (!string.IsNullOrWhiteSpace(dto.BrightPoNumber))
                po.BrightPoNumber = dto.BrightPoNumber;

            po.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            await RecalculateTotalsAsync(po);
            await _db.SaveChangesAsync();

            return Ok(ApiResponse<object>.Ok(null, "International PO updated."));
        }

        // ── POST /api/international-po/{id}/items — add item line ───────
        [HttpPost("{id:guid}/items")]
        public async Task<IActionResult> AddItem(Guid id, CreateInternationalPoItemDto dto)
        {
            var po = await _db.InternationalPurchaseOrders.FindAsync(id);
            if (po == null || !po.IsActive)
                return NotFound(ApiResponse<object>.Fail("International PO not found."));

            if (po.LinkedPurchaseRequestId.HasValue && !dto.SourcePurchaseRequestItemId.HasValue)
                return BadRequest(ApiResponse<object>.Fail("This PO is linked to an MR — new items can't be added directly. Create a separate PO for anything not already on this list."));

            if (dto.Qty <= 0)
                return BadRequest(ApiResponse<object>.Fail("Quantity must be greater than zero."));

            // ── NEW: same UPDLOCK transaction pattern as Create() — locks the
            // source MR item row for the duration of this check+insert, closing
            // the same race condition when adding an item to an existing PO.
            using var transaction = await _db.Database.BeginTransactionAsync();
            try
            {
                if (dto.SourcePurchaseRequestItemId.HasValue)
                {
                    var sourceItemId = dto.SourcePurchaseRequestItemId.Value;

                    await _db.Database.ExecuteSqlRawAsync(
                        $"SELECT Id FROM PurchaseRequestItems WITH (UPDLOCK, ROWLOCK) WHERE Id = '{sourceItemId}'");

                    var prItem = await _db.PurchaseRequestItems.FindAsync(sourceItemId);
                    if (prItem == null)
                        return BadRequest(ApiResponse<object>.Fail("Source MR item not found."));

                    var alreadyAllocatedQty = await _db.InternationalPOItems
                        .Where(poi => poi.SourcePurchaseRequestItemId == sourceItemId && poi.IsActive)
                        .Join(_db.InternationalPurchaseOrders.Where(p => p.Status != "Cancelled" && p.IsActive && p.SupersededByPoId == null),
                            poi => poi.InternationalPoId, p => p.Id, (poi, p) => poi)
                        .SumAsync(poi => (decimal?)poi.Qty) ?? 0;

                    var remainingQty = prItem.Quantity - alreadyAllocatedQty;
                    if (dto.Qty > remainingQty)
                        return BadRequest(ApiResponse<object>.Fail($"Cannot allocate {dto.Qty} — only {remainingQty} remaining on this MR item."));
                }

                var item = new InternationalPOItem
                {
                    Id = Guid.NewGuid(),
                    InternationalPoId = id,
                    SourcePurchaseRequestItemId = dto.SourcePurchaseRequestItemId,
                    FreeTextItemCode = dto.FreeTextItemCode,
                    FreeTextItemName = dto.FreeTextItemName,
                    Qty = dto.Qty,
                    Uom = dto.Uom,
                    Rate = dto.Rate,
                    DiscountAmount = dto.DiscountAmount,
                    Amount = (dto.Qty * dto.Rate) - dto.DiscountAmount,
                    LineOrder = (await _db.InternationalPOItems.Where(i => i.InternationalPoId == id && i.IsActive).CountAsync()) + 1,
                    CreatedAt = DateTime.UtcNow,
                    IsActive = true
                };

                _db.InternationalPOItems.Add(item);
                await _db.SaveChangesAsync();

                await RecalculateTotalsAsync(po);
                await _db.SaveChangesAsync();

                await transaction.CommitAsync();

                return Ok(ApiResponse<object>.Ok(null, "Item added."));
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        // ── DELETE /api/international-po/{id}/items/{itemId} ────────────
        [HttpDelete("{id:guid}/items/{itemId:guid}")]
        public async Task<IActionResult> RemoveItem(Guid id, Guid itemId)
        {
            var po = await _db.InternationalPurchaseOrders.FindAsync(id);
            if (po == null || !po.IsActive)
                return NotFound(ApiResponse<object>.Fail("International PO not found."));

            var item = await _db.InternationalPOItems
                .FirstOrDefaultAsync(i => i.Id == itemId && i.InternationalPoId == id);
            if (item == null)
                return NotFound(ApiResponse<object>.Fail("Item not found."));

            item.IsActive = false;
            item.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();  // persist the removal first

            await RecalculateTotalsAsync(po);
            await _db.SaveChangesAsync();

            return Ok(ApiResponse<object>.Ok(null, "Item removed."));
        }
        // ── PUT /api/international-po/{id}/items/{itemId} — edit item qty/rate ──
        // Only allowed when items aren't locked (see frontend itemsLocked logic —
        // this mirrors the same rule server-side so the API can't be called
        // directly to bypass the UI lock).
        [HttpPut("{id:guid}/items/{itemId:guid}")]
        public async Task<IActionResult> UpdateItem(Guid id, Guid itemId, UpdateInternationalPoItemDto dto)
        {
            var po = await _db.InternationalPurchaseOrders.FindAsync(id);
            if (po == null || !po.IsActive)
                return NotFound(ApiResponse<object>.Fail("International PO not found."));

            var lockedStatuses = new[] { InternationalPoStatus.Completed, InternationalPoStatus.Cancelled, "Blocked", InternationalPoStatus.Superseded };
            if (lockedStatuses.Contains(po.Status))
                return BadRequest(ApiResponse<object>.Fail("This PO's items cannot be edited in its current status."));

            // MR-linked items are normally locked, EXCEPT on a revision (RevisionNumber > 0)
            // — a revision's whole purpose is correcting quantities against the original.
            // ── CHANGED: MR-linked items are locked from direct edit UNLESS still in
            // Draft. MRs never carry pricing (only quantity), so an officer needs to
            // be able to type the price in during Draft, before Mark Complete —
            // otherwise there's no way to ever set a price on an MR-linked PO short
            // of the (heavier) revision flow, which is meant for Completed POs only.
            if (po.LinkedPurchaseRequestId.HasValue && po.RevisionNumber == 0 && po.Status != InternationalPoStatus.Draft)
                return BadRequest(ApiResponse<object>.Fail("Items on an MR-linked PO can't be edited directly outside of Draft. Create a revision instead."));

            if (dto.Qty <= 0)
                return BadRequest(ApiResponse<object>.Fail("Quantity must be greater than zero."));

            var item = await _db.InternationalPOItems
                .FirstOrDefaultAsync(i => i.Id == itemId && i.InternationalPoId == id && i.IsActive);
            if (item == null)
                return NotFound(ApiResponse<object>.Fail("Item not found."));

            // same remaining-qty guard as AddItem, excluding this item's own current
            // allocation from the "already allocated" sum (since we're replacing it)
            if (item.SourcePurchaseRequestItemId.HasValue)
            {
                var sourceItemId = item.SourcePurchaseRequestItemId.Value; 
                var prItem = await _db.PurchaseRequestItems.FindAsync(sourceItemId);
                if (prItem == null)
                    return BadRequest(ApiResponse<object>.Fail("Source MR item not found."));

                var alreadyAllocatedQty = await _db.InternationalPOItems
                    .Where(poi => poi.SourcePurchaseRequestItemId == sourceItemId && poi.IsActive && poi.Id != itemId)
                    .Join(_db.InternationalPurchaseOrders.Where(p => p.Status != InternationalPoStatus.Cancelled && p.IsActive && p.SupersededByPoId == null),
                        poi => poi.InternationalPoId, p => p.Id, (poi, p) => poi)
                    .SumAsync(poi => (decimal?)poi.Qty) ?? 0;

                var remainingQty = prItem.Quantity - alreadyAllocatedQty;
                if (dto.Qty > remainingQty)
                    return BadRequest(ApiResponse<object>.Fail($"Cannot set qty to {dto.Qty} — only {remainingQty} remaining on this MR item."));
            }

            item.Qty = dto.Qty;
            item.Rate = dto.Rate;
            item.DiscountAmount = dto.DiscountAmount;
            item.Amount = (dto.Qty * dto.Rate) - dto.DiscountAmount;
            item.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();
            await RecalculateTotalsAsync(po);
            await _db.SaveChangesAsync();

            return Ok(ApiResponse<object>.Ok(null, "Item updated."));
        }
        // ── POST /api/international-po/{id}/quotes — add a vendor quote ─
        // InternationalPoItemId = null  -> whole-PO-level quote
        // InternationalPoItemId = set   -> per-item quote
        [HttpPost("{id:guid}/quotes")]
        public async Task<IActionResult> AddQuote(Guid id, AddQuoteDto dto)
        {
            var po = await _db.InternationalPurchaseOrders.FindAsync(id);
            if (po == null || !po.IsActive)
                return NotFound(ApiResponse<object>.Fail("International PO not found."));

            var supplier = await _db.Suppliers.FindAsync(dto.SupplierId);
            if (supplier == null)
                return BadRequest(ApiResponse<object>.Fail("Invalid supplier."));

            if (dto.InternationalPoItemId.HasValue)
            {
                var itemExists = await _db.InternationalPOItems
                    .AnyAsync(i => i.Id == dto.InternationalPoItemId.Value && i.InternationalPoId == id && i.IsActive);
                if (!itemExists)
                    return BadRequest(ApiResponse<object>.Fail("Item line not found on this PO."));
            }

            var quote = new InternationalPOItemQuote
            {
                Id = Guid.NewGuid(),
                InternationalPoId = id,
                InternationalPoItemId = dto.InternationalPoItemId,
                SupplierId = dto.SupplierId,
                UnitPrice = dto.UnitPrice,
                Currency = string.IsNullOrWhiteSpace(dto.Currency) ? "USD" : dto.Currency,
                ExchangeRateToQar = dto.ExchangeRateToQar <= 0 ? 1 : dto.ExchangeRateToQar,
                ConvertedPriceQar = dto.UnitPrice * (dto.ExchangeRateToQar <= 0 ? 1 : dto.ExchangeRateToQar),
                LeadTimeDays = dto.LeadTimeDays,
                ValidityDate = dto.ValidityDate,
                Notes = dto.Notes,
                IsSelected = false,
                CreatedAt = DateTime.UtcNow,
                IsActive = true
            };

            _db.InternationalPOItemQuotes.Add(quote);

            if (po.Status == InternationalPoStatus.Draft)
                po.Status = InternationalPoStatus.QuotesCollected;

            await _db.SaveChangesAsync();

            return Ok(ApiResponse<object>.Ok(new { quote.Id }, "Quote added."));
        }

        // ── POST /api/international-po/{id}/quotes/{quoteId}/select ─────
        [HttpPost("{id:guid}/quotes/{quoteId:guid}/select")]
        public async Task<IActionResult> SelectQuote(Guid id, Guid quoteId)
        {
            var po = await _db.InternationalPurchaseOrders.FindAsync(id);
            if (po == null || !po.IsActive)
                return NotFound(ApiResponse<object>.Fail("International PO not found."));

            var quote = await _db.InternationalPOItemQuotes
                .FirstOrDefaultAsync(q => q.Id == quoteId && q.InternationalPoId == id);
            if (quote == null)
                return NotFound(ApiResponse<object>.Fail("Quote not found."));

            if (quote.InternationalPoItemId.HasValue)
            {
                var siblingQuotes = await _db.InternationalPOItemQuotes
                    .Where(q => q.InternationalPoId == id && q.InternationalPoItemId == quote.InternationalPoItemId)
                    .ToListAsync();

                foreach (var s in siblingQuotes)
                    s.IsSelected = s.Id == quote.Id;

                var item = await _db.InternationalPOItems.FindAsync(quote.InternationalPoItemId.Value);
                if (item != null)
                {
                    item.Rate = quote.UnitPrice;
                    item.Amount = (item.Qty * item.Rate) - item.DiscountAmount;
                    item.UpdatedAt = DateTime.UtcNow;
                }
            }
            else
            {
                var siblingQuotes = await _db.InternationalPOItemQuotes
                    .Where(q => q.InternationalPoId == id && q.InternationalPoItemId == null)
                    .ToListAsync();

                foreach (var s in siblingQuotes)
                    s.IsSelected = s.Id == quote.Id;

                po.SupplierId = quote.SupplierId;
                po.Currency = quote.Currency;
                po.ExchangeRate = quote.ExchangeRateToQar;

                var itemsWithOwnSelectedQuote = await _db.InternationalPOItemQuotes
                    .Where(q => q.InternationalPoId == id && q.InternationalPoItemId != null && q.IsSelected)
                    .Select(q => q.InternationalPoItemId!.Value)
                    .ToListAsync();

                var itemsToUpdate = await _db.InternationalPOItems
                    .Where(i => i.InternationalPoId == id && i.IsActive && !itemsWithOwnSelectedQuote.Contains(i.Id))
                    .ToListAsync();

                foreach (var item in itemsToUpdate)
                {
                    item.Rate = quote.UnitPrice;
                    item.Amount = (item.Qty * item.Rate) - item.DiscountAmount;
                    item.UpdatedAt = DateTime.UtcNow;
                }
            }

            po.Status = InternationalPoStatus.SupplierSelected;
            po.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            await RecalculateTotalsAsync(po);
            await _db.SaveChangesAsync();

            var resultDto = await BuildDetailDtoAsync(po);
            return Ok(ApiResponse<InternationalPoDetailDto>.Ok(resultDto, "Quote selected."));
        }

        // ── DELETE /api/international-po/{id}/quotes/{quoteId} ──────────
        [HttpDelete("{id:guid}/quotes/{quoteId:guid}")]
        public async Task<IActionResult> RemoveQuote(Guid id, Guid quoteId)
        {
            var quote = await _db.InternationalPOItemQuotes
                .FirstOrDefaultAsync(q => q.Id == quoteId && q.InternationalPoId == id);
            if (quote == null)
                return NotFound(ApiResponse<object>.Fail("Quote not found."));

            quote.IsActive = false;
            quote.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();
            return Ok(ApiResponse<object>.Ok(null, "Quote removed."));
        }
        private async Task<bool> IsManagerRoleAsync()
        {
            var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userIdClaim == null || !Guid.TryParse(userIdClaim, out var userId))
                return false;

            var roles = await _db.UserRoles
                .Where(ur => ur.UserId == userId)
                .Join(_db.Roles, ur => ur.RoleId, r => r.Id, (ur, r) => r.Name)
                .ToListAsync();

            return roles.Contains("Procurement Manager") || roles.Contains("System Admin");
        }

        [HttpPut("{id:guid}/status")]
        public async Task<IActionResult> UpdateStatus(Guid id, UpdateStatusDto dto)
        {
            var po = await _db.InternationalPurchaseOrders.FindAsync(id);
            if (po == null || !po.IsActive)
                return NotFound(ApiResponse<object>.Fail("International PO not found."));

            var validStatuses = new[]
            {
    InternationalPoStatus.Draft, InternationalPoStatus.QuotesCollected,
    InternationalPoStatus.SupplierSelected, InternationalPoStatus.Finalized,
    InternationalPoStatus.SentToBright, InternationalPoStatus.Completed,
    InternationalPoStatus.Cancelled, "Blocked"
};

            if (!validStatuses.Contains(dto.Status))
                return BadRequest(ApiResponse<object>.Fail("Invalid status value."));

            // ── NEW: block marking a PO as Completed if any active item still
            // has a zero rate — a zero-priced item slipping through means the
            // PO's Net PO Value could be entirely made up of expenses with no
            // actual item cost, which is almost always a data-entry mistake
            // (officer forgot to fill in the price).
            if (dto.Status == InternationalPoStatus.Completed)
            {
                var hasZeroRateItems = await _db.InternationalPOItems
                    .AnyAsync(i => i.InternationalPoId == id && i.IsActive && i.Rate <= 0);

                if (hasZeroRateItems)
                    return BadRequest(ApiResponse<object>.Fail(
                        "One or more items have no price (Rate = 0). Enter the item price before marking this PO as Completed."));
            }

            // ── NEW: "Unpost" (Completed -> Blocked) and "Post" (Blocked-that-came-
            // from-Completed -> back to Completed) are Manager-only actions. This is
            // the only way a Completed PO gets reopened for revision — an officer
            // can never do this themselves; a manager has to explicitly unpost it
            // first. This check runs before any other logic below.
            bool isUnpostAction = po.Status == InternationalPoStatus.Completed && dto.Status == "Blocked";
            bool isRepostAction = po.Status == "Blocked"
                                   && po.StatusBeforeBlock == InternationalPoStatus.Completed
                                   && dto.Status == InternationalPoStatus.Completed;

            if ((isUnpostAction || isRepostAction) && !await IsManagerRoleAsync())
                return Forbid();

            if (dto.Status == InternationalPoStatus.Draft)
            {
                if (po.SupersededByPoId.HasValue)
                    return BadRequest(ApiResponse<object>.Fail("This PO has been revised — edit the latest revision instead."));
                if (po.Status == InternationalPoStatus.Cancelled)
                    return BadRequest(ApiResponse<object>.Fail("A cancelled PO cannot be returned to Draft."));
                if (po.Status == InternationalPoStatus.Completed)
                    return BadRequest(ApiResponse<object>.Fail("A Completed PO cannot be returned to Draft. Use Create Revision instead to make a tracked correction."));
            }

            // ── existing: remember the status this PO was in right before it gets
            // Blocked, so Unblock/Post can restore exactly that — not always "Draft".
            if (dto.Status == "Blocked")
            {
                po.StatusBeforeBlock = po.Status;
            }

            // ── existing: Unblock restores the remembered prior status instead of
            // hardcoding "Draft". A Completed PO that got Unposted comes back as
            // Completed via this same path when dto.Status == Draft is sent for a
            // non-Completed-origin Blocked PO (e.g. a Draft that got Blocked).
            if (po.Status == "Blocked" && dto.Status == InternationalPoStatus.Draft)
            {
                var restoreStatus = string.IsNullOrWhiteSpace(po.StatusBeforeBlock)
                    ? InternationalPoStatus.Draft
                    : po.StatusBeforeBlock;

                po.Status = restoreStatus;
                po.StatusBeforeBlock = null;
                po.UpdatedAt = DateTime.UtcNow;

                _db.AuditLogs.Add(new AuditLog
                {
                    Id = Guid.NewGuid(),
                    Module = "International PO",
                    Action = $"Unblock -> {restoreStatus}",
                    UserName = "System",
                    Details = po.PoNo ?? po.Id.ToString(),
                    CreatedAt = DateTime.UtcNow
                });

                await _db.SaveChangesAsync();
                return Ok(ApiResponse<object>.Ok(null, $"Unblocked — restored to {restoreStatus}."));
            }

            // ── NEW: explicit "Post" — Manager re-locks a Blocked-Completed PO
            // (Unposted state) straight back to Completed, without going through
            // the Draft-restore path above (that path is for a Draft that got
            // Blocked, which is a different scenario).
            if (isRepostAction)
            {
                po.Status = InternationalPoStatus.Completed;
                po.StatusBeforeBlock = null;
                po.UpdatedAt = DateTime.UtcNow;

                _db.AuditLogs.Add(new AuditLog
                {
                    Id = Guid.NewGuid(),
                    Module = "International PO",
                    Action = "Post (re-lock as Completed)",
                    UserName = "System",
                    Details = po.PoNo ?? po.Id.ToString(),
                    CreatedAt = DateTime.UtcNow
                });

                await _db.SaveChangesAsync();
                return Ok(ApiResponse<object>.Ok(null, "PO posted — locked as Completed again."));
            }

            if (dto.Status == InternationalPoStatus.Cancelled && po.ParentPoId.HasValue)
            {
                var parent = await _db.InternationalPurchaseOrders.FindAsync(po.ParentPoId.Value);
                if (parent != null && parent.SupersededByPoId == po.Id)
                {
                    parent.SupersededByPoId = null;
                    parent.Status = InternationalPoStatus.Completed;
                    parent.UpdatedAt = DateTime.UtcNow;
                }
            }

            po.Status = dto.Status;
            po.UpdatedAt = DateTime.UtcNow;

            _db.AuditLogs.Add(new AuditLog
            {
                Id = Guid.NewGuid(),
                Module = "International PO",
                Action = $"Status -> {dto.Status}",
                UserName = "System",
                Details = po.PoNo ?? po.Id.ToString(),
                CreatedAt = DateTime.UtcNow
            });

            await _db.SaveChangesAsync();
            return Ok(ApiResponse<object>.Ok(null, $"Status updated to {dto.Status}."));
        }
        //    public async Task<IActionResult> UpdateStatus(Guid id, UpdateStatusDto dto)
        //    {
        //        var po = await _db.InternationalPurchaseOrders.FindAsync(id);
        //        if (po == null || !po.IsActive)
        //            return NotFound(ApiResponse<object>.Fail("International PO not found."));

        //        var validStatuses = new[]
        //        {
        //    InternationalPoStatus.Draft, InternationalPoStatus.QuotesCollected,
        //    InternationalPoStatus.SupplierSelected, InternationalPoStatus.Finalized,
        //    InternationalPoStatus.SentToBright, InternationalPoStatus.Completed,
        //    InternationalPoStatus.Cancelled, "Blocked"
        //};

        //        if (!validStatuses.Contains(dto.Status))
        //            return BadRequest(ApiResponse<object>.Fail("Invalid status value."));

        //        if (dto.Status == InternationalPoStatus.Draft)
        //        {
        //            if (po.SupersededByPoId.HasValue)
        //                return BadRequest(ApiResponse<object>.Fail("This PO has been revised — edit the latest revision instead."));
        //            if (po.Status == InternationalPoStatus.Cancelled)
        //                return BadRequest(ApiResponse<object>.Fail("A cancelled PO cannot be returned to Draft."));
        //            if (po.Status == InternationalPoStatus.Completed)
        //                return BadRequest(ApiResponse<object>.Fail("A Completed PO cannot be returned to Draft. Use Create Revision instead to make a tracked correction."));
        //        }

        //        // ── NEW: remember the status this PO was in right before it gets
        //        // Blocked, so Unblock can restore exactly that — not always "Draft".
        //        // This closes the loophole where Block -> Unblock on a Completed PO
        //        // silently turned it back into an editable Draft.
        //        if (dto.Status == "Blocked")
        //        {
        //            po.StatusBeforeBlock = po.Status;
        //        }

        //        // ── NEW: Unblock restores the remembered prior status instead of
        //        // hardcoding "Draft". A Completed PO that got blocked comes back as
        //        // Completed (still locked, still no edit), not Draft.
        //        if (po.Status == "Blocked" && dto.Status == InternationalPoStatus.Draft)
        //        {
        //            var restoreStatus = string.IsNullOrWhiteSpace(po.StatusBeforeBlock)
        //                ? InternationalPoStatus.Draft
        //                : po.StatusBeforeBlock;

        //            po.Status = restoreStatus;
        //            po.StatusBeforeBlock = null;
        //            po.UpdatedAt = DateTime.UtcNow;

        //            _db.AuditLogs.Add(new AuditLog
        //            {
        //                Id = Guid.NewGuid(),
        //                Module = "International PO",
        //                Action = $"Unblock -> {restoreStatus}",
        //                UserName = "System",
        //                Details = po.PoNo ?? po.Id.ToString(),
        //                CreatedAt = DateTime.UtcNow
        //            });

        //            await _db.SaveChangesAsync();
        //            return Ok(ApiResponse<object>.Ok(null, $"Unblocked — restored to {restoreStatus}."));
        //        }

        //        if (dto.Status == InternationalPoStatus.Cancelled && po.ParentPoId.HasValue)
        //        {
        //            var parent = await _db.InternationalPurchaseOrders.FindAsync(po.ParentPoId.Value);
        //            if (parent != null && parent.SupersededByPoId == po.Id)
        //            {
        //                parent.SupersededByPoId = null;
        //                parent.Status = InternationalPoStatus.Completed;
        //                parent.UpdatedAt = DateTime.UtcNow;
        //            }
        //        }

        //        po.Status = dto.Status;
        //        po.UpdatedAt = DateTime.UtcNow;

        //        _db.AuditLogs.Add(new AuditLog
        //        {
        //            Id = Guid.NewGuid(),
        //            Module = "International PO",
        //            Action = $"Status -> {dto.Status}",
        //            UserName = "System",
        //            Details = po.PoNo ?? po.Id.ToString(),
        //            CreatedAt = DateTime.UtcNow
        //        });

        //        await _db.SaveChangesAsync();
        //        return Ok(ApiResponse<object>.Ok(null, $"Status updated to {dto.Status}."));
        //    }

        private async Task<List<SignatoryDto>> BuildSignatoriesAsync(Guid companyId)
        {
            async Task<string?> GetNameByRoleAsync(string roleName)
            {
                return await _db.UserRoles
                    .Join(_db.Roles, ur => ur.RoleId, r => r.Id, (ur, r) => new { ur, r })
                    .Where(x => x.r.Name == roleName)
                    .Join(_db.Users.Where(u => u.IsActive), x => x.ur.UserId, u => u.Id, (x, u) => u.FullName)
                    .FirstOrDefaultAsync();
            }

            async Task<string?> GetCompanyGmNameAsync(Guid compId)
            {
                var gmRoleIds = await _db.Roles
                    .Where(r => r.Name.EndsWith("-GM") || r.Name == "Company GM" || r.Name == "HTC GM")
                    .Select(r => r.Id)
                    .ToListAsync();

                return await _db.UserRoles
                    .Where(ur => gmRoleIds.Contains(ur.RoleId))
                    .Join(_db.UserCompanies.Where(uc => uc.CompanyId == compId && uc.IsActive),
                        ur => ur.UserId, uc => uc.UserId, (ur, uc) => ur.UserId)
                    .Join(_db.Users.Where(u => u.IsActive), uid => uid, u => u.Id, (uid, u) => u.FullName)
                    .FirstOrDefaultAsync();
            }

            return new List<SignatoryDto>
            {
                new() { Label = "Holding Procurement Manager", Name = await GetNameByRoleAsync("Procurement Manager") },
                new() { Label = "General Manager",              Name = await GetCompanyGmNameAsync(companyId) },
                new() { Label = "Deputy Chief Executive Officer", Name = await GetNameByRoleAsync("DCEO") },
                new() { Label = "Chief Executive Officer",       Name = await GetNameByRoleAsync("CEO") },
                new() { Label = "Chairman/Vice Chairman",        Name = await GetNameByRoleAsync("Vice Chairman") },
            };
        }
        // ── POST /api/international-po/{id}/create-revision ─────────────
        // Only allowed on a Completed PO that hasn't already been revised.
        // Copies the full header + items into a brand-new Draft PO named
        // "<RootPoNo>-R<n>", and marks the original as superseded so it
        // stays visible for audit but points forward to the live version.
        [HttpPost("{id:guid}/create-revision")]
        
        public async Task<IActionResult> CreateRevision(Guid id, [FromBody] CreateRevisionDto? dto)
        {
            var original = await _db.InternationalPurchaseOrders.FindAsync(id);
            if (original == null || !original.IsActive)
                return NotFound(ApiResponse<object>.Fail("International PO not found."));

            // ── CHANGED: a revision can now be created from a still-Completed PO
            // (old flow, kept for safety) OR from an "Unposted" PO — one that a
            // manager explicitly Blocked from Completed status via the Unpost
            // action. Unposted is the primary path now, since a manager must
            // unpost a Completed PO before anyone can revise it.
            bool isUnposted = original.Status == "Blocked" && original.StatusBeforeBlock == InternationalPoStatus.Completed;

            if (original.Status != InternationalPoStatus.Completed && !isUnposted)
                return BadRequest(ApiResponse<object>.Fail("Only a Completed (or Unposted) PO can be revised."));

            // ── CHANGED: don't blindly block on SupersededByPoId — check whether
            // the existing revision is still "live". If it was Cancelled, allow a
            // fresh revision to be created and clear the stale link.
            if (original.SupersededByPoId.HasValue)
            {
                var existingRevision = await _db.InternationalPurchaseOrders.FindAsync(original.SupersededByPoId.Value);

                if (existingRevision != null && existingRevision.Status != InternationalPoStatus.Cancelled)
                    return BadRequest(ApiResponse<object>.Fail(
                        $"This PO has already been revised as {existingRevision.PoNo}. Open that revision instead, or cancel it first to create a new one."));

                // existing revision was cancelled — clear the stale link, allow retry
                original.SupersededByPoId = null;
            }

            if (string.IsNullOrWhiteSpace(original.PoNo))
                return BadRequest(ApiResponse<object>.Fail("This PO has no PO Number set. Add one via Edit before creating a revision."));

            var rootPoNo = string.IsNullOrWhiteSpace(original.RootPoNo) ? original.PoNo : original.RootPoNo;

            // ── CHANGED: base the next revision number on original.RevisionNumber,
            // which we now persist on the original every time a revision is made —
            // this prevents number reuse (e.g. R1 cancelled -> next is R2, not R1 again).
            var newRevisionNumber = original.RevisionNumber + 1;
            var newPoNo = string.IsNullOrWhiteSpace(rootPoNo) ? null : $"{rootPoNo}-R{newRevisionNumber}";

            var revision = new InternationalPurchaseOrder
            {
                Id = Guid.NewGuid(),
                PoNo = newPoNo,
                CompanyId = original.CompanyId,
                LinkedPurchaseRequestId = original.LinkedPurchaseRequestId,
                MrReferenceNumber = original.MrReferenceNumber,
                IsInternational = original.IsInternational,
                RevisionNumber = newRevisionNumber,
                ParentPoId = original.Id,
                RootPoNo = rootPoNo,
                RevisionReason = dto?.Reason,
                SupplierId = original.SupplierId,
                PoDate = DateTime.UtcNow,
                ContactPerson = original.ContactPerson,
                ForDeliveryName = original.ForDeliveryName,
                LandlineEmail = original.LandlineEmail,
                Mobile = original.Mobile,
                DeliveryDateTime = original.DeliveryDateTime,
                DeliveryLocationId = original.DeliveryLocationId,
                DeliveryLocationName = original.DeliveryLocationName,
                ProjectId = original.ProjectId,
                PaymentType = original.PaymentType,
                Email = original.Email,
                OriginCountry = original.OriginCountry,
                DestinationPort = original.DestinationPort,
                Incoterm = original.Incoterm,
                PerformaNo = original.PerformaNo,
                RequestedById = original.RequestedById,
                Currency = original.Currency,
                ExchangeRate = original.ExchangeRate,
                ModeOfFreight = original.ModeOfFreight,
                TypeOfCargo = original.TypeOfCargo,
                PaymentTermsText = original.PaymentTermsText,
                AdvancePayment = original.AdvancePayment,
                DiscountAmount = original.DiscountAmount,
                InsuranceAmount = original.InsuranceAmount,
                OthersAmount = original.OthersAmount,
                TermsAndConditions = original.TermsAndConditions,
                Notes = original.Notes,
                Status = InternationalPoStatus.Draft,
                CreatedAt = DateTime.UtcNow,
                IsActive = true
            };

            _db.InternationalPurchaseOrders.Add(revision);
            await _db.SaveChangesAsync();

            var originalItems = await _db.InternationalPOItems
                .Where(i => i.InternationalPoId == original.Id && i.IsActive)
                .OrderBy(i => i.LineOrder)
                .ToListAsync();

            foreach (var item in originalItems)
            {
                _db.InternationalPOItems.Add(new InternationalPOItem
                {
                    Id = Guid.NewGuid(),
                    InternationalPoId = revision.Id,
                    ItemId = item.ItemId,
                    SourcePurchaseRequestItemId = item.SourcePurchaseRequestItemId,
                    FreeTextItemCode = item.FreeTextItemCode,
                    FreeTextItemName = item.FreeTextItemName,
                    Qty = item.Qty,
                    Uom = item.Uom,
                    Rate = item.Rate,
                    DiscountAmount = item.DiscountAmount,
                    Amount = item.Amount,
                    LineOrder = item.LineOrder,
                    CreatedAt = DateTime.UtcNow,
                    IsActive = true
                });
            }

            await _db.SaveChangesAsync();
            // ── Copy expenses to revision ──
            var originalExpenses = await _db.InternationalPOExpenses
                .Where(e => e.InternationalPoId == original.Id && e.IsActive)
                .ToListAsync();

            foreach (var exp in originalExpenses)
            {
                _db.InternationalPOExpenses.Add(new InternationalPOExpense
                {
                    Id = Guid.NewGuid(),
                    InternationalPoId = revision.Id,
                    SupplierExpenseTypeId = exp.SupplierExpenseTypeId,
                    Amount = exp.Amount,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                });
            }

            await _db.SaveChangesAsync();

            await RecalculateTotalsAsync(revision);

            await RecalculateTotalsAsync(revision);
            await _db.SaveChangesAsync();

            // ── existing: original flips to "Superseded" (works the same whether
            // it came from Completed or from Unposted/Blocked) and StatusBeforeBlock
            // is cleared since it's no longer relevant once superseded.
            original.SupersededByPoId = revision.Id;
            original.Status = InternationalPoStatus.Superseded;
            original.StatusBeforeBlock = null;   // ── NEW: clean up, no longer meaningful once Superseded
            original.RevisionNumber = newRevisionNumber;
            original.UpdatedAt = DateTime.UtcNow;

            _db.AuditLogs.Add(new AuditLog
            {
                Id = Guid.NewGuid(),
                Module = "International PO",
                Action = "Create Revision",
                UserName = "System",
                Details = $"{original.PoNo} -> {revision.PoNo}" + (dto?.Reason != null ? $" | Reason: {dto.Reason}" : ""),
                CreatedAt = DateTime.UtcNow
            });

            await _db.SaveChangesAsync();

            var resultDto = await BuildDetailDtoAsync(revision);
            return Ok(ApiResponse<InternationalPoDetailDto>.Ok(resultDto, "Revision created."));
        }
        // ── DELETE /api/international-po/{id} — soft delete / cancel ────
        [HttpDelete("{id:guid}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            var po = await _db.InternationalPurchaseOrders.FindAsync(id);
            if (po == null || !po.IsActive)
                return NotFound(ApiResponse<object>.Fail("International PO not found."));

            po.IsActive = false;
            po.Status = InternationalPoStatus.Cancelled;
            po.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();
            return Ok(ApiResponse<object>.Ok(null, "International PO cancelled."));
        }

        // ── HELPERS ───────────────────────────────────────────────────

        // ── GET /api/international-po/{id}/expenses ─────────────────────
        [HttpGet("{id:guid}/expenses")]
        public async Task<IActionResult> GetExpenses(Guid id)
        {
            var po = await _db.InternationalPurchaseOrders.FindAsync(id);
            if (po == null || !po.IsActive)
                return NotFound(ApiResponse<object>.Fail("International PO not found."));

            var expenses = await _db.InternationalPOExpenses
                .Where(e => e.InternationalPoId == id && e.IsActive)
                .Join(_db.SupplierExpenseTypes, e => e.SupplierExpenseTypeId, t => t.Id, (e, t) => new InternationalPoExpenseDto
                {
                    Id = e.Id,
                    SupplierExpenseTypeId = e.SupplierExpenseTypeId,
                    ExpenseCode = t.Code,
                    ExpenseDescription = t.Description,
                    Amount = e.Amount
                })
                .ToListAsync();

            return Ok(ApiResponse<List<InternationalPoExpenseDto>>.Ok(expenses));
        }

        // ── POST /api/international-po/{id}/expenses — bulk save ────────
        // Replaces all existing expense lines for this PO with the new set.
        // Frontend sends only checked expense types with their amounts.
        [HttpPost("{id:guid}/expenses")]
        public async Task<IActionResult> SaveExpenses(Guid id, SavePoExpensesDto dto)
        {
            var po = await _db.InternationalPurchaseOrders.FindAsync(id);
            if (po == null || !po.IsActive)
                return NotFound(ApiResponse<object>.Fail("International PO not found."));

            // Soft-delete all existing expense rows for this PO
            var existing = await _db.InternationalPOExpenses
                .Where(e => e.InternationalPoId == id && e.IsActive)
                .ToListAsync();

            foreach (var e in existing)
            {
                e.IsActive = false;
                e.UpdatedAt = DateTime.UtcNow;
            }

            // Insert new rows
            foreach (var line in dto.Expenses.Where(l => l.Amount != 0))
            {
                _db.InternationalPOExpenses.Add(new InternationalPOExpense
                {
                    Id = Guid.NewGuid(),
                    InternationalPoId = id,
                    SupplierExpenseTypeId = line.SupplierExpenseTypeId,
                    Amount = line.Amount,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                });
            }

            await _db.SaveChangesAsync();

            // Recalculate totals now that expenses changed
            await RecalculateTotalsAsync(po);
            await _db.SaveChangesAsync();

            return Ok(ApiResponse<object>.Ok(null, "Expenses saved."));
        }

        private async Task RecalculateTotalsAsync(InternationalPurchaseOrder po)
        {
            var subTotal = await _db.InternationalPOItems
                .Where(i => i.InternationalPoId == po.Id && i.IsActive)
                .SumAsync(i => (decimal?)i.Amount) ?? 0;

            var expensesTotal = await _db.InternationalPOExpenses
                .Where(e => e.InternationalPoId == po.Id && e.IsActive)
                .SumAsync(e => (decimal?)e.Amount) ?? 0;

            po.SubTotal = subTotal;
            // TotalAmount = items subtotal - discount + expenses total
            // (legacy flat fields InsuranceAmount/OthersAmount kept for backward
            //  compat with older POs; new POs use the expenses table instead)
            po.TotalAmount = subTotal - po.DiscountAmount + po.InsuranceAmount + po.OthersAmount + expensesTotal;
        }


        // POST /api/international-po/{id}/submit-for-approval
        [HttpPost("{id:guid}/submit-for-approval")]
        public async Task<IActionResult> SubmitForApproval(Guid id)
        {
            var po = await _db.InternationalPurchaseOrders.FindAsync(id);
            if (po == null || !po.IsActive)
                return NotFound(ApiResponse<object>.Fail("International PO not found."));

            var result = await _engine.StartPoWorkflowAsync(id);

            return result.Success
                ? Ok(ApiResponse<object>.Ok(result.Data, result.Message))
                : BadRequest(ApiResponse<object>.Fail(result.Message));
        }
        private async Task<InternationalPoDetailDto> BuildDetailDtoAsync(InternationalPurchaseOrder po)
        {
            var company = await _db.Companies.FindAsync(po.CompanyId);
            var supplier = await _db.Suppliers.FindAsync(po.SupplierId);
            var requestedBy = await _db.Users.FindAsync(po.RequestedById);
            var deliveryLocation = po.DeliveryLocationId.HasValue
                ? await _db.DeliveryLocations.FindAsync(po.DeliveryLocationId.Value)
                : null;
            var project = po.ProjectId.HasValue
                ? await _db.Projects.FindAsync(po.ProjectId.Value)
                : null;
            var linkedPr = po.LinkedPurchaseRequestId.HasValue
                ? await _db.PurchaseRequests.FindAsync(po.LinkedPurchaseRequestId.Value)
                : null;

            // ── NEW: revision family lookup ──
            var parentPoNo = po.ParentPoId.HasValue
                ? await _db.InternationalPurchaseOrders.Where(p => p.Id == po.ParentPoId.Value).Select(p => p.PoNo).FirstOrDefaultAsync()
                : null;
            var supersededByPoNo = po.SupersededByPoId.HasValue
                ? await _db.InternationalPurchaseOrders.Where(p => p.Id == po.SupersededByPoId.Value).Select(p => p.PoNo).FirstOrDefaultAsync()
                : null;

            var items = await _db.InternationalPOItems
                .Where(i => i.InternationalPoId == po.Id && i.IsActive)
                .OrderBy(i => i.LineOrder)
                .ToListAsync();

            var itemIds = items.Select(i => i.Id).ToList();
            var linkedItemMasterIds = items.Where(i => i.ItemId.HasValue).Select(i => i.ItemId!.Value).ToList();
            var itemMasterLookup = await _db.Items
                .Where(m => linkedItemMasterIds.Contains(m.Id))
                .ToDictionaryAsync(m => m.Id, m => m);

            var allQuotes = await _db.InternationalPOItemQuotes
                .Where(q => q.InternationalPoId == po.Id && q.IsActive)
                .ToListAsync();

            var supplierIds = allQuotes.Select(q => q.SupplierId).Distinct().ToList();
            var supplierLookup = await _db.Suppliers
                .Where(s => supplierIds.Contains(s.Id))
                .ToDictionaryAsync(s => s.Id, s => s.Name);

            // ── Load expenses ──
            var expenses = await _db.InternationalPOExpenses
                .Where(e => e.InternationalPoId == po.Id && e.IsActive)
                .Join(_db.SupplierExpenseTypes, e => e.SupplierExpenseTypeId, t => t.Id, (e, t) => new InternationalPoExpenseDto
                {
                    Id = e.Id,
                    SupplierExpenseTypeId = e.SupplierExpenseTypeId,
                    ExpenseCode = t.Code,
                    ExpenseDescription = t.Description,
                    Amount = e.Amount
                })
                .ToListAsync();

            var expensesTotal = expenses.Sum(e => e.Amount);

            // ── derive the distinct set of MR numbers this PO's items
            // were actually pulled from. A PO created from a single MR will
            // just show that one number here (same info LinkedRequestNumber
            // already carries); a PO combining several MRs via multi-select
            // shows all of them, in no particular guaranteed order.
            var sourceItemIdsForMrList = items
                .Where(i => i.SourcePurchaseRequestItemId.HasValue)
                .Select(i => i.SourcePurchaseRequestItemId!.Value)
                .Distinct()
                .ToList();

            var linkedMrNumbers = sourceItemIdsForMrList.Count > 0
                ? await _db.PurchaseRequestItems
                    .Where(pi => sourceItemIdsForMrList.Contains(pi.Id))
                    .Join(_db.PurchaseRequests, pi => pi.PurchaseRequestId, pr => pr.Id, (pi, pr) => pr.RequestNumber)
                    .Distinct()
                    .ToListAsync()
                : new List<string>();

            // ── NEW: derive the distinct set of Project names across every MR
            // this PO's items were pulled from. A single-MR PO shows just that
            // MR's project (same info projectName already carries); a multi-MR
            // PO shows every distinct project, since "Project" doubles as Cost
            // Center in this system and each source MR may carry a different one.
            var projectNames = sourceItemIdsForMrList.Count > 0
                ? await _db.PurchaseRequestItems
                    .Where(pi => sourceItemIdsForMrList.Contains(pi.Id))
                    .Join(_db.PurchaseRequests, pi => pi.PurchaseRequestId, pr => pr.Id, (pi, pr) => pr.ProjectId)
                    .Where(pid => pid != null)
                    .Distinct()
                    .Join(_db.Projects, pid => pid, proj => proj.Id, (pid, proj) => proj.Name)
                    .Distinct()
                    .ToListAsync()
                : new List<string>();

            InternationalPoItemQuoteDto MapQuote(InternationalPOItemQuote q) => new InternationalPoItemQuoteDto
            {
                Id = q.Id,
                InternationalPoItemId = q.InternationalPoItemId,
                SupplierId = q.SupplierId,
                SupplierName = supplierLookup.TryGetValue(q.SupplierId, out var sn) ? sn : "",
                UnitPrice = q.UnitPrice,
                Currency = q.Currency,
                ExchangeRateToQar = q.ExchangeRateToQar,
                ConvertedPriceQar = q.ConvertedPriceQar,
                LeadTimeDays = q.LeadTimeDays,
                ValidityDate = q.ValidityDate,
                Notes = q.Notes,
                IsSelected = q.IsSelected
            };

            var itemDtos = items.Select(i => new InternationalPoItemDto
            {
                Id = i.Id,
                ItemId = i.ItemId,
                ItemCode = i.ItemId.HasValue && itemMasterLookup.TryGetValue(i.ItemId.Value, out var m)
                    ? m.ItemCode : (i.FreeTextItemCode ?? ""),
                ItemName = i.ItemId.HasValue && itemMasterLookup.TryGetValue(i.ItemId.Value, out var m2)
                    ? m2.Name : (i.FreeTextItemName ?? ""),
                Qty = i.Qty,
                Uom = i.Uom,
                Rate = i.Rate,
                DiscountAmount = i.DiscountAmount,
                Amount = i.Amount,
                LineOrder = i.LineOrder,
                Quotes = allQuotes.Where(q => q.InternationalPoItemId == i.Id).Select(MapQuote).ToList()
            }).ToList();

            return new InternationalPoDetailDto
            {
                Id = po.Id,
                PoNo = po.PoNo,
                CompanyId = po.CompanyId,
                CompanyName = company?.Name ?? "",
                CompanyLogoUrl = company?.LogoUrl,
                LinkedPurchaseRequestId = po.LinkedPurchaseRequestId,
                LinkedRequestNumber = linkedPr?.RequestNumber,
                MrReferenceNumber = po.MrReferenceNumber,
                LinkedMrNumbers = linkedMrNumbers,
                IsInternational = po.IsInternational,

                RevisionNumber = po.RevisionNumber,
                ParentPoId = po.ParentPoId,
                ParentPoNo = parentPoNo,
                SupersededByPoId = po.SupersededByPoId,
                SupersededByPoNo = supersededByPoNo,
                RevisionReason = po.RevisionReason,
                SupplierId = po.SupplierId,
                Supplier = supplier == null ? null : new SupplierDto
                {
                    Id = supplier.Id,
                    SupplierCode = supplier.SupplierCode,
                    Name = supplier.Name,
                    Country = supplier.Country,
                    Address = supplier.Address,
                    ContactPerson = supplier.ContactPerson,
                    Landline = supplier.Landline,
                    Email = supplier.Email,
                    Mobile = supplier.Mobile,
                    DefaultCurrency = supplier.DefaultCurrency,
                    BankAccountName = supplier.BankAccountName,
                    BankAddress = supplier.BankAddress,
                    BankName = supplier.BankName,
                    Iban = supplier.Iban,
                    SourceType = supplier.SourceType,
                    IsActive = supplier.IsActive
                },
                PoDate = po.PoDate,
                ContactPerson = po.ContactPerson,
                ForDeliveryName = po.ForDeliveryName,
                LandlineEmail = po.LandlineEmail,
                Mobile = po.Mobile,
                DeliveryDateTime = po.DeliveryDateTime,
                DeliveryLocationId = po.DeliveryLocationId,
                DeliveryLocationName = po.DeliveryLocationName ?? deliveryLocation?.Name,
                ProjectId = po.ProjectId,
                ProjectName = project?.Name,
                ProjectNames = projectNames,
                PaymentType = po.PaymentType,
                Email = po.Email,
                OriginCountry = po.OriginCountry,
                DestinationPort = po.DestinationPort,
                Incoterm = po.Incoterm,
                PerformaNo = po.PerformaNo,
                ContainerDetails = po.ContainerDetails,
                DeliveryPeriodText = po.DeliveryPeriodText,
                RequestedById = po.RequestedById,
                RequestedByName = requestedBy?.FullName,
                Currency = po.Currency,
                ExchangeRate = po.ExchangeRate,
                ModeOfFreight = po.ModeOfFreight,
                TypeOfCargo = po.TypeOfCargo,
                PaymentTermsText = po.PaymentTermsText,
                AdvancePayment = po.AdvancePayment,
                DiscountAmount = po.DiscountAmount,
                InsuranceAmount = po.InsuranceAmount,
                OthersAmount = po.OthersAmount,
                SubTotal = po.SubTotal,
                TotalAmount = po.TotalAmount,
                TermsAndConditions = po.TermsAndConditions,
                Status = po.Status,
                StatusBeforeBlock = po.StatusBeforeBlock,
                BrightPoNumber = po.BrightPoNumber,
                Notes = po.Notes,
                Items = itemDtos,
                Quotes = allQuotes.Where(q => q.InternationalPoItemId == null).Select(MapQuote).ToList(),
                Expenses = expenses,
                ExpensesTotal = expensesTotal,
                Signatories = await BuildSignatoriesAsync(po.CompanyId)
            };
        }
        //private async Task<InternationalPoDetailDto> BuildDetailDtoAsync(InternationalPurchaseOrder po)
        //{
        //    var company = await _db.Companies.FindAsync(po.CompanyId);
        //    var supplier = await _db.Suppliers.FindAsync(po.SupplierId);
        //    var requestedBy = await _db.Users.FindAsync(po.RequestedById);
        //    var deliveryLocation = po.DeliveryLocationId.HasValue
        //        ? await _db.DeliveryLocations.FindAsync(po.DeliveryLocationId.Value)
        //        : null;
        //    var project = po.ProjectId.HasValue
        //        ? await _db.Projects.FindAsync(po.ProjectId.Value)
        //        : null;
        //    var linkedPr = po.LinkedPurchaseRequestId.HasValue
        //        ? await _db.PurchaseRequests.FindAsync(po.LinkedPurchaseRequestId.Value)
        //        : null;

        //    // ── NEW: revision family lookup ──
        //    var parentPoNo = po.ParentPoId.HasValue
        //        ? await _db.InternationalPurchaseOrders.Where(p => p.Id == po.ParentPoId.Value).Select(p => p.PoNo).FirstOrDefaultAsync()
        //        : null;
        //    var supersededByPoNo = po.SupersededByPoId.HasValue
        //        ? await _db.InternationalPurchaseOrders.Where(p => p.Id == po.SupersededByPoId.Value).Select(p => p.PoNo).FirstOrDefaultAsync()
        //        : null;

        //    var items = await _db.InternationalPOItems
        //        .Where(i => i.InternationalPoId == po.Id && i.IsActive)
        //        .OrderBy(i => i.LineOrder)
        //        .ToListAsync();

        //    var itemIds = items.Select(i => i.Id).ToList();
        //    var linkedItemMasterIds = items.Where(i => i.ItemId.HasValue).Select(i => i.ItemId!.Value).ToList();
        //    var itemMasterLookup = await _db.Items
        //        .Where(m => linkedItemMasterIds.Contains(m.Id))
        //        .ToDictionaryAsync(m => m.Id, m => m);

        //    var allQuotes = await _db.InternationalPOItemQuotes
        //        .Where(q => q.InternationalPoId == po.Id && q.IsActive)
        //        .ToListAsync();

        //    var supplierIds = allQuotes.Select(q => q.SupplierId).Distinct().ToList();
        //    var supplierLookup = await _db.Suppliers
        //        .Where(s => supplierIds.Contains(s.Id))
        //        .ToDictionaryAsync(s => s.Id, s => s.Name);
        //    // ── Load expenses ──
        //    var expenses = await _db.InternationalPOExpenses
        //        .Where(e => e.InternationalPoId == po.Id && e.IsActive)
        //        .Join(_db.SupplierExpenseTypes, e => e.SupplierExpenseTypeId, t => t.Id, (e, t) => new InternationalPoExpenseDto
        //        {
        //            Id = e.Id,
        //            SupplierExpenseTypeId = e.SupplierExpenseTypeId,
        //            ExpenseCode = t.Code,
        //            ExpenseDescription = t.Description,
        //            Amount = e.Amount
        //        })
        //        .ToListAsync();

        //    var expensesTotal = expenses.Sum(e => e.Amount);
        //    InternationalPoItemQuoteDto MapQuote(InternationalPOItemQuote q) => new InternationalPoItemQuoteDto
        //    {
        //        Id = q.Id,
        //        InternationalPoItemId = q.InternationalPoItemId,
        //        SupplierId = q.SupplierId,
        //        SupplierName = supplierLookup.TryGetValue(q.SupplierId, out var sn) ? sn : "",
        //        UnitPrice = q.UnitPrice,
        //        Currency = q.Currency,
        //        ExchangeRateToQar = q.ExchangeRateToQar,
        //        ConvertedPriceQar = q.ConvertedPriceQar,
        //        LeadTimeDays = q.LeadTimeDays,
        //        ValidityDate = q.ValidityDate,
        //        Notes = q.Notes,
        //        IsSelected = q.IsSelected
        //    };

        //    var itemDtos = items.Select(i => new InternationalPoItemDto
        //    {
        //        Id = i.Id,
        //        ItemId = i.ItemId,
        //        ItemCode = i.ItemId.HasValue && itemMasterLookup.TryGetValue(i.ItemId.Value, out var m)
        //            ? m.ItemCode : (i.FreeTextItemCode ?? ""),
        //        ItemName = i.ItemId.HasValue && itemMasterLookup.TryGetValue(i.ItemId.Value, out var m2)
        //            ? m2.Name : (i.FreeTextItemName ?? ""),
        //        Qty = i.Qty,
        //        Uom = i.Uom,
        //        Rate = i.Rate,
        //        DiscountAmount = i.DiscountAmount,
        //        Amount = i.Amount,
        //        LineOrder = i.LineOrder,
        //        Quotes = allQuotes.Where(q => q.InternationalPoItemId == i.Id).Select(MapQuote).ToList()
        //    }).ToList();

        //    return new InternationalPoDetailDto
        //    {
        //        Id = po.Id,
        //        PoNo = po.PoNo,
        //        CompanyId = po.CompanyId,
        //        CompanyName = company?.Name ?? "",
        //        CompanyLogoUrl = company?.LogoUrl,
        //        LinkedPurchaseRequestId = po.LinkedPurchaseRequestId,
        //        LinkedRequestNumber = linkedPr?.RequestNumber,
        //        MrReferenceNumber = po.MrReferenceNumber,
        //        IsInternational = po.IsInternational,

        //        RevisionNumber = po.RevisionNumber,
        //        ParentPoId = po.ParentPoId,
        //        ParentPoNo = parentPoNo,
        //        SupersededByPoId = po.SupersededByPoId,
        //        SupersededByPoNo = supersededByPoNo,
        //        RevisionReason = po.RevisionReason,   // ← ITH ADD CHEYYUKA
        //        SupplierId = po.SupplierId,
        //        Supplier = supplier == null ? null : new SupplierDto
        //        {
        //            Id = supplier.Id,
        //            SupplierCode = supplier.SupplierCode,
        //            Name = supplier.Name,
        //            Country = supplier.Country,
        //            Address = supplier.Address,
        //            ContactPerson = supplier.ContactPerson,
        //            Landline = supplier.Landline,
        //            Email = supplier.Email,
        //            Mobile = supplier.Mobile,
        //            DefaultCurrency = supplier.DefaultCurrency,
        //            BankAccountName = supplier.BankAccountName,
        //            BankAddress = supplier.BankAddress,
        //            BankName = supplier.BankName,
        //            Iban = supplier.Iban,
        //            SourceType = supplier.SourceType,
        //            IsActive = supplier.IsActive
        //        },
        //        PoDate = po.PoDate,
        //        ContactPerson = po.ContactPerson,
        //        ForDeliveryName = po.ForDeliveryName,
        //        LandlineEmail = po.LandlineEmail,
        //        Mobile = po.Mobile,
        //        DeliveryDateTime = po.DeliveryDateTime,
        //        DeliveryLocationId = po.DeliveryLocationId,
        //        DeliveryLocationName = po.DeliveryLocationName ?? deliveryLocation?.Name,
        //        ProjectId = po.ProjectId,
        //        ProjectName = project?.Name,
        //        PaymentType = po.PaymentType,
        //        Email = po.Email,
        //        OriginCountry = po.OriginCountry,
        //        DestinationPort = po.DestinationPort,
        //        Incoterm = po.Incoterm,
        //        PerformaNo = po.PerformaNo,
        //        RequestedById = po.RequestedById,
        //        RequestedByName = requestedBy?.FullName,
        //        Currency = po.Currency,
        //        ExchangeRate = po.ExchangeRate,
        //        ModeOfFreight = po.ModeOfFreight,
        //        TypeOfCargo = po.TypeOfCargo,
        //        PaymentTermsText = po.PaymentTermsText,
        //        AdvancePayment = po.AdvancePayment,
        //        DiscountAmount = po.DiscountAmount,
        //        InsuranceAmount = po.InsuranceAmount,
        //        OthersAmount = po.OthersAmount,
        //        SubTotal = po.SubTotal,
        //        TotalAmount = po.TotalAmount,
        //        TermsAndConditions = po.TermsAndConditions,
        //        Status = po.Status,
        //        StatusBeforeBlock = po.StatusBeforeBlock,
        //        BrightPoNumber = po.BrightPoNumber,
        //        Notes = po.Notes,
        //        Items = itemDtos,
        //        Quotes = allQuotes.Where(q => q.InternationalPoItemId == null).Select(MapQuote).ToList(),
        //        Expenses = expenses,
        //        ExpensesTotal = expensesTotal,
        //        Signatories = await BuildSignatoriesAsync(po.CompanyId)   // ← NEW
        //    };
        //}

        private const string DefaultTermsAndConditions =
@"1. Supplier to submit to Buyer the original shipping documents (B/L, Commercial Invoice, Packing List, Certificate of Origin, Test Certificate, Data Sheet etc) in Five working days Before Shipment Arrival.

2. In case of imposing Delay Charges on Shipment (Liner Demurrage and/or Port Storage Charges) due to Late receipt of the Original shipping Documents by Buyer in less than five working days, Such Delay Charges shall be Charged to the Account of Supplier.

3. Draft copy of Shipping Documents (B/L Commercial Invoice, Packing List, Certificate of Origin, Test Certificate, Data Sheet ...etc) should be provided to Buyer before dispatching the shipment form supplier.

4. The following condition to be mentioned in the BL: (14 days free at port of discharge). Shipment delay charges shall be to the account of supplier in case of failure to submit the B/L with a statement.

5. Shipping documents to mention correct information about material (Such as: Item Description, Price, Weight, Volume, Dimensions.. etc). In case of providing incorrect / wrong information in the shipping documents and accordingly incurring penalty / demurrage / port storage charges. Such charges shall be back charged to the account of Supplier.";
    }
}