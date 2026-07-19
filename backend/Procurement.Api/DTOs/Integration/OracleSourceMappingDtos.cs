namespace Procurement.Api.DTOs.Integration
{
    public class OracleSourceMappingDto
    {
        public Guid Id { get; set; }
        public string OracleSource { get; set; } = "";
        public string BranchId { get; set; } = "";
        public Guid CompanyId { get; set; }
        public string CompanyCode { get; set; } = "";
        public string CompanyName { get; set; } = "";
        public DateTime EffectiveFrom { get; set; }
        public DateTime? EffectiveTo { get; set; }
        public string? Notes { get; set; }
        public bool IsActive { get; set; }
        public bool IsCurrent { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public string? EntityType { get; set; }
    }

    public class CreateOracleSourceMappingDto
    {
        public string OracleSource { get; set; } = "";
        public string BranchId { get; set; } = "";
        public Guid CompanyId { get; set; }
        public DateTime? EffectiveFrom { get; set; }
        public string? Notes { get; set; }
        public string? EntityType { get; set; }
    }

    public class UpdateOracleSourceMappingDto
    {
        public Guid CompanyId { get; set; }
        public DateTime EffectiveFrom { get; set; }
        public DateTime? EffectiveTo { get; set; }
        public string? Notes { get; set; }
        public bool IsActive { get; set; }
    }
}
