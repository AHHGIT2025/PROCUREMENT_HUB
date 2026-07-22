namespace Procurement.Api.DTOs.Users
{
    public class UpdateUserDto
    {
        public string? EmployeeCode { get; set; }
        public string FullName { get; set; } = "";
        public string Email { get; set; } = "";
        public Guid CompanyId { get; set; }
        public Guid? DepartmentId { get; set; }
        public string RoleName { get; set; } = "";
        public Guid? ManagerId { get; set; }
        public Guid? SubManagerId { get; set; }
        public string? Password { get; set; }
        public List<Guid>? AdditionalCompanyIds { get; set; }
        // No Password field — editing a user should never require re-entering it
    }
}
