using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Procurement.Api.Data;
namespace Procurement.Api.Controllers.Notification
{
    [ApiController]
    [Route("api/notifications")]
    [Authorize]

    public class NotificationsController : Controller
    {

           private readonly AppDbContext _db;
            public NotificationsController(AppDbContext db) => _db = db;
       
        // GET /api/notifications?userId=xxx
        [HttpGet]
            public async Task<IActionResult> GetAll([FromQuery] Guid userId)
            {
                var data = await _db.Notifications
                    .Where(n => n.UserId == userId && n.IsActive)
                    .OrderByDescending(n => n.CreatedAt)
                    .Take(50)
                    .Select(n => new
                    {
                        n.Id,
                        n.Title,
                        n.Message,
                        n.IsRead,
                        n.CreatedAt
                    })
                    .ToListAsync();

                return Ok(new { success = true, data });
            }

            // PUT /api/notifications/{id}/mark-read
            [HttpPut("{id}/mark-read")]
            public async Task<IActionResult> MarkRead(Guid id)
            {
                var n = await _db.Notifications.FindAsync(id);
                if (n == null) return NotFound();
                n.IsRead = true;
                n.UpdatedAt = DateTime.UtcNow;
                await _db.SaveChangesAsync();
                return Ok(new { success = true });
            }

            // PUT /api/notifications/mark-all-read?userId=xxx
            [HttpPut("mark-all-read")]
            public async Task<IActionResult> MarkAllRead([FromQuery] Guid userId)
            {
                var unread = await _db.Notifications
                    .Where(n => n.UserId == userId && !n.IsRead && n.IsActive)
                    .ToListAsync();

                unread.ForEach(n => { n.IsRead = true; n.UpdatedAt = DateTime.UtcNow; });
                await _db.SaveChangesAsync();

                return Ok(new { success = true, count = unread.Count });
            }
        

        
      
    }
}
