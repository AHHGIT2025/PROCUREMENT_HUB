
namespace Procurement.Api.Services.PurchaseRequests
{
    public class ApprovalService
    {
        public bool CanApprove(
            string userRole,
            string requestStatus)
        {
            if (userRole == "CEO")
                return true;

            if (userRole == "PM" &&
                requestStatus == "PendingPM")
                return true;

            return false;
        }
    }
}
