using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Procurement.Api.Data;
using Procurement.Api.Models;

namespace Procurement.Api.Services.Integration
{
    // Registered as a Hosted Service (Singleton lifetime by the framework).
    // It creates a new DI scope on every tick so it can safely resolve the
    // Scoped ErpSyncOrchestrator and the Scoped/keyed IErpConnector instances
    // without ever holding a DbContext open across ticks.
    public class ErpSyncSchedulerService : BackgroundService
    {
        private readonly IServiceProvider _rootProvider;
        private readonly IOptionsMonitor<ErpSyncSchedulerOptions> _optionsMonitor;
        private readonly ErpSyncSchedulerStatus _status;
        private readonly ILogger<ErpSyncSchedulerService> _logger;
        private readonly SemaphoreSlim _runGate = new(1, 1);
        private long _runCounter = 0;

        public ErpSyncSchedulerService(
            IServiceProvider rootProvider,
            IOptionsMonitor<ErpSyncSchedulerOptions> optionsMonitor,
            ErpSyncSchedulerStatus status,
            ILogger<ErpSyncSchedulerService> logger)
        {
            _rootProvider = rootProvider;
            _optionsMonitor = optionsMonitor;
            _status = status;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            var initialOptions = _optionsMonitor.CurrentValue;
            _status.SetEnabled(initialOptions.Enabled);
            _status.SetFailureThreshold(initialOptions.FailureThresholdForWarning);

            if (!initialOptions.Enabled)
            {
                _logger.LogInformation("ErpSyncScheduler is disabled via configuration (ErpSyncScheduler:Enabled=false). Background sync will not run.");
                return;
            }

            // Small stagger on startup so it doesn't fight with app warm-up.
            try { await Task.Delay(TimeSpan.FromSeconds(10), stoppingToken); }
            catch (OperationCanceledException) { return; }

            while (!stoppingToken.IsCancellationRequested)
            {
                var options = _optionsMonitor.CurrentValue;
                _status.SetEnabled(options.Enabled);
                _status.SetFailureThreshold(options.FailureThresholdForWarning);

                var intervalMinutes = options.IntervalMinutes > 0 ? options.IntervalMinutes : 15;
                var interval = TimeSpan.FromMinutes(intervalMinutes);

                if (!options.Enabled)
                {
                    _status.SetNextRunAt(DateTime.UtcNow.Add(interval));
                    try { await Task.Delay(interval, stoppingToken); }
                    catch (OperationCanceledException) { break; }
                    continue;
                }

                await RunOnceAsync(options, stoppingToken);

                _status.SetNextRunAt(DateTime.UtcNow.Add(interval));

                try { await Task.Delay(interval, stoppingToken); }
                catch (OperationCanceledException) { break; }
            }
        }

        private async Task RunOnceAsync(ErpSyncSchedulerOptions options, CancellationToken stoppingToken)
        {
            // Guard against overlap: if a previous run is still executing
            // (e.g. sync took longer than the interval), skip this tick entirely
            // rather than queueing up or running concurrently.
            if (!await _runGate.WaitAsync(0, stoppingToken))
            {
                _logger.LogWarning("ErpSyncScheduler: previous run still in progress, skipping this tick.");
                _status.MarkSkipped();
                return;
            }

            try
            {
                _status.MarkRunStarted();
                _runCounter++;

                var doFullSync = options.RunFullSyncEveryNRuns > 0
                    && _runCounter % options.RunFullSyncEveryNRuns == 0;

                using var scope = _rootProvider.CreateScope();
                var orchestrator = scope.ServiceProvider.GetRequiredService<ErpSyncOrchestrator>();
                var hqConnector = scope.ServiceProvider.GetRequiredKeyedService<IErpConnector>("HQ");
                var fmcgConnector = scope.ServiceProvider.GetRequiredKeyedService<IErpConnector>("FMCG");

                var summaries = new List<string>();

                foreach (var connector in new[] { hqConnector, fmcgConnector })
                {
                    if (stoppingToken.IsCancellationRequested) break;

                    try
                    {
                        // NOTE: current ErpSyncOrchestrator.SyncAsync always does an
                        // incremental sync driven by watermarks — that is exactly what
                        // we want for the 15-min background tick. Full sync (doFullSync)
                        // stays a manual action from Oracle Monitor page for now; if/when
                        // orchestrator exposes a SyncAsync(connector, fullResync: bool)
                        // overload, pass doFullSync through here.
                        var result = await orchestrator.SyncAsync(connector);
                        summaries.Add(
                            $"{connector.ConnectorName}: Items {result.ItemsProcessed} processed/{result.ItemsSkipped} skipped, " +
                            $"Projects {result.ProjectsProcessed} processed/{result.ProjectsSkipped} skipped");
                    }
                    catch (Exception connEx)
                    {
                        summaries.Add($"{connector.ConnectorName}: FAILED - {connEx.Message}");
                        _logger.LogError(connEx, "ErpSyncScheduler: sync failed for connector {ConnectorName}", connector.ConnectorName);
                    }
                }

                var combinedSummary = string.Join(" | ", summaries);
                var anyFailed = summaries.Any(s => s.Contains("FAILED"));

                if (anyFailed)
                {
                    _status.MarkRunFailed(combinedSummary);

                    if (_status.ConsecutiveFailures >= _status.FailureThreshold && !_status.AlertSent)
                    {
                        await NotifyAdminsOfFailureAsync(scope, combinedSummary, _status.ConsecutiveFailures, stoppingToken);
                        _status.MarkAlertSent();
                    }
                }
                else
                    _status.MarkRunSucceeded(combinedSummary);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "ErpSyncScheduler: unhandled error during scheduled run.");
                _status.MarkRunFailed(ex.Message);
            }
            finally
            {
                _runGate.Release();
            }
        }

        private async Task NotifyAdminsOfFailureAsync(
            IServiceScope scope, string errorSummary, int consecutiveFailures, CancellationToken stoppingToken)
        {
            try
            {
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

                var adminIds = await db.Users
                    .Where(u => u.IsActive && db.UserRoles
                        .Any(ur => ur.UserId == u.Id && db.Roles
                            .Any(r => r.Id == ur.RoleId && r.Name == "System Admin")))
                    .Select(u => u.Id)
                    .ToListAsync(stoppingToken);

                foreach (var adminId in adminIds)
                {
                    db.Notifications.Add(new Notification
                    {
                        Id = Guid.NewGuid(),
                        UserId = adminId,
                        Title = "Oracle Auto-Sync Failing",
                        Message = $"Oracle sync scheduler has failed {consecutiveFailures} times in a row. Last error: {errorSummary}",
                        IsRead = false,
                        IsActive = true,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    });
                }

                await db.SaveChangesAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "ErpSyncScheduler: failed to send admin failure notifications.");
            }
        }
    }
}