// ===== FILE: RfqDtos.cs — save under DTOs/Rfq/RfqDtos.cs =====
using System;
using System.Collections.Generic;
 
namespace Procurement.Api.DTOs.Rfq
{
    public class CreateRfqDto
    {
        public string Title { get; set; } = "";
        public Guid CompanyId { get; set; }
        public Guid? SourcePurchaseRequestId { get; set; }
        public DateTime? ClosingDateTime { get; set; }
        public int? BidValidityDays { get; set; }
        public bool SealedBid { get; set; } = true;
        public bool TechnicalCommercialSeparation { get; set; }
        public string? Notes { get; set; }
        public string? Currency { get; set; }
        public string? PaymentTerms { get; set; }
        public string? DeliveryTerms { get; set; }
        public Guid? DeliveryLocationId { get; set; }
        public List<CreateRfqItemDto> Items { get; set; } = new();
        public List<Guid> SupplierIds { get; set; } = new();
    }

    public class CreateRfqItemDto
    {
        public string ItemDescription { get; set; } = "";
        public string? Specification { get; set; }
        public decimal Qty { get; set; }
        public string? Uom { get; set; }
    }

    public class AddRfqQuotationDto
    {
        public Guid SupplierId { get; set; }
        public string Currency { get; set; } = "QAR";
        public decimal FreightAmount { get; set; }
        public decimal? TechnicalScore { get; set; }
        public string? Notes { get; set; }
        public List<RfqQuotationItemInputDto> Items { get; set; } = new();
    }

    public class RfqQuotationItemInputDto
    {
        public Guid RfqItemId { get; set; }
        public decimal UnitPrice { get; set; }
    }

    public class RfqListItemDto
    {
        public Guid Id { get; set; }
        public string RfqNumber { get; set; } = "";
        public string Title { get; set; } = "";
        public string CompanyName { get; set; } = "";
        public string Status { get; set; } = "";
        public DateTime? ClosingDateTime { get; set; }
        public int SupplierCount { get; set; }
        public int QuotationCount { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class RfqDetailDto
    {
        public Guid Id { get; set; }
        public string RfqNumber { get; set; } = "";
        public string Title { get; set; } = "";
        public Guid CompanyId { get; set; }
        public string CompanyName { get; set; } = "";
        public Guid? SourcePurchaseRequestId { get; set; }
        public DateTime? ClosingDateTime { get; set; }
        public int? BidValidityDays { get; set; }
        public bool SealedBid { get; set; }
        public bool TechnicalCommercialSeparation { get; set; }
        public string Status { get; set; } = "";
        public string? Notes { get; set; }
        public string? Currency { get; set; }
        public string? PaymentTerms { get; set; }
        public string? DeliveryTerms { get; set; }
        public Guid? DeliveryLocationId { get; set; }
        public string? DeliveryLocationName { get; set; }
        public string? SourcePrNumber { get; set; }
        public List<RfqAttachmentDto> Attachments { get; set; } = new();
        public List<RfqItemDto> Items { get; set; } = new();
        public List<RfqSupplierDto> InvitedSuppliers { get; set; } = new();
        public List<RfqQuotationDto> Quotations { get; set; } = new();
    }

    public class RfqItemDto
    {
        public Guid Id { get; set; }
        public string ItemDescription { get; set; } = "";
        public string? Specification { get; set; }
        public decimal Qty { get; set; }
        public string? Uom { get; set; }
    }
    public class RfqAttachmentDto
    {
        public Guid Id { get; set; }
        public string FileName { get; set; } = "";
        public string FileUrl { get; set; } = "";
        public DateTime CreatedAt { get; set; }
    }

    public class AddRfqAttachmentDto
    {
        public string FileName { get; set; } = "";
        public string StorageKey { get; set; } = "";
    }
    public class RfqSupplierDto
    {
        public Guid Id { get; set; }
        public Guid SupplierId { get; set; }
        public string SupplierName { get; set; } = "";
        public string Status { get; set; } = "";
        public DateTime InvitedAt { get; set; }
    }

    public class RfqQuotationDto
    {
        public Guid Id { get; set; }
        public Guid SupplierId { get; set; }
        public string SupplierName { get; set; } = "";
        public string Currency { get; set; } = "";
        public decimal FreightAmount { get; set; }
        public decimal? TechnicalScore { get; set; }
        public decimal TotalAmount { get; set; }
        public bool IsSelected { get; set; }
        public string? Notes { get; set; }
        public List<RfqQuotationItemDto> Items { get; set; } = new();
    }

    public class RfqQuotationItemDto
    {
        public Guid RfqItemId { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal LineTotal { get; set; }
    }

 

}