namespace Procurement.Api.Models.Integration
{
    public class ErpSupplierDto
    {
        public string SourceSupplierId { get; set; } = "";
        public string UserCode { get; set; } = "";
        public string PrimaryName { get; set; } = "";
        public string BranchId { get; set; } = "";
        public int? CreditLimitDays { get; set; }
        public string? PaymentType { get; set; }
        public bool IsActive { get; set; }
    }
}