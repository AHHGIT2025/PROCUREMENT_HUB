// ===== FILE: ErpSupplierDto.cs =====
// Place under: Models/Integration/ErpSupplierDto.cs

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
        public string? TelNo1 { get; set; }
        public string? Mobile { get; set; }
        public string? AddressP { get; set; }
        public string? AddressS { get; set; }
        public string? Country { get; set; }
        public string? Email { get; set; }
    }
}