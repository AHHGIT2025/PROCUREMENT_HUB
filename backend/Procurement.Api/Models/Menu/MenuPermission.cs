namespace Procurement.Api.Models.Menu
{
    public class MenuPermission
    {
        public Guid Id { get; set; }
        public Guid RoleId { get; set; }
        public string MenuKey { get; set; } = "";
        public DateTime CreatedAt { get; set; }
    }
}
