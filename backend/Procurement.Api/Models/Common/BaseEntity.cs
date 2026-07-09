
namespace Procurement.Api.Models;

public enum MaterialSource { ORACLE = 1, MANUAL = 2 }
//public enum RequestStatus { Draft = 1, Submitted = 2, PendingApproval = 3, Approved = 4, Rejected = 5, Returned = 6, OracleReady = 7, OraclePosted = 8 }
public enum ApprovalDecision { Pending = 1, Approved = 2, Rejected = 3, Returned = 4 }
public enum IntegrationStatus { Pending = 1, Success = 2, Failed = 3, Retrying = 4 }

public enum RequestStatus
{
    Draft = 1,

    Submitted = 2,

    PendingApproval = 3,

    Approved = 4,

    Rejected = 5,

    Returned = 6,

    OracleReady = 7,

    OraclePosted = 8,

    Deleted = 9,
        // ✅ NEW — set only when Store Keeper completes verification and
    // every item was fully available in store (no purchase needed at all)
    FulfilledFromStock = 10
}


//public enum RequestStatus
//{
//    Draft = 1,

//    Submitted = 2,

//    PendingApproval = 3,

//    Approved = 4,

//    Rejected = 5,

//    Returned = 6,

//    OracleReady = 7,

//    OraclePosted = 8,

//    Deleted = 9
//}


public abstract class BaseEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    public bool IsActive { get; set; } = true;
}

public class Holding : BaseEntity { public string Code { get; set; } = "AHH"; public string Name { get; set; } = "Al Hattab Holding"; public Guid? HeadOfficeCompanyId { get; set; } }
public class Company : BaseEntity { public Guid HoldingId { get; set; } public string Code { get; set; } = ""; public string Name { get; set; } = ""; public bool IsOracleIntegrated { get; set; } public string Currency { get; set; } = "QAR"; }
public class Department : BaseEntity { public Guid CompanyId { get; set; } public string Code { get; set; } = ""; public string Name { get; set; } = ""; }
public class BusinessVertical : BaseEntity { public Guid HoldingId { get; set; } public string Code { get; set; } = ""; public string Name { get; set; } = ""; }
public class Role : BaseEntity { public string Name { get; set; } = ""; public string Description { get; set; } = ""; }
public class Permission : BaseEntity { public string Code { get; set; } = ""; public string Name { get; set; } = ""; }

public class AppUser : BaseEntity
{
    public string EmployeeCode { get; set; } = "";   // Primary business ID

    public string FullName { get; set; } = "";
    public string Email { get; set; } = "";
    public string PasswordHash { get; set; } = "";

    public Guid? CompanyId { get; set; }
    public Guid? DepartmentId { get; set; }

    // ✅ Reporting hierarchy
    public Guid? ManagerId { get; set; }
    public Guid? SubManagerId { get; set; }

    // ✅ Status
    public bool IsActive { get; set; } = true;

    // ✅ Audit (if not already in BaseEntity)
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}

public class UserRole : BaseEntity { public Guid UserId { get; set; } public Guid RoleId { get; set; } }
public class UserCompany : BaseEntity { public Guid UserId { get; set; } public Guid CompanyId { get; set; } }
public class UserDepartment : BaseEntity { public Guid UserId { get; set; } public Guid DepartmentId { get; set; } }
public class MaterialType : BaseEntity { public string Code { get; set; } = ""; public string Name { get; set; } = ""; }
public class MaterialCategory : BaseEntity { public string Code { get; set; } = ""; public string Name { get; set; } = ""; }
public class MaterialSubCategory : BaseEntity { public Guid CategoryId { get; set; } public string Code { get; set; } = ""; public string Name { get; set; } = ""; }
public class UnitOfMeasure : BaseEntity { public string Code { get; set; } = ""; public string Name { get; set; } = ""; }
public class CostCenter : BaseEntity { public Guid CompanyId { get; set; } public string Code { get; set; } = ""; public string Name { get; set; } = ""; }
public class BudgetCenter : BaseEntity { public Guid CompanyId { get; set; } public string Code { get; set; } = ""; public string Name { get; set; } = ""; public decimal TotalBudget { get; set; } public decimal UsedBudget { get; set; } }
public class Material : BaseEntity { public string MaterialCode { get; set; } = ""; public string Name { get; set; } = ""; public string Description { get; set; } = ""; public MaterialSource Source { get; set; } public Guid? CompanyId { get; set; } public Guid MaterialTypeId { get; set; } public Guid MaterialCategoryId { get; set; } public string Uom { get; set; } = "EA"; public decimal EstimatedPrice { get; set; } }


public class UploadBatch : BaseEntity { public string Module { get; set; } = ""; public string FileName { get; set; } = ""; public int TotalRows { get; set; } public int SuccessRows { get; set; } public int ErrorRows { get; set; } }
public class UploadBatchItem : BaseEntity { public Guid UploadBatchId { get; set; } public int RowNumber { get; set; } public string Status { get; set; } = ""; public string ErrorMessage { get; set; } = ""; }
public class Notification : BaseEntity { public Guid UserId { get; set; } public string Title { get; set; } = ""; public string Message { get; set; } = ""; public bool IsRead { get; set; } }
public class AuditLog : BaseEntity { public string Module { get; set; } = ""; public string Action { get; set; } = ""; public string UserName { get; set; } = ""; public string Details { get; set; } = ""; }
public class IntegrationConfig : BaseEntity { public Guid CompanyId { get; set; } public string SystemName { get; set; } = "Oracle ERP"; public string BaseUrl { get; set; } = ""; public bool Enabled { get; set; } }
public class IntegrationLog : BaseEntity { public string Direction { get; set; } = ""; public string Module { get; set; } = ""; public IntegrationStatus Status { get; set; } public int RetryCount { get; set; } public string Message { get; set; } = ""; }
public class OraclePostingLog : BaseEntity { public Guid PurchaseRequestId { get; set; } public IntegrationStatus Status { get; set; } public int RetryCount { get; set; } public string ErrorMessage { get; set; } = ""; }
public class Attachment : BaseEntity { public string EntityType { get; set; } = ""; public Guid EntityId { get; set; } public string FileName { get; set; } = ""; public string FileUrl { get; set; } = ""; }

public record LoginRequest(string Email, string Password);

public class CreateUserDto
{

    public string EmployeeCode { get; set; }
    public string FullName { get; set; }
    public string Email { get; set; }
    public string Password { get; set; }

    public Guid? CompanyId { get; set; }
    public Guid? DepartmentId { get; set; }

    public string RoleName { get; set; }

    public Guid? ManagerId { get; set; }
    public Guid? SubManagerId { get; set; }

    public List<Guid>? AdditionalCompanyIds { get; set; }


}

