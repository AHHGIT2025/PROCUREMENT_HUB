namespace Procurement.Api.Services.Integration
{
    public class ErpSyncWatermark
    {
        public Guid Id { get; set; }
        public string ConnectorName { get; set; } = "";
        public string EntityType { get; set; } = "";   // "Item" | "Project"
        public string LastWatermark { get; set; } = "1900-01-01 00:00:00";
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
