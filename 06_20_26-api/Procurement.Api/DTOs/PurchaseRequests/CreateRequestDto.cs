namespace Procurement.Api.DTOs.PurchaseRequests
{
    public class CreateRequestDto
    {
        public int CompanyId { get; set; }
        public string CreatedBy { get; set; } = "";
        public Guid? ProjectId { get; set; }
        public List<MRItemDto> Items { get; set; } = new();
    }

    public class MRItemDto
    {
        public int ItemId { get; set; }
        public decimal Quantity { get; set; }
        public string Remarks { get; set; } = "";
    }
    //public class CreateRequestDto
    //{
    //    public int CompanyId { get; set; }



    //    public string CreatedBy { get; set; }
    //    public Guid? ProjectId { get; set; }
    //    public List<MRItemDto> Items { get; set; }
    //}

    //public class MRItemDto
    //{
    //    public int ItemId { get; set; }

    //    public decimal Quantity { get; set; }

    //    public string Remarks { get; set; }
    //}

}
