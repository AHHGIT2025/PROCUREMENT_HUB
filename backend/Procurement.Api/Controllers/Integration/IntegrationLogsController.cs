using Microsoft.AspNetCore.Mvc;
using Procurement.Api.Data;
using Procurement.Api.Models;

namespace Procurement.Api.Controllers.Integration
{
    [Route("api/integration-logs")]
    public class IntegrationLogsController : CrudController<IntegrationLog> 
    { public IntegrationLogsController(AppDbContext db) : base(db) { } 
    }
}
