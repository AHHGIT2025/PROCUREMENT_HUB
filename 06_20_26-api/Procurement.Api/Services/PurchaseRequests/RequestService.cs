
using Procurement.Api.Data;
using Procurement.Api.Models;
using Procurement.Api.Models.PurchaseRequests;
 
namespace Procurement.Api.Services.PurchaseRequests
{
    public class RequestService
    {
        private readonly AppDbContext _context;

        public RequestService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<PurchaseRequest> CreateRequest(
            PurchaseRequest request)
        {
            request.CreatedAt = DateTime.UtcNow;

            _context.PurchaseRequests.Add(request);

            await _context.SaveChangesAsync();

            return request;
        }
    }
}
