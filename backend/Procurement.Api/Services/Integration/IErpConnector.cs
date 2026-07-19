using Procurement.Api.Models.Integration;

namespace Procurement.Api.Services.Integration
{
    public class ErpItemDto
    {
        public string SourceItemId { get; set; } = "";
        public string ItemCode { get; set; } = "";
        public string Name { get; set; } = "";
        public string? Description { get; set; }
        public string GroupName { get; set; } = "";
        public string SubGroupName { get; set; } = "";
        public string Uom { get; set; } = "";
        public string BranchId { get; set; } = "";
        public string? Status { get; set; }
        public DateTime LastModified { get; set; }   // drives the watermark
    }

    public class ErpProjectDto
    {
        public string SourceProjectId { get; set; } = "";
        public string Code { get; set; } = "";
        public string Name { get; set; } = "";
        public string? ParentSourceProjectId { get; set; }
        public string BranchId { get; set; } = "";
        public bool IsActive { get; set; } = true;
        public DateTime LastModified { get; set; }   // drives the watermark
    }

    // Implement this once per ERP system (Oracle, SAP, Tally, ...).
    // The orchestrator never needs to know which ERP it's talking to.
    public interface IErpConnector
    {
        string ConnectorName { get; }   // e.g. "BrightOracle-HQ", "BrightOracle-FMCG"

        Task<List<ErpItemDto>> FetchItemsSinceAsync(DateTime watermark);
        Task<List<ErpSupplierDto>> FetchSuppliersAsync();
        Task<List<ErpProjectDto>> FetchProjectsSinceAsync(DateTime watermark);
    }
}
