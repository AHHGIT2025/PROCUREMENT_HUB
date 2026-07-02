

using Microsoft.EntityFrameworkCore;
using Procurement.Api.Data;
using Procurement.Api.Models;
using Procurement.Api.Models.PurchaseRequests;

namespace Procurement.Api.Services;

public class SeedService
{
    private readonly AppDbContext _db;
    public SeedService(AppDbContext db) => _db = db;

    public async Task SeedAsync()
    {
        if (await _db.Holdings.AnyAsync()) return;

        var holding = new Holding { Code = "AHH", Name = "Al Hattab Holding" };
        _db.Holdings.Add(holding);

        var companies = new[]
        {
            new Company { HoldingId = holding.Id, Code = "AHT", Name = "Al Hattab Trading",      IsOracleIntegrated = true  },
            new Company { HoldingId = holding.Id, Code = "AHC", Name = "Al Hattab Construction", IsOracleIntegrated = true  },
            new Company { HoldingId = holding.Id, Code = "AHM", Name = "Al Hattab Manufacturing",IsOracleIntegrated = false },
            new Company { HoldingId = holding.Id, Code = "AHS", Name = "Al Hattab Services",     IsOracleIntegrated = false }
        };
        _db.Companies.AddRange(companies);

        var depNames = new[] { "Procurement", "Finance", "Operations", "Maintenance", "Warehouse", "IT", "HR", "Administration" };
        var depts = companies
            .SelectMany(c => depNames.Select((d, i) => new Department
            {
                CompanyId = c.Id,
                Code = d[..Math.Min(3, d.Length)].ToUpper() + i,
                Name = d
            }))
            .ToList();
        _db.Departments.AddRange(depts);

        var roles = new[]
        {
            "Requester", "Approver", "Department Manager", "Procurement Officer",
            "Finance Approver", "Material Admin", "Workflow Admin", "Company Admin",
            "Holding Admin", "System Admin", "Upload Admin", "Integration Admin", "Audit Admin"
        }
        .Select(r => new Role { Name = r, Description = r })
        .ToList();
        _db.Roles.AddRange(roles);

        var cats = new[] { "Construction", "Electrical", "Mechanical", "IT", "Office", "Safety" }
            .Select((c, i) => new MaterialCategory { Code = $"CAT{i + 1:00}", Name = c }).ToList();
        _db.MaterialCategories.AddRange(cats);

        var types = new[] { "Consumable", "Asset", "Service", "Spare Part" }
            .Select((t, i) => new MaterialType { Code = $"T{i + 1:00}", Name = t }).ToList();
        _db.MaterialTypes.AddRange(types);

        _db.UnitOfMeasures.AddRange(
            new[] { "EA", "BOX", "KG", "MTR", "LTR", "PCS" }
            .Select(u => new UnitOfMeasure { Code = u, Name = u }));

        var users = new[]
        {
            ("System Admin",    "admin@alhattab.com",           "Admin@123", "System Admin"),
            ("Requester",       "requester@alhattab.com",       "User@123",  "Requester"),
            ("Approver",        "approver@alhattab.com",        "User@123",  "Approver"),
            ("Material Admin",  "material.admin@alhattab.com",  "User@123",  "Material Admin"),
            ("Workflow Admin",  "workflow.admin@alhattab.com",  "User@123",  "Workflow Admin")
        }
        .Select(u => new AppUser
        {
            FullName = u.Item1,
            Email = u.Item2,
            PasswordHash = PasswordService.Hash(u.Item3),
            CompanyId = companies[0].Id,
            DepartmentId = depts[0].Id
        })
        .ToList();
        _db.Users.AddRange(users);

        await _db.SaveChangesAsync();

        foreach (var tuple in users.Zip(new[] { "System Admin", "Requester", "Approver", "Material Admin", "Workflow Admin" }))
        {
            _db.UserRoles.Add(new UserRole
            {
                UserId = tuple.First.Id,
                RoleId = roles.First(r => r.Name == tuple.Second).Id
            });
        }

        var materials = Enumerable.Range(1, 25).Select(i => new Material
        {
            MaterialCode = $"MAT-{i:0000}",
            Name = $"Enterprise Material {i}",
            Description = $"Sample procurement material {i}",
            Source = i <= 15 ? MaterialSource.ORACLE : MaterialSource.MANUAL,
            CompanyId = i <= 15 ? null : companies[i % companies.Length].Id,
            MaterialCategoryId = cats[i % cats.Count].Id,
            MaterialTypeId = types[i % types.Count].Id,
            Uom = i % 2 == 0 ? "EA" : "BOX",
            EstimatedPrice = 25 + i * 12
        }).ToList();
        _db.Materials.AddRange(materials);

        // ── Workflows — new shape (CompanyId nullable, EntityType, Priority) ──
        var workflows = companies.Select((c, i) => new WorkflowDefinition
        {
            Name = $"{c.Name} Standard Workflow",
            CompanyId = c.Id,
            EntityType = "PURCHASE_REQUEST",
            IsDefault = true,
            Priority = 0
        }).ToList();
        _db.WorkflowDefinitions.AddRange(workflows);

        await _db.SaveChangesAsync();

        foreach (var wf in workflows)
        {
            _db.WorkflowSteps.AddRange(
                new WorkflowStep
                {
                    WorkflowDefinitionId = wf.Id,
                    StepOrder = 1,
                    Name = "Manager Approval",
                    RoleName = "Department Manager",
                    ApproverType = "DEPARTMENT_MANAGER",
                    StepType = "SEQUENTIAL",
                    TimeoutHours = 48,
                    IsRequired = true
                },
                new WorkflowStep
                {
                    WorkflowDefinitionId = wf.Id,
                    StepOrder = 2,
                    Name = "Finance Approval",
                    RoleName = "Finance Approver",
                    ApproverType = "ROLE",
                    StepType = "SEQUENTIAL",
                    TimeoutHours = 48,
                    IsRequired = true
                },
                new WorkflowStep
                {
                    WorkflowDefinitionId = wf.Id,
                    StepOrder = 3,
                    Name = "Procurement Approval",
                    RoleName = "Procurement Officer",
                    ApproverType = "ROLE",
                    StepType = "SEQUENTIAL",
                    TimeoutHours = 72,
                    IsRequired = true
                }
            );
        }

        // ── Purchase Requests — NO ApprovalAction (old shape removed) ────────
        var requester = users.First(u => u.Email == "requester@alhattab.com");

        for (int i = 1; i <= 10; i++)
        {
            var pr = new PurchaseRequest
            {
                RequestNumber = $"PR-2026-{i:0000}",
                CompanyId = companies[i % companies.Length].Id,
                DepartmentId = depts[i % depts.Count].Id,
                RequestedById = requester.Id,
                Status = (RequestStatus)((i % 7) + 1),
                Justification = $"Operational requirement {i}",
                TotalAmount = 1000 + i * 150
            };
            _db.PurchaseRequests.Add(pr);

            await _db.SaveChangesAsync();

            _db.PurchaseRequestItems.Add(new PurchaseRequestItem
            {
                PurchaseRequestId = pr.Id,
                MaterialId = materials[i % materials.Count].Id,
                Quantity = 2 + i,
                Uom = "EA",
                RequiredDate = DateTime.UtcNow.AddDays(7 + i),
                Justification = "Required for operations",
                EstimatedUnitPrice = 50 + i
            });

            // ── ApprovalAction removed from seed ─────────────────────────────
            // Old shape had PurchaseRequestId + UserId + Decision
            // New shape requires ApprovalInstanceId — engine creates these at runtime
            // Seed data does not pre-create approval actions
        }

        _db.UploadBatches.AddRange(
            new UploadBatch { Module = "Materials", FileName = "materials-upload.csv", TotalRows = 50, SuccessRows = 47, ErrorRows = 3 },
            new UploadBatch { Module = "Users", FileName = "users-upload.xlsx", TotalRows = 20, SuccessRows = 20, ErrorRows = 0 }
        );

        _db.IntegrationLogs.AddRange(
            new IntegrationLog { Direction = "Inbound", Module = "Material Sync", Status = IntegrationStatus.Success, Message = "25 materials synced" },
            new IntegrationLog { Direction = "Outbound", Module = "PR Posting", Status = IntegrationStatus.Failed, RetryCount = 2, Message = "Oracle endpoint timeout" }
        );

        _db.AuditLogs.AddRange(
            new AuditLog { Module = "Auth", Action = "Login", UserName = "admin@alhattab.com", Details = "Seed login audit" },
            new AuditLog { Module = "Purchase Request", Action = "Submit", UserName = "requester@alhattab.com", Details = "Seed request submitted" }
        );

        await _db.SaveChangesAsync();
    }
}
//using Procurement.Api.Data;
//using Procurement.Api.Models;
//using Procurement.Api.Models.PurchaseRequests;
//using Microsoft.EntityFrameworkCore;
//using Procurement.Api.DTOs;


//namespace Procurement.Api.Services;
//public class SeedService
//{
//    private readonly AppDbContext _db;
//    public SeedService(AppDbContext db) => _db = db;    
//    public async Task SeedAsync()
//    {
//        if (await _db.Holdings.AnyAsync()) return;
//        var holding = new Holding { Code = "AHH", Name = "Al Hattab Holding" }; _db.Holdings.Add(holding);
//        var companies = new[] {
//            new Company{HoldingId=holding.Id,Code="AHT",Name="Al Hattab Trading",IsOracleIntegrated=true},
//            new Company{HoldingId=holding.Id,Code="AHC",Name="Al Hattab Construction",IsOracleIntegrated=true},
//            new Company{HoldingId=holding.Id,Code="AHM",Name="Al Hattab Manufacturing",IsOracleIntegrated=false},
//            new Company{HoldingId=holding.Id,Code="AHS",Name="Al Hattab Services",IsOracleIntegrated=false}
//        }; _db.Companies.AddRange(companies);
//        var depNames = new[] {"Procurement","Finance","Operations","Maintenance","Warehouse","IT","HR","Administration"};
//        var depts = companies.SelectMany(c => depNames.Select((d,i)=>new Department{CompanyId=c.Id, Code=d[..Math.Min(3,d.Length)].ToUpper()+i, Name=d})).ToList(); _db.Departments.AddRange(depts);
//        var roles = new[]{"Requester","Approver","Department Manager","Procurement Officer","Finance Approver","Material Admin","Workflow Admin","Company Admin","Holding Admin","System Admin","Upload Admin","Integration Admin","Audit Admin"}.Select(r=>new Role{Name=r,Description=r}).ToList(); _db.Roles.AddRange(roles);
//        var cats = new[]{"Construction","Electrical","Mechanical","IT","Office","Safety"}.Select((c,i)=>new MaterialCategory{Code=$"CAT{i+1:00}",Name=c}).ToList(); _db.MaterialCategories.AddRange(cats);
//        var types = new[]{"Consumable","Asset","Service","Spare Part"}.Select((t,i)=>new MaterialType{Code=$"T{i+1:00}",Name=t}).ToList(); _db.MaterialTypes.AddRange(types);
//        _db.UnitOfMeasures.AddRange(new[]{"EA","BOX","KG","MTR","LTR","PCS"}.Select(u=>new UnitOfMeasure{Code=u,Name=u}));
//        var users = new[]{
//            ("System Admin","admin@alhattab.com","Admin@123","System Admin"),("Requester","requester@alhattab.com","User@123","Requester"),("Approver","approver@alhattab.com","User@123","Approver"),("Material Admin","material.admin@alhattab.com","User@123","Material Admin"),("Workflow Admin","workflow.admin@alhattab.com","User@123","Workflow Admin")
//        }.Select(u=>new AppUser{FullName=u.Item1,Email=u.Item2,PasswordHash=PasswordService.Hash(u.Item3),CompanyId=companies[0].Id,DepartmentId=depts[0].Id}).ToList(); _db.Users.AddRange(users);
//        await _db.SaveChangesAsync();
//        foreach (var tuple in users.Zip(new[]{"System Admin","Requester","Approver","Material Admin","Workflow Admin"})) _db.UserRoles.Add(new UserRole{UserId=tuple.First.Id,RoleId=roles.First(r=>r.Name==tuple.Second).Id});
//        var materials = Enumerable.Range(1,25).Select(i=>new Material{MaterialCode=$"MAT-{i:0000}",Name=$"Enterprise Material {i}",Description=$"Sample procurement material {i}",Source=i<=15?MaterialSource.ORACLE:MaterialSource.MANUAL,CompanyId=i<=15?null:companies[i%companies.Length].Id,MaterialCategoryId=cats[i%cats.Count].Id,MaterialTypeId=types[i%types.Count].Id,Uom=i%2==0?"EA":"BOX",EstimatedPrice=25+i*12}).ToList(); _db.Materials.AddRange(materials);
//        var workflows = companies.Select((c,i)=>new WorkflowDefinition{Name=$"{c.Name} Standard Workflow",CompanyId=c.Id,IsDefault=true}).ToList(); _db.WorkflowDefinitions.AddRange(workflows); await _db.SaveChangesAsync();
//        foreach(var wf in workflows){ _db.WorkflowSteps.AddRange(new WorkflowStep{WorkflowDefinitionId=wf.Id,StepOrder=1,Name="Department Manager Review",RoleName="Department Manager"},new WorkflowStep{WorkflowDefinitionId=wf.Id,StepOrder=2,Name="Finance Review",RoleName="Finance Approver"},new WorkflowStep{WorkflowDefinitionId=wf.Id,StepOrder=3,Name="Procurement Review",RoleName="Procurement Officer"}); }
//        var requester = users.First(u=>u.Email=="requester@alhattab.com");
//        for(int i=1;i<=10;i++){ var pr = new PurchaseRequest{RequestNumber=$"PR-2026-{i:0000}",CompanyId=companies[i%companies.Length].Id,DepartmentId=depts[i%depts.Count].Id,RequestedById=requester.Id,Status=(RequestStatus)((i%7)+1),Justification=$"Operational requirement {i}",TotalAmount=1000+i*150}; _db.PurchaseRequests.Add(pr); await _db.SaveChangesAsync(); _db.PurchaseRequestItems.Add(new PurchaseRequestItem{PurchaseRequestId=pr.Id,MaterialId=materials[i%materials.Count].Id,Quantity=2+i,Uom="EA",RequiredDate=DateTime.UtcNow.AddDays(7+i),Justification="Required for operations",EstimatedUnitPrice=50+i}); _db.ApprovalActions.Add(new ApprovalAction{PurchaseRequestId=pr.Id,UserId=users[2].Id,Decision=i%3==0?ApprovalDecision.Returned:ApprovalDecision.Approved,Comments="Seed approval action"}); }
//        _db.UploadBatches.AddRange(new UploadBatch{Module="Materials",FileName="materials-upload.csv",TotalRows=50,SuccessRows=47,ErrorRows=3}, new UploadBatch{Module="Users",FileName="users-upload.xlsx",TotalRows=20,SuccessRows=20,ErrorRows=0});
//        _db.IntegrationLogs.AddRange(new IntegrationLog{Direction="Inbound",Module="Material Sync",Status=IntegrationStatus.Success,Message="25 materials synced"}, new IntegrationLog{Direction="Outbound",Module="PR Posting",Status=IntegrationStatus.Failed,RetryCount=2,Message="Oracle endpoint timeout"});
//        _db.AuditLogs.AddRange(new AuditLog{Module="Auth",Action="Login",UserName="admin@alhattab.com",Details="Seed login audit"}, new AuditLog{Module="Purchase Request",Action="Submit",UserName="requester@alhattab.com",Details="Seed request submitted"});
//        await _db.SaveChangesAsync();
//    }
//}
