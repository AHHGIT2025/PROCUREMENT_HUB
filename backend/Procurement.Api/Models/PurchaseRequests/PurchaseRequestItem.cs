namespace Procurement.Api.Models.PurchaseRequests
{
    // ✅ NEW — per-item store verification outcome
    public enum StoreItemStatus
    {
        NotChecked = 0,
        StockAvailable = 1,      // full requested quantity available in store
        PartiallyAvailable = 2,  // some available, remainder needs purchase
        NotAvailable = 3         // nothing in store, full quantity needs purchase
    }

    public class PurchaseRequestItem : BaseEntity
    {
        public Guid PurchaseRequestId { get; set; }

        public Guid MaterialId { get; set; }

        public decimal Quantity { get; set; }

        public string Uom { get; set; } = "EA";

        public DateTime RequiredDate { get; set; }

        public string Justification { get; set; } = "";

        public decimal EstimatedUnitPrice { get; set; }
        public string? AttachmentUrl { get; set; }
        public string? AttachmentFileName { get; set; }

        // ── STORE VERIFICATION (✅ NEW) ──────────────────────────
        public StoreItemStatus StoreStatus { get; set; } = StoreItemStatus.NotChecked;
        public decimal AvailableQty { get; set; } = 0;   // qty confirmed in store
        public decimal PurchaseQty { get; set; } = 0;    // Quantity - AvailableQty
        public string? StoreRemarks { get; set; }
        public Guid? StoreVerifiedById { get; set; }
        public DateTime? StoreVerifiedAt { get; set; }

        // ── ORACLE INDENT TRANSFER ────────────────────────────
        public DateTime? OracleTransferredAt { get; set; }
        public string? OracleDocumentId { get; set; }
    }
}