
namespace Procurement.Api.Models.PurchaseRequests
{
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
    }
}
