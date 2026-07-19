using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Procurement.Api.Common;
using Procurement.Api.Data;
using Procurement.Api.DTOs.Rfq;
using Procurement.Api.Models.Rfq;

namespace Procurement.Api.Controllers.Rfq
{
    [Authorize]
    [ApiController]
    [Route("api/rfq")]
    public class RfqController : ControllerBase
    {
        private readonly AppDbContext _db;
        public RfqController(AppDbContext db) { _db = db; }

        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] Guid? companyId, [FromQuery] string? status)
        {
            var q = _db.Rfqs.Where(r => r.IsActive);
            if (companyId.HasValue) q = q.Where(r => r.CompanyId == companyId.Value);
            if (!string.IsNullOrWhiteSpace(status)) q = q.Where(r => r.Status == status);

            var list = await q.OrderByDescending(r => r.CreatedAt).ToListAsync();
            var companyIds = list.Select(r => r.CompanyId).Distinct().ToList();
            var companies = await _db.Companies.Where(c => companyIds.Contains(c.Id)).ToDictionaryAsync(c => c.Id, c => c.Name);

            var result = new List<RfqListItemDto>();
            foreach (var r in list)
            {
                var supplierCount = await _db.RfqSuppliers.CountAsync(s => s.RfqId == r.Id && s.IsActive);
                var quoteCount = await _db.RfqQuotations.CountAsync(q2 => q2.RfqId == r.Id && q2.IsActive);
                result.Add(new RfqListItemDto
                {
                    Id = r.Id,
                    RfqNumber = r.RfqNumber,
                    Title = r.Title,
                    CompanyName = companies.GetValueOrDefault(r.CompanyId, ""),
                    Status = r.Status,
                    ClosingDateTime = r.ClosingDateTime,
                    SupplierCount = supplierCount,
                    QuotationCount = quoteCount,
                    CreatedAt = r.CreatedAt
                });
            }
            return Ok(ApiResponse<List<RfqListItemDto>>.Ok(result));
        }

        [HttpGet("{id:guid}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var rfq = await _db.Rfqs.FindAsync(id);
            if (rfq == null || !rfq.IsActive) return NotFound(ApiResponse<object>.Fail("RFQ not found."));

            var company = await _db.Companies.FindAsync(rfq.CompanyId);
            var items = await _db.RfqItems.Where(i => i.RfqId == id && i.IsActive).ToListAsync();
            var invited = await _db.RfqSuppliers.Where(s => s.RfqId == id && s.IsActive).ToListAsync();
            var supplierIds = invited.Select(s => s.SupplierId).ToList();
            var supplierNames = await _db.Suppliers.Where(s => supplierIds.Contains(s.Id)).ToDictionaryAsync(s => s.Id, s => s.Name);

            var quotations = await _db.RfqQuotations.Where(q => q.RfqId == id && q.IsActive).ToListAsync();
            var quoteIds = quotations.Select(q => q.Id).ToList();
            var quoteItems = await _db.RfqQuotationItems.Where(qi => quoteIds.Contains(qi.RfqQuotationId) && qi.IsActive).ToListAsync();
            var allQuoteSupplierIds = quotations.Select(q => q.SupplierId).Distinct().ToList();
            var quoteSupplierNames = await _db.Suppliers.Where(s => allQuoteSupplierIds.Contains(s.Id)).ToDictionaryAsync(s => s.Id, s => s.Name);
            var itemQtyLookup = items.ToDictionary(i => i.Id, i => i.Qty);

            var dto = new RfqDetailDto
            {
                Id = rfq.Id,
                RfqNumber = rfq.RfqNumber,
                Title = rfq.Title,
                CompanyId = rfq.CompanyId,
                CompanyName = company?.Name ?? "",
                SourcePurchaseRequestId = rfq.SourcePurchaseRequestId,
                ClosingDateTime = rfq.ClosingDateTime,
                BidValidityDays = rfq.BidValidityDays,
                SealedBid = rfq.SealedBid,
                TechnicalCommercialSeparation = rfq.TechnicalCommercialSeparation,
                Status = rfq.Status,
                Notes = rfq.Notes,
                Items = items.Select(i => new RfqItemDto { Id = i.Id, ItemDescription = i.ItemDescription, Specification = i.Specification, Qty = i.Qty, Uom = i.Uom }).ToList(),
                InvitedSuppliers = invited.Select(s => new RfqSupplierDto { Id = s.Id, SupplierId = s.SupplierId, SupplierName = supplierNames.GetValueOrDefault(s.SupplierId, ""), Status = s.Status, InvitedAt = s.InvitedAt }).ToList(),
                Quotations = quotations.Select(q => new RfqQuotationDto
                {
                    Id = q.Id,
                    SupplierId = q.SupplierId,
                    SupplierName = quoteSupplierNames.GetValueOrDefault(q.SupplierId, ""),
                    Currency = q.Currency,
                    FreightAmount = q.FreightAmount,
                    TechnicalScore = q.TechnicalScore,
                    IsSelected = q.IsSelected,
                    Notes = q.Notes,
                    Items = quoteItems.Where(qi => qi.RfqQuotationId == q.Id).Select(qi => new RfqQuotationItemDto
                    {
                        RfqItemId = qi.RfqItemId,
                        UnitPrice = qi.UnitPrice,
                        LineTotal = qi.UnitPrice * itemQtyLookup.GetValueOrDefault(qi.RfqItemId, 0)
                    }).ToList(),
                    TotalAmount = q.FreightAmount + quoteItems.Where(qi => qi.RfqQuotationId == q.Id)
                        .Sum(qi => qi.UnitPrice * itemQtyLookup.GetValueOrDefault(qi.RfqItemId, 0))
                }).ToList()
            };
            return Ok(ApiResponse<RfqDetailDto>.Ok(dto));
        }

        [HttpPost]
        public async Task<IActionResult> Create(CreateRfqDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Title)) return BadRequest(ApiResponse<object>.Fail("Title is required."));
            if (dto.Items.Count == 0) return BadRequest(ApiResponse<object>.Fail("At least one item is required."));

            var year = DateTime.UtcNow.Year;
            var countThisYear = await _db.Rfqs.CountAsync(r => r.RfqNumber.Contains(year.ToString()));
            var rfqNumber = $"RFQ-{year}-{(countThisYear + 1):D5}";

            var rfq = new Models.Rfq.Rfq
            {
                Id = Guid.NewGuid(),
                RfqNumber = rfqNumber,
                Title = dto.Title,
                CompanyId = dto.CompanyId,
                SourcePurchaseRequestId = dto.SourcePurchaseRequestId,
                ClosingDateTime = dto.ClosingDateTime,
                BidValidityDays = dto.BidValidityDays,
                SealedBid = dto.SealedBid,
                TechnicalCommercialSeparation = dto.TechnicalCommercialSeparation,
                Notes = dto.Notes,
                Status = "Draft",
                CreatedAt = DateTime.UtcNow,
                IsActive = true
            };
            _db.Rfqs.Add(rfq);

            foreach (var (item, idx) in dto.Items.Select((v, i) => (v, i)))
            {
                _db.RfqItems.Add(new Models.Rfq.RfqItem
                {
                    Id = Guid.NewGuid(),
                    RfqId = rfq.Id,
                    ItemDescription = item.ItemDescription,
                    Specification = item.Specification,
                    Qty = item.Qty,
                    Uom = item.Uom,
                    LineOrder = idx + 1,
                    CreatedAt = DateTime.UtcNow,
                    IsActive = true
                });
            }

            foreach (var supplierId in dto.SupplierIds)
            {
                _db.RfqSuppliers.Add(new Models.Rfq.RfqSupplier
                {
                    Id = Guid.NewGuid(),
                    RfqId = rfq.Id,
                    SupplierId = supplierId,
                    InvitedAt = DateTime.UtcNow,
                    Status = "Invited",
                    IsActive = true
                });
            }

            await _db.SaveChangesAsync();
            return Ok(ApiResponse<object>.Ok(new { rfq.Id, rfq.RfqNumber }, "RFQ created."));
        }

        [HttpPost("{id:guid}/issue")]
        public async Task<IActionResult> Issue(Guid id)
        {
            var rfq = await _db.Rfqs.FindAsync(id);
            if (rfq == null) return NotFound(ApiResponse<object>.Fail("RFQ not found."));
            rfq.Status = "Issued"; rfq.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            return Ok(ApiResponse<object>.Ok(null, "RFQ issued."));
        }

        [HttpPost("{id:guid}/quotations")]
        public async Task<IActionResult> AddQuotation(Guid id, AddRfqQuotationDto dto)
        {
            var rfq = await _db.Rfqs.FindAsync(id);
            if (rfq == null) return NotFound(ApiResponse<object>.Fail("RFQ not found."));

            var quotation = new Models.Rfq.RfqQuotation
            {
                Id = Guid.NewGuid(),
                RfqId = id,
                SupplierId = dto.SupplierId,
                Currency = dto.Currency,
                FreightAmount = dto.FreightAmount,
                TechnicalScore = dto.TechnicalScore,
                Notes = dto.Notes,
                CreatedAt = DateTime.UtcNow,
                IsActive = true
            };
            _db.RfqQuotations.Add(quotation);

            foreach (var item in dto.Items)
            {
                _db.RfqQuotationItems.Add(new Models.Rfq.RfqQuotationItem
                {
                    Id = Guid.NewGuid(),
                    RfqQuotationId = quotation.Id,
                    RfqItemId = item.RfqItemId,
                    UnitPrice = item.UnitPrice,
                    CreatedAt = DateTime.UtcNow,
                    IsActive = true
                });
            }

            if (rfq.Status == "Issued") rfq.Status = "Closed";
            await _db.SaveChangesAsync();
            return Ok(ApiResponse<object>.Ok(new { quotation.Id }, "Quotation added."));
        }

        [HttpPost("{id:guid}/quotations/{quotationId:guid}/select")]
        public async Task<IActionResult> SelectQuotation(Guid id, Guid quotationId)
        {
            var siblings = await _db.RfqQuotations.Where(q => q.RfqId == id).ToListAsync();
            foreach (var s in siblings) s.IsSelected = s.Id == quotationId;

            var rfq = await _db.Rfqs.FindAsync(id);
            if (rfq != null) { rfq.Status = "Awarded"; rfq.UpdatedAt = DateTime.UtcNow; }

            await _db.SaveChangesAsync();
            return Ok(ApiResponse<object>.Ok(null, "Quotation selected."));
        }


        [HttpGet("{id:guid}/attachments")]
        public async Task<IActionResult> GetAttachments(Guid id)
        {
            var list = await _db.RfqAttachments
                .Where(a => a.RfqId == id && a.IsActive)
                .OrderByDescending(a => a.CreatedAt)
                .Select(a => new RfqAttachmentDto
                {
                    Id = a.Id,
                    FileName = a.FileName,
                    FileUrl = $"/api/attachments/file/{a.StorageKey}",
                    CreatedAt = a.CreatedAt
                })
                .ToListAsync();
            return Ok(ApiResponse<List<RfqAttachmentDto>>.Ok(list));
        }

        [HttpPost("{id:guid}/attachments")]
        public async Task<IActionResult> AddAttachment(Guid id, AddRfqAttachmentDto dto)
        {
            var rfq = await _db.Rfqs.FindAsync(id);
            if (rfq == null) return NotFound(ApiResponse<object>.Fail("RFQ not found."));

            var attachment = new Models.Rfq.RfqAttachment
            {
                Id = Guid.NewGuid(),
                RfqId = id,
                FileName = dto.FileName,
                StorageKey = dto.StorageKey,
                CreatedAt = DateTime.UtcNow,
                IsActive = true
            };
            _db.RfqAttachments.Add(attachment);
            await _db.SaveChangesAsync();
            return Ok(ApiResponse<object>.Ok(new { attachment.Id }, "Attachment added."));
        }

        [HttpDelete("attachments/{attachmentId:guid}")]
        public async Task<IActionResult> DeleteAttachment(Guid attachmentId)
        {
            var a = await _db.RfqAttachments.FindAsync(attachmentId);
            if (a == null) return NotFound(ApiResponse<object>.Fail("Attachment not found."));
            a.IsActive = false;
            await _db.SaveChangesAsync();
            return Ok(ApiResponse<object>.Ok(null, "Attachment removed."));
        }

    }
}
           

        
  
