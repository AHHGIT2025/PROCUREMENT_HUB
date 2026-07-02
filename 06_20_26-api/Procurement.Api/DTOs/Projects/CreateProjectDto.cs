namespace Procurement.Api.DTOs.Projects
{
   
        public class CreateProjectDto
        {
            public string Name { get; set; }
            public Guid CompanyId { get; set; }
            public Guid? DepartmentId { get; set; }
        public string SourceType { get; set; }
     

        public string? ExternalCode { get; set; }
    }

    


    }
