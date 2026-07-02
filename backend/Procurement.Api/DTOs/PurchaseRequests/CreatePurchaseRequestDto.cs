namespace Procurement.Api.DTOs.PurchaseRequests
{
    //public class CreatePurchaseRequestDto
    //{
    //    public Guid CompanyId { get; set; }

    //    public Guid? ProjectId { get; set; }

    //    public Guid DepartmentId { get; set; }

    //    public Guid RequestedById { get; set; }

    //    public string Justification { get; set; } = "";

    //    public List<CreatePurchaseRequestItemDto> Items { get; set; }
    //        = new();

    //    public bool Submit { get; set; }
    //}

    //public class CreatePurchaseRequestItemDto
    //{
    //    public Guid MaterialId { get; set; }

    //    public decimal Quantity { get; set; }

    //    public string Uom { get; set; } = "EA";

    //    public DateTime RequiredDate { get; set; }

    //    public string Justification { get; set; } = "";

    //    public decimal EstimatedUnitPrice { get; set; }
    //}
    public class CreatePurchaseRequestDto
    {
        public Guid CompanyId { get; set; }
        public Guid? ProjectId { get; set; }
        //public Guid DepartmentId { get; set; }

        public Guid? DepartmentId { get; set; }  // ✅ nullable
        public Guid RequestedById { get; set; }
        public string Justification { get; set; } = "";
        public List<CreatePurchaseRequestItemDto> Items { get; set; } = new();
        public bool Submit { get; set; }
    }

    public class CreatePurchaseRequestItemDto
    {
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