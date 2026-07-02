namespace Procurement.Api.DTOs.Integration
{
    namespace Procurement.Api.DTOs.Integration
    {
        public class ItemCategoryDto
        {
            public Guid Id { get; set; }
            public string Code { get; set; } = "";
            public string Name { get; set; } = "";
            public string? Description { get; set; }
            public int SortOrder { get; set; }
            public int GroupsMapped { get; set; }
            public int ItemsMapped { get; set; }
            public bool IsActive { get; set; }
        }

        public class ItemCategoryGroupMapDto
        {
            public Guid Id { get; set; }
            public string OracleGroupName { get; set; } = "";
            public int ItemCount { get; set; }
            public DateTime CreatedAt { get; set; }
        }

        public class UnmappedGroupDto
        {
            public Guid GroupId { get; set; }
            public string GroupName { get; set; } = "";
            public int ItemCount { get; set; }
        }

        public class MapGroupDto
        {
            public string OracleGroupName { get; set; } = "";
            public Guid ItemCategoryId { get; set; }
        }

        public class CreateItemCategoryDto
        {
            public string Code { get; set; } = "";
            public string Name { get; set; } = "";
            public string? Description { get; set; }
            public int SortOrder { get; set; }
        }
    }
}
