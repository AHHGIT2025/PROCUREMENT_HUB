using Procurement.Api.Models.Categories;

namespace Procurement.Api.Models
{


    public class Item
    {
        public Guid Id { get; set; }

        public string ItemCode { get; set; }
        public string Name { get; set; }
        public string Description { get; set; }

        public Guid? GroupId { get; set; }
        public Guid? SubGroupId { get; set; }
        public Guid? UnitId { get; set; }

        public string SourceType { get; set; }
        public Guid? CategoryId { get; set; }          // ✅ NEW

        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }    // ✅ ADD THIS LINE
        public ICollection<ItemUnit> ItemUnits { get; set; }
        public bool IsManualCategoryOverride { get; set; }
        public ItemCategory? Category { get; set; }    // ✅ NEW nav property
    }

    public class ItemCompany
    {
        public Guid Id { get; set; }
        public Guid ItemId { get; set; }
        public Guid CompanyId { get; set; }
    }

    public class ItemUnit
    {
        public Guid Id { get; set; }

        public Guid ItemId { get; set; }
        public Guid UnitId { get; set; }

        public decimal ConversionFactor { get; set; }  // 1 BOX = 10 PCS ✅

        public bool IsDefault { get; set; }  // default unit ✅

        // ✅ Navigation properties (best practice)
        public Item Item { get; set; }
        public Unit Unit { get; set; }
    }

    public class Unit
    {
        public Guid Id { get; set; }
        public string Name { get; set; }

        public ICollection<ItemUnit> ItemUnits { get; set; }
    }


    public class ItemGroup
    {
        public Guid Id { get; set; }

        public string Name { get; set; }
        public Guid? CategoryId { get; set; }          // ✅ NEW
        public ItemCategory? Category { get; set; }    // ✅ NEW
        public ICollection<ItemSubGroup> ItemSubGroups { get; set; }
    }

    public class ItemSubGroup
    {
        public Guid Id { get; set; }

        public Guid ItemGroupId { get; set; }

        public string Name { get; set; }

        public ItemGroup ItemGroup { get; set; }
    }



}
