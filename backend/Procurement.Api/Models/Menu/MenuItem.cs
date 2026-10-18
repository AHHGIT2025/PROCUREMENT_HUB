namespace Procurement.Api.Models.Menu
{
    public class MenuItem
    {
        public Guid Id { get; set; }
        public string MenuKey { get; set; } = "";
        public string Label { get; set; } = "";
        public string Route { get; set; } = "";
        public string IconName { get; set; } = "";
        public string GroupKey { get; set; } = "";
        public int DisplayOrder { get; set; }
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; }
    }
}
