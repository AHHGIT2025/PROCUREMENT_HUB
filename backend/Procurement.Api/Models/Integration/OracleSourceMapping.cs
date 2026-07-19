namespace Procurement.Api.Models.Integration
{
    public class OracleSourceMapping
    {
        public Guid Id { get; set; }
        public string OracleSource { get; set; } = "";
        public string BranchId { get; set; } = "";
        public Guid CompanyId { get; set; }
        public DateTime EffectiveFrom { get; set; } = DateTime.UtcNow;
        public DateTime? EffectiveTo { get; set; }
        public string? Notes { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedAt { get; set; }
        public bool IsActive { get; set; } = true;
        public string? EntityType { get; set; }  // "Items" | "Suppliers" | null (= applies to all)
    }
}