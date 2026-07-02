using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Procurement.Api.Common;
using Procurement.Api.Data;
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

        public ErpSyncController(
            ErpSyncOrchestrator orchestrator,
            [FromKeyedServices("HQ")] IErpConnector hqConnector,
            [FromKeyedServices("FMCG")] IErpConnector fmcgConnector,
            AppDbContext db)
        {
            _orchestrator = orchestrator;
            _hqConnector = hqConnector;
            _fmcgConnector = fmcgConnector;
            _db = db;
        }

        // POST api/erp-sync/run?source=HQ|FMCG|All   (default: All)
        [HttpPost("run")]
        public async Task<IActionResult> Run([FromQuery] string source = "All")
        {
            var normalized = source.Trim().ToUpperInvariant();

            if (normalized != "HQ" && normalized != "FMCG" && normalized != "ALL")
            {
                return BadRequest(ApiResponse<object>.Fail(
                    $"Unknown source '{source}'. Use 'HQ', 'FMCG', or 'All'."));
            }

            var results = new Dictionary<string, SyncResult>();

            try
            {
                if (normalized == "HQ" || normalized == "ALL")
                {
                    results["HQ"] = await _orchestrator.SyncAsync(_hqConnector);
                }

                if (normalized == "FMCG" || normalized == "ALL")
                {
                    results["FMCG"] = await _orchestrator.SyncAsync(_fmcgConnector);
                }

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

        // GET api/erp-sync/status — watermarks + recent sync logs, feeds the admin Oracle Monitor page
        [HttpGet("status")]
        public async Task<IActionResult> Status()
        {
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
                .Where(l => l.Direction == "Inbound")
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

            return Ok(ApiResponse<object>.Ok(new { watermarks, recentLogs }));
        }
    }
}