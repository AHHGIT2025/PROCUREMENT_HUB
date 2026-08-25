using Microsoft.EntityFrameworkCore;
using Procurement.Api.Models;
using Procurement.Api.Models.Categories;
using Procurement.Api.Models.PurchaseRequests;
using Procurement.Api.Models.System;
using Procurement.Api.Models.Menu;
using Procurement.Api.Models.InternationalPO;
using Procurement.Api.Services.Integration;
using System.Reflection.Emit;
 

namespace Procurement.Api.Data;

public class AppDbContext : DbContext
{
  
    public DbSet<OracleSourceMapping> OracleSourceMappings => Set<OracleSourceMapping>();
    public DbSet<ErpSyncWatermark> ErpSyncWatermarks => Set<ErpSyncWatermark>();
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    //public DbSet<CreateUserDto> CreateUserDto { get; set; }
    public DbSet<RunningSequence> RunningSequences { get; set; }
    public DbSet<ItemCategory> ItemCategories => Set<ItemCategory>();
    public DbSet<ItemGroupCategoryMap> ItemGroupCategoryMaps => Set<ItemGroupCategoryMap>();
    public DbSet<Item> Items { get; set; }  
    public DbSet<ItemCompany> ItemCompanies { get; set; }
    public DbSet<WorkflowDefinitionCompany> WorkflowDefinitionCompanies => Set<WorkflowDefinitionCompany>();
    public DbSet<ItemUnit> ItemUnits
    {
        get; set;
    }
   
    public DbSet<Supplier> Suppliers => Set<Supplier>();
    public DbSet<DeliveryLocation> DeliveryLocations => Set<DeliveryLocation>();
    public DbSet<InternationalPurchaseOrder> InternationalPurchaseOrders => Set<InternationalPurchaseOrder>();
    public DbSet<InternationalPOItem> InternationalPOItems => Set<InternationalPOItem>();
    public DbSet<InternationalPOItemQuote> InternationalPOItemQuotes => Set<InternationalPOItemQuote>();
    public DbSet<SupplierDocument> SupplierDocuments => Set<SupplierDocument>();
    public DbSet<ItemSubGroup> ItemSubGroups { get; set; }

    public DbSet<Unit> Units { get; set; }
    public DbSet<ItemGroup> ItemGroups { get; set; }
    public DbSet<Procurement.Api.Models.Rfq.Rfq> Rfqs => Set<Procurement.Api.Models.Rfq.Rfq>();
    public DbSet<Procurement.Api.Models.Rfq.RfqItem> RfqItems => Set<Procurement.Api.Models.Rfq.RfqItem>();
    public DbSet<Procurement.Api.Models.Rfq.RfqSupplier> RfqSuppliers => Set<Procurement.Api.Models.Rfq.RfqSupplier>();
    public DbSet<Procurement.Api.Models.Rfq.RfqQuotation> RfqQuotations => Set<Procurement.Api.Models.Rfq.RfqQuotation>();
    public DbSet<Procurement.Api.Models.Rfq.RfqQuotationItem> RfqQuotationItems => Set<Procurement.Api.Models.Rfq.RfqQuotationItem>();
    //public DbSet<MaterialRequest> MaterialRequests { get; set; }
    //public DbSet<MaterialRequestItem> MaterialRequestItems { get; set; }
    public DbSet<Procurement.Api.Models.Rfq.RfqAttachment> RfqAttachments => Set<Procurement.Api.Models.Rfq.RfqAttachment>();

    public DbSet<Holding> Holdings => Set<Holding>();
    public DbSet<Company> Companies => Set<Company>();
    public DbSet<Department> Departments => Set<Department>();
    public DbSet<BusinessVertical> BusinessVerticals => Set<BusinessVertical>();
    public DbSet<AppUser> Users => Set<AppUser>();
    public DbSet<Role> Roles => Set<Role>();

    public DbSet<MenuPermission> MenuPermissions { get; set; }
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
    public DbSet<SupplierExpenseType> SupplierExpenseTypes => Set<SupplierExpenseType>();
    public DbSet<InternationalPOExpense> InternationalPOExpenses => Set<InternationalPOExpense>();

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
   .Ignore(x => x.UpdatedAt);

        modelBuilder.Entity<ApprovalAction>()
            .Ignore(e => e.ActionByUser);

        // ── International PO relationships ───────────────────────────
        // EF Core's default convention expects the FK property on the
        // dependent side to be named "<PrincipalClassName>Id" (e.g.
        // "InternationalPurchaseOrderId"). Our actual column/property is
        // "InternationalPoId", which doesn't match that convention, so EF
        // was silently creating an extra shadow FK column
        // ("InternationalPurchaseOrderId") that doesn't exist in the DB —
        // causing "Invalid column name 'InternationalPurchaseOrderId'" on
        // save. These explicit mappings fix that.
        modelBuilder.Entity<Procurement.Api.Models.InternationalPO.InternationalPOItem>()
            .HasOne<Procurement.Api.Models.InternationalPO.InternationalPurchaseOrder>()
            .WithMany(p => p.Items)
            .HasForeignKey(i => i.InternationalPoId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Procurement.Api.Models.InternationalPO.InternationalPOItemQuote>()
            .HasOne<Procurement.Api.Models.InternationalPO.InternationalPurchaseOrder>()
            .WithMany(p => p.Quotes)
            .HasForeignKey(q => q.InternationalPoId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Procurement.Api.Models.InternationalPO.InternationalPOItemQuote>()
            .HasOne<Procurement.Api.Models.InternationalPO.InternationalPOItem>()
            .WithMany(i => i.Quotes)
            .HasForeignKey(q => q.InternationalPoItemId)
            .OnDelete(DeleteBehavior.Restrict);

        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<ItemGroupCategoryMap>(b =>
        {
            b.ToTable("ItemGroupCategoryMaps");
            b.HasKey(e => e.Id);
            b.Property(e => e.OracleGroupName).HasMaxLength(200).IsRequired();
            b.HasOne(e => e.Category)
         .WithMany(c => c.GroupMaps)
         .HasForeignKey(e => e.ItemCategoryId);
        });

        modelBuilder.Entity<Item>(b =>
        {
            // existing config stays, just add:
            b.HasOne(e => e.Category)
             .WithMany()
             .HasForeignKey(e => e.CategoryId)
             .IsRequired(false);
        });

        modelBuilder.Entity<ItemGroup>(b =>
        {
            b.HasOne(e => e.Category)
             .WithMany()
             .HasForeignKey(e => e.CategoryId)
             .IsRequired(false);
        });
    }
}
