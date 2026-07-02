
namespace Procurement.Api.Services.Security
{
    public class MenuService
    {
        public List<string> GetMenus(string role)
        {
            var menus = new List<string>();

            menus.Add("Dashboard");

            if (role == "Admin")
            {
                menus.Add("Users");
                menus.Add("Settings");
            }

            menus.Add("Materials");
            menus.Add("Projects");

            return menus;
        }
    }
}
