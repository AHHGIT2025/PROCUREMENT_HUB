
namespace Procurement.Api.Services.Security
{
    public class PermissionService
    {
        public bool HasPermission(
            string role,
            string page)
        {
            if (role == "Admin")
                return true;

            if (role == "PM" &&
                page == "CreateRequest")
                return true;

            return false;
        }
    }
}
