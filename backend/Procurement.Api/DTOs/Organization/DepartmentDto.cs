namespace Procurement.Api.DTOs.Organization
{
    public class DepartmentDto
    {
        public Guid Id { get; set; }
        public Guid CompanyId { get; set; }
        public string CompanyName { get; set; } = "";
        public string Code { get; set; } = "";
        public string Name { get; set; } = "";
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }

    public class CreateDepartmentDto
    {
        public Guid CompanyId { get; set; }
        public string Code { get; set; } = "";
        public string Name { get; set; } = "";
    }

    public class UpdateDepartmentDto
    {
        public Guid CompanyId { get; set; }
        public string Code { get; set; } = "";
        public string Name { get; set; } = "";
        public bool IsActive { get; set; }
    }
}