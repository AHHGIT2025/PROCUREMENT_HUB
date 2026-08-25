
using Procurement.Api.Models;

namespace Procurement.Api.Services.Integration
{
    public class OracleSourceMapping : BaseEntity
    {
        public string OracleSource { get; set; } = "";
        public string BranchId { get; set; } = "";
        public Guid CompanyId { get; set; }
        public DateTime EffectiveFrom { get; set; } = DateTime.UtcNow;
        public DateTime? EffectiveTo { get; set; }
        public int? StoresId { get; set; }
        public string? Notes { get; set; }
        public string? EntityType { get; set; }  // "Items" | "Suppliers" | null (= applies to all)
    }
}
