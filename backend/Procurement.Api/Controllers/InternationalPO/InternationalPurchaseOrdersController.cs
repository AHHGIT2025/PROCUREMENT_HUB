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
        public async Task<IActionResult> GetAll([FromQuery] Guid? companyId, [FromQuery] string? status)
        {
            var query = _db.InternationalPurchaseOrders.Where(p => p.IsActive);

            if (companyId.HasValue)
                query = query.Where(p => p.CompanyId == companyId.Value);

            if (!string.IsNullOrWhiteSpace(status))
                query = query.Where(p => p.Status == status);

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
                    CreatedAt = x.p.CreatedAt
                })
                .OrderByDescending(p => p.CreatedAt)
                .ToListAsync();

            return Ok(ApiResponse<List<InternationalPoListItemDto>>.Ok(data));
        }

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

            if (dto.CompanyId == Guid.Empty)
                return BadRequest(ApiResponse<object>.Fail("Company is required."));

            if (dto.SupplierId == Guid.Empty)
                return BadRequest(ApiResponse<object>.Fail("Supplier is required."));

            if (dto.RequestedById == Guid.Empty)
                return BadRequest(ApiResponse<object>.Fail("Requested By is required."));

            var company = await _db.Companies.FindAsync(dto.CompanyId);
            if (company == null)
                return BadRequest(ApiResponse<object>.Fail("Invalid company."));

            var supplier = await _db.Suppliers.FindAsync(dto.SupplierId);
            if (supplier == null)
                return BadRequest(ApiResponse<object>.Fail("Invalid supplier."));

            var po = new InternationalPurchaseOrder
            {
                Id = Guid.NewGuid(),
                PoNo = string.IsNullOrWhiteSpace(dto.PoNo) ? null : dto.PoNo,
                CompanyId = dto.CompanyId,
                LinkedPurchaseRequestId = dto.LinkedPurchaseRequestId,
                MrReferenceNumber = dto.MrReferenceNumber,
                SupplierId = dto.SupplierId,
                PoDate = DateTime.UtcNow,
                ContactPerson = dto.ContactPerson,
                ForDeliveryName = dto.ForDeliveryName,
                LandlineEmail = dto.LandlineEmail,
                Mobile = dto.Mobile,
                DeliveryDateTime = dto.DeliveryDateTime,
                DeliveryLocationId = dto.DeliveryLocationId,
                ProjectId = dto.ProjectId,
                PaymentType = dto.PaymentType,
                Email = dto.Email,
                OriginCountry = dto.OriginCountry,
                DestinationPort = dto.DestinationPort,
                Incoterm = dto.Incoterm,
                PerformaNo = dto.PerformaNo,
                RequestedById = dto.RequestedById,
                Currency = string.IsNullOrWhiteSpace(dto.Currency) ? "USD" : dto.Currency,
                ExchangeRate = dto.ExchangeRate <= 0 ? 1 : dto.ExchangeRate,
                ModeOfFreight = dto.ModeOfFreight,
                TypeOfCargo = dto.TypeOfCargo,
                PaymentTermsText = dto.PaymentTermsText,
                AdvancePayment = dto.AdvancePayment,
                DiscountAmount = dto.DiscountAmount,
                InsuranceAmount = dto.InsuranceAmount,
                OthersAmount = dto.OthersAmount,
                TermsAndConditions = string.IsNullOrWhiteSpace(dto.TermsAndConditions)
                    ? DefaultTermsAndConditions
                    : dto.TermsAndConditions,
                Notes = dto.Notes,
                Status = InternationalPoStatus.Draft,
                CreatedAt = DateTime.UtcNow,
                IsActive = true
            };

            _db.InternationalPurchaseOrders.Add(po);

            int lineOrder = 1;
            foreach (var itemDto in dto.Items)
            {
                var amount = (itemDto.Qty * itemDto.Rate) - itemDto.DiscountAmount;
                _db.InternationalPOItems.Add(new InternationalPOItem
                {
                    Id = Guid.NewGuid(),
                    InternationalPoId = po.Id,
                    ItemId = itemDto.ItemId,
                    SourcePurchaseRequestItemId = itemDto.SourcePurchaseRequestItemId,
                    FreeTextItemCode = itemDto.FreeTextItemCode,
                    FreeTextItemName = itemDto.FreeTextItemName,
                    Qty = itemDto.Qty,
                    Uom = itemDto.Uom,
                    Rate = itemDto.Rate,
                    DiscountAmount = itemDto.DiscountAmount,
                    Amount = amount,
                    LineOrder = lineOrder++,
                    CreatedAt = DateTime.UtcNow,
                    IsActive = true
                });
            }

            await RecalculateTotalsAsync(po);

            _db.AuditLogs.Add(new AuditLog
            {
                Id = Guid.NewGuid(),
                Module = "International PO",
                Action = "Create",
                UserName = dto.RequestedById.ToString(),
                Details = po.PoNo ?? po.Id.ToString(),
                CreatedAt = DateTime.UtcNow
            });

            await _db.SaveChangesAsync();

            var resultDto = await BuildDetailDtoAsync(po);
            return Ok(ApiResponse<InternationalPoDetailDto>.Ok(resultDto, "International PO created."));
        }

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

            await RecalculateTotalsAsync(po);
            po.UpdatedAt = DateTime.UtcNow;

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

            if (dto.Qty <= 0)
                return BadRequest(ApiResponse<object>.Fail("Quantity must be greater than zero."));

            var maxOrder = await _db.InternationalPOItems
                .Where(i => i.InternationalPoId == id && i.IsActive)
                .Select(i => (int?)i.LineOrder)
                .MaxAsync() ?? 0;

            var amount = (dto.Qty * dto.Rate) - dto.DiscountAmount;

            var item = new InternationalPOItem
            {
                Id = Guid.NewGuid(),
                InternationalPoId = id,
                ItemId = dto.ItemId,
                SourcePurchaseRequestItemId = dto.SourcePurchaseRequestItemId,
                FreeTextItemCode = dto.FreeTextItemCode,
                FreeTextItemName = dto.FreeTextItemName,
                Qty = dto.Qty,
                Uom = dto.Uom,
                Rate = dto.Rate,
                DiscountAmount = dto.DiscountAmount,
                Amount = amount,
                LineOrder = maxOrder + 1,
                CreatedAt = DateTime.UtcNow,
                IsActive = true
            };

            _db.InternationalPOItems.Add(item);
            await RecalculateTotalsAsync(po);
            await _db.SaveChangesAsync();

            return Ok(ApiResponse<object>.Ok(new { item.Id }, "Item added."));
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

            await RecalculateTotalsAsync(po);
            await _db.SaveChangesAsync();

            return Ok(ApiResponse<object>.Ok(null, "Item removed."));
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
        // Marks this quote as the winner. If whole-PO-level, locks the header
        // Supplier + Currency and updates ALL item rates. If per-item, updates
        // just that item's rate. Unselects sibling quotes at the same scope.
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
                // Per-item selection: unselect siblings for the same item, update that item's rate.
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
                // Whole-PO-level selection: unselect siblings at PO-level, lock header
                // supplier/currency, and apply this rate to every item that doesn't
                // already have its own selected per-item quote.
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
            await RecalculateTotalsAsync(po);
            po.UpdatedAt = DateTime.UtcNow;

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

        // ── PUT /api/international-po/{id}/status — status transition ───
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
                InternationalPoStatus.Cancelled
            };

            if (!validStatuses.Contains(dto.Status))
                return BadRequest(ApiResponse<object>.Fail("Invalid status value."));

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

        private async Task RecalculateTotalsAsync(InternationalPurchaseOrder po)
        {
            var subTotal = await _db.InternationalPOItems
                .Where(i => i.InternationalPoId == po.Id && i.IsActive)
                .SumAsync(i => (decimal?)i.Amount) ?? 0;

            po.SubTotal = subTotal;
            po.TotalAmount = subTotal - po.DiscountAmount + po.InsuranceAmount + po.OthersAmount;
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
                LinkedPurchaseRequestId = po.LinkedPurchaseRequestId,
                LinkedRequestNumber = linkedPr?.RequestNumber,
                MrReferenceNumber = po.MrReferenceNumber,
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
                DeliveryLocationName = deliveryLocation?.Name,
                ProjectId = po.ProjectId,
                ProjectName = project?.Name,
                PaymentType = po.PaymentType,
                Email = po.Email,
                OriginCountry = po.OriginCountry,
                DestinationPort = po.DestinationPort,
                Incoterm = po.Incoterm,
                PerformaNo = po.PerformaNo,
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
                BrightPoNumber = po.BrightPoNumber,
                Notes = po.Notes,
                Items = itemDtos,
                Quotes = allQuotes.Where(q => q.InternationalPoItemId == null).Select(MapQuote).ToList()
            };
        }

        private const string DefaultTermsAndConditions =
@"1. Supplier to submit to Buyer the original shipping documents (B/L, Commercial Invoice, Packing List, Certificate of Origin, Test Certificate, Data Sheet etc) in Five working days Before Shipment Arrival.

2. In case of imposing Delay Charges on Shipment (Liner Demurrage and/or Port Storage Charges) due to Late receipt of the Original shipping Documents by Buyer in less than five working days, Such Delay Charges shall be Charged to the Account of Supplier.

3. Draft copy of Shipping Documents (B/L Commercial Invoice, Packing List, Certificate of Origin, Test Certificate, Data Sheet ...etc) should be provided to Buyer before dispatching the shipment form supplier.

4. The following condition to be mentioned in the BL: (14 days free at port of discharge). Shipment delay charges shall be to the account of supplier in case of failure to submit the B/L with a statement.

5. Shipping documents to mention correct information about material (Such as: Item Description, Price, Weight, Volume, Dimensions.. etc). In case of providing incorrect / wrong information in the shipping documents and accordingly incurring penalty / demurrage / port storage charges. Such charges shall be back charged to the account of Supplier.";
    }
}