namespace Procurement.Api.DTOs.Materials
{

    public class UpdateItemDto
    {
        public string Name { get; set; } = "";
        public string? Description { get; set; }
        public Guid? GroupId { get; set; }
        public Guid? SubGroupId { get; set; }
        public Guid? UnitId { get; set; }
    }
    public class UpdateItemCategoryDto
    {
        public Guid CategoryId { get; set; }
    }

}