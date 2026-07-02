
using Procurement.Api.Data;
using Procurement.Api.Models;

namespace Procurement.Api.Services.Materials
{
    public class MaterialService
    {
        private readonly AppDbContext _context;

        public MaterialService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<Item> CreateItem(Item item)
        {
            item.Id = Guid.NewGuid();

            item.CreatedAt = DateTime.UtcNow;

            _context.Items.Add(item);

            await _context.SaveChangesAsync();

            return item;
        }
    }
}
