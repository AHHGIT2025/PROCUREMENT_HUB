-- ============================================================================
-- MATERIAL & PURCHASE REQUEST MANAGEMENT SYSTEM
-- SQL Server Database Schema
-- Version: 1.0.0
-- Date: 2024
-- Description: Complete database schema for multi-company holding
--              material and purchase request management with Oracle integration
-- ============================================================================

-- ============================================================================
-- DATABASE CREATION
-- ============================================================================
USE [master]
GO

IF EXISTS (SELECT name FROM sys.databases WHERE name = N'MaterialRequestDB')
BEGIN
    ALTER DATABASE [MaterialRequestDB] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE [MaterialRequestDB];
END
GO

CREATE DATABASE [MaterialRequestDB]
GO

USE [MaterialRequestDB]
GO

-- ============================================================================
-- SCHEMA CREATION
-- ============================================================================
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = N'org')
    EXEC('CREATE SCHEMA [org]')
GO

IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = N'auth')
    EXEC('CREATE SCHEMA [auth]')
GO

IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = N'mat')
    EXEC('CREATE SCHEMA [mat]')
GO

IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = N'pr')
    EXEC('CREATE SCHEMA [pr]')
GO

IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = N'wf')
    EXEC('CREATE SCHEMA [wf]')
GO

IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = N'intg')
    EXEC('CREATE SCHEMA [intg]')
GO

IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = N'sys_admin')
    EXEC('CREATE SCHEMA [sys_admin]')
GO

-- ============================================================================
-- ORGANIZATION TABLES
-- ============================================================================

-- Holdings
CREATE TABLE [org].[Holdings] (
    [Id]            UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
    [Code]          NVARCHAR(20)     NOT NULL,
    [Name]          NVARCHAR(200)    NOT NULL,
    [NameAr]        NVARCHAR(200)    NULL,
    [Description]   NVARCHAR(MAX)    NULL,
    [LogoUrl]       NVARCHAR(500)    NULL,
    [IsActive]      BIT              NOT NULL DEFAULT 1,
    [CreatedAt]     DATETIME2(7)     NOT NULL DEFAULT SYSUTCDATETIME(),
    [UpdatedAt]     DATETIME2(7)     NOT NULL DEFAULT SYSUTCDATETIME(),
    [DeletedAt]     DATETIME2(7)     NULL,

    CONSTRAINT [PK_Holdings] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [UQ_Holdings_Code] UNIQUE ([Code])
)
GO

-- Companies
CREATE TABLE [org].[Companies] (
    [Id]                    UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
    [HoldingId]             UNIQUEIDENTIFIER NOT NULL,
    [Code]                  NVARCHAR(20)     NOT NULL,
    [Name]                  NVARCHAR(200)    NOT NULL,
    [NameAr]                NVARCHAR(200)    NULL,
    [Description]           NVARCHAR(MAX)    NULL,
    [LogoUrl]               NVARCHAR(500)    NULL,
    [IsOracleIntegrated]    BIT              NOT NULL DEFAULT 0,
    [CrossCompanyAccess]    BIT              NOT NULL DEFAULT 0,
    [OracleOrgId]           NVARCHAR(50)     NULL,
    [OracleOperatingUnit]   NVARCHAR(100)    NULL,
    [Currency]              NVARCHAR(10)     NOT NULL DEFAULT 'SAR',
    [Country]               NVARCHAR(5)      NOT NULL DEFAULT 'SA',
    [Timezone]              NVARCHAR(50)     NOT NULL DEFAULT 'Asia/Riyadh',
    [IsActive]              BIT              NOT NULL DEFAULT 1,
    [CreatedAt]             DATETIME2(7)     NOT NULL DEFAULT SYSUTCDATETIME(),
    [UpdatedAt]             DATETIME2(7)     NOT NULL DEFAULT SYSUTCDATETIME(),
    [DeletedAt]             DATETIME2(7)     NULL,

    CONSTRAINT [PK_Companies] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [UQ_Companies_Code] UNIQUE ([Code]),
    CONSTRAINT [FK_Companies_Holdings] FOREIGN KEY ([HoldingId]) REFERENCES [org].[Holdings]([Id])
)
GO

CREATE NONCLUSTERED INDEX [IX_Companies_HoldingId] ON [org].[Companies]([HoldingId])
GO
CREATE NONCLUSTERED INDEX [IX_Companies_IsOracleIntegrated] ON [org].[Companies]([IsOracleIntegrated])
GO
CREATE NONCLUSTERED INDEX [IX_Companies_IsActive] ON [org].[Companies]([IsActive])
GO

-- Departments
CREATE TABLE [org].[Departments] (
    [Id]            UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
    [CompanyId]     UNIQUEIDENTIFIER NOT NULL,
    [Code]          NVARCHAR(20)     NOT NULL,
    [Name]          NVARCHAR(200)    NOT NULL,
    [NameAr]        NVARCHAR(200)    NULL,
    [Description]   NVARCHAR(MAX)    NULL,
    [ParentId]      UNIQUEIDENTIFIER NULL,
    [ManagerId]     UNIQUEIDENTIFIER NULL,
    [IsActive]      BIT              NOT NULL DEFAULT 1,
    [CreatedAt]     DATETIME2(7)     NOT NULL DEFAULT SYSUTCDATETIME(),
    [UpdatedAt]     DATETIME2(7)     NOT NULL DEFAULT SYSUTCDATETIME(),
    [DeletedAt]     DATETIME2(7)     NULL,

    CONSTRAINT [PK_Departments] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [UQ_Departments_CompanyCode] UNIQUE ([CompanyId], [Code]),
    CONSTRAINT [FK_Departments_Companies] FOREIGN KEY ([CompanyId]) REFERENCES [org].[Companies]([Id]),
    CONSTRAINT [FK_Departments_Parent] FOREIGN KEY ([ParentId]) REFERENCES [org].[Departments]([Id])
)
GO

CREATE NONCLUSTERED INDEX [IX_Departments_CompanyId] ON [org].[Departments]([CompanyId])
GO
CREATE NONCLUSTERED INDEX [IX_Departments_ParentId] ON [org].[Departments]([ParentId])
GO

-- Business Verticals
CREATE TABLE [org].[BusinessVerticals] (
    [Id]            UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
    [HoldingId]     UNIQUEIDENTIFIER NOT NULL,
    [Code]          NVARCHAR(20)     NOT NULL,
    [Name]          NVARCHAR(200)    NOT NULL,
    [NameAr]        NVARCHAR(200)    NULL,
    [Description]   NVARCHAR(MAX)    NULL,
    [IsActive]      BIT              NOT NULL DEFAULT 1,
    [CreatedAt]     DATETIME2(7)     NOT NULL DEFAULT SYSUTCDATETIME(),
    [UpdatedAt]     DATETIME2(7)     NOT NULL DEFAULT SYSUTCDATETIME(),

    CONSTRAINT [PK_BusinessVerticals] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [UQ_BusinessVerticals_Code] UNIQUE ([Code]),
    CONSTRAINT [FK_BusinessVerticals_Holdings] FOREIGN KEY ([HoldingId]) REFERENCES [org].[Holdings]([Id])
)
GO

CREATE NONCLUSTERED INDEX [IX_BusinessVerticals_HoldingId] ON [org].[BusinessVerticals]([HoldingId])
GO

-- Cost Centers
CREATE TABLE [org].[CostCenters] (
    [Id]            UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
    [CompanyId]     UNIQUEIDENTIFIER NOT NULL,
    [DepartmentId]  UNIQUEIDENTIFIER NULL,
    [Code]          NVARCHAR(30)     NOT NULL,
    [Name]          NVARCHAR(200)    NOT NULL,
    [NameAr]        NVARCHAR(200)    NULL,
    [OracleCCId]    NVARCHAR(50)     NULL,
    [IsActive]      BIT              NOT NULL DEFAULT 1,
    [CreatedAt]     DATETIME2(7)     NOT NULL DEFAULT SYSUTCDATETIME(),
    [UpdatedAt]     DATETIME2(7)     NOT NULL DEFAULT SYSUTCDATETIME(),

    CONSTRAINT [PK_CostCenters] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [UQ_CostCenters_CompanyCode] UNIQUE ([CompanyId], [Code]),
    CONSTRAINT [FK_CostCenters_Companies] FOREIGN KEY ([CompanyId]) REFERENCES [org].[Companies]([Id]),
    CONSTRAINT [FK_CostCenters_Departments] FOREIGN KEY ([DepartmentId]) REFERENCES [org].[Departments]([Id])
)
GO

CREATE NONCLUSTERED INDEX [IX_CostCenters_CompanyId] ON [org].[CostCenters]([CompanyId])
GO

-- Budget Centers
CREATE TABLE [org].[BudgetCenters] (
    [Id]            UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
    [CompanyId]     UNIQUEIDENTIFIER NOT NULL,
    [Code]          NVARCHAR(30)     NOT NULL,
    [Name]          NVARCHAR(200)    NOT NULL,
    [FiscalYear]    INT              NOT NULL,
    [TotalBudget]   DECIMAL(18,4)    NOT NULL,
    [UsedBudget]    DECIMAL(18,4)    NOT NULL DEFAULT 0,
    [IsActive]      BIT              NOT NULL DEFAULT 1,
    [CreatedAt]     DATETIME2(7)     NOT NULL DEFAULT SYSUTCDATETIME(),
    [UpdatedAt]     DATETIME2(7)     NOT NULL DEFAULT SYSUTCDATETIME(),

    CONSTRAINT [PK_BudgetCenters] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [UQ_BudgetCenters_CompanyCodeYear] UNIQUE ([CompanyId], [Code], [FiscalYear]),
    CONSTRAINT [FK_BudgetCenters_Companies] FOREIGN KEY ([CompanyId]) REFERENCES [org].[Companies]([Id])
)
GO

CREATE NONCLUSTERED INDEX [IX_BudgetCenters_CompanyId] ON [org].[BudgetCenters]([CompanyId])
GO

-- ============================================================================
-- AUTHENTICATION & AUTHORIZATION TABLES
-- ============================================================================

-- Users
CREATE TABLE [auth].[Users] (
    [Id]            UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
    [EmployeeId]    NVARCHAR(50)     NULL,
    [Email]         NVARCHAR(255)    NOT NULL,
    [Username]      NVARCHAR(100)    NOT NULL,
    [PasswordHash]  NVARCHAR(255)    NOT NULL,
    [FirstName]     NVARCHAR(100)    NOT NULL,
    [LastName]      NVARCHAR(100)    NOT NULL,
    [FirstNameAr]   NVARCHAR(100)    NULL,
    [LastNameAr]    NVARCHAR(100)    NULL,
    [Phone]         NVARCHAR(20)     NULL,
    [AvatarUrl]     NVARCHAR(500)    NULL,
    [OracleUserId]  NVARCHAR(50)     NULL,
    [IsActive]      BIT              NOT NULL DEFAULT 1,
    [LastLoginAt]   DATETIME2(7)     NULL,
    [CreatedAt]     DATETIME2(7)     NOT NULL DEFAULT SYSUTCDATETIME(),
    [UpdatedAt]     DATETIME2(7)     NOT NULL DEFAULT SYSUTCDATETIME(),
    [DeletedAt]     DATETIME2(7)     NULL,

    CONSTRAINT [PK_Users] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [UQ_Users_Email] UNIQUE ([Email]),
    CONSTRAINT [UQ_Users_Username] UNIQUE ([Username]),
    CONSTRAINT [UQ_Users_EmployeeId] UNIQUE ([EmployeeId])
)
GO

CREATE NONCLUSTERED INDEX [IX_Users_Email] ON [auth].[Users]([Email])
GO
CREATE NONCLUSTERED INDEX [IX_Users_Username] ON [auth].[Users]([Username])
GO
CREATE NONCLUSTERED INDEX [IX_Users_IsActive] ON [auth].[Users]([IsActive])
GO

-- Add FK for Department Manager (deferred due to circular dependency)
ALTER TABLE [org].[Departments]
    ADD CONSTRAINT [FK_Departments_Manager] FOREIGN KEY ([ManagerId]) REFERENCES [auth].[Users]([Id])
GO

-- Roles
CREATE TABLE [auth].[Roles] (
    [Id]            UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
    [Code]          NVARCHAR(50)     NOT NULL,
    [Name]          NVARCHAR(200)    NOT NULL,
    [NameAr]        NVARCHAR(200)    NULL,
    [Description]   NVARCHAR(MAX)    NULL,
    [IsSystem]      BIT              NOT NULL DEFAULT 0,
    [IsActive]      BIT              NOT NULL DEFAULT 1,
    [CreatedAt]     DATETIME2(7)     NOT NULL DEFAULT SYSUTCDATETIME(),
    [UpdatedAt]     DATETIME2(7)     NOT NULL DEFAULT SYSUTCDATETIME(),

    CONSTRAINT [PK_Roles] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [UQ_Roles_Code] UNIQUE ([Code])
)
GO

-- Permissions
CREATE TABLE [auth].[Permissions] (
    [Id]            UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
    [Code]          NVARCHAR(100)    NOT NULL,
    [Name]          NVARCHAR(200)    NOT NULL,
    [Description]   NVARCHAR(MAX)    NULL,
    [Module]        NVARCHAR(50)     NOT NULL,
    [CreatedAt]     DATETIME2(7)     NOT NULL DEFAULT SYSUTCDATETIME(),

    CONSTRAINT [PK_Permissions] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [UQ_Permissions_Code] UNIQUE ([Code])
)
GO

CREATE NONCLUSTERED INDEX [IX_Permissions_Module] ON [auth].[Permissions]([Module])
GO

-- Role Permissions
CREATE TABLE [auth].[RolePermissions] (
    [Id]            UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
    [RoleId]        UNIQUEIDENTIFIER NOT NULL,
    [PermissionId]  UNIQUEIDENTIFIER NOT NULL,
    [CreatedAt]     DATETIME2(7)     NOT NULL DEFAULT SYSUTCDATETIME(),

    CONSTRAINT [PK_RolePermissions] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [UQ_RolePermissions_RolePerm] UNIQUE ([RoleId], [PermissionId]),
    CONSTRAINT [FK_RolePermissions_Roles] FOREIGN KEY ([RoleId]) REFERENCES [auth].[Roles]([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_RolePermissions_Permissions] FOREIGN KEY ([PermissionId]) REFERENCES [auth].[Permissions]([Id]) ON DELETE CASCADE
)
GO

-- User Companies (User-Company-Role junction)
CREATE TABLE [auth].[UserCompanies] (
    [Id]            UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
    [UserId]        UNIQUEIDENTIFIER NOT NULL,
    [CompanyId]     UNIQUEIDENTIFIER NOT NULL,
    [RoleId]        UNIQUEIDENTIFIER NOT NULL,
    [IsPrimary]     BIT              NOT NULL DEFAULT 0,
    [IsActive]      BIT              NOT NULL DEFAULT 1,
    [CreatedAt]     DATETIME2(7)     NOT NULL DEFAULT SYSUTCDATETIME(),
    [UpdatedAt]     DATETIME2(7)     NOT NULL DEFAULT SYSUTCDATETIME(),
    [DeletedAt]     DATETIME2(7)     NULL,

    CONSTRAINT [PK_UserCompanies] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [UQ_UserCompanies_UserCompanyRole] UNIQUE ([UserId], [CompanyId], [RoleId]),
    CONSTRAINT [FK_UserCompanies_Users] FOREIGN KEY ([UserId]) REFERENCES [auth].[Users]([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_UserCompanies_Companies] FOREIGN KEY ([CompanyId]) REFERENCES [org].[Companies]([Id]),
    CONSTRAINT [FK_UserCompanies_Roles] FOREIGN KEY ([RoleId]) REFERENCES [auth].[Roles]([Id])
)
GO

CREATE NONCLUSTERED INDEX [IX_UserCompanies_UserId] ON [auth].[UserCompanies]([UserId])
GO
CREATE NONCLUSTERED INDEX [IX_UserCompanies_CompanyId] ON [auth].[UserCompanies]([CompanyId])
GO

-- User Departments
CREATE TABLE [auth].[UserDepartments] (
    [Id]            UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
    [UserId]        UNIQUEIDENTIFIER NOT NULL,
    [DepartmentId]  UNIQUEIDENTIFIER NOT NULL,
    [IsPrimary]     BIT              NOT NULL DEFAULT 0,
    [IsActive]      BIT              NOT NULL DEFAULT 1,
    [CreatedAt]     DATETIME2(7)     NOT NULL DEFAULT SYSUTCDATETIME(),
    [UpdatedAt]     DATETIME2(7)     NOT NULL DEFAULT SYSUTCDATETIME(),

    CONSTRAINT [PK_UserDepartments] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [UQ_UserDepartments_UserDept] UNIQUE ([UserId], [DepartmentId]),
    CONSTRAINT [FK_UserDepartments_Users] FOREIGN KEY ([UserId]) REFERENCES [auth].[Users]([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_UserDepartments_Departments] FOREIGN KEY ([DepartmentId]) REFERENCES [org].[Departments]([Id])
)
GO

CREATE NONCLUSTERED INDEX [IX_UserDepartments_UserId] ON [auth].[UserDepartments]([UserId])
GO
CREATE NONCLUSTERED INDEX [IX_UserDepartments_DepartmentId] ON [auth].[UserDepartments]([DepartmentId])
GO

-- ============================================================================
-- MATERIAL TABLES
-- ============================================================================

-- Material Categories
CREATE TABLE [mat].[MaterialCategories] (
    [Id]            UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
    [Code]          NVARCHAR(20)     NOT NULL,
    [Name]          NVARCHAR(200)    NOT NULL,
    [NameAr]        NVARCHAR(200)    NULL,
    [Description]   NVARCHAR(MAX)    NULL,
    [IsActive]      BIT              NOT NULL DEFAULT 1,
    [CreatedAt]     DATETIME2(7)     NOT NULL DEFAULT SYSUTCDATETIME(),
    [UpdatedAt]     DATETIME2(7)     NOT NULL DEFAULT SYSUTCDATETIME(),

    CONSTRAINT [PK_MaterialCategories] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [UQ_MaterialCategories_Code] UNIQUE ([Code])
)
GO

-- Material Subcategories
CREATE TABLE [mat].[MaterialSubcategories] (
    [Id]            UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
    [CategoryId]    UNIQUEIDENTIFIER NOT NULL,
    [Code]          NVARCHAR(20)     NOT NULL,
    [Name]          NVARCHAR(200)    NOT NULL,
    [NameAr]        NVARCHAR(200)    NULL,
    [IsActive]      BIT              NOT NULL DEFAULT 1,
    [CreatedAt]     DATETIME2(7)     NOT NULL DEFAULT SYSUTCDATETIME(),
    [UpdatedAt]     DATETIME2(7)     NOT NULL DEFAULT SYSUTCDATETIME(),

    CONSTRAINT [PK_MaterialSubcategories] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [UQ_MaterialSubcategories_CatCode] UNIQUE ([CategoryId], [Code]),
    CONSTRAINT [FK_MaterialSubcategories_Categories] FOREIGN KEY ([CategoryId]) REFERENCES [mat].[MaterialCategories]([Id])
)
GO

-- Material Types
CREATE TABLE [mat].[MaterialTypes] (
    [Id]            UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
    [Code]          NVARCHAR(20)     NOT NULL,
    [Name]          NVARCHAR(200)    NOT NULL,
    [NameAr]        NVARCHAR(200)    NULL,
    [Description]   NVARCHAR(MAX)    NULL,
    [IsActive]      BIT              NOT NULL DEFAULT 1,
    [CreatedAt]     DATETIME2(7)     NOT NULL DEFAULT SYSUTCDATETIME(),
    [UpdatedAt]     DATETIME2(7)     NOT NULL DEFAULT SYSUTCDATETIME(),

    CONSTRAINT [PK_MaterialTypes] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [UQ_MaterialTypes_Code] UNIQUE ([Code])
)
GO

-- Units of Measure
CREATE TABLE [mat].[UnitsOfMeasure] (
    [Id]            UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
    [Code]          NVARCHAR(20)     NOT NULL,
    [Name]          NVARCHAR(100)    NOT NULL,
    [NameAr]        NVARCHAR(100)    NULL,
    [Abbreviation]  NVARCHAR(10)     NOT NULL,
    [IsActive]      BIT              NOT NULL DEFAULT 1,
    [CreatedAt]     DATETIME2(7)     NOT NULL DEFAULT SYSUTCDATETIME(),
    [UpdatedAt]     DATETIME2(7)     NOT NULL DEFAULT SYSUTCDATETIME(),

    CONSTRAINT [PK_UnitsOfMeasure] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [UQ_UnitsOfMeasure_Code] UNIQUE ([Code])
)
GO

-- Materials
CREATE TABLE [mat].[Materials] (
    [Id]                    UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
    [MaterialCode]          NVARCHAR(50)     NOT NULL,
    [Name]                  NVARCHAR(300)    NOT NULL,
    [NameAr]                NVARCHAR(300)    NULL,
    [Description]           NVARCHAR(MAX)    NULL,
    [Source]                NVARCHAR(20)     NOT NULL,  -- ORACLE, MANUAL
    [Status]                NVARCHAR(30)     NOT NULL DEFAULT 'DRAFT', -- DRAFT, PENDING_APPROVAL, APPROVED, REJECTED, ACTIVE, INACTIVE, DEPRECATED
    [CategoryId]            UNIQUEIDENTIFIER NULL,
    [SubcategoryId]         UNIQUEIDENTIFIER NULL,
    [MaterialTypeId]        UNIQUEIDENTIFIER NULL,
    [UnitOfMeasureId]       UNIQUEIDENTIFIER NULL,
    [OwningCompanyId]       UNIQUEIDENTIFIER NULL,
    [Specifications]        NVARCHAR(MAX)    NULL,  -- JSON

    -- Oracle-specific fields
    [OracleMaterialCode]    NVARCHAR(50)     NULL,
    [OracleItemId]          NVARCHAR(50)     NULL,
    [OracleOrgId]           NVARCHAR(50)     NULL,
    [SourceSystem]          NVARCHAR(50)     NULL,
    [LastSyncDate]          DATETIME2(7)     NULL,
    [SyncStatus]            NVARCHAR(20)     NOT NULL DEFAULT 'NOT_APPLICABLE', -- SYNCED, PENDING, FAILED, OUT_OF_SYNC, NOT_APPLICABLE

    -- Manual material fields
    [ApprovalStatus]        NVARCHAR(30)     NULL,
    [ApprovedBy]            UNIQUEIDENTIFIER NULL,
    [ApprovedAt]            DATETIME2(7)     NULL,

    -- Common fields
    [StandardPrice]         DECIMAL(18,4)    NULL,
    [Currency]              NVARCHAR(10)     NULL,
    [LeadTimeDays]          INT              NULL,
    [MinimumOrderQty]       DECIMAL(18,4)    NULL,
    [IsActive]              BIT              NOT NULL DEFAULT 1,
    [CreatedAt]             DATETIME2(7)     NOT NULL DEFAULT SYSUTCDATETIME(),
    [UpdatedAt]             DATETIME2(7)     NOT NULL DEFAULT SYSUTCDATETIME(),
    [DeletedAt]             DATETIME2(7)     NULL,

    CONSTRAINT [PK_Materials] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [UQ_Materials_MaterialCode] UNIQUE ([MaterialCode]),
    CONSTRAINT [FK_Materials_Categories] FOREIGN KEY ([CategoryId]) REFERENCES [mat].[MaterialCategories]([Id]),
    CONSTRAINT [FK_Materials_Subcategories] FOREIGN KEY ([SubcategoryId]) REFERENCES [mat].[MaterialSubcategories]([Id]),
    CONSTRAINT [FK_Materials_Types] FOREIGN KEY ([MaterialTypeId]) REFERENCES [mat].[MaterialTypes]([Id]),
    CONSTRAINT [FK_Materials_UOM] FOREIGN KEY ([UnitOfMeasureId]) REFERENCES [mat].[UnitsOfMeasure]([Id]),
    CONSTRAINT [FK_Materials_Companies] FOREIGN KEY ([OwningCompanyId]) REFERENCES [org].[Companies]([Id]),
    CONSTRAINT [FK_Materials_ApprovedBy] FOREIGN KEY ([ApprovedBy]) REFERENCES [auth].[Users]([Id]),
    CONSTRAINT [CK_Materials_Source] CHECK ([Source] IN ('ORACLE', 'MANUAL')),
    CONSTRAINT [CK_Materials_Status] CHECK ([Status] IN ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'ACTIVE', 'INACTIVE', 'DEPRECATED')),
    CONSTRAINT [CK_Materials_SyncStatus] CHECK ([SyncStatus] IN ('SYNCED', 'PENDING', 'FAILED', 'OUT_OF_SYNC', 'NOT_APPLICABLE'))
)
GO

CREATE NONCLUSTERED INDEX [IX_Materials_Source] ON [mat].[Materials]([Source])
GO
CREATE NONCLUSTERED INDEX [IX_Materials_Status] ON [mat].[Materials]([Status])
GO
CREATE NONCLUSTERED INDEX [IX_Materials_CategoryId] ON [mat].[Materials]([CategoryId])
GO
CREATE NONCLUSTERED INDEX [IX_Materials_MaterialTypeId] ON [mat].[Materials]([MaterialTypeId])
GO
CREATE NONCLUSTERED INDEX [IX_Materials_OwningCompanyId] ON [mat].[Materials]([OwningCompanyId])
GO
CREATE NONCLUSTERED INDEX [IX_Materials_OracleMaterialCode] ON [mat].[Materials]([OracleMaterialCode]) WHERE [OracleMaterialCode] IS NOT NULL
GO
CREATE NONCLUSTERED INDEX [IX_Materials_SyncStatus] ON [mat].[Materials]([SyncStatus])
GO
CREATE NONCLUSTERED INDEX [IX_Materials_Name] ON [mat].[Materials]([Name])
GO
CREATE NONCLUSTERED INDEX [IX_Materials_IsActive] ON [mat].[Materials]([IsActive])
GO

-- ============================================================================
-- PURCHASE REQUEST TABLES
-- ============================================================================

-- Purchase Requests
CREATE TABLE [pr].[PurchaseRequests] (
    [Id]                    UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
    [RequestNumber]         NVARCHAR(50)     NOT NULL,
    [CompanyId]             UNIQUEIDENTIFIER NOT NULL,
    [DepartmentId]          UNIQUEIDENTIFIER NOT NULL,
    [RequesterId]           UNIQUEIDENTIFIER NOT NULL,
    [BusinessVerticalId]    UNIQUEIDENTIFIER NULL,
    [CostCenterId]          UNIQUEIDENTIFIER NULL,
    [BudgetCenterId]        UNIQUEIDENTIFIER NULL,
    [Title]                 NVARCHAR(300)    NOT NULL,
    [Description]           NVARCHAR(MAX)    NULL,
    [Justification]         NVARCHAR(MAX)    NULL,
    [Status]                NVARCHAR(30)     NOT NULL DEFAULT 'DRAFT',
    [UrgencyLevel]          NVARCHAR(20)     NOT NULL DEFAULT 'MEDIUM',
    [TotalEstimatedValue]   DECIMAL(18,4)    NULL,
    [Currency]              NVARCHAR(10)     NOT NULL DEFAULT 'SAR',
    [RequiredDate]          DATETIME2(7)     NULL,

    -- Oracle posting fields
    [OraclePrNumber]        NVARCHAR(50)     NULL,
    [OracleReqHeaderId]     NVARCHAR(50)     NULL,
    [PostedToOracleAt]      DATETIME2(7)     NULL,
    [OraclePostingStatus]   NVARCHAR(20)     NULL,

    [SubmittedAt]           DATETIME2(7)     NULL,
    [ApprovedAt]            DATETIME2(7)     NULL,
    [RejectedAt]            DATETIME2(7)     NULL,
    [CreatedAt]             DATETIME2(7)     NOT NULL DEFAULT SYSUTCDATETIME(),
    [UpdatedAt]             DATETIME2(7)     NOT NULL DEFAULT SYSUTCDATETIME(),
    [DeletedAt]             DATETIME2(7)     NULL,

    CONSTRAINT [PK_PurchaseRequests] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [UQ_PurchaseRequests_RequestNumber] UNIQUE ([RequestNumber]),
    CONSTRAINT [FK_PurchaseRequests_Companies] FOREIGN KEY ([CompanyId]) REFERENCES [org].[Companies]([Id]),
    CONSTRAINT [FK_PurchaseRequests_Departments] FOREIGN KEY ([DepartmentId]) REFERENCES [org].[Departments]([Id]),
    CONSTRAINT [FK_PurchaseRequests_Users] FOREIGN KEY ([RequesterId]) REFERENCES [auth].[Users]([Id]),
    CONSTRAINT [FK_PurchaseRequests_Verticals] FOREIGN KEY ([BusinessVerticalId]) REFERENCES [org].[BusinessVerticals]([Id]),
    CONSTRAINT [FK_PurchaseRequests_CostCenters] FOREIGN KEY ([CostCenterId]) REFERENCES [org].[CostCenters]([Id]),
    CONSTRAINT [FK_PurchaseRequests_BudgetCenters] FOREIGN KEY ([BudgetCenterId]) REFERENCES [org].[BudgetCenters]([Id]),
    CONSTRAINT [CK_PurchaseRequests_Status] CHECK ([Status] IN ('DRAFT', 'SUBMITTED', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'RETURNED', 'POSTED_TO_ORACLE', 'ORACLE_POSTING_FAILED', 'LOCALLY_APPROVED', 'CANCELLED')),
    CONSTRAINT [CK_PurchaseRequests_Urgency] CHECK ([UrgencyLevel] IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'EMERGENCY')),
    CONSTRAINT [CK_PurchaseRequests_PostingStatus] CHECK ([OraclePostingStatus] IS NULL OR [OraclePostingStatus] IN ('SUCCESS', 'FAILED', 'PENDING', 'IN_PROGRESS', 'RETRYING'))
)
GO

CREATE NONCLUSTERED INDEX [IX_PurchaseRequests_CompanyId] ON [pr].[PurchaseRequests]([CompanyId])
GO
CREATE NONCLUSTERED INDEX [IX_PurchaseRequests_DepartmentId] ON [pr].[PurchaseRequests]([DepartmentId])
GO
CREATE NONCLUSTERED INDEX [IX_PurchaseRequests_RequesterId] ON [pr].[PurchaseRequests]([RequesterId])
GO
CREATE NONCLUSTERED INDEX [IX_PurchaseRequests_Status] ON [pr].[PurchaseRequests]([Status])
GO
CREATE NONCLUSTERED INDEX [IX_PurchaseRequests_UrgencyLevel] ON [pr].[PurchaseRequests]([UrgencyLevel])
GO
CREATE NONCLUSTERED INDEX [IX_PurchaseRequests_CreatedAt] ON [pr].[PurchaseRequests]([CreatedAt] DESC)
GO
CREATE NONCLUSTERED INDEX [IX_PurchaseRequests_RequestNumber] ON [pr].[PurchaseRequests]([RequestNumber])
GO

-- Purchase Request Items
CREATE TABLE [pr].[PurchaseRequestItems] (
    [Id]                UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
    [PurchaseRequestId] UNIQUEIDENTIFIER NOT NULL,
    [MaterialId]        UNIQUEIDENTIFIER NOT NULL,
    [LineNumber]        INT              NOT NULL,
    [Description]       NVARCHAR(MAX)    NULL,
    [Quantity]          DECIMAL(18,4)    NOT NULL,
    [UnitOfMeasureId]   UNIQUEIDENTIFIER NOT NULL,
    [EstimatedPrice]    DECIMAL(18,4)    NULL,
    [TotalPrice]        DECIMAL(18,4)    NULL,
    [Currency]          NVARCHAR(10)     NOT NULL DEFAULT 'SAR',
    [CostCenterId]      UNIQUEIDENTIFIER NULL,
    [DeliverToLocation] NVARCHAR(200)    NULL,
    [RequiredDate]      DATETIME2(7)     NULL,
    [Notes]             NVARCHAR(MAX)    NULL,
    [OracleLineId]      NVARCHAR(50)     NULL,
    [CreatedAt]         DATETIME2(7)     NOT NULL DEFAULT SYSUTCDATETIME(),
    [UpdatedAt]         DATETIME2(7)     NOT NULL DEFAULT SYSUTCDATETIME(),

    CONSTRAINT [PK_PurchaseRequestItems] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [UQ_PurchaseRequestItems_PRLine] UNIQUE ([PurchaseRequestId], [LineNumber]),
    CONSTRAINT [FK_PurchaseRequestItems_PR] FOREIGN KEY ([PurchaseRequestId]) REFERENCES [pr].[PurchaseRequests]([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_PurchaseRequestItems_Materials] FOREIGN KEY ([MaterialId]) REFERENCES [mat].[Materials]([Id]),
    CONSTRAINT [FK_PurchaseRequestItems_UOM] FOREIGN KEY ([UnitOfMeasureId]) REFERENCES [mat].[UnitsOfMeasure]([Id]),
    CONSTRAINT [FK_PurchaseRequestItems_CostCenters] FOREIGN KEY ([CostCenterId]) REFERENCES [org].[CostCenters]([Id])
)
GO

CREATE NONCLUSTERED INDEX [IX_PurchaseRequestItems_PRId] ON [pr].[PurchaseRequestItems]([PurchaseRequestId])
GO
CREATE NONCLUSTERED INDEX [IX_PurchaseRequestItems_MaterialId] ON [pr].[PurchaseRequestItems]([MaterialId])
GO

-- ============================================================================
-- WORKFLOW TABLES
-- ============================================================================

-- Workflow Definitions
CREATE TABLE [wf].[WorkflowDefinitions] (
    [Id]            UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
    [CompanyId]     UNIQUEIDENTIFIER NULL,
    [Code]          NVARCHAR(50)     NOT NULL,
    [Name]          NVARCHAR(200)    NOT NULL,
    [NameAr]        NVARCHAR(200)    NULL,
    [Description]   NVARCHAR(MAX)    NULL,
    [EntityType]    NVARCHAR(50)     NOT NULL, -- PURCHASE_REQUEST, MATERIAL
    [Version]       INT              NOT NULL DEFAULT 1,
    [IsActive]      BIT              NOT NULL DEFAULT 1,
    [IsDefault]     BIT              NOT NULL DEFAULT 0,
    [Priority]      INT              NOT NULL DEFAULT 0,
    [CreatedAt]     DATETIME2(7)     NOT NULL DEFAULT SYSUTCDATETIME(),
    [UpdatedAt]     DATETIME2(7)     NOT NULL DEFAULT SYSUTCDATETIME(),
    [DeletedAt]     DATETIME2(7)     NULL,

    CONSTRAINT [PK_WorkflowDefinitions] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [UQ_WorkflowDefinitions_Code] UNIQUE ([Code]),
    CONSTRAINT [FK_WorkflowDefinitions_Companies] FOREIGN KEY ([CompanyId]) REFERENCES [org].[Companies]([Id])
)
GO

CREATE NONCLUSTERED INDEX [IX_WorkflowDefinitions_CompanyId] ON [wf].[WorkflowDefinitions]([CompanyId])
GO
CREATE NONCLUSTERED INDEX [IX_WorkflowDefinitions_EntityType] ON [wf].[WorkflowDefinitions]([EntityType])
GO
CREATE NONCLUSTERED INDEX [IX_WorkflowDefinitions_IsActive] ON [wf].[WorkflowDefinitions]([IsActive])
GO

-- Workflow Steps
CREATE TABLE [wf].[WorkflowSteps] (
    [Id]                    UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
    [WorkflowDefinitionId]  UNIQUEIDENTIFIER NOT NULL,
    [StepOrder]             INT              NOT NULL,
    [Name]                  NVARCHAR(200)    NOT NULL,
    [Description]           NVARCHAR(MAX)    NULL,
    [StepType]              NVARCHAR(30)     NOT NULL, -- SEQUENTIAL, PARALLEL, CONDITIONAL, NOTIFICATION_ONLY
    [ApproverRoleId]        UNIQUEIDENTIFIER NULL,
    [ApproverUserId]        UNIQUEIDENTIFIER NULL,
    [ApproverType]          NVARCHAR(50)     NULL, -- ROLE, USER, DEPARTMENT_MANAGER, DYNAMIC
    [TimeoutHours]          INT              NULL,
    [IsRequired]            BIT              NOT NULL DEFAULT 1,
    [CanDelegate]           BIT              NOT NULL DEFAULT 1,
    [CanEscalate]           BIT              NOT NULL DEFAULT 1,
    [ParallelGroupId]       NVARCHAR(50)     NULL,
    [ParallelApprovalType]  NVARCHAR(20)     NULL, -- ALL, ANY, MAJORITY
    [CreatedAt]             DATETIME2(7)     NOT NULL DEFAULT SYSUTCDATETIME(),
    [UpdatedAt]             DATETIME2(7)     NOT NULL DEFAULT SYSUTCDATETIME(),

    CONSTRAINT [PK_WorkflowSteps] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [FK_WorkflowSteps_Definitions] FOREIGN KEY ([WorkflowDefinitionId]) REFERENCES [wf].[WorkflowDefinitions]([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_WorkflowSteps_Roles] FOREIGN KEY ([ApproverRoleId]) REFERENCES [auth].[Roles]([Id]),
    CONSTRAINT [FK_WorkflowSteps_Users] FOREIGN KEY ([ApproverUserId]) REFERENCES [auth].[Users]([Id]),
    CONSTRAINT [CK_WorkflowSteps_StepType] CHECK ([StepType] IN ('SEQUENTIAL', 'PARALLEL', 'CONDITIONAL', 'NOTIFICATION_ONLY'))
)
GO

CREATE NONCLUSTERED INDEX [IX_WorkflowSteps_DefinitionId] ON [wf].[WorkflowSteps]([WorkflowDefinitionId])
GO

-- Workflow Conditions
CREATE TABLE [wf].[WorkflowConditions] (
    [Id]                    UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
    [WorkflowDefinitionId]  UNIQUEIDENTIFIER NOT NULL,
    [Field]                 NVARCHAR(100)    NOT NULL,
    [Operator]              NVARCHAR(20)     NOT NULL, -- EQUALS, NOT_EQUALS, GREATER_THAN, LESS_THAN, IN, BETWEEN
    [Value]                 NVARCHAR(500)    NOT NULL,
    [ValueType]             NVARCHAR(20)     NOT NULL, -- STRING, NUMBER, ARRAY, BOOLEAN
    [MaterialTypeId]        UNIQUEIDENTIFIER NULL,
    [CostCenterId]          UNIQUEIDENTIFIER NULL,
    [BusinessVerticalId]    UNIQUEIDENTIFIER NULL,
    [CreatedAt]             DATETIME2(7)     NOT NULL DEFAULT SYSUTCDATETIME(),

    CONSTRAINT [PK_WorkflowConditions] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [FK_WorkflowConditions_Definitions] FOREIGN KEY ([WorkflowDefinitionId]) REFERENCES [wf].[WorkflowDefinitions]([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_WorkflowConditions_MaterialTypes] FOREIGN KEY ([MaterialTypeId]) REFERENCES [mat].[MaterialTypes]([Id]),
    CONSTRAINT [FK_WorkflowConditions_CostCenters] FOREIGN KEY ([CostCenterId]) REFERENCES [org].[CostCenters]([Id]),
    CONSTRAINT [FK_WorkflowConditions_Verticals] FOREIGN KEY ([BusinessVerticalId]) REFERENCES [org].[BusinessVerticals]([Id])
)
GO

CREATE NONCLUSTERED INDEX [IX_WorkflowConditions_DefinitionId] ON [wf].[WorkflowConditions]([WorkflowDefinitionId])
GO

-- Approval Instances
CREATE TABLE [wf].[ApprovalInstances] (
    [Id]                    UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
    [PurchaseRequestId]     UNIQUEIDENTIFIER NULL,
    [EntityType]            NVARCHAR(50)     NOT NULL, -- PURCHASE_REQUEST, MATERIAL
    [EntityId]              UNIQUEIDENTIFIER NOT NULL,
    [WorkflowDefinitionId]  UNIQUEIDENTIFIER NOT NULL,
    [WorkflowStepId]        UNIQUEIDENTIFIER NOT NULL,
    [AssignedToId]          UNIQUEIDENTIFIER NOT NULL,
    [Status]                NVARCHAR(20)     NOT NULL DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED, RETURNED, ESCALATED, DELEGATED, SKIPPED, TIMED_OUT
    [StepOrder]             INT              NOT NULL,
    [DueDate]               DATETIME2(7)     NULL,
    [CompletedAt]           DATETIME2(7)     NULL,
    [CreatedAt]             DATETIME2(7)     NOT NULL DEFAULT SYSUTCDATETIME(),
    [UpdatedAt]             DATETIME2(7)     NOT NULL DEFAULT SYSUTCDATETIME(),

    CONSTRAINT [PK_ApprovalInstances] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [FK_ApprovalInstances_PR] FOREIGN KEY ([PurchaseRequestId]) REFERENCES [pr].[PurchaseRequests]([Id]),
    CONSTRAINT [FK_ApprovalInstances_Definitions] FOREIGN KEY ([WorkflowDefinitionId]) REFERENCES [wf].[WorkflowDefinitions]([Id]),
    CONSTRAINT [FK_ApprovalInstances_Steps] FOREIGN KEY ([WorkflowStepId]) REFERENCES [wf].[WorkflowSteps]([Id]),
    CONSTRAINT [FK_ApprovalInstances_Users] FOREIGN KEY ([AssignedToId]) REFERENCES [auth].[Users]([Id]),
    CONSTRAINT [CK_ApprovalInstances_Status] CHECK ([Status] IN ('PENDING', 'APPROVED', 'REJECTED', 'RETURNED', 'ESCALATED', 'DELEGATED', 'SKIPPED', 'TIMED_OUT'))
)
GO

CREATE NONCLUSTERED INDEX [IX_ApprovalInstances_PRId] ON [wf].[ApprovalInstances]([PurchaseRequestId])
GO
CREATE NONCLUSTERED INDEX [IX_ApprovalInstances_EntityTypeId] ON [wf].[ApprovalInstances]([EntityType], [EntityId])
GO
CREATE NONCLUSTERED INDEX [IX_ApprovalInstances_AssignedToId] ON [wf].[ApprovalInstances]([AssignedToId])
GO
CREATE NONCLUSTERED INDEX [IX_ApprovalInstances_Status] ON [wf].[ApprovalInstances]([Status])
GO
CREATE NONCLUSTERED INDEX [IX_ApprovalInstances_DueDate] ON [wf].[ApprovalInstances]([DueDate]) WHERE [DueDate] IS NOT NULL
GO

-- Approval Actions
CREATE TABLE [wf].[ApprovalActions] (
    [Id]                    UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
    [ApprovalInstanceId]    UNIQUEIDENTIFIER NOT NULL,
    [ActionBy]              UNIQUEIDENTIFIER NOT NULL,
    [ActionType]            NVARCHAR(20)     NOT NULL, -- APPROVE, REJECT, RETURN, DELEGATE, ESCALATE, COMMENT, RECALL
    [Comments]              NVARCHAR(MAX)    NULL,
    [DelegatedToId]         UNIQUEIDENTIFIER NULL,
    [Metadata]              NVARCHAR(MAX)    NULL, -- JSON
    [CreatedAt]             DATETIME2(7)     NOT NULL DEFAULT SYSUTCDATETIME(),

    CONSTRAINT [PK_ApprovalActions] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [FK_ApprovalActions_Instances] FOREIGN KEY ([ApprovalInstanceId]) REFERENCES [wf].[ApprovalInstances]([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_ApprovalActions_Users] FOREIGN KEY ([ActionBy]) REFERENCES [auth].[Users]([Id]),
    CONSTRAINT [CK_ApprovalActions_Type] CHECK ([ActionType] IN ('APPROVE', 'REJECT', 'RETURN', 'DELEGATE', 'ESCALATE', 'COMMENT', 'RECALL'))
)
GO

CREATE NONCLUSTERED INDEX [IX_ApprovalActions_InstanceId] ON [wf].[ApprovalActions]([ApprovalInstanceId])
GO
CREATE NONCLUSTERED INDEX [IX_ApprovalActions_ActionBy] ON [wf].[ApprovalActions]([ActionBy])
GO
CREATE NONCLUSTERED INDEX [IX_ApprovalActions_CreatedAt] ON [wf].[ApprovalActions]([CreatedAt] DESC)
GO

-- Delegations
CREATE TABLE [wf].[Delegations] (
    [Id]            UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
    [DelegatorId]   UNIQUEIDENTIFIER NOT NULL,
    [DelegateId]    UNIQUEIDENTIFIER NOT NULL,
    [Reason]        NVARCHAR(MAX)    NULL,
    [StartDate]     DATETIME2(7)     NOT NULL,
    [EndDate]       DATETIME2(7)     NOT NULL,
    [Status]        NVARCHAR(20)     NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, EXPIRED, REVOKED
    [EntityType]    NVARCHAR(50)     NULL,
    [CompanyId]     UNIQUEIDENTIFIER NULL,
    [CreatedAt]     DATETIME2(7)     NOT NULL DEFAULT SYSUTCDATETIME(),
    [UpdatedAt]     DATETIME2(7)     NOT NULL DEFAULT SYSUTCDATETIME(),

    CONSTRAINT [PK_Delegations] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [FK_Delegations_Delegator] FOREIGN KEY ([DelegatorId]) REFERENCES [auth].[Users]([Id]),
    CONSTRAINT [FK_Delegations_Delegate] FOREIGN KEY ([DelegateId]) REFERENCES [auth].[Users]([Id]),
    CONSTRAINT [CK_Delegations_Status] CHECK ([Status] IN ('ACTIVE', 'EXPIRED', 'REVOKED'))
)
GO

CREATE NONCLUSTERED INDEX [IX_Delegations_DelegatorId] ON [wf].[Delegations]([DelegatorId])
GO
CREATE NONCLUSTERED INDEX [IX_Delegations_DelegateId] ON [wf].[Delegations]([DelegateId])
GO
CREATE NONCLUSTERED INDEX [IX_Delegations_Status] ON [wf].[Delegations]([Status])
GO
CREATE NONCLUSTERED INDEX [IX_Delegations_Dates] ON [wf].[Delegations]([StartDate], [EndDate])
GO

-- Escalation Rules
CREATE TABLE [wf].[EscalationRules] (
    [Id]                    UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
    [WorkflowStepId]        UNIQUEIDENTIFIER NOT NULL,
    [EscalateAfterHours]    INT              NOT NULL,
    [EscalateToRoleId]      UNIQUEIDENTIFIER NULL,
    [EscalateToUserId]      UNIQUEIDENTIFIER NULL,
    [NotifyOriginal]        BIT              NOT NULL DEFAULT 1,
    [MaxEscalations]        INT              NOT NULL DEFAULT 3,
    [IsActive]              BIT              NOT NULL DEFAULT 1,
    [CreatedAt]             DATETIME2(7)     NOT NULL DEFAULT SYSUTCDATETIME(),

    CONSTRAINT [PK_EscalationRules] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [FK_EscalationRules_Steps] FOREIGN KEY ([WorkflowStepId]) REFERENCES [wf].[WorkflowSteps]([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_EscalationRules_Roles] FOREIGN KEY ([EscalateToRoleId]) REFERENCES [auth].[Roles]([Id]),
    CONSTRAINT [FK_EscalationRules_Users] FOREIGN KEY ([EscalateToUserId]) REFERENCES [auth].[Users]([Id])
)
GO

CREATE NONCLUSTERED INDEX [IX_EscalationRules_StepId] ON [wf].[EscalationRules]([WorkflowStepId])
GO

-- ============================================================================
-- SYSTEM ADMIN TABLES
-- ============================================================================

-- Notifications
CREATE TABLE [sys_admin].[Notifications] (
    [Id]            UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
    [UserId]        UNIQUEIDENTIFIER NOT NULL,
    [Type]          NVARCHAR(50)     NOT NULL, -- APPROVAL_REQUIRED, APPROVAL_COMPLETED, etc.
    [Title]         NVARCHAR(300)    NOT NULL,
    [Message]       NVARCHAR(MAX)    NOT NULL,
    [EntityType]    NVARCHAR(50)     NULL,
    [EntityId]      UNIQUEIDENTIFIER NULL,
    [IsRead]        BIT              NOT NULL DEFAULT 0,
    [ReadAt]        DATETIME2(7)     NULL,
    [Metadata]      NVARCHAR(MAX)    NULL, -- JSON
    [CreatedAt]     DATETIME2(7)     NOT NULL DEFAULT SYSUTCDATETIME(),

    CONSTRAINT [PK_Notifications] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [FK_Notifications_Users] FOREIGN KEY ([UserId]) REFERENCES [auth].[Users]([Id]) ON DELETE CASCADE
)
GO

CREATE NONCLUSTERED INDEX [IX_Notifications_UserId] ON [sys_admin].[Notifications]([UserId])
GO
CREATE NONCLUSTERED INDEX [IX_Notifications_IsRead] ON [sys_admin].[Notifications]([UserId], [IsRead])
GO
CREATE NONCLUSTERED INDEX [IX_Notifications_CreatedAt] ON [sys_admin].[Notifications]([CreatedAt] DESC)
GO
CREATE NONCLUSTERED INDEX [IX_Notifications_Type] ON [sys_admin].[Notifications]([Type])
GO

-- Upload Batches
CREATE TABLE [sys_admin].[UploadBatches] (
    [Id]            UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
    [CompanyId]     UNIQUEIDENTIFIER NOT NULL,
    [UploadedById]  UNIQUEIDENTIFIER NOT NULL,
    [FileName]      NVARCHAR(300)    NOT NULL,
    [FileUrl]       NVARCHAR(500)    NOT NULL,
    [FileSize]      BIGINT           NOT NULL,
    [EntityType]    NVARCHAR(50)     NOT NULL, -- MATERIAL, USER, APPROVAL_MATRIX
    [Status]        NVARCHAR(30)     NOT NULL DEFAULT 'PENDING', -- PENDING, VALIDATING, VALIDATED, PROCESSING, COMPLETED, COMPLETED_WITH_ERRORS, FAILED
    [TotalRows]     INT              NOT NULL DEFAULT 0,
    [SuccessRows]   INT              NOT NULL DEFAULT 0,
    [FailedRows]    INT              NOT NULL DEFAULT 0,
    [ErrorSummary]  NVARCHAR(MAX)    NULL, -- JSON
    [StartedAt]     DATETIME2(7)     NULL,
    [CompletedAt]   DATETIME2(7)     NULL,
    [CreatedAt]     DATETIME2(7)     NOT NULL DEFAULT SYSUTCDATETIME(),
    [UpdatedAt]     DATETIME2(7)     NOT NULL DEFAULT SYSUTCDATETIME(),

    CONSTRAINT [PK_UploadBatches] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [FK_UploadBatches_Companies] FOREIGN KEY ([CompanyId]) REFERENCES [org].[Companies]([Id]),
    CONSTRAINT [FK_UploadBatches_Users] FOREIGN KEY ([UploadedById]) REFERENCES [auth].[Users]([Id])
)
GO

CREATE NONCLUSTERED INDEX [IX_UploadBatches_CompanyId] ON [sys_admin].[UploadBatches]([CompanyId])
GO
CREATE NONCLUSTERED INDEX [IX_UploadBatches_Status] ON [sys_admin].[UploadBatches]([Status])
GO
CREATE NONCLUSTERED INDEX [IX_UploadBatches_EntityType] ON [sys_admin].[UploadBatches]([EntityType])
GO

-- Upload Batch Items
CREATE TABLE [sys_admin].[UploadBatchItems] (
    [Id]            UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
    [UploadBatchId] UNIQUEIDENTIFIER NOT NULL,
    [RowNumber]     INT              NOT NULL,
    [RawData]       NVARCHAR(MAX)    NOT NULL, -- JSON
    [Status]        NVARCHAR(20)     NOT NULL DEFAULT 'PENDING', -- PENDING, VALID, INVALID, PROCESSED, FAILED
    [Errors]        NVARCHAR(MAX)    NULL, -- JSON
    [ProcessedData] NVARCHAR(MAX)    NULL, -- JSON
    [EntityId]      UNIQUEIDENTIFIER NULL,
    [CreatedAt]     DATETIME2(7)     NOT NULL DEFAULT SYSUTCDATETIME(),
    [UpdatedAt]     DATETIME2(7)     NOT NULL DEFAULT SYSUTCDATETIME(),

    CONSTRAINT [PK_UploadBatchItems] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [FK_UploadBatchItems_Batches] FOREIGN KEY ([UploadBatchId]) REFERENCES [sys_admin].[UploadBatches]([Id]) ON DELETE CASCADE
)
GO

CREATE NONCLUSTERED INDEX [IX_UploadBatchItems_BatchId] ON [sys_admin].[UploadBatchItems]([UploadBatchId])
GO
CREATE NONCLUSTERED INDEX [IX_UploadBatchItems_Status] ON [sys_admin].[UploadBatchItems]([Status])
GO

-- Audit Logs
CREATE TABLE [sys_admin].[AuditLogs] (
    [Id]            UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
    [UserId]        UNIQUEIDENTIFIER NULL,
    [Action]        NVARCHAR(100)    NOT NULL,
    [EntityType]    NVARCHAR(50)     NOT NULL,
    [EntityId]      UNIQUEIDENTIFIER NULL,
    [OldValues]     NVARCHAR(MAX)    NULL, -- JSON
    [NewValues]     NVARCHAR(MAX)    NULL, -- JSON
    [Metadata]      NVARCHAR(MAX)    NULL, -- JSON
    [IpAddress]     NVARCHAR(45)     NULL,
    [UserAgent]     NVARCHAR(500)    NULL,
    [CompanyId]     UNIQUEIDENTIFIER NULL,
    [CreatedAt]     DATETIME2(7)     NOT NULL DEFAULT SYSUTCDATETIME(),

    CONSTRAINT [PK_AuditLogs] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [FK_AuditLogs_Users] FOREIGN KEY ([UserId]) REFERENCES [auth].[Users]([Id])
)
GO

CREATE NONCLUSTERED INDEX [IX_AuditLogs_UserId] ON [sys_admin].[AuditLogs]([UserId])
GO
CREATE NONCLUSTERED INDEX [IX_AuditLogs_EntityTypeId] ON [sys_admin].[AuditLogs]([EntityType], [EntityId])
GO
CREATE NONCLUSTERED INDEX [IX_AuditLogs_Action] ON [sys_admin].[AuditLogs]([Action])
GO
CREATE NONCLUSTERED INDEX [IX_AuditLogs_CreatedAt] ON [sys_admin].[AuditLogs]([CreatedAt] DESC)
GO
CREATE NONCLUSTERED INDEX [IX_AuditLogs_CompanyId] ON [sys_admin].[AuditLogs]([CompanyId]) WHERE [CompanyId] IS NOT NULL
GO

-- Numbering Rules
CREATE TABLE [sys_admin].[NumberingRules] (
    [Id]            UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
    [HoldingId]     UNIQUEIDENTIFIER NULL,
    [CompanyId]     UNIQUEIDENTIFIER NULL,
    [EntityType]    NVARCHAR(50)     NOT NULL,
    [Prefix]        NVARCHAR(20)     NOT NULL,
    [Separator]     NVARCHAR(5)      NOT NULL DEFAULT '-',
    [PadLength]     INT              NOT NULL DEFAULT 6,
    [CurrentSeq]    INT              NOT NULL DEFAULT 0,
    [ResetPeriod]   NVARCHAR(20)     NULL, -- YEARLY, MONTHLY, NEVER
    [IncludeYear]   BIT              NOT NULL DEFAULT 1,
    [IsActive]      BIT              NOT NULL DEFAULT 1,
    [CreatedAt]     DATETIME2(7)     NOT NULL DEFAULT SYSUTCDATETIME(),
    [UpdatedAt]     DATETIME2(7)     NOT NULL DEFAULT SYSUTCDATETIME(),

    CONSTRAINT [PK_NumberingRules] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [UQ_NumberingRules_CompanyEntity] UNIQUE ([CompanyId], [EntityType]),
    CONSTRAINT [FK_NumberingRules_Holdings] FOREIGN KEY ([HoldingId]) REFERENCES [org].[Holdings]([Id]),
    CONSTRAINT [FK_NumberingRules_Companies] FOREIGN KEY ([CompanyId]) REFERENCES [org].[Companies]([Id])
)
GO

-- Attachments
CREATE TABLE [sys_admin].[Attachments] (
    [Id]                UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
    [PurchaseRequestId] UNIQUEIDENTIFIER NULL,
    [EntityType]        NVARCHAR(50)     NOT NULL,
    [EntityId]          UNIQUEIDENTIFIER NOT NULL,
    [FileName]          NVARCHAR(300)    NOT NULL,
    [FileUrl]           NVARCHAR(500)    NOT NULL,
    [FileSize]          BIGINT           NOT NULL,
    [MimeType]          NVARCHAR(100)    NOT NULL,
    [UploadedById]      UNIQUEIDENTIFIER NOT NULL,
    [CreatedAt]         DATETIME2(7)     NOT NULL DEFAULT SYSUTCDATETIME(),

    CONSTRAINT [PK_Attachments] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [FK_Attachments_PR] FOREIGN KEY ([PurchaseRequestId]) REFERENCES [pr].[PurchaseRequests]([Id]),
    CONSTRAINT [FK_Attachments_Users] FOREIGN KEY ([UploadedById]) REFERENCES [auth].[Users]([Id])
)
GO

CREATE NONCLUSTERED INDEX [IX_Attachments_EntityTypeId] ON [sys_admin].[Attachments]([EntityType], [EntityId])
GO
CREATE NONCLUSTERED INDEX [IX_Attachments_PRId] ON [sys_admin].[Attachments]([PurchaseRequestId]) WHERE [PurchaseRequestId] IS NOT NULL
GO

-- ============================================================================
-- INTEGRATION TABLES
-- ============================================================================

-- Integration Configs
CREATE TABLE [intg].[IntegrationConfigs] (
    [Id]                UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
    [HoldingId]         UNIQUEIDENTIFIER NULL,
    [CompanyId]         UNIQUEIDENTIFIER NULL,
    [SystemType]        NVARCHAR(50)     NOT NULL, -- ORACLE, SAP, CUSTOM
    [SystemName]        NVARCHAR(100)    NOT NULL,
    [BaseUrl]           NVARCHAR(500)    NOT NULL,
    [AuthType]          NVARCHAR(50)     NOT NULL, -- BASIC, OAUTH2, API_KEY
    [Credentials]       NVARCHAR(MAX)    NOT NULL, -- JSON encrypted
    [Settings]          NVARCHAR(MAX)    NULL, -- JSON
    [IsActive]          BIT              NOT NULL DEFAULT 1,
    [LastTestedAt]      DATETIME2(7)     NULL,
    [LastTestStatus]    NVARCHAR(20)     NULL,
    [CreatedAt]         DATETIME2(7)     NOT NULL DEFAULT SYSUTCDATETIME(),
    [UpdatedAt]         DATETIME2(7)     NOT NULL DEFAULT SYSUTCDATETIME(),

    CONSTRAINT [PK_IntegrationConfigs] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [FK_IntegrationConfigs_Holdings] FOREIGN KEY ([HoldingId]) REFERENCES [org].[Holdings]([Id]),
    CONSTRAINT [FK_IntegrationConfigs_Companies] FOREIGN KEY ([CompanyId]) REFERENCES [org].[Companies]([Id])
)
GO

CREATE NONCLUSTERED INDEX [IX_IntegrationConfigs_CompanyId] ON [intg].[IntegrationConfigs]([CompanyId])
GO
CREATE NONCLUSTERED INDEX [IX_IntegrationConfigs_SystemType] ON [intg].[IntegrationConfigs]([SystemType])
GO

-- Integration Logs
CREATE TABLE [intg].[IntegrationLogs] (
    [Id]                    UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
    [IntegrationConfigId]   UNIQUEIDENTIFIER NULL,
    [Direction]             NVARCHAR(10)     NOT NULL, -- INBOUND, OUTBOUND
    [EntityType]            NVARCHAR(50)     NOT NULL,
    [EntityId]              UNIQUEIDENTIFIER NULL,
    [OperationType]         NVARCHAR(50)     NOT NULL, -- SYNC, POST, FETCH
    [Status]                NVARCHAR(20)     NOT NULL, -- SUCCESS, FAILED, PENDING, IN_PROGRESS, RETRYING, CANCELLED, PARTIAL
    [RequestPayload]        NVARCHAR(MAX)    NULL, -- JSON
    [ResponsePayload]       NVARCHAR(MAX)    NULL, -- JSON
    [ErrorMessage]          NVARCHAR(MAX)    NULL,
    [ErrorCode]             NVARCHAR(50)     NULL,
    [RetryCount]            INT              NOT NULL DEFAULT 0,
    [MaxRetries]            INT              NOT NULL DEFAULT 3,
    [NextRetryAt]           DATETIME2(7)     NULL,
    [DurationMs]            INT              NULL,
    [CreatedAt]             DATETIME2(7)     NOT NULL DEFAULT SYSUTCDATETIME(),
    [UpdatedAt]             DATETIME2(7)     NOT NULL DEFAULT SYSUTCDATETIME(),

    CONSTRAINT [PK_IntegrationLogs] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [FK_IntegrationLogs_Configs] FOREIGN KEY ([IntegrationConfigId]) REFERENCES [intg].[IntegrationConfigs]([Id]),
    CONSTRAINT [CK_IntegrationLogs_Direction] CHECK ([Direction] IN ('INBOUND', 'OUTBOUND')),
    CONSTRAINT [CK_IntegrationLogs_Status] CHECK ([Status] IN ('SUCCESS', 'FAILED', 'PENDING', 'IN_PROGRESS', 'RETRYING', 'CANCELLED', 'PARTIAL'))
)
GO

CREATE NONCLUSTERED INDEX [IX_IntegrationLogs_ConfigId] ON [intg].[IntegrationLogs]([IntegrationConfigId])
GO
CREATE NONCLUSTERED INDEX [IX_IntegrationLogs_EntityTypeId] ON [intg].[IntegrationLogs]([EntityType], [EntityId])
GO
CREATE NONCLUSTERED INDEX [IX_IntegrationLogs_Status] ON [intg].[IntegrationLogs]([Status])
GO
CREATE NONCLUSTERED INDEX [IX_IntegrationLogs_CreatedAt] ON [intg].[IntegrationLogs]([CreatedAt] DESC)
GO
CREATE NONCLUSTERED INDEX [IX_IntegrationLogs_Direction] ON [intg].[IntegrationLogs]([Direction])
GO

-- Oracle Posting Logs
CREATE TABLE [intg].[OraclePostingLogs] (
    [Id]                    UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
    [PurchaseRequestId]     UNIQUEIDENTIFIER NOT NULL,
    [PostingType]           NVARCHAR(50)     NOT NULL, -- REQUISITION, PO
    [Status]                NVARCHAR(20)     NOT NULL, -- SUCCESS, FAILED, PENDING, IN_PROGRESS, RETRYING
    [OracleReqNumber]       NVARCHAR(50)     NULL,
    [OracleReqHeaderId]     NVARCHAR(50)     NULL,
    [OraclePONumber]        NVARCHAR(50)     NULL,
    [RequestPayload]        NVARCHAR(MAX)    NULL, -- JSON
    [ResponsePayload]       NVARCHAR(MAX)    NULL, -- JSON
    [ErrorMessage]          NVARCHAR(MAX)    NULL,
    [ErrorCode]             NVARCHAR(50)     NULL,
    [RetryCount]            INT              NOT NULL DEFAULT 0,
    [PostedAt]              DATETIME2(7)     NULL,
    [CreatedAt]             DATETIME2(7)     NOT NULL DEFAULT SYSUTCDATETIME(),
    [UpdatedAt]             DATETIME2(7)     NOT NULL DEFAULT SYSUTCDATETIME(),

    CONSTRAINT [PK_OraclePostingLogs] PRIMARY KEY CLUSTERED ([Id]),
    CONSTRAINT [FK_OraclePostingLogs_PR] FOREIGN KEY ([PurchaseRequestId]) REFERENCES [pr].[PurchaseRequests]([Id]),
    CONSTRAINT [CK_OraclePostingLogs_Status] CHECK ([Status] IN ('SUCCESS', 'FAILED', 'PENDING', 'IN_PROGRESS', 'RETRYING'))
)
GO

CREATE NONCLUSTERED INDEX [IX_OraclePostingLogs_PRId] ON [intg].[OraclePostingLogs]([PurchaseRequestId])
GO
CREATE NONCLUSTERED INDEX [IX_OraclePostingLogs_Status] ON [intg].[OraclePostingLogs]([Status])
GO
CREATE NONCLUSTERED INDEX [IX_OraclePostingLogs_CreatedAt] ON [intg].[OraclePostingLogs]([CreatedAt] DESC)
GO

-- ============================================================================
-- TRIGGERS FOR UpdatedAt
-- ============================================================================

-- Generic trigger template for UpdatedAt
CREATE OR ALTER TRIGGER [org].[TR_Holdings_UpdatedAt] ON [org].[Holdings]
AFTER UPDATE AS
BEGIN
    SET NOCOUNT ON;
    UPDATE [org].[Holdings] SET [UpdatedAt] = SYSUTCDATETIME()
    FROM [org].[Holdings] h INNER JOIN inserted i ON h.[Id] = i.[Id];
END
GO

CREATE OR ALTER TRIGGER [org].[TR_Companies_UpdatedAt] ON [org].[Companies]
AFTER UPDATE AS
BEGIN
    SET NOCOUNT ON;
    UPDATE [org].[Companies] SET [UpdatedAt] = SYSUTCDATETIME()
    FROM [org].[Companies] c INNER JOIN inserted i ON c.[Id] = i.[Id];
END
GO

CREATE OR ALTER TRIGGER [org].[TR_Departments_UpdatedAt] ON [org].[Departments]
AFTER UPDATE AS
BEGIN
    SET NOCOUNT ON;
    UPDATE [org].[Departments] SET [UpdatedAt] = SYSUTCDATETIME()
    FROM [org].[Departments] d INNER JOIN inserted i ON d.[Id] = i.[Id];
END
GO

CREATE OR ALTER TRIGGER [auth].[TR_Users_UpdatedAt] ON [auth].[Users]
AFTER UPDATE AS
BEGIN
    SET NOCOUNT ON;
    UPDATE [auth].[Users] SET [UpdatedAt] = SYSUTCDATETIME()
    FROM [auth].[Users] u INNER JOIN inserted i ON u.[Id] = i.[Id];
END
GO

CREATE OR ALTER TRIGGER [mat].[TR_Materials_UpdatedAt] ON [mat].[Materials]
AFTER UPDATE AS
BEGIN
    SET NOCOUNT ON;
    UPDATE [mat].[Materials] SET [UpdatedAt] = SYSUTCDATETIME()
    FROM [mat].[Materials] m INNER JOIN inserted i ON m.[Id] = i.[Id];
END
GO

CREATE OR ALTER TRIGGER [pr].[TR_PurchaseRequests_UpdatedAt] ON [pr].[PurchaseRequests]
AFTER UPDATE AS
BEGIN
    SET NOCOUNT ON;
    UPDATE [pr].[PurchaseRequests] SET [UpdatedAt] = SYSUTCDATETIME()
    FROM [pr].[PurchaseRequests] p INNER JOIN inserted i ON p.[Id] = i.[Id];
END
GO

CREATE OR ALTER TRIGGER [wf].[TR_ApprovalInstances_UpdatedAt] ON [wf].[ApprovalInstances]
AFTER UPDATE AS
BEGIN
    SET NOCOUNT ON;
    UPDATE [wf].[ApprovalInstances] SET [UpdatedAt] = SYSUTCDATETIME()
    FROM [wf].[ApprovalInstances] a INNER JOIN inserted i ON a.[Id] = i.[Id];
END
GO

-- ============================================================================
-- VIEWS FOR COMMON QUERIES
-- ============================================================================

-- View: Materials with full details
CREATE OR ALTER VIEW [mat].[vw_MaterialsFullDetail]
AS
SELECT
    m.[Id],
    m.[MaterialCode],
    m.[Name],
    m.[NameAr],
    m.[Source],
    m.[Status],
    m.[SyncStatus],
    mc.[Name] AS [CategoryName],
    ms.[Name] AS [SubcategoryName],
    mt.[Name] AS [MaterialTypeName],
    uom.[Name] AS [UnitOfMeasureName],
    uom.[Abbreviation] AS [UOMCode],
    c.[Name] AS [OwningCompanyName],
    c.[Code] AS [OwningCompanyCode],
    c.[IsOracleIntegrated],
    m.[OracleMaterialCode],
    m.[StandardPrice],
    m.[Currency],
    m.[LastSyncDate],
    m.[IsActive],
    m.[CreatedAt]
FROM [mat].[Materials] m
LEFT JOIN [mat].[MaterialCategories] mc ON m.[CategoryId] = mc.[Id]
LEFT JOIN [mat].[MaterialSubcategories] ms ON m.[SubcategoryId] = ms.[Id]
LEFT JOIN [mat].[MaterialTypes] mt ON m.[MaterialTypeId] = mt.[Id]
LEFT JOIN [mat].[UnitsOfMeasure] uom ON m.[UnitOfMeasureId] = uom.[Id]
LEFT JOIN [org].[Companies] c ON m.[OwningCompanyId] = c.[Id]
WHERE m.[DeletedAt] IS NULL
GO

-- View: Purchase Requests Dashboard
CREATE OR ALTER VIEW [pr].[vw_PurchaseRequestsDashboard]
AS
SELECT
    p.[Id],
    p.[RequestNumber],
    p.[Title],
    p.[Status],
    p.[UrgencyLevel],
    p.[TotalEstimatedValue],
    p.[Currency],
    p.[OraclePostingStatus],
    c.[Name] AS [CompanyName],
    c.[Code] AS [CompanyCode],
    c.[IsOracleIntegrated],
    d.[Name] AS [DepartmentName],
    u.[FirstName] + ' ' + u.[LastName] AS [RequesterName],
    bv.[Name] AS [BusinessVerticalName],
    p.[SubmittedAt],
    p.[ApprovedAt],
    p.[CreatedAt]
FROM [pr].[PurchaseRequests] p
INNER JOIN [org].[Companies] c ON p.[CompanyId] = c.[Id]
INNER JOIN [org].[Departments] d ON p.[DepartmentId] = d.[Id]
INNER JOIN [auth].[Users] u ON p.[RequesterId] = u.[Id]
LEFT JOIN [org].[BusinessVerticals] bv ON p.[BusinessVerticalId] = bv.[Id]
WHERE p.[DeletedAt] IS NULL
GO

-- View: Pending Approvals
CREATE OR ALTER VIEW [wf].[vw_PendingApprovals]
AS
SELECT
    ai.[Id] AS [ApprovalInstanceId],
    ai.[EntityType],
    ai.[EntityId],
    ai.[Status] AS [ApprovalStatus],
    ai.[StepOrder],
    ai.[DueDate],
    ai.[CreatedAt] AS [AssignedAt],
    u.[Id] AS [AssignedToId],
    u.[FirstName] + ' ' + u.[LastName] AS [AssignedToName],
    u.[Email] AS [AssignedToEmail],
    ws.[Name] AS [StepName],
    ws.[StepType],
    wd.[Name] AS [WorkflowName],
    pr.[RequestNumber],
    pr.[Title] AS [RequestTitle],
    pr.[UrgencyLevel],
    pr.[TotalEstimatedValue],
    c.[Name] AS [CompanyName]
FROM [wf].[ApprovalInstances] ai
INNER JOIN [auth].[Users] u ON ai.[AssignedToId] = u.[Id]
INNER JOIN [wf].[WorkflowSteps] ws ON ai.[WorkflowStepId] = ws.[Id]
INNER JOIN [wf].[WorkflowDefinitions] wd ON ai.[WorkflowDefinitionId] = wd.[Id]
LEFT JOIN [pr].[PurchaseRequests] pr ON ai.[PurchaseRequestId] = pr.[Id]
LEFT JOIN [org].[Companies] c ON pr.[CompanyId] = c.[Id]
WHERE ai.[Status] = 'PENDING'
GO

-- ============================================================================
-- STORED PROCEDURES
-- ============================================================================

-- SP: Get Next Sequence Number
CREATE OR ALTER PROCEDURE [sys_admin].[sp_GetNextSequenceNumber]
    @CompanyId UNIQUEIDENTIFIER,
    @EntityType NVARCHAR(50),
    @NextNumber NVARCHAR(50) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @Prefix NVARCHAR(20);
    DECLARE @Separator NVARCHAR(5);
    DECLARE @PadLength INT;
    DECLARE @CurrentSeq INT;
    DECLARE @IncludeYear BIT;
    
    -- Get and increment sequence atomically
    UPDATE [sys_admin].[NumberingRules]
    SET @CurrentSeq = [CurrentSeq] = [CurrentSeq] + 1,
        @Prefix = [Prefix],
        @Separator = [Separator],
        @PadLength = [PadLength],
        @IncludeYear = [IncludeYear]
    WHERE [CompanyId] = @CompanyId AND [EntityType] = @EntityType AND [IsActive] = 1;
    
    IF @CurrentSeq IS NULL
    BEGIN
        SET @NextNumber = NULL;
        RETURN;
    END
    
    IF @IncludeYear = 1
        SET @NextNumber = @Prefix + @Separator + CAST(YEAR(GETUTCDATE()) AS NVARCHAR(4)) + @Separator + RIGHT(REPLICATE('0', @PadLength) + CAST(@CurrentSeq AS NVARCHAR(10)), @PadLength);
    ELSE
        SET @NextNumber = @Prefix + @Separator + RIGHT(REPLICATE('0', @PadLength) + CAST(@CurrentSeq AS NVARCHAR(10)), @PadLength);
END
GO

-- SP: Search Materials by Company
CREATE OR ALTER PROCEDURE [mat].[sp_SearchMaterialsByCompany]
    @CompanyId UNIQUEIDENTIFIER,
    @SearchTerm NVARCHAR(200) = NULL,
    @Source NVARCHAR(20) = NULL,
    @Status NVARCHAR(30) = NULL,
    @MaterialTypeId UNIQUEIDENTIFIER = NULL,
    @CategoryId UNIQUEIDENTIFIER = NULL,
    @PageNumber INT = 1,
    @PageSize INT = 50
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT
        m.*,
        mc.[Name] AS [CategoryName],
        mt.[Name] AS [TypeName],
        uom.[Abbreviation] AS [UOMCode]
    FROM [mat].[Materials] m
    LEFT JOIN [mat].[MaterialCategories] mc ON m.[CategoryId] = mc.[Id]
    LEFT JOIN [mat].[MaterialTypes] mt ON m.[MaterialTypeId] = mt.[Id]
    LEFT JOIN [mat].[UnitsOfMeasure] uom ON m.[UnitOfMeasureId] = uom.[Id]
    WHERE m.[OwningCompanyId] = @CompanyId
        AND m.[DeletedAt] IS NULL
        AND (@SearchTerm IS NULL OR m.[Name] LIKE '%' + @SearchTerm + '%' OR m.[MaterialCode] LIKE '%' + @SearchTerm + '%')
        AND (@Source IS NULL OR m.[Source] = @Source)
        AND (@Status IS NULL OR m.[Status] = @Status)
        AND (@MaterialTypeId IS NULL OR m.[MaterialTypeId] = @MaterialTypeId)
        AND (@CategoryId IS NULL OR m.[CategoryId] = @CategoryId)
    ORDER BY m.[Name]
    OFFSET (@PageNumber - 1) * @PageSize ROWS
    FETCH NEXT @PageSize ROWS ONLY;
END
GO

-- SP: Get Pending Approvals for User
CREATE OR ALTER PROCEDURE [wf].[sp_GetPendingApprovalsForUser]
    @UserId UNIQUEIDENTIFIER,
    @CompanyId UNIQUEIDENTIFIER = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT
        ai.[Id],
        ai.[EntityType],
        ai.[EntityId],
        ai.[StepOrder],
        ai.[DueDate],
        ai.[CreatedAt] AS [AssignedAt],
        ws.[Name] AS [StepName],
        wd.[Name] AS [WorkflowName],
        pr.[RequestNumber],
        pr.[Title],
        pr.[UrgencyLevel],
        pr.[TotalEstimatedValue],
        pr.[Currency],
        c.[Name] AS [CompanyName],
        c.[Code] AS [CompanyCode],
        d.[Name] AS [DepartmentName],
        req.[FirstName] + ' ' + req.[LastName] AS [RequesterName],
        CASE WHEN ai.[DueDate] < SYSUTCDATETIME() THEN 1 ELSE 0 END AS [IsOverdue]
    FROM [wf].[ApprovalInstances] ai
    INNER JOIN [wf].[WorkflowSteps] ws ON ai.[WorkflowStepId] = ws.[Id]
    INNER JOIN [wf].[WorkflowDefinitions] wd ON ai.[WorkflowDefinitionId] = wd.[Id]
    LEFT JOIN [pr].[PurchaseRequests] pr ON ai.[PurchaseRequestId] = pr.[Id]
    LEFT JOIN [org].[Companies] c ON pr.[CompanyId] = c.[Id]
    LEFT JOIN [org].[Departments] d ON pr.[DepartmentId] = d.[Id]
    LEFT JOIN [auth].[Users] req ON pr.[RequesterId] = req.[Id]
    WHERE ai.[AssignedToId] = @UserId
        AND ai.[Status] = 'PENDING'
        AND (@CompanyId IS NULL OR pr.[CompanyId] = @CompanyId)
    ORDER BY
        CASE ai.[DueDate] WHEN NULL THEN 1 ELSE 0 END,
        ai.[DueDate] ASC,
        ai.[CreatedAt] ASC;
END
GO

-- SP: Get Request Approval History
CREATE OR ALTER PROCEDURE [wf].[sp_GetRequestApprovalHistory]
    @PurchaseRequestId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT
        ai.[Id] AS [ApprovalInstanceId],
        ai.[StepOrder],
        ai.[Status] AS [InstanceStatus],
        ai.[DueDate],
        ai.[CompletedAt],
        ai.[CreatedAt] AS [AssignedAt],
        ws.[Name] AS [StepName],
        ws.[StepType],
        assignee.[FirstName] + ' ' + assignee.[LastName] AS [AssignedTo],
        aa.[Id] AS [ActionId],
        aa.[ActionType],
        aa.[Comments],
        aa.[CreatedAt] AS [ActionDate],
        actor.[FirstName] + ' ' + actor.[LastName] AS [ActionByName]
    FROM [wf].[ApprovalInstances] ai
    INNER JOIN [wf].[WorkflowSteps] ws ON ai.[WorkflowStepId] = ws.[Id]
    INNER JOIN [auth].[Users] assignee ON ai.[AssignedToId] = assignee.[Id]
    LEFT JOIN [wf].[ApprovalActions] aa ON aa.[ApprovalInstanceId] = ai.[Id]
    LEFT JOIN [auth].[Users] actor ON aa.[ActionBy] = actor.[Id]
    WHERE ai.[PurchaseRequestId] = @PurchaseRequestId
    ORDER BY ai.[StepOrder], aa.[CreatedAt];
END
GO

-- SP: Get Dashboard KPIs
CREATE OR ALTER PROCEDURE [sys_admin].[sp_GetDashboardKPIs]
    @CompanyId UNIQUEIDENTIFIER = NULL,
    @UserId UNIQUEIDENTIFIER = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Total requests by status
    SELECT
        [Status],
        COUNT(*) AS [Count],
        ISNULL(SUM([TotalEstimatedValue]), 0) AS [TotalValue]
    FROM [pr].[PurchaseRequests]
    WHERE [DeletedAt] IS NULL
        AND (@CompanyId IS NULL OR [CompanyId] = @CompanyId)
    GROUP BY [Status];
    
    -- Pending approvals count for user
    IF @UserId IS NOT NULL
    BEGIN
        SELECT COUNT(*) AS [PendingApprovalsCount]
        FROM [wf].[ApprovalInstances]
        WHERE [AssignedToId] = @UserId AND [Status] = 'PENDING';
    END
    
    -- Overdue approvals
    SELECT COUNT(*) AS [OverdueCount]
    FROM [wf].[ApprovalInstances] ai
    LEFT JOIN [pr].[PurchaseRequests] pr ON ai.[PurchaseRequestId] = pr.[Id]
    WHERE ai.[Status] = 'PENDING'
        AND ai.[DueDate] < SYSUTCDATETIME()
        AND (@CompanyId IS NULL OR pr.[CompanyId] = @CompanyId);
    
    -- Oracle posting stats
    SELECT
        [Status],
        COUNT(*) AS [Count]
    FROM [intg].[OraclePostingLogs]
    WHERE [CreatedAt] >= DATEADD(DAY, -30, SYSUTCDATETIME())
    GROUP BY [Status];
    
    -- Materials by source
    SELECT
        [Source],
        [Status],
        COUNT(*) AS [Count]
    FROM [mat].[Materials]
    WHERE [DeletedAt] IS NULL
        AND (@CompanyId IS NULL OR [OwningCompanyId] = @CompanyId)
    GROUP BY [Source], [Status];
END
GO

-- SP: Get Oracle Posting Status
CREATE OR ALTER PROCEDURE [intg].[sp_GetOraclePostingStatus]
    @PurchaseRequestId UNIQUEIDENTIFIER = NULL,
    @Status NVARCHAR(20) = NULL,
    @DaysBack INT = 30
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT
        opl.[Id],
        opl.[PurchaseRequestId],
        pr.[RequestNumber],
        pr.[Title],
        opl.[PostingType],
        opl.[Status],
        opl.[OracleReqNumber],
        opl.[OracleReqHeaderId],
        opl.[OraclePONumber],
        opl.[ErrorMessage],
        opl.[ErrorCode],
        opl.[RetryCount],
        opl.[PostedAt],
        opl.[CreatedAt],
        c.[Name] AS [CompanyName]
    FROM [intg].[OraclePostingLogs] opl
    INNER JOIN [pr].[PurchaseRequests] pr ON opl.[PurchaseRequestId] = pr.[Id]
    INNER JOIN [org].[Companies] c ON pr.[CompanyId] = c.[Id]
    WHERE (@PurchaseRequestId IS NULL OR opl.[PurchaseRequestId] = @PurchaseRequestId)
        AND (@Status IS NULL OR opl.[Status] = @Status)
        AND opl.[CreatedAt] >= DATEADD(DAY, -@DaysBack, SYSUTCDATETIME())
    ORDER BY opl.[CreatedAt] DESC;
END
GO

-- SP: Get Upload Validation Errors
CREATE OR ALTER PROCEDURE [sys_admin].[sp_GetUploadValidationErrors]
    @UploadBatchId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT
        ubi.[RowNumber],
        ubi.[RawData],
        ubi.[Status],
        ubi.[Errors],
        ub.[FileName],
        ub.[EntityType],
        ub.[Status] AS [BatchStatus]
    FROM [sys_admin].[UploadBatchItems] ubi
    INNER JOIN [sys_admin].[UploadBatches] ub ON ubi.[UploadBatchId] = ub.[Id]
    WHERE ubi.[UploadBatchId] = @UploadBatchId
        AND ubi.[Status] IN ('INVALID', 'FAILED')
    ORDER BY ubi.[RowNumber];
END
GO

-- ============================================================================
-- SEED DATA
-- ============================================================================
PRINT 'Starting seed data insertion...'
GO

-- Insert Holding
DECLARE @HoldingId UNIQUEIDENTIFIER = NEWID();
INSERT INTO [org].[Holdings] ([Id], [Code], [Name], [NameAr], [Description])
VALUES (@HoldingId, 'AHH', N'Al Hattab Holding', N'مجموعة الحطاب القابضة', N'Multi-company holding with diversified business verticals');

-- Insert Companies
DECLARE @CompTradingId UNIQUEIDENTIFIER = NEWID();
DECLARE @CompConstructionId UNIQUEIDENTIFIER = NEWID();
DECLARE @CompManufacturingId UNIQUEIDENTIFIER = NEWID();
DECLARE @CompServicesId UNIQUEIDENTIFIER = NEWID();

INSERT INTO [org].[Companies] ([Id], [HoldingId], [Code], [Name], [NameAr], [IsOracleIntegrated], [CrossCompanyAccess], [OracleOrgId], [OracleOperatingUnit])
VALUES
    (@CompTradingId, @HoldingId, 'AHT', N'Al Hattab Trading', N'الحطاب للتجارة', 1, 1, 'ORG_101', 'AHT_OU'),
    (@CompConstructionId, @HoldingId, 'AHC', N'Al Hattab Construction', N'الحطاب للمقاولات', 1, 1, 'ORG_102', 'AHC_OU'),
    (@CompManufacturingId, @HoldingId, 'AHM', N'Al Hattab Manufacturing', N'الحطاب للتصنيع', 0, 0, NULL, NULL),
    (@CompServicesId, @HoldingId, 'AHS', N'Al Hattab Services', N'الحطاب للخدمات', 0, 0, NULL, NULL);

-- Insert Departments for each company
DECLARE @DeptTable TABLE (CompanyId UNIQUEIDENTIFIER, Code NVARCHAR(20), [Name] NVARCHAR(200), NameAr NVARCHAR(200));
INSERT INTO @DeptTable VALUES
    (@CompTradingId, 'PROC', N'Procurement', N'المشتريات'),
    (@CompTradingId, 'FIN', N'Finance', N'المالية'),
    (@CompTradingId, 'OPS', N'Operations', N'العمليات'),
    (@CompTradingId, 'MAINT', N'Maintenance', N'الصيانة'),
    (@CompTradingId, 'WH', N'Warehouse', N'المستودعات'),
    (@CompTradingId, 'IT', N'IT', N'تقنية المعلومات'),
    (@CompTradingId, 'HR', N'HR', N'الموارد البشرية'),
    (@CompTradingId, 'ADMIN', N'Administration', N'الإدارة'),
    (@CompConstructionId, 'PROC', N'Procurement', N'المشتريات'),
    (@CompConstructionId, 'FIN', N'Finance', N'المالية'),
    (@CompConstructionId, 'OPS', N'Operations', N'العمليات'),
    (@CompConstructionId, 'MAINT', N'Maintenance', N'الصيانة'),
    (@CompConstructionId, 'WH', N'Warehouse', N'المستودعات'),
    (@CompConstructionId, 'IT', N'IT', N'تقنية المعلومات'),
    (@CompConstructionId, 'HR', N'HR', N'الموارد البشرية'),
    (@CompConstructionId, 'ADMIN', N'Administration', N'الإدارة'),
    (@CompManufacturingId, 'PROC', N'Procurement', N'المشتريات'),
    (@CompManufacturingId, 'FIN', N'Finance', N'المالية'),
    (@CompManufacturingId, 'OPS', N'Operations', N'العمليات'),
    (@CompManufacturingId, 'MAINT', N'Maintenance', N'الصيانة'),
    (@CompManufacturingId, 'WH', N'Warehouse', N'المستودعات'),
    (@CompManufacturingId, 'IT', N'IT', N'تقنية المعلومات'),
    (@CompManufacturingId, 'HR', N'HR', N'الموارد البشرية'),
    (@CompManufacturingId, 'ADMIN', N'Administration', N'الإدارة'),
    (@CompServicesId, 'PROC', N'Procurement', N'المشتريات'),
    (@CompServicesId, 'FIN', N'Finance', N'المالية'),
    (@CompServicesId, 'OPS', N'Operations', N'العمليات'),
    (@CompServicesId, 'MAINT', N'Maintenance', N'الصيانة'),
    (@CompServicesId, 'WH', N'Warehouse', N'المستودعات'),
    (@CompServicesId, 'IT', N'IT', N'تقنية المعلومات'),
    (@CompServicesId, 'HR', N'HR', N'الموارد البشرية'),
    (@CompServicesId, 'ADMIN', N'Administration', N'الإدارة');

INSERT INTO [org].[Departments] ([Id], [CompanyId], [Code], [Name], [NameAr])
SELECT NEWID(), [CompanyId], [Code], [Name], [NameAr] FROM @DeptTable;

-- Insert Business Verticals
INSERT INTO [org].[BusinessVerticals] ([Id], [HoldingId], [Code], [Name], [NameAr])
VALUES
    (NEWID(), @HoldingId, 'CONST', N'Construction', N'المقاولات'),
    (NEWID(), @HoldingId, 'MANUF', N'Manufacturing', N'التصنيع'),
    (NEWID(), @HoldingId, 'TRADE', N'Trading', N'التجارة'),
    (NEWID(), @HoldingId, 'SERV', N'Services', N'الخدمات');

-- Insert Roles
INSERT INTO [auth].[Roles] ([Id], [Code], [Name], [IsSystem])
VALUES
    (NEWID(), 'REQUESTER', N'Requester', 0),
    (NEWID(), 'APPROVER', N'Approver', 0),
    (NEWID(), 'DEPT_MANAGER', N'Department Manager', 0),
    (NEWID(), 'PROC_OFFICER', N'Procurement Officer', 0),
    (NEWID(), 'FIN_APPROVER', N'Finance Approver', 0),
    (NEWID(), 'MAT_ADMIN', N'Material Admin', 0),
    (NEWID(), 'WF_ADMIN', N'Workflow Admin', 0),
    (NEWID(), 'COMP_ADMIN', N'Company Admin', 0),
    (NEWID(), 'HOLD_ADMIN', N'Holding Admin', 1),
    (NEWID(), 'SYS_ADMIN', N'System Admin', 1),
    (NEWID(), 'AUDIT_ADMIN', N'Audit Admin', 1),
    (NEWID(), 'INT_ADMIN', N'Integration Admin', 1),
    (NEWID(), 'UPLOAD_ADMIN', N'Upload Admin', 0);

-- Insert Permissions
INSERT INTO [auth].[Permissions] ([Id], [Code], [Name], [Module])
VALUES
    (NEWID(), 'material.view', N'View Materials', 'material'),
    (NEWID(), 'material.create', N'Create Materials', 'material'),
    (NEWID(), 'material.approve', N'Approve Materials', 'material'),
    (NEWID(), 'request.create', N'Create Requests', 'request'),
    (NEWID(), 'request.view', N'View Requests', 'request'),
    (NEWID(), 'request.approve', N'Approve Requests', 'request'),
    (NEWID(), 'workflow.manage', N'Manage Workflows', 'workflow'),
    (NEWID(), 'user.manage', N'Manage Users', 'user'),
    (NEWID(), 'organization.manage', N'Manage Organization', 'organization'),
    (NEWID(), 'upload.manage', N'Manage Uploads', 'upload'),
    (NEWID(), 'integration.manage', N'Manage Integration', 'integration'),
    (NEWID(), 'audit.view', N'View Audit Logs', 'audit'),
    (NEWID(), 'report.view', N'View Reports', 'report'),
    (NEWID(), 'admin.access', N'Admin Panel Access', 'admin');

-- Insert Material Types
INSERT INTO [mat].[MaterialTypes] ([Id], [Code], [Name], [NameAr])
VALUES
    (NEWID(), 'RAW', N'Raw Material', N'مواد خام'),
    (NEWID(), 'CONS', N'Consumable', N'مستهلكات'),
    (NEWID(), 'SPARE', N'Spare Part', N'قطع غيار'),
    (NEWID(), 'SVC', N'Service Item', N'بند خدمي'),
    (NEWID(), 'CAP', N'Capital Item', N'أصول رأسمالية');

-- Insert Material Categories
INSERT INTO [mat].[MaterialCategories] ([Id], [Code], [Name], [NameAr])
VALUES
    (NEWID(), 'ELEC', N'Electrical', N'كهربائيات'),
    (NEWID(), 'MECH', N'Mechanical', N'ميكانيكيات'),
    (NEWID(), 'CHEM', N'Chemicals', N'كيماويات'),
    (NEWID(), 'CIVIL', N'Civil', N'مدني'),
    (NEWID(), 'OFFICE', N'Office Supplies', N'لوازم مكتبية'),
    (NEWID(), 'SAFETY', N'Safety Equipment', N'معدات السلامة');

-- Insert Subcategories
INSERT INTO [mat].[MaterialSubcategories] ([Id], [CategoryId], [Code], [Name])
SELECT NEWID(), mc.[Id], 'CABLES', N'Cables & Wires' FROM [mat].[MaterialCategories] mc WHERE mc.[Code] = 'ELEC'
UNION ALL
SELECT NEWID(), mc.[Id], 'PANELS', N'Panels & Boards' FROM [mat].[MaterialCategories] mc WHERE mc.[Code] = 'ELEC'
UNION ALL
SELECT NEWID(), mc.[Id], 'PUMPS', N'Pumps' FROM [mat].[MaterialCategories] mc WHERE mc.[Code] = 'MECH'
UNION ALL
SELECT NEWID(), mc.[Id], 'VALVES', N'Valves' FROM [mat].[MaterialCategories] mc WHERE mc.[Code] = 'MECH'
UNION ALL
SELECT NEWID(), mc.[Id], 'LUBRIC', N'Lubricants' FROM [mat].[MaterialCategories] mc WHERE mc.[Code] = 'CHEM'
UNION ALL
SELECT NEWID(), mc.[Id], 'CEMENT', N'Cement & Concrete' FROM [mat].[MaterialCategories] mc WHERE mc.[Code] = 'CIVIL'
UNION ALL
SELECT NEWID(), mc.[Id], 'STEEL', N'Steel & Rebar' FROM [mat].[MaterialCategories] mc WHERE mc.[Code] = 'CIVIL'
UNION ALL
SELECT NEWID(), mc.[Id], 'PAPER', N'Paper & Print' FROM [mat].[MaterialCategories] mc WHERE mc.[Code] = 'OFFICE'
UNION ALL
SELECT NEWID(), mc.[Id], 'PPE', N'Personal Protective Equipment' FROM [mat].[MaterialCategories] mc WHERE mc.[Code] = 'SAFETY';

-- Insert Units of Measure
INSERT INTO [mat].[UnitsOfMeasure] ([Id], [Code], [Name], [Abbreviation])
VALUES
    (NEWID(), 'EA', N'Each', 'EA'),
    (NEWID(), 'M', N'Meter', 'M'),
    (NEWID(), 'KG', N'Kilogram', 'KG'),
    (NEWID(), 'L', N'Liter', 'L'),
    (NEWID(), 'TON', N'Ton', 'TON'),
    (NEWID(), 'SET', N'Set', 'SET'),
    (NEWID(), 'BOX', N'Box', 'BOX'),
    (NEWID(), 'ROLL', N'Roll', 'ROLL'),
    (NEWID(), 'SQM', N'Square Meter', 'SQM'),
    (NEWID(), 'HR', N'Hour', 'HR');

-- Insert Users
INSERT INTO [auth].[Users] ([Id], [EmployeeId], [Email], [Username], [PasswordHash], [FirstName], [LastName])
VALUES
    (NEWID(), 'EMP001', 'admin@alhattab.com', 'sysadmin', '$2b$12$placeholder', N'System', N'Admin'),
    (NEWID(), 'EMP002', 'ahmed.ali@alhattab.com', 'ahmed.ali', '$2b$12$placeholder', N'Ahmed', N'Ali'),
    (NEWID(), 'EMP003', 'fatima.hassan@alhattab.com', 'fatima.hassan', '$2b$12$placeholder', N'Fatima', N'Hassan'),
    (NEWID(), 'EMP004', 'mohammed.omar@alhattab.com', 'mohammed.omar', '$2b$12$placeholder', N'Mohammed', N'Omar'),
    (NEWID(), 'EMP005', 'sara.khalid@alhattab.com', 'sara.khalid', '$2b$12$placeholder', N'Sara', N'Khalid'),
    (NEWID(), 'EMP006', 'abdullah.fahd@alhattab.com', 'abdullah.fahd', '$2b$12$placeholder', N'Abdullah', N'Fahd'),
    (NEWID(), 'EMP007', 'nora.saleh@alhattab.com', 'nora.saleh', '$2b$12$placeholder', N'Nora', N'Saleh'),
    (NEWID(), 'EMP008', 'khalid.ibrahim@alhattab.com', 'khalid.ibrahim', '$2b$12$placeholder', N'Khalid', N'Ibrahim'),
    (NEWID(), 'EMP009', 'layla.ahmad@alhattab.com', 'layla.ahmad', '$2b$12$placeholder', N'Layla', N'Ahmad'),
    (NEWID(), 'EMP010', 'omar.hassan@alhattab.com', 'omar.hassan', '$2b$12$placeholder', N'Omar', N'Hassan'),
    (NEWID(), 'EMP011', 'yusuf.ali@alhattab.com', 'yusuf.ali', '$2b$12$placeholder', N'Yusuf', N'Ali'),
    (NEWID(), 'EMP012', 'maha.saeed@alhattab.com', 'maha.saeed', '$2b$12$placeholder', N'Maha', N'Saeed');

-- Insert Cost Centers
INSERT INTO [org].[CostCenters] ([Id], [CompanyId], [Code], [Name], [OracleCCId])
VALUES
    (NEWID(), @CompTradingId, 'CC-AHT-001', N'Trading Operations', NULL),
    (NEWID(), @CompTradingId, 'CC-AHT-002', N'Trading Admin', NULL),
    (NEWID(), @CompConstructionId, 'CC-AHC-001', N'Construction Projects', 'ORA_CC_101'),
    (NEWID(), @CompConstructionId, 'CC-AHC-002', N'Construction Maintenance', 'ORA_CC_102'),
    (NEWID(), @CompManufacturingId, 'CC-AHM-001', N'Production Floor', NULL),
    (NEWID(), @CompManufacturingId, 'CC-AHM-002', N'Quality Control', NULL),
    (NEWID(), @CompServicesId, 'CC-AHS-001', N'Service Operations', NULL);

-- Insert Budget Centers
INSERT INTO [org].[BudgetCenters] ([Id], [CompanyId], [Code], [Name], [FiscalYear], [TotalBudget])
VALUES
    (NEWID(), @CompTradingId, 'BC-AHT-2024', N'Trading 2024 Budget', 2024, 5000000.0000),
    (NEWID(), @CompConstructionId, 'BC-AHC-2024', N'Construction 2024 Budget', 2024, 15000000.0000),
    (NEWID(), @CompManufacturingId, 'BC-AHM-2024', N'Manufacturing 2024 Budget', 2024, 8000000.0000),
    (NEWID(), @CompServicesId, 'BC-AHS-2024', N'Services 2024 Budget', 2024, 3000000.0000);

-- Insert Numbering Rules
INSERT INTO [sys_admin].[NumberingRules] ([Id], [HoldingId], [CompanyId], [EntityType], [Prefix], [Separator], [PadLength], [CurrentSeq], [ResetPeriod], [IncludeYear])
VALUES
    (NEWID(), @HoldingId, @CompTradingId, 'PURCHASE_REQUEST', 'PR-AHT', '-', 6, 10, 'YEARLY', 1),
    (NEWID(), @HoldingId, @CompConstructionId, 'PURCHASE_REQUEST', 'PR-AHC', '-', 6, 8, 'YEARLY', 1),
    (NEWID(), @HoldingId, @CompManufacturingId, 'PURCHASE_REQUEST', 'PR-AHM', '-', 6, 5, 'YEARLY', 1),
    (NEWID(), @HoldingId, @CompServicesId, 'PURCHASE_REQUEST', 'PR-AHS', '-', 6, 3, 'YEARLY', 1);

PRINT '✅ Seed data insertion completed successfully!'
GO

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
PRINT ''
PRINT '=== DATABASE VERIFICATION ==='
PRINT ''

SELECT 'Holdings' AS [Table], COUNT(*) AS [Count] FROM [org].[Holdings]
UNION ALL SELECT 'Companies', COUNT(*) FROM [org].[Companies]
UNION ALL SELECT 'Departments', COUNT(*) FROM [org].[Departments]
UNION ALL SELECT 'BusinessVerticals', COUNT(*) FROM [org].[BusinessVerticals]
UNION ALL SELECT 'Users', COUNT(*) FROM [auth].[Users]
UNION ALL SELECT 'Roles', COUNT(*) FROM [auth].[Roles]
UNION ALL SELECT 'Permissions', COUNT(*) FROM [auth].[Permissions]
UNION ALL SELECT 'MaterialTypes', COUNT(*) FROM [mat].[MaterialTypes]
UNION ALL SELECT 'MaterialCategories', COUNT(*) FROM [mat].[MaterialCategories]
UNION ALL SELECT 'MaterialSubcategories', COUNT(*) FROM [mat].[MaterialSubcategories]
UNION ALL SELECT 'UnitsOfMeasure', COUNT(*) FROM [mat].[UnitsOfMeasure]
UNION ALL SELECT 'CostCenters', COUNT(*) FROM [org].[CostCenters]
UNION ALL SELECT 'BudgetCenters', COUNT(*) FROM [org].[BudgetCenters]
UNION ALL SELECT 'NumberingRules', COUNT(*) FROM [sys_admin].[NumberingRules]
ORDER BY [Table];
GO

PRINT ''
PRINT '============================================'
PRINT ' DATABASE CREATED SUCCESSFULLY!'
PRINT ' MaterialRequestDB is ready for use.'
PRINT '============================================'
GO
How to Execute This Script