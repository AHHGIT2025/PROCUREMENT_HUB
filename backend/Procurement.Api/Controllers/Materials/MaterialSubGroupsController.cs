using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Procurement.Api.Data;
namespace Procurement.Api.Controllers.Materials
{
    [ApiController]
    [Route("api/[controller]")]
    public class MaterialSubGroupsController : Controller
    {
      
        private readonly AppDbContext _context;

        public MaterialSubGroupsController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> Get(Guid groupId)
        {
            var data = await _context.ItemSubGroups
                .Where(x => x.ItemGroupId == groupId)
                .Select(x => new
                {
                    x.Id,
                    x.Name
                })
                .ToListAsync();

            return Ok(data);
        }
    }
}
