using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Procurement.Api.Common;
using Procurement.Api.Data;
using Procurement.Api.Models;
using Procurement.Api.Services.Integration;

namespace Procurement.Api.Controllers.Integration
{
    [Authorize]
    [ApiController]
    [Route("api/erp-sync")]
    public class ErpSyncController : ControllerBase
    {
        private readonly ErpSyncOrchestrator _orchestrator;
        private readonly IErpConnector _hqConnector;
        private readonly IErpConnector _fmcgConnector;
        private readonly AppDbContext _db;
        private readonly ErpSyncSchedulerStatus _schedulerStatus;
        private readonly SupplierSyncService _supplierSyncService;

        public ErpSyncController(
            ErpSyncOrchestrator orchestrator,
            [FromKeyedServices("HQ")] IErpConnector hqConnector,
            [FromKeyedServices("FMCG")] IErpConnector fmcgConnector,
            AppDbContext db,
            ErpSyncSchedulerStatus schedulerStatus,
            SupplierSyncService supplierSyncService)
        {
            _orchestrator = orchestrator;
            _hqConnector = hqConnector;
            _fmcgConnector = fmcgConnector;
            _db = db;
            _schedulerStatus = schedulerStatus;
            _supplierSyncService = supplierSyncService;
        }

        // POST api/erp-sync/run?source=HQ|FMCG|All
        [HttpPost("run")]
        public async Task<IActionResult> Run([FromQuery] string source = "All")
        {
            var normalized = source.Trim().ToUpperInvariant();

            if (normalized != "HQ" && normalized != "FMCG" && normalized != "ALL")
                return BadRequest(ApiResponse<object>.Fail(
                    $"Unknown source '{source}'. Use 'HQ', 'FMCG', or 'All'."));

            var results = new Dictionary<string, SyncResult>();

            try
            {
                if (normalized == "HQ" || normalized == "ALL")
                    results["HQ"] = await _orchestrator.SyncAsync(_hqConnector);

                if (normalized == "FMCG" || normalized == "ALL")
                    results["FMCG"] = await _orchestrator.SyncAsync(_fmcgConnector);

                return Ok(ApiResponse<Dictionary<string, SyncResult>>.Ok(results, "Sync completed."));
            }
            catch (Exception ex)
            {
                Console.WriteLine("===== SYNC EXCEPTION =====");
                Console.WriteLine(ex.ToString());
                Console.WriteLine("===========================");

                var fullMessage = ex.Message;
                var inner = ex.InnerException;
                while (inner != null)
                {
                    fullMessage += " | INNER: " + inner.Message;
                    inner = inner.InnerException;
                }

                return StatusCode(500, ApiResponse<object>.Fail($"Sync failed: {fullMessage}"));
            }
        }

        // POST api/erp-sync/run-suppliers?source=HQ|FMCG|All
        [HttpPost("run-suppliers")]
        public async Task<IActionResult> RunSuppliers([FromQuery] string source = "All")
        {
            var normalized = source.Trim().ToUpperInvariant();

            if (normalized != "HQ" && normalized != "FMCG" && normalized != "ALL")
                return BadRequest(ApiResponse<object>.Fail(
                    $"Unknown source '{source}'. Use 'HQ', 'FMCG', or 'All'."));

            var results = new Dictionary<string, SupplierSyncResult>();

            try
            {
                if (normalized == "HQ" || normalized == "ALL")
                    results["HQ"] = await _supplierSyncService.SyncAsync(_hqConnector, "ORACLE_HQ");

                if (normalized == "FMCG" || normalized == "ALL")
                    results["FMCG"] = await _supplierSyncService.SyncAsync(_fmcgConnector, "ORACLE_FMCG");

                return Ok(ApiResponse<Dictionary<string, SupplierSyncResult>>.Ok(results, "Supplier sync completed."));
            }
            catch (Exception ex)
            {
                return StatusCode(500, ApiResponse<object>.Fail($"Supplier sync failed: {ex.Message}"));
            }
        }

        // POST api/erp-sync/reset-watermark?source=HQ|FMCG|All
        // Resets watermark to 1900 so next sync pulls ALL records from Oracle
        [HttpPost("reset-watermark")]
        public async Task<IActionResult> ResetWatermark([FromQuery] string source = "HQ")
        {
            var normalized = source.Trim().ToUpperInvariant();

            if (normalized != "HQ" && normalized != "FMCG" && normalized != "ALL")
                return BadRequest(ApiResponse<object>.Fail(
                    $"Unknown source '{source}'. Use 'HQ', 'FMCG', or 'All'."));

            var connectorNames = new List<string>();
            if (normalized == "HQ" || normalized == "ALL") connectorNames.Add("BrightOracle-HQ");
            if (normalized == "FMCG" || normalized == "ALL") connectorNames.Add("BrightOracle-FMCG");

            var watermarks = await _db.ErpSyncWatermarks
                .Where(w => connectorNames.Contains(w.ConnectorName))
                .ToListAsync();

            foreach (var wm in watermarks)
            {
                wm.LastWatermark = "1900-01-01 00:00:00";  // ✅ string
                wm.UpdatedAt = DateTime.UtcNow;
            }

            await _db.SaveChangesAsync();

            return Ok(ApiResponse<object>.Ok(null,
                $"Watermark reset for: {string.Join(", ", connectorNames)}. " +
                $"Run sync now to pull all records from Oracle."));
        }

        // GET api/erp-sync/status
        [HttpGet("status")]
        public async Task<IActionResult> Status()
        {
            _db.Database.SetCommandTimeout(60);

            var watermarks = await _db.ErpSyncWatermarks
                .OrderBy(w => w.ConnectorName)
                .ThenBy(w => w.EntityType)
                .Select(w => new
                {
                    w.ConnectorName,
                    w.EntityType,
                    w.LastWatermark,
                    w.UpdatedAt
                })
                .ToListAsync();

            var recentLogs = await _db.IntegrationLogs
                .Where(l => l.Direction == "Inbound" && l.Status == IntegrationStatus.Success)
                .OrderByDescending(l => l.CreatedAt)
                .Take(20)
                .Select(l => new
                {
                    l.Module,
                    l.Status,
                    l.Message,
                    l.CreatedAt
                })
                .ToListAsync();

            // NOTE: DateTime -> UTC "Z" correction is now handled globally by
            // UtcDateTimeJsonConverter (registered in Program.cs), so no
            // per-field fixups are needed here anymore.
            return Ok(ApiResponse<object>.Ok(new { watermarks, recentLogs }));
        }

        // GET api/erp-sync/scheduler-status
        // Powers the "Auto-sync: ON | Last run ... | Next run ..." status
        // card on the Oracle Monitor page. Purely reads in-memory state
        // from the background scheduler — no DB hit needed here.
        [HttpGet("scheduler-status")]
        public IActionResult SchedulerStatus()
        {
            return Ok(ApiResponse<object>.Ok(_schedulerStatus.ToDto()));
        }
    }
}