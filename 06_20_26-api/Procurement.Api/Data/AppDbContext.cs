using Microsoft.EntityFrameworkCore;
using Procurement.Api.Models;
using Procurement.Api.Models.PurchaseRequests;
using Procurement.Api.Models.System;
using Procurement.Api.Services.Integration;

namespace Procurement.Api.Data;

public class AppDbContext : DbContext
{

    public DbSet<OracleSourceMapping> OracleSourceMappings => Set<OracleSourceMapping>();
    public DbSet<ErpSyncWatermark> ErpSyncWatermarks => Set<ErpSyncWatermark>();
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    //public DbSet<CreateUserDto> CreateUserDto { get; set; }
    public DbSet<RunningSequence> RunningSequences { get; set; }

    public DbSet<Item> Items { get; set; }  
    public DbSet<ItemCompany> ItemCompanies { get; set; }
    public DbSet<ItemUnit> ItemUnits
    {
        get; set;
    }
    public DbSet<ItemSubGroup> ItemSubGroups { get; set; }

    public DbSet<Unit> Units { get; set; }
    public DbSet<ItemGroup> ItemGroups { get; set; }

    //public DbSet<MaterialRequest> MaterialRequests { get; set; }
    //public DbSet<MaterialRequestItem> MaterialRequestItems { get; set; }

    public DbSet<Holding> Holdings => Set<Holding>();
    public DbSet<Company> Companies => Set<Company>();
    public DbSet<Department> Departments => Set<Department>();
    public DbSet<BusinessVertical> BusinessVerticals => Set<BusinessVertical>();
    public DbSet<AppUser> Users => Set<AppUser>();
    public DbSet<Role> Roles => Set<Role>();
    public DbSet<Permission> Permissions => Set<Permission>();
    public DbSet<UserRole> UserRoles => Set<UserRole>();
    public DbSet<UserCompany> UserCompanies => Set<UserCompany>();
    public DbSet<UserDepartment> UserDepartments => Set<UserDepartment>();
    public DbSet<Material> Materials => Set<Material>();
    public DbSet<MaterialType> MaterialTypes => Set<MaterialType>();
    public DbSet<MaterialCategory> MaterialCategories => Set<MaterialCategory>();
    public DbSet<MaterialSubCategory> MaterialSubCategories => Set<MaterialSubCategory>();
    public DbSet<UnitOfMeasure> UnitOfMeasures => Set<UnitOfMeasure>();
    public DbSet<CostCenter> CostCenters => Set<CostCenter>();
    public DbSet<BudgetCenter> BudgetCenters => Set<BudgetCenter>();
    public DbSet<PurchaseRequest> PurchaseRequests => Set<PurchaseRequest>();
    public DbSet<PurchaseRequestItem> PurchaseRequestItems => Set<PurchaseRequestItem>();

    public DbSet<WorkflowDefinition> WorkflowDefinitions => Set<WorkflowDefinition>();
    public DbSet<WorkflowStep> WorkflowSteps => Set<WorkflowStep>();
    public DbSet<WorkflowCondition> WorkflowConditions => Set<WorkflowCondition>();
    public DbSet<ApprovalInstance> ApprovalInstances => Set<ApprovalInstance>();
    public DbSet<ApprovalAction> ApprovalActions => Set<ApprovalAction>();

   
    public DbSet<UploadBatch> UploadBatches => Set<UploadBatch>();
    public DbSet<UploadBatchItem> UploadBatchItems => Set<UploadBatchItem>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<IntegrationConfig> IntegrationConfigs => Set<IntegrationConfig>();
    public DbSet<IntegrationLog> IntegrationLogs => Set<IntegrationLog>();
    public DbSet<OraclePostingLog> OraclePostingLogs => Set<OraclePostingLog>();
    public DbSet<Attachment> Attachments => Set<Attachment>();
    public DbSet<Project> Projects { get; set; }
 
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<AppUser>().HasIndex(x => x.Email).IsUnique();
        modelBuilder.Entity<Material>().HasIndex(x => x.MaterialCode).IsUnique();
        modelBuilder.Entity<PurchaseRequest>().HasIndex(x => x.RequestNumber).IsUnique();
        modelBuilder.Ignore<CreateUserDto>();

        modelBuilder.Entity<ItemUnit>()
            .HasOne(iu => iu.Item)
            .WithMany(i => i.ItemUnits)
            .HasForeignKey(iu => iu.ItemId);

        modelBuilder.Entity<ItemUnit>()
            .HasOne(iu => iu.Unit)
            .WithMany(u => u.ItemUnits)
            .HasForeignKey(iu => iu.UnitId);
        modelBuilder.Entity<ApprovalAction>()
    .Ignore(x => x.UpdatedAt);

        modelBuilder.Entity<ApprovalAction>()
            .Ignore(e => e.ActionByUser);
        base.OnModelCreating(modelBuilder);
    }
}
