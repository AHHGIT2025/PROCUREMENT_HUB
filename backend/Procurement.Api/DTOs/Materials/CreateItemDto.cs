namespace Procurement.Api.DTOs.Materials
{
    public class CreateItemDto
    {

          public string ItemCode { get; set; }
            public string Name { get; set; }
           

            public Guid? GroupId { get; set; }
            public Guid? SubGroupId { get; set; }
            public Guid? UnitId { get; set; }

            public Guid CompanyId { get; set; }
        public string? Description { get; set; }

    }
  

}
