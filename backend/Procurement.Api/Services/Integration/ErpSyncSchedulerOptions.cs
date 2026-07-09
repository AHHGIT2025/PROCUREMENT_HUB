namespace Procurement.Api.Services.Integration
{
    public class ErpSyncSchedulerOptions
    {
        public const string SectionName = "ErpSyncScheduler";

        public bool Enabled { get; set; } = true;
        public int IntervalMinutes { get; set; } = 15;

        // 0 = never auto full-sync, only incremental. If > 0, every Nth run
        // does a full sync instead of incremental (e.g. 96 runs * 15min = daily).
        public int RunFullSyncEveryNRuns { get; set; } = 0;

        // How many consecutive failures before we flag "failing" status for the UI.
        public int FailureThresholdForWarning { get; set; } = 3;
    }
}
