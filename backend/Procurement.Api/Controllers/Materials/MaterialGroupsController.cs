using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Procurement.Api.Data;
using Procurement.Api.Models;
using System.Net.NetworkInformation;

namespace Procurement.Api.Controllers.Materials
{
    [ApiController]
    [Route("api/[controller]")]
    public class MaterialGroupsController : Controller
    {
        private readonly AppDbContext _context;

        public MaterialGroupsController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> Get()
        {
            var data = await _context.ItemGroups
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
