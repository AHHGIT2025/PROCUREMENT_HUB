namespace Procurement.Api.Models.Categories
{
     
        public class ItemCategory
        {
            public Guid Id { get; set; }
            public string Code { get; set; } = "";
            public string Name { get; set; } = "";
            public string? Description { get; set; }
            public int SortOrder { get; set; }
            public bool IsActive { get; set; } = true;
            public DateTime CreatedAt { get; set; }
            public DateTime? UpdatedAt { get; set; }

            public ICollection<ItemGroupCategoryMap> GroupMaps { get; set; } = new List<ItemGroupCategoryMap>();
        }

        public class ItemGroupCategoryMap
        {
            public Guid Id { get; set; }
            public string OracleGroupName { get; set; } = "";
            public Guid ItemCategoryId { get; set; }
            public DateTime CreatedAt { get; set; }

            public ItemCategory? Category { get; set; }
        }
     
}
