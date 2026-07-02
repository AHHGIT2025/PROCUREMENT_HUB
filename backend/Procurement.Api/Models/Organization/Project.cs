namespace Procurement.Api.Models
{


    public class Project
    {
        public Guid Id { get; set; }

        public string Name { get; set; }

        public Guid CompanyId { get; set; }

        public Guid? DepartmentId { get; set; }

        public string SourceType { get; set; }

        public string? ExternalCode { get; set; }

        public DateTime CreatedAt { get; set; }
    }


}
