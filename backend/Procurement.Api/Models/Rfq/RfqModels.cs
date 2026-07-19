using Procurement.Api.Models;
namespace Procurement.Api.Models.Rfq
{

 
    public class Rfq : BaseEntity
    {
        public string RfqNumber { get; set; } = "";
        public string Title { get; set; } = "";
        public Guid CompanyId { get; set; }
        public Guid? SourcePurchaseRequestId { get; set; }
        public DateTime? ClosingDateTime { get; set; }
        public int? BidValidityDays { get; set; }
        public bool SealedBid { get; set; } = true;
        public bool TechnicalCommercialSeparation { get; set; }
        public string Status { get; set; } = "Draft";
        public Guid? CreatedById { get; set; }
        public string? Notes { get; set; }
    }
 
    public class RfqItem : BaseEntity
    {
        public Guid RfqId { get; set; }
        public string ItemDescription { get; set; } = "";
        public string? Specification { get; set; }
        public decimal Qty { get; set; }
        public string? Uom { get; set; }
        public int LineOrder { get; set; } = 1;
    }
 
    public class RfqSupplier : BaseEntity
    {
        public Guid RfqId { get; set; }
        public Guid SupplierId { get; set; }
        public DateTime InvitedAt { get; set; }
        public string Status { get; set; } = "Invited";
    }
 
    public class RfqQuotation : BaseEntity
    {
        public Guid RfqId { get; set; }
        public Guid SupplierId { get; set; }
        public string Currency { get; set; } = "QAR";
        public decimal FreightAmount { get; set; }
        public decimal? TechnicalScore { get; set; }
        public bool IsSelected { get; set; }
        public string? Notes { get; set; }
    }
 
    public class RfqQuotationItem : BaseEntity
    {
        public Guid RfqQuotationId { get; set; }
        public Guid RfqItemId { get; set; }
        public decimal UnitPrice { get; set; }
    }
    public class RfqAttachment : BaseEntity
    {
        public Guid RfqId { get; set; }
        public string FileName { get; set; } = "";
        public string StorageKey { get; set; } = "";
    }
}
 
