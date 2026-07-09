namespace Procurement.Api.Services.Integration
{
    // Registered as a Singleton in DI. Purely in-memory — resets on app restart,
    // which is fine because "next run" / "is it alive" only matters for the
    // currently-running process. Historical run outcomes are already persisted
    // to IntegrationLogs by the orchestrator, so nothing is lost on restart.
    public class ErpSyncSchedulerStatus
    {
        private readonly object _lock = new();

        public bool Enabled { get; private set; }
        public bool IsRunning { get; private set; }
        public DateTime? LastRunStartedAt { get; private set; }
        public DateTime? LastRunCompletedAt { get; private set; }
        public bool? LastRunSuccess { get; private set; }
        public string? LastRunSummary { get; private set; }
        public string? LastRunError { get; private set; }
        public DateTime? NextRunAt { get; private set; }
        public int ConsecutiveFailures { get; private set; }
        public long TotalRunsCompleted { get; private set; }
        private int _failureThreshold = 3;
        public bool AlertSent { get; private set; }

        public void MarkAlertSent()
        {
            lock (_lock) { AlertSent = true; }
        }

        public void SetEnabled(bool enabled)
        {
            lock (_lock) { Enabled = enabled; }
        }

        public void SetFailureThreshold(int threshold)
        {
            lock (_lock) { _failureThreshold = threshold; }
        }

        public int FailureThreshold => _failureThreshold;

        public void MarkRunStarted()
        {
            lock (_lock)
            {
                IsRunning = true;
                LastRunStartedAt = DateTime.UtcNow;
            }
        }

        public void MarkRunSucceeded(string summary)
        {
            lock (_lock)
            {
                IsRunning = false;
                LastRunCompletedAt = DateTime.UtcNow;
                LastRunSuccess = true;
                LastRunSummary = summary;
                LastRunError = null;
                ConsecutiveFailures = 0;
                TotalRunsCompleted++;
                AlertSent = false;
            }
        }

        public void MarkRunFailed(string error)
        {
            lock (_lock)
            {
                IsRunning = false;
                LastRunCompletedAt = DateTime.UtcNow;
                LastRunSuccess = false;
                LastRunError = error;
                ConsecutiveFailures++;
                TotalRunsCompleted++;
            }
        }

        public void MarkSkipped()
        {
            // Previous run still in progress when timer ticked again — no state
            // change needed besides leaving IsRunning as-is; this exists mainly
            // as a hook point if we want to count skips later.
        }

        public void SetNextRunAt(DateTime nextRunUtc)
        {
            lock (_lock) { NextRunAt = nextRunUtc; }
        }

        public object ToDto()
        {
            lock (_lock)
            {
                return new
                {
                    enabled = Enabled,
                    isRunning = IsRunning,
                    lastRunStartedAt = LastRunStartedAt,
                    lastRunCompletedAt = LastRunCompletedAt,
                    lastRunSuccess = LastRunSuccess,
                    lastRunSummary = LastRunSummary,
                    lastRunError = LastRunError,
                    nextRunAt = NextRunAt,
                    consecutiveFailures = ConsecutiveFailures,
                    totalRunsCompleted = TotalRunsCompleted,
                    isFailing = ConsecutiveFailures >= _failureThreshold
                };
            }
        }
    }
}