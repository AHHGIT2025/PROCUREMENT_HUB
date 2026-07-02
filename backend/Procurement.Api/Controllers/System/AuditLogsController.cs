using Microsoft.AspNetCore.Mvc;

namespace Procurement.Api.Controllers.System
{
    public class AuditLogsController : Controller
    {
        public IActionResult Index()
        {
            return View();
        }
    }
}
