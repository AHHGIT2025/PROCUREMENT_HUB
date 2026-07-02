using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Procurement.Api.Data;
using Procurement.Api.DTOs.Materials;
using Procurement.Api.Models;
namespace Procurement.Api.Controllers.Materials
{
    [ApiController]
    [Route("api/[controller]")]
    public class MaterialsController : Controller
    {


        private readonly AppDbContext _context;

        public MaterialsController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> Get(Guid? companyId)
        {
            var query = _context.Items.AsQueryable();

            // ✅ Company filter
            if (companyId.HasValue)
            {
                query = query.Where(i =>
                    _context.ItemCompanies.Any(ic =>
                        ic.ItemId == i.Id &&
                        ic.CompanyId == companyId.Value));
            }

            var data = await query
                .Select(i => new
                {
                    id = i.Id,

                    materialCode = i.ItemCode,

                    name = i.Name,

                    mainGroup = _context.ItemGroups
                        .Where(g => g.Id == i.GroupId)
                        .Select(g => g.Name)
                        .FirstOrDefault(),

                    subGroup = _context.ItemSubGroups
                        .Where(s => s.Id == i.SubGroupId)
                        .Select(s => s.Name)
                        .FirstOrDefault(),

                    source = i.SourceType,

                    uom = _context.ItemUnits
                        .Where(u =>
                            u.ItemId == i.Id &&
                            u.IsDefault)
                        .Select(u => u.Unit.Name)
                        .FirstOrDefault(),

                    estimatedPrice = 0
                })
                .ToListAsync();

            return Ok(data);
        }


        [HttpPost]
public async Task<IActionResult> Create(CreateItemDto dto)
{
    try
    {
        var item = new Item
        {
            Id = Guid.NewGuid(),

            ItemCode = dto.ItemCode,

            Name = dto.Name,

            Description = dto.Description,

            GroupId = dto.GroupId,

            SubGroupId = dto.SubGroupId,

            SourceType = "MANUAL",

            CreatedAt = DateTime.UtcNow
        };

        // ✅ SAVE ITEM FIRST
        _context.Items.Add(item);

        await _context.SaveChangesAsync();

                // ✅ THEN COMPANY MAPPING

                _context.ItemCompanies.Add(new ItemCompany
                {
                    Id = Guid.NewGuid(),

                    ItemId = item.Id,

                    CompanyId = dto.CompanyId
                });


                // ✅ DEFAULT UNIT
                if (dto.UnitId.HasValue)
        {

                    _context.ItemUnits.Add(new ItemUnit
                    {
                        Id = Guid.NewGuid(),

                        ItemId = item.Id,

                        UnitId = dto.UnitId.Value,

                        IsDefault = true
                    });

                }

                await _context.SaveChangesAsync();

        return Ok(new
        {
            message = "✅ Item Created Successfully"
        });
    }

    catch (Exception ex)
    {
        return BadRequest(new
        {
            message = ex.Message,
            inner = ex.InnerException?.Message
        });
    }
}



        //private readonly AppDbContext _db;

        //public MaterialsController(AppDbContext db)
        //{
        //    _db = db;
        //}

        //// ✅ CREATE MR
        //[HttpPost]
        //public IActionResult Create(CreateMRDto dto)
        //{
        //    // ✅ Generate Request No
        //    int lastNo = _db.MaterialRequests
        //        .OrderByDescending(x => x.Id)
        //        .Select(x => x.RequestNo)
        //        .FirstOrDefault();

        //    int newNo = lastNo + 1;

        //    var mr = new MaterialRequest
        //    {
        //        RequestNo = newNo,
        //        CompanyId = dto.CompanyId,
        //        ProjectId = dto.ProjectId,
        //        CreatedBy = dto.CreatedBy,
        //        Status = "Pending"
        //    };

        //    _db.MaterialRequests.Add(mr);
        //    _db.SaveChanges();

        //    // ✅ Insert items
        //    foreach (var item in dto.Items)
        //    {
        //        _db.MaterialRequestItems.Add(new MaterialRequestItem
        //        {
        //            RequestId = mr.Id,
        //            ItemId = item.ItemId,
        //            Quantity = item.Quantity,
        //            Remarks = item.Remarks
        //        });
        //    }

        //    _db.SaveChanges();

        //    return Ok(new { message = "MR Created ✅", mr.RequestNo });
        //}

    }
}
 
