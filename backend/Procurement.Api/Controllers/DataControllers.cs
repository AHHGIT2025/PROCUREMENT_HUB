using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Procurement.Api.Data;
using Procurement.Api.Models;
namespace Procurement.Api.Controllers;
 
[Authorize]
[ApiController]
public abstract class CrudController<T> : ControllerBase where T : BaseEntity
{
    protected readonly AppDbContext Db;
    protected CrudController(AppDbContext db) => Db = db;
    [HttpGet] public virtual async Task<IActionResult> Get() => Ok(await Db.Set<T>().OrderByDescending(x => x.CreatedAt).ToListAsync());
    [HttpGet("{id:guid}")] public virtual async Task<IActionResult> GetById(Guid id) => Ok(await Db.Set<T>().FindAsync(id));
    [HttpPost] public virtual async Task<IActionResult> Create(T entity){ Db.Set<T>().Add(entity); await Db.SaveChangesAsync(); return Ok(entity); }
    [HttpPut("{id:guid}")] public virtual async Task<IActionResult> Update(Guid id, T entity){ entity.Id=id; entity.UpdatedAt=DateTime.UtcNow; Db.Update(entity); await Db.SaveChangesAsync(); return Ok(entity); }
    [HttpDelete("{id:guid}")] public virtual async Task<IActionResult> Delete(Guid id){ var e=await Db.Set<T>().FindAsync(id); if(e==null)return NotFound(); e.IsActive=false; await Db.SaveChangesAsync(); return Ok(); }
}







[Route("api/uploads")] public class UploadsController:CrudController<UploadBatch>{public UploadsController(AppDbContext db):base(db){}}
[Route("api/audit-logs")] public class AuditLogsController:CrudController<AuditLog>{public AuditLogsController(AppDbContext db):base(db){}}








