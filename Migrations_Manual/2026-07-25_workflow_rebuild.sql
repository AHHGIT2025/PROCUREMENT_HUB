-- ============================================================
-- Workflow Rebuild Migration
-- Date: 2026-07-25
-- Purpose: Replace old workflow set with new 12-workflow structure
--          (GENERAL / IT / ASSET / IT_ASSET / LOGISTICS / LOGISTICS-ASSETS
--           x Global + Sweethouse Design & Decor override)
-- IMPORTANT: 101-GL-GENERAL has NO ItemCategory condition on purpose —
--            it is the true catch-all fallback (Priority lowest / IsDefault=1).
--            Set Priority + IsDefault manually after this script via
--            Settings > Workflow UI, as previously agreed.
-- ============================================================

USE MaterialRequestDB_App;
GO

-- ============================================================
-- STEP 0: Backup current production workflow tables
-- ============================================================
IF OBJECT_ID('WorkflowDefinitions_Backup_Prod_20260725') IS NOT NULL DROP TABLE WorkflowDefinitions_Backup_Prod_20260725;
IF OBJECT_ID('WorkflowSteps_Backup_Prod_20260725') IS NOT NULL DROP TABLE WorkflowSteps_Backup_Prod_20260725;
IF OBJECT_ID('WorkflowConditions_Backup_Prod_20260725') IS NOT NULL DROP TABLE WorkflowConditions_Backup_Prod_20260725;

SELECT * INTO WorkflowDefinitions_Backup_Prod_20260725 FROM WorkflowDefinitions;
SELECT * INTO WorkflowSteps_Backup_Prod_20260725 FROM WorkflowSteps;
SELECT * INTO WorkflowConditions_Backup_Prod_20260725 FROM WorkflowConditions;
GO

PRINT 'Backup complete. Row counts:';
SELECT 'WorkflowDefinitions_Backup' AS TableName, COUNT(*) AS Cnt FROM WorkflowDefinitions_Backup_Prod_20260725
UNION ALL SELECT 'WorkflowSteps_Backup', COUNT(*) FROM WorkflowSteps_Backup_Prod_20260725
UNION ALL SELECT 'WorkflowConditions_Backup', COUNT(*) FROM WorkflowConditions_Backup_Prod_20260725;
GO

-- ============================================================
-- STEP 1: Delete old workflow data (FK-safe order)
-- ============================================================
BEGIN TRAN DeleteOld;

DELETE FROM WorkflowConditions;
DELETE FROM WorkflowSteps;
DELETE FROM WorkflowDefinitions;

SELECT 'After Delete - WorkflowDefinitions' AS TableName, COUNT(*) AS Cnt FROM WorkflowDefinitions
UNION ALL SELECT 'After Delete - WorkflowSteps', COUNT(*) FROM WorkflowSteps
UNION ALL SELECT 'After Delete - WorkflowConditions', COUNT(*) FROM WorkflowConditions;

-- >>> Verify all three counts are 0 above, then run: COMMIT TRAN DeleteOld;
-- >>> If anything looks wrong, run: ROLLBACK TRAN DeleteOld;  and STOP.
GO

-- ============================================================
-- STEP 2: Insert 12 new WorkflowDefinitions
-- Priority left as 0 for all — set manually via Settings > Workflow
-- UI after this script runs, per company/category tiering discussed.
-- IsDefault also left as 0 — set 101-GL-GENERAL to 1 manually.
-- ============================================================
INSERT INTO WorkflowDefinitions (Id, Name, CompanyId, IsDefault, CreatedAt, UpdatedAt, IsActive, Code, EntityType, Priority, Version) VALUES ('DF87BFF6-21D4-4D54-948C-CBFD6AB58F0B', 'General Flow', NULL, 0, GETUTCDATE(), NULL, 1, '101-GL-GENERAL', 'PURCHASE_REQUEST', 0, 1);
INSERT INTO WorkflowDefinitions (Id, Name, CompanyId, IsDefault, CreatedAt, UpdatedAt, IsActive, Code, EntityType, Priority, Version) VALUES ('6501A9AA-309F-4874-B85E-83220CEDD37C', 'General-SW', 'DC713578-CAB5-4E73-9ABD-061C1857E694', 0, GETUTCDATE(), NULL, 1, '102-SW-GENERAL', 'PURCHASE_REQUEST', 0, 1);
INSERT INTO WorkflowDefinitions (Id, Name, CompanyId, IsDefault, CreatedAt, UpdatedAt, IsActive, Code, EntityType, Priority, Version) VALUES ('C601901B-9FDC-4A5A-BA90-8C6D87CCA36A', 'LOGISTICS FLOW', NULL, 0, GETUTCDATE(), NULL, 1, '103-GL-LOGISTICS', 'PURCHASE_REQUEST', 0, 1);
INSERT INTO WorkflowDefinitions (Id, Name, CompanyId, IsDefault, CreatedAt, UpdatedAt, IsActive, Code, EntityType, Priority, Version) VALUES ('68172C05-8501-4323-907A-39CE11125BEF', 'LOGISTICS -SW', 'DC713578-CAB5-4E73-9ABD-061C1857E694', 0, GETUTCDATE(), NULL, 1, '104-SW-LOG', 'PURCHASE_REQUEST', 0, 1);
INSERT INTO WorkflowDefinitions (Id, Name, CompanyId, IsDefault, CreatedAt, UpdatedAt, IsActive, Code, EntityType, Priority, Version) VALUES ('745249F1-9B82-4B9B-A68D-BB598810F099', 'IT FLOW', NULL, 0, GETUTCDATE(), NULL, 1, '105-GL-IT', 'PURCHASE_REQUEST', 0, 1);
INSERT INTO WorkflowDefinitions (Id, Name, CompanyId, IsDefault, CreatedAt, UpdatedAt, IsActive, Code, EntityType, Priority, Version) VALUES ('8F0455BB-9D10-401E-9A17-0787B1327B75', 'IT-SW', 'DC713578-CAB5-4E73-9ABD-061C1857E694', 0, GETUTCDATE(), NULL, 1, '106-SW-IT', 'PURCHASE_REQUEST', 0, 1);
INSERT INTO WorkflowDefinitions (Id, Name, CompanyId, IsDefault, CreatedAt, UpdatedAt, IsActive, Code, EntityType, Priority, Version) VALUES ('2FEC5739-FC3F-4291-A09E-E506DFF7DFE2', 'ASSET FLOW', NULL, 0, GETUTCDATE(), NULL, 1, '107-GL-AST', 'PURCHASE_REQUEST', 0, 1);
INSERT INTO WorkflowDefinitions (Id, Name, CompanyId, IsDefault, CreatedAt, UpdatedAt, IsActive, Code, EntityType, Priority, Version) VALUES ('4978AC1A-AA11-4B9E-B047-8FB6794A5D41', 'ASSET-SW', 'DC713578-CAB5-4E73-9ABD-061C1857E694', 0, GETUTCDATE(), NULL, 1, '108-SW-AST', 'PURCHASE_REQUEST', 0, 1);
INSERT INTO WorkflowDefinitions (Id, Name, CompanyId, IsDefault, CreatedAt, UpdatedAt, IsActive, Code, EntityType, Priority, Version) VALUES ('233058DD-8E06-4A48-BD44-E09861426543', 'IT ASSET FLOW', NULL, 0, GETUTCDATE(), NULL, 1, '109-GL-IT-AST', 'PURCHASE_REQUEST', 0, 1);
INSERT INTO WorkflowDefinitions (Id, Name, CompanyId, IsDefault, CreatedAt, UpdatedAt, IsActive, Code, EntityType, Priority, Version) VALUES ('F75AAD41-F62E-4DF3-B63C-66CB1BA4888E', 'IT ASSET-SW', 'DC713578-CAB5-4E73-9ABD-061C1857E694', 0, GETUTCDATE(), NULL, 1, '110-SW-IT-AST', 'PURCHASE_REQUEST', 0, 1);
INSERT INTO WorkflowDefinitions (Id, Name, CompanyId, IsDefault, CreatedAt, UpdatedAt, IsActive, Code, EntityType, Priority, Version) VALUES ('A89EAFEB-A731-450E-A9B3-272077B50983', 'LOGISTICS ASSET FLOW', NULL, 0, GETUTCDATE(), NULL, 1, '111-GL-L-AST', 'PURCHASE_REQUEST', 0, 1);
INSERT INTO WorkflowDefinitions (Id, Name, CompanyId, IsDefault, CreatedAt, UpdatedAt, IsActive, Code, EntityType, Priority, Version) VALUES ('379A6A25-EE52-42CB-AD8F-4E37C70D5E23', 'LOGISTICS ASSET- SW', 'DC713578-CAB5-4E73-9ABD-061C1857E694', 0, GETUTCDATE(), NULL, 1, '112-SW-LOG-AST', 'PURCHASE_REQUEST', 0, 1);
GO

PRINT 'WorkflowDefinitions inserted. Count should be 12:';
SELECT COUNT(*) AS DefinitionsCount FROM WorkflowDefinitions;
GO

-- ============================================================
-- STEP 3: Insert WorkflowSteps (55 rows)
-- ============================================================
INSERT INTO WorkflowSteps (Id, WorkflowDefinitionId, StepOrder, Name, RoleName, CreatedAt, IsActive, RoleId, StepType, ApproverType, TimeoutHours, IsRequired, CanDelegate) VALUES ('DC0EEAA2-C101-48F0-B4F8-BD8525C2A7FA', 'DF87BFF6-21D4-4D54-948C-CBFD6AB58F0B', 1, 'DEPARTMENT_MANAGER', '', GETUTCDATE(), 1, NULL, 'SEQUENTIAL', 'DEPARTMENT_MANAGER', 48, 1, 1);
INSERT INTO WorkflowSteps (Id, WorkflowDefinitionId, StepOrder, Name, RoleName, CreatedAt, IsActive, RoleId, StepType, ApproverType, TimeoutHours, IsRequired, CanDelegate) VALUES ('5A558C49-5278-4F90-B702-6CB4ECA2E982', 'DF87BFF6-21D4-4D54-948C-CBFD6AB58F0B', 2, 'BUDGET_MANAGER', 'Budget Manager', GETUTCDATE(), 1, '3BAA918D-43B0-4201-9FE8-25152335A694', 'SEQUENTIAL', 'ROLE', 48, 1, 1);
INSERT INTO WorkflowSteps (Id, WorkflowDefinitionId, StepOrder, Name, RoleName, CreatedAt, IsActive, RoleId, StepType, ApproverType, TimeoutHours, IsRequired, CanDelegate) VALUES ('805057C2-F588-4DC9-AA4B-B409BDFAF687', 'DF87BFF6-21D4-4D54-948C-CBFD6AB58F0B', 3, 'PURCHASE_MANAGER', 'Purchase Manager', GETUTCDATE(), 1, 'D6C3A5A2-8A0F-43BE-A85D-CEB39C4E0C46', 'SEQUENTIAL', 'ROLE', 48, 1, 1);
INSERT INTO WorkflowSteps (Id, WorkflowDefinitionId, StepOrder, Name, RoleName, CreatedAt, IsActive, RoleId, StepType, ApproverType, TimeoutHours, IsRequired, CanDelegate) VALUES ('0EAE7559-5837-4E6F-BFA7-906E38A51ACC', '6501A9AA-309F-4874-B85E-83220CEDD37C', 1, 'DEPARTMENT_MANAGER', '', GETUTCDATE(), 1, NULL, 'SEQUENTIAL', 'DEPARTMENT_MANAGER', 48, 1, 1);
INSERT INTO WorkflowSteps (Id, WorkflowDefinitionId, StepOrder, Name, RoleName, CreatedAt, IsActive, RoleId, StepType, ApproverType, TimeoutHours, IsRequired, CanDelegate) VALUES ('4CE2FAEA-1F0B-4A99-B455-B3E0E3ED95BB', '6501A9AA-309F-4874-B85E-83220CEDD37C', 2, 'GENERAL_MANAGER', 'SW-GM', GETUTCDATE(), 1, '8110594D-6704-4FE3-B2BF-528EE038F78A', 'SEQUENTIAL', 'ROLE', 48, 1, 1);
INSERT INTO WorkflowSteps (Id, WorkflowDefinitionId, StepOrder, Name, RoleName, CreatedAt, IsActive, RoleId, StepType, ApproverType, TimeoutHours, IsRequired, CanDelegate) VALUES ('F2D837D2-8312-4176-A50F-002AFD5150FC', '6501A9AA-309F-4874-B85E-83220CEDD37C', 3, 'BUDGET_MANAGER', 'Budget Manager', GETUTCDATE(), 1, '3BAA918D-43B0-4201-9FE8-25152335A694', 'SEQUENTIAL', 'ROLE', 48, 1, 1);
INSERT INTO WorkflowSteps (Id, WorkflowDefinitionId, StepOrder, Name, RoleName, CreatedAt, IsActive, RoleId, StepType, ApproverType, TimeoutHours, IsRequired, CanDelegate) VALUES ('FF706BAB-CE61-4A14-81A7-91ADC736F609', '6501A9AA-309F-4874-B85E-83220CEDD37C', 4, 'PURCHASE_MANAGER', 'Purchase Manager', GETUTCDATE(), 1, 'D6C3A5A2-8A0F-43BE-A85D-CEB39C4E0C46', 'SEQUENTIAL', 'ROLE', 48, 1, 1);
INSERT INTO WorkflowSteps (Id, WorkflowDefinitionId, StepOrder, Name, RoleName, CreatedAt, IsActive, RoleId, StepType, ApproverType, TimeoutHours, IsRequired, CanDelegate) VALUES ('2BCCEE2D-F13E-47D7-AF64-1DE0F2EF61C6', 'C601901B-9FDC-4A5A-BA90-8C6D87CCA36A', 1, 'DEPARTMENT_MANAGER', '', GETUTCDATE(), 1, NULL, 'SEQUENTIAL', 'DEPARTMENT_MANAGER', 48, 1, 1);
INSERT INTO WorkflowSteps (Id, WorkflowDefinitionId, StepOrder, Name, RoleName, CreatedAt, IsActive, RoleId, StepType, ApproverType, TimeoutHours, IsRequired, CanDelegate) VALUES ('EB62BC4E-CEE1-4006-9C28-125A9D256B7A', 'C601901B-9FDC-4A5A-BA90-8C6D87CCA36A', 2, 'LOGISTICS_MANAGER', 'Logistics Manager', GETUTCDATE(), 1, '3A9A7830-0DB8-4284-BE5F-F50CE6847A70', 'SEQUENTIAL', 'ROLE', 48, 1, 1);
INSERT INTO WorkflowSteps (Id, WorkflowDefinitionId, StepOrder, Name, RoleName, CreatedAt, IsActive, RoleId, StepType, ApproverType, TimeoutHours, IsRequired, CanDelegate) VALUES ('0C12AB52-AB4B-48CB-BFE4-39644820DADF', 'C601901B-9FDC-4A5A-BA90-8C6D87CCA36A', 3, 'BUDGET_MANAGER', 'Budget Manager', GETUTCDATE(), 1, '3BAA918D-43B0-4201-9FE8-25152335A694', 'SEQUENTIAL', 'ROLE', 48, 1, 1);
INSERT INTO WorkflowSteps (Id, WorkflowDefinitionId, StepOrder, Name, RoleName, CreatedAt, IsActive, RoleId, StepType, ApproverType, TimeoutHours, IsRequired, CanDelegate) VALUES ('EB7CA8C4-F7D9-467F-B2AA-2C2A97462C93', 'C601901B-9FDC-4A5A-BA90-8C6D87CCA36A', 4, 'PURCHASE_MANAGER', 'Purchase Manager', GETUTCDATE(), 1, 'D6C3A5A2-8A0F-43BE-A85D-CEB39C4E0C46', 'SEQUENTIAL', 'ROLE', 48, 1, 1);
INSERT INTO WorkflowSteps (Id, WorkflowDefinitionId, StepOrder, Name, RoleName, CreatedAt, IsActive, RoleId, StepType, ApproverType, TimeoutHours, IsRequired, CanDelegate) VALUES ('77350963-D89D-4241-B041-125098D95132', '68172C05-8501-4323-907A-39CE11125BEF', 1, 'DEPARTMENT_MANAGER', '', GETUTCDATE(), 1, NULL, 'SEQUENTIAL', 'DEPARTMENT_MANAGER', 48, 1, 1);
INSERT INTO WorkflowSteps (Id, WorkflowDefinitionId, StepOrder, Name, RoleName, CreatedAt, IsActive, RoleId, StepType, ApproverType, TimeoutHours, IsRequired, CanDelegate) VALUES ('4671A5F2-CFC7-410E-A958-3275C49AEEB5', '68172C05-8501-4323-907A-39CE11125BEF', 2, 'GENERAL_MANAGER', 'SW-GM', GETUTCDATE(), 1, '8110594D-6704-4FE3-B2BF-528EE038F78A', 'SEQUENTIAL', 'ROLE', 48, 1, 1);
INSERT INTO WorkflowSteps (Id, WorkflowDefinitionId, StepOrder, Name, RoleName, CreatedAt, IsActive, RoleId, StepType, ApproverType, TimeoutHours, IsRequired, CanDelegate) VALUES ('C6CCCDA8-5378-44EA-B355-37A56202827A', '68172C05-8501-4323-907A-39CE11125BEF', 3, 'LOGISTICS_MANAGER', 'Logistics Manager', GETUTCDATE(), 1, '3A9A7830-0DB8-4284-BE5F-F50CE6847A70', 'SEQUENTIAL', 'ROLE', 48, 1, 1);
INSERT INTO WorkflowSteps (Id, WorkflowDefinitionId, StepOrder, Name, RoleName, CreatedAt, IsActive, RoleId, StepType, ApproverType, TimeoutHours, IsRequired, CanDelegate) VALUES ('5B3E7DA8-50B5-48E3-8D2B-1081E95D8CB9', '68172C05-8501-4323-907A-39CE11125BEF', 4, 'BUDGET_MANAGER', 'Budget Manager', GETUTCDATE(), 1, '3BAA918D-43B0-4201-9FE8-25152335A694', 'SEQUENTIAL', 'ROLE', 48, 1, 1);
INSERT INTO WorkflowSteps (Id, WorkflowDefinitionId, StepOrder, Name, RoleName, CreatedAt, IsActive, RoleId, StepType, ApproverType, TimeoutHours, IsRequired, CanDelegate) VALUES ('0B7BA338-F86F-426F-90FA-EB0282C49599', '68172C05-8501-4323-907A-39CE11125BEF', 5, 'PURCHASE_MANAGER', 'Purchase Manager', GETUTCDATE(), 1, 'D6C3A5A2-8A0F-43BE-A85D-CEB39C4E0C46', 'SEQUENTIAL', 'ROLE', 48, 1, 1);
INSERT INTO WorkflowSteps (Id, WorkflowDefinitionId, StepOrder, Name, RoleName, CreatedAt, IsActive, RoleId, StepType, ApproverType, TimeoutHours, IsRequired, CanDelegate) VALUES ('DB0C6AC6-5F16-458D-83E6-0305A62BE007', '745249F1-9B82-4B9B-A68D-BB598810F099', 1, 'DEPARTMENT_MANAGER', 'DEPARTMENT_MANAGER', GETUTCDATE(), 1, NULL, 'APPROVAL', 'DEPARTMENT_MANAGER', NULL, 1, 1);
INSERT INTO WorkflowSteps (Id, WorkflowDefinitionId, StepOrder, Name, RoleName, CreatedAt, IsActive, RoleId, StepType, ApproverType, TimeoutHours, IsRequired, CanDelegate) VALUES ('DA80F54B-B821-4038-A513-AC26D5BBE148', '745249F1-9B82-4B9B-A68D-BB598810F099', 2, 'IT_MANAGER', 'IT Manager', GETUTCDATE(), 1, 'FB9BEAFC-67A3-4DE1-A951-218A5134BBE1', 'APPROVAL', 'ROLE', NULL, 1, 1);
INSERT INTO WorkflowSteps (Id, WorkflowDefinitionId, StepOrder, Name, RoleName, CreatedAt, IsActive, RoleId, StepType, ApproverType, TimeoutHours, IsRequired, CanDelegate) VALUES ('A28D5F1C-5F33-4BE1-A47C-1D7173443C8F', '745249F1-9B82-4B9B-A68D-BB598810F099', 3, 'BUDGET_MANAGER', 'Budget Manager', GETUTCDATE(), 1, '3BAA918D-43B0-4201-9FE8-25152335A694', 'APPROVAL', 'ROLE', NULL, 1, 1);
INSERT INTO WorkflowSteps (Id, WorkflowDefinitionId, StepOrder, Name, RoleName, CreatedAt, IsActive, RoleId, StepType, ApproverType, TimeoutHours, IsRequired, CanDelegate) VALUES ('13B21299-D716-4F42-AAC2-F9ADE49B2252', '745249F1-9B82-4B9B-A68D-BB598810F099', 4, 'PURCHASE_MANAGER', 'Purchase Manager', GETUTCDATE(), 1, 'D6C3A5A2-8A0F-43BE-A85D-CEB39C4E0C46', 'APPROVAL', 'ROLE', NULL, 1, 1);
INSERT INTO WorkflowSteps (Id, WorkflowDefinitionId, StepOrder, Name, RoleName, CreatedAt, IsActive, RoleId, StepType, ApproverType, TimeoutHours, IsRequired, CanDelegate) VALUES ('D34EB304-4228-4ED6-B32E-59EDFEA32495', '8F0455BB-9D10-401E-9A17-0787B1327B75', 1, 'DEPARTMENT_MANAGER', 'DEPARTMENT_MANAGER', GETUTCDATE(), 1, NULL, 'APPROVAL', 'DEPARTMENT_MANAGER', NULL, 1, 1);
INSERT INTO WorkflowSteps (Id, WorkflowDefinitionId, StepOrder, Name, RoleName, CreatedAt, IsActive, RoleId, StepType, ApproverType, TimeoutHours, IsRequired, CanDelegate) VALUES ('35F07625-1B29-4CCB-AD0F-716F28FD1843', '8F0455BB-9D10-401E-9A17-0787B1327B75', 2, 'GENERAL_MANAGER', 'SW-GM', GETUTCDATE(), 1, '8110594D-6704-4FE3-B2BF-528EE038F78A', 'APPROVAL', 'ROLE', NULL, 1, 1);
INSERT INTO WorkflowSteps (Id, WorkflowDefinitionId, StepOrder, Name, RoleName, CreatedAt, IsActive, RoleId, StepType, ApproverType, TimeoutHours, IsRequired, CanDelegate) VALUES ('CBAE2C70-4BC7-404D-B358-46C7207EAD81', '8F0455BB-9D10-401E-9A17-0787B1327B75', 3, 'IT_MANAGER', 'IT Manager', GETUTCDATE(), 1, 'FB9BEAFC-67A3-4DE1-A951-218A5134BBE1', 'APPROVAL', 'ROLE', NULL, 1, 1);
INSERT INTO WorkflowSteps (Id, WorkflowDefinitionId, StepOrder, Name, RoleName, CreatedAt, IsActive, RoleId, StepType, ApproverType, TimeoutHours, IsRequired, CanDelegate) VALUES ('76546892-2C78-4D53-8708-3F0557475AA4', '8F0455BB-9D10-401E-9A17-0787B1327B75', 4, 'BUDGET_MANAGER', 'Budget Manager', GETUTCDATE(), 1, '3BAA918D-43B0-4201-9FE8-25152335A694', 'APPROVAL', 'ROLE', NULL, 1, 1);
INSERT INTO WorkflowSteps (Id, WorkflowDefinitionId, StepOrder, Name, RoleName, CreatedAt, IsActive, RoleId, StepType, ApproverType, TimeoutHours, IsRequired, CanDelegate) VALUES ('62F5CC7F-26B6-42E1-A02D-8914249A530E', '8F0455BB-9D10-401E-9A17-0787B1327B75', 5, 'PURCHASE_MANAGER', 'Purchase Manager', GETUTCDATE(), 1, 'D6C3A5A2-8A0F-43BE-A85D-CEB39C4E0C46', 'APPROVAL', 'ROLE', NULL, 1, 1);
INSERT INTO WorkflowSteps (Id, WorkflowDefinitionId, StepOrder, Name, RoleName, CreatedAt, IsActive, RoleId, StepType, ApproverType, TimeoutHours, IsRequired, CanDelegate) VALUES ('2DC62070-19FB-4258-878A-6144434F62A0', '2FEC5739-FC3F-4291-A09E-E506DFF7DFE2', 1, 'DEPARTMENT_MANAGER', 'DEPARTMENT_MANAGER', GETUTCDATE(), 1, NULL, 'APPROVAL', 'DEPARTMENT_MANAGER', NULL, 1, 1);
INSERT INTO WorkflowSteps (Id, WorkflowDefinitionId, StepOrder, Name, RoleName, CreatedAt, IsActive, RoleId, StepType, ApproverType, TimeoutHours, IsRequired, CanDelegate) VALUES ('18ACF790-526E-45A1-95A7-242E93ED02F0', '2FEC5739-FC3F-4291-A09E-E506DFF7DFE2', 2, 'BUDGET_MANAGER', 'Budget Manager', GETUTCDATE(), 1, '3BAA918D-43B0-4201-9FE8-25152335A694', 'APPROVAL', 'ROLE', NULL, 1, 1);
INSERT INTO WorkflowSteps (Id, WorkflowDefinitionId, StepOrder, Name, RoleName, CreatedAt, IsActive, RoleId, StepType, ApproverType, TimeoutHours, IsRequired, CanDelegate) VALUES ('201AA66C-16E4-45D3-84B5-14224F61EC2C', '2FEC5739-FC3F-4291-A09E-E506DFF7DFE2', 3, 'PURCHASE_MANAGER', 'Purchase Manager', GETUTCDATE(), 1, 'D6C3A5A2-8A0F-43BE-A85D-CEB39C4E0C46', 'APPROVAL', 'ROLE', NULL, 1, 1);
INSERT INTO WorkflowSteps (Id, WorkflowDefinitionId, StepOrder, Name, RoleName, CreatedAt, IsActive, RoleId, StepType, ApproverType, TimeoutHours, IsRequired, CanDelegate) VALUES ('A0DEFC7E-8162-429F-9FAF-C7E5DD1E2196', '2FEC5739-FC3F-4291-A09E-E506DFF7DFE2', 4, 'CEO', 'CEO', GETUTCDATE(), 1, 'C6ABCAFF-15AF-4905-AA7D-ABC5247273B1', 'SEQUENTIAL', 'ROLE', 48, 1, 1);
INSERT INTO WorkflowSteps (Id, WorkflowDefinitionId, StepOrder, Name, RoleName, CreatedAt, IsActive, RoleId, StepType, ApproverType, TimeoutHours, IsRequired, CanDelegate) VALUES ('C49006C9-F800-47D2-97E1-5D812F19F472', '4978AC1A-AA11-4B9E-B047-8FB6794A5D41', 1, 'DEPARTMENT_MANAGER', 'DEPARTMENT_MANAGER', GETUTCDATE(), 1, NULL, 'APPROVAL', 'DEPARTMENT_MANAGER', NULL, 1, 1);
INSERT INTO WorkflowSteps (Id, WorkflowDefinitionId, StepOrder, Name, RoleName, CreatedAt, IsActive, RoleId, StepType, ApproverType, TimeoutHours, IsRequired, CanDelegate) VALUES ('2A936896-FB8E-40CB-8317-468B332D0963', '4978AC1A-AA11-4B9E-B047-8FB6794A5D41', 2, 'GENERAL_MANAGER', 'SW-GM', GETUTCDATE(), 1, '8110594D-6704-4FE3-B2BF-528EE038F78A', 'APPROVAL', 'ROLE', NULL, 1, 1);
INSERT INTO WorkflowSteps (Id, WorkflowDefinitionId, StepOrder, Name, RoleName, CreatedAt, IsActive, RoleId, StepType, ApproverType, TimeoutHours, IsRequired, CanDelegate) VALUES ('2EA9EF90-7268-4B9F-9819-ABBB159855DA', '4978AC1A-AA11-4B9E-B047-8FB6794A5D41', 3, 'BUDGET_MANAGER', 'Budget Manager', GETUTCDATE(), 1, '3BAA918D-43B0-4201-9FE8-25152335A694', 'APPROVAL', 'ROLE', NULL, 1, 1);
INSERT INTO WorkflowSteps (Id, WorkflowDefinitionId, StepOrder, Name, RoleName, CreatedAt, IsActive, RoleId, StepType, ApproverType, TimeoutHours, IsRequired, CanDelegate) VALUES ('62DD31B0-2F35-4CAF-B8EB-238C839DA44A', '4978AC1A-AA11-4B9E-B047-8FB6794A5D41', 4, 'PURCHASE_MANAGER', 'Purchase Manager', GETUTCDATE(), 1, 'D6C3A5A2-8A0F-43BE-A85D-CEB39C4E0C46', 'APPROVAL', 'ROLE', NULL, 1, 1);
INSERT INTO WorkflowSteps (Id, WorkflowDefinitionId, StepOrder, Name, RoleName, CreatedAt, IsActive, RoleId, StepType, ApproverType, TimeoutHours, IsRequired, CanDelegate) VALUES ('D38940A3-665D-4378-8739-4FF0E78B5AE9', '4978AC1A-AA11-4B9E-B047-8FB6794A5D41', 5, 'CEO', 'CEO', GETUTCDATE(), 1, 'C6ABCAFF-15AF-4905-AA7D-ABC5247273B1', 'SEQUENTIAL', 'ROLE', 48, 1, 1);
INSERT INTO WorkflowSteps (Id, WorkflowDefinitionId, StepOrder, Name, RoleName, CreatedAt, IsActive, RoleId, StepType, ApproverType, TimeoutHours, IsRequired, CanDelegate) VALUES ('D0825E90-A1CD-47CF-A0F5-8C7CC331113B', '233058DD-8E06-4A48-BD44-E09861426543', 1, 'DEPARTMENT_MANAGER', 'DEPARTMENT_MANAGER', GETUTCDATE(), 1, NULL, 'APPROVAL', 'DEPARTMENT_MANAGER', NULL, 1, 1);
INSERT INTO WorkflowSteps (Id, WorkflowDefinitionId, StepOrder, Name, RoleName, CreatedAt, IsActive, RoleId, StepType, ApproverType, TimeoutHours, IsRequired, CanDelegate) VALUES ('46D19157-B825-4671-85E8-2A432B16D351', '233058DD-8E06-4A48-BD44-E09861426543', 2, 'IT_MANAGER', 'IT Manager', GETUTCDATE(), 1, 'FB9BEAFC-67A3-4DE1-A951-218A5134BBE1', 'APPROVAL', 'ROLE', NULL, 1, 1);
INSERT INTO WorkflowSteps (Id, WorkflowDefinitionId, StepOrder, Name, RoleName, CreatedAt, IsActive, RoleId, StepType, ApproverType, TimeoutHours, IsRequired, CanDelegate) VALUES ('2397ED4E-5ADB-4FA7-A79E-C71531A5C961', '233058DD-8E06-4A48-BD44-E09861426543', 3, 'BUDGET_MANAGER', 'Budget Manager', GETUTCDATE(), 1, '3BAA918D-43B0-4201-9FE8-25152335A694', 'APPROVAL', 'ROLE', NULL, 1, 1);
INSERT INTO WorkflowSteps (Id, WorkflowDefinitionId, StepOrder, Name, RoleName, CreatedAt, IsActive, RoleId, StepType, ApproverType, TimeoutHours, IsRequired, CanDelegate) VALUES ('68CA27BC-8CB5-4E28-8908-6890D8FA4893', '233058DD-8E06-4A48-BD44-E09861426543', 4, 'PURCHASE_MANAGER', 'Purchase Manager', GETUTCDATE(), 1, 'D6C3A5A2-8A0F-43BE-A85D-CEB39C4E0C46', 'APPROVAL', 'ROLE', NULL, 1, 1);
INSERT INTO WorkflowSteps (Id, WorkflowDefinitionId, StepOrder, Name, RoleName, CreatedAt, IsActive, RoleId, StepType, ApproverType, TimeoutHours, IsRequired, CanDelegate) VALUES ('C3FDDE9D-ADF6-48F7-9BC7-F37C0FD951F6', '233058DD-8E06-4A48-BD44-E09861426543', 5, 'CEO', 'CEO', GETUTCDATE(), 1, 'C6ABCAFF-15AF-4905-AA7D-ABC5247273B1', 'SEQUENTIAL', 'ROLE', 48, 1, 1);
INSERT INTO WorkflowSteps (Id, WorkflowDefinitionId, StepOrder, Name, RoleName, CreatedAt, IsActive, RoleId, StepType, ApproverType, TimeoutHours, IsRequired, CanDelegate) VALUES ('F4B2B167-7E2E-4320-BA06-2396D1245BC9', 'F75AAD41-F62E-4DF3-B63C-66CB1BA4888E', 1, 'DEPARTMENT_MANAGER', 'DEPARTMENT_MANAGER', GETUTCDATE(), 1, NULL, 'APPROVAL', 'DEPARTMENT_MANAGER', NULL, 1, 1);
INSERT INTO WorkflowSteps (Id, WorkflowDefinitionId, StepOrder, Name, RoleName, CreatedAt, IsActive, RoleId, StepType, ApproverType, TimeoutHours, IsRequired, CanDelegate) VALUES ('A7B9A9B2-BE5B-4497-9DF1-549846B87E15', 'F75AAD41-F62E-4DF3-B63C-66CB1BA4888E', 2, 'GENERAL_MANAGER', 'SW-GM', GETUTCDATE(), 1, '8110594D-6704-4FE3-B2BF-528EE038F78A', 'APPROVAL', 'ROLE', NULL, 1, 1);
INSERT INTO WorkflowSteps (Id, WorkflowDefinitionId, StepOrder, Name, RoleName, CreatedAt, IsActive, RoleId, StepType, ApproverType, TimeoutHours, IsRequired, CanDelegate) VALUES ('BB8F868D-6603-4D9B-8D61-DBC67D3CBFAD', 'F75AAD41-F62E-4DF3-B63C-66CB1BA4888E', 3, 'IT_MANAGER', 'IT Manager', GETUTCDATE(), 1, 'FB9BEAFC-67A3-4DE1-A951-218A5134BBE1', 'APPROVAL', 'ROLE', NULL, 1, 1);
INSERT INTO WorkflowSteps (Id, WorkflowDefinitionId, StepOrder, Name, RoleName, CreatedAt, IsActive, RoleId, StepType, ApproverType, TimeoutHours, IsRequired, CanDelegate) VALUES ('FCA627BB-B9F2-45FA-89AB-6640A3140FC1', 'F75AAD41-F62E-4DF3-B63C-66CB1BA4888E', 4, 'BUDGET_MANAGER', 'Budget Manager', GETUTCDATE(), 1, '3BAA918D-43B0-4201-9FE8-25152335A694', 'APPROVAL', 'ROLE', NULL, 1, 1);
INSERT INTO WorkflowSteps (Id, WorkflowDefinitionId, StepOrder, Name, RoleName, CreatedAt, IsActive, RoleId, StepType, ApproverType, TimeoutHours, IsRequired, CanDelegate) VALUES ('6695108F-04B2-4FC7-B280-261C7077E8AC', 'F75AAD41-F62E-4DF3-B63C-66CB1BA4888E', 5, 'PURCHASE_MANAGER', 'Purchase Manager', GETUTCDATE(), 1, 'D6C3A5A2-8A0F-43BE-A85D-CEB39C4E0C46', 'APPROVAL', 'ROLE', NULL, 1, 1);
INSERT INTO WorkflowSteps (Id, WorkflowDefinitionId, StepOrder, Name, RoleName, CreatedAt, IsActive, RoleId, StepType, ApproverType, TimeoutHours, IsRequired, CanDelegate) VALUES ('F118EE13-BA74-4687-B93F-6C7C43582C44', 'F75AAD41-F62E-4DF3-B63C-66CB1BA4888E', 6, 'CEO', 'CEO', GETUTCDATE(), 1, 'C6ABCAFF-15AF-4905-AA7D-ABC5247273B1', 'SEQUENTIAL', 'ROLE', 48, 1, 1);
INSERT INTO WorkflowSteps (Id, WorkflowDefinitionId, StepOrder, Name, RoleName, CreatedAt, IsActive, RoleId, StepType, ApproverType, TimeoutHours, IsRequired, CanDelegate) VALUES ('8262C99A-DD82-4A66-87B8-5977EC84EF06', 'A89EAFEB-A731-450E-A9B3-272077B50983', 1, 'DEPARTMENT_MANAGER', 'DEPARTMENT_MANAGER', GETUTCDATE(), 1, NULL, 'APPROVAL', 'DEPARTMENT_MANAGER', NULL, 1, 1);
INSERT INTO WorkflowSteps (Id, WorkflowDefinitionId, StepOrder, Name, RoleName, CreatedAt, IsActive, RoleId, StepType, ApproverType, TimeoutHours, IsRequired, CanDelegate) VALUES ('A940D607-1937-43EB-9711-88DCFA5E28C3', 'A89EAFEB-A731-450E-A9B3-272077B50983', 2, 'LOGISTICS_MANAGER', 'Logistics Manager', GETUTCDATE(), 1, '3A9A7830-0DB8-4284-BE5F-F50CE6847A70', 'APPROVAL', 'ROLE', NULL, 1, 1);
INSERT INTO WorkflowSteps (Id, WorkflowDefinitionId, StepOrder, Name, RoleName, CreatedAt, IsActive, RoleId, StepType, ApproverType, TimeoutHours, IsRequired, CanDelegate) VALUES ('C9B835D0-A938-4AE0-BAE2-2910FF1950F4', 'A89EAFEB-A731-450E-A9B3-272077B50983', 3, 'BUDGET_MANAGER', 'Budget Manager', GETUTCDATE(), 1, '3BAA918D-43B0-4201-9FE8-25152335A694', 'APPROVAL', 'ROLE', NULL, 1, 1);
INSERT INTO WorkflowSteps (Id, WorkflowDefinitionId, StepOrder, Name, RoleName, CreatedAt, IsActive, RoleId, StepType, ApproverType, TimeoutHours, IsRequired, CanDelegate) VALUES ('A0F3D351-9B73-4795-A979-77B2E762A573', 'A89EAFEB-A731-450E-A9B3-272077B50983', 4, 'PURCHASE_MANAGER', 'Purchase Manager', GETUTCDATE(), 1, 'D6C3A5A2-8A0F-43BE-A85D-CEB39C4E0C46', 'APPROVAL', 'ROLE', NULL, 1, 1);
INSERT INTO WorkflowSteps (Id, WorkflowDefinitionId, StepOrder, Name, RoleName, CreatedAt, IsActive, RoleId, StepType, ApproverType, TimeoutHours, IsRequired, CanDelegate) VALUES ('61BD946C-C1A5-40B3-849A-796818ACA887', 'A89EAFEB-A731-450E-A9B3-272077B50983', 5, 'CEO', 'CEO', GETUTCDATE(), 1, 'C6ABCAFF-15AF-4905-AA7D-ABC5247273B1', 'SEQUENTIAL', 'ROLE', 48, 1, 1);
INSERT INTO WorkflowSteps (Id, WorkflowDefinitionId, StepOrder, Name, RoleName, CreatedAt, IsActive, RoleId, StepType, ApproverType, TimeoutHours, IsRequired, CanDelegate) VALUES ('87241630-FD38-4AF8-95D4-AEBECE6CD8DF', '379A6A25-EE52-42CB-AD8F-4E37C70D5E23', 1, 'DEPARTMENT_MANAGER', 'DEPARTMENT_MANAGER', GETUTCDATE(), 1, NULL, 'APPROVAL', 'DEPARTMENT_MANAGER', NULL, 1, 1);
INSERT INTO WorkflowSteps (Id, WorkflowDefinitionId, StepOrder, Name, RoleName, CreatedAt, IsActive, RoleId, StepType, ApproverType, TimeoutHours, IsRequired, CanDelegate) VALUES ('1898DC14-10AC-4CF0-B943-C2B46A369D2B', '379A6A25-EE52-42CB-AD8F-4E37C70D5E23', 2, 'GENERAL_MANAGER', 'SW-GM', GETUTCDATE(), 1, '8110594D-6704-4FE3-B2BF-528EE038F78A', 'APPROVAL', 'ROLE', NULL, 1, 1);
INSERT INTO WorkflowSteps (Id, WorkflowDefinitionId, StepOrder, Name, RoleName, CreatedAt, IsActive, RoleId, StepType, ApproverType, TimeoutHours, IsRequired, CanDelegate) VALUES ('B5C6E558-6C17-4721-BAC9-47600AED037E', '379A6A25-EE52-42CB-AD8F-4E37C70D5E23', 3, 'LOGISTICS_MANAGER', 'Logistics Manager', GETUTCDATE(), 1, '3A9A7830-0DB8-4284-BE5F-F50CE6847A70', 'APPROVAL', 'ROLE', NULL, 1, 1);
INSERT INTO WorkflowSteps (Id, WorkflowDefinitionId, StepOrder, Name, RoleName, CreatedAt, IsActive, RoleId, StepType, ApproverType, TimeoutHours, IsRequired, CanDelegate) VALUES ('4C15CD8A-44C4-4E15-A81C-F7D7CFED368F', '379A6A25-EE52-42CB-AD8F-4E37C70D5E23', 4, 'BUDGET_MANAGER', 'Budget Manager', GETUTCDATE(), 1, '3BAA918D-43B0-4201-9FE8-25152335A694', 'APPROVAL', 'ROLE', NULL, 1, 1);
INSERT INTO WorkflowSteps (Id, WorkflowDefinitionId, StepOrder, Name, RoleName, CreatedAt, IsActive, RoleId, StepType, ApproverType, TimeoutHours, IsRequired, CanDelegate) VALUES ('C0CD21FF-2414-4915-9D2A-23B7E0BBDABA', '379A6A25-EE52-42CB-AD8F-4E37C70D5E23', 5, 'PURCHASE_MANAGER', 'Purchase Manager', GETUTCDATE(), 1, 'D6C3A5A2-8A0F-43BE-A85D-CEB39C4E0C46', 'APPROVAL', 'ROLE', NULL, 1, 1);
INSERT INTO WorkflowSteps (Id, WorkflowDefinitionId, StepOrder, Name, RoleName, CreatedAt, IsActive, RoleId, StepType, ApproverType, TimeoutHours, IsRequired, CanDelegate) VALUES ('83D4EBC5-D7D9-42F5-BC44-A73648F25019', '379A6A25-EE52-42CB-AD8F-4E37C70D5E23', 6, 'CEO', 'CEO', GETUTCDATE(), 1, 'C6ABCAFF-15AF-4905-AA7D-ABC5247273B1', 'SEQUENTIAL', 'ROLE', 48, 1, 1);
GO

PRINT 'WorkflowSteps inserted. Count should be 55:';
SELECT COUNT(*) AS StepsCount FROM WorkflowSteps;
GO

-- ============================================================
-- STEP 4: Insert WorkflowConditions
-- 101-GL-GENERAL gets 4 conditions (GENERAL/CIVIL/UNIFORM/SAFETY)
-- with ConditionMatchLogic = 'ANY' so it matches any one of them.
-- All other 11 workflows keep their single-category condition.
-- ============================================================

-- Set ANY logic on the General flow (matches multiple categories)
UPDATE WorkflowDefinitions
SET ConditionMatchLogic = 'ANY'
WHERE Id = 'DF87BFF6-21D4-4D54-948C-CBFD6AB58F0B';

-- 101-GL-GENERAL: GENERAL, CIVIL, UNIFORM, SAFETY (multi-condition, ANY logic)
INSERT INTO WorkflowConditions (Id, WorkflowDefinitionId, Field, Operator, Value, CreatedAt, IsActive, ValueType) VALUES (NEWID(), 'DF87BFF6-21D4-4D54-948C-CBFD6AB58F0B', 'ItemCategory', 'EQUALS', 'GENERAL', GETUTCDATE(), 1, 'string');
INSERT INTO WorkflowConditions (Id, WorkflowDefinitionId, Field, Operator, Value, CreatedAt, IsActive, ValueType) VALUES (NEWID(), 'DF87BFF6-21D4-4D54-948C-CBFD6AB58F0B', 'ItemCategory', 'EQUALS', 'CIVIL', GETUTCDATE(), 1, 'string');
INSERT INTO WorkflowConditions (Id, WorkflowDefinitionId, Field, Operator, Value, CreatedAt, IsActive, ValueType) VALUES (NEWID(), 'DF87BFF6-21D4-4D54-948C-CBFD6AB58F0B', 'ItemCategory', 'EQUALS', 'UNIFORM', GETUTCDATE(), 1, 'string');
INSERT INTO WorkflowConditions (Id, WorkflowDefinitionId, Field, Operator, Value, CreatedAt, IsActive, ValueType) VALUES (NEWID(), 'DF87BFF6-21D4-4D54-948C-CBFD6AB58F0B', 'ItemCategory', 'EQUALS', 'SAFETY', GETUTCDATE(), 1, 'string');

-- Other 11 workflows: single-category conditions
INSERT INTO WorkflowConditions (Id, WorkflowDefinitionId, Field, Operator, Value, CreatedAt, IsActive, ValueType) VALUES ('3666A5C0-3716-4BC4-B342-1376BBB9E084', '6501A9AA-309F-4874-B85E-83220CEDD37C', 'ItemCategory', 'EQUALS', 'GENERAL', GETUTCDATE(), 1, 'string');
INSERT INTO WorkflowConditions (Id, WorkflowDefinitionId, Field, Operator, Value, CreatedAt, IsActive, ValueType) VALUES ('BD83D74C-7902-4E70-BB8C-CAB558917D8E', 'C601901B-9FDC-4A5A-BA90-8C6D87CCA36A', 'ItemCategory', 'EQUALS', 'LOGISTICS', GETUTCDATE(), 1, 'string');
INSERT INTO WorkflowConditions (Id, WorkflowDefinitionId, Field, Operator, Value, CreatedAt, IsActive, ValueType) VALUES ('A91329D5-0FB8-4DEB-A6AA-E6FD0BDA632C', '68172C05-8501-4323-907A-39CE11125BEF', 'ItemCategory', 'EQUALS', 'LOGISTICS', GETUTCDATE(), 1, 'string');
INSERT INTO WorkflowConditions (Id, WorkflowDefinitionId, Field, Operator, Value, CreatedAt, IsActive, ValueType) VALUES ('77AF1FA3-994F-4C7B-9A7A-710DF3F2625B', '745249F1-9B82-4B9B-A68D-BB598810F099', 'ItemCategory', 'EQUALS', 'IT', GETUTCDATE(), 1, 'string');
INSERT INTO WorkflowConditions (Id, WorkflowDefinitionId, Field, Operator, Value, CreatedAt, IsActive, ValueType) VALUES ('B962C4D7-FB29-4FFC-A5BD-D5B675151D8B', '8F0455BB-9D10-401E-9A17-0787B1327B75', 'ItemCategory', 'EQUALS', 'IT', GETUTCDATE(), 1, 'string');
INSERT INTO WorkflowConditions (Id, WorkflowDefinitionId, Field, Operator, Value, CreatedAt, IsActive, ValueType) VALUES ('488E4BB3-F496-43D8-85CD-960FA17E4FB3', '2FEC5739-FC3F-4291-A09E-E506DFF7DFE2', 'ItemCategory', 'EQUALS', 'ASSET', GETUTCDATE(), 1, 'string');
INSERT INTO WorkflowConditions (Id, WorkflowDefinitionId, Field, Operator, Value, CreatedAt, IsActive, ValueType) VALUES ('26FF94A1-D409-4440-9B05-C369FA8E47CA', '4978AC1A-AA11-4B9E-B047-8FB6794A5D41', 'ItemCategory', 'EQUALS', 'ASSET', GETUTCDATE(), 1, 'string');
INSERT INTO WorkflowConditions (Id, WorkflowDefinitionId, Field, Operator, Value, CreatedAt, IsActive, ValueType) VALUES ('5D5B9FB0-BD10-440F-BAF8-0FF1AA8CCD90', '233058DD-8E06-4A48-BD44-E09861426543', 'ItemCategory', 'EQUALS', 'IT_ASSET', GETUTCDATE(), 1, 'string');
INSERT INTO WorkflowConditions (Id, WorkflowDefinitionId, Field, Operator, Value, CreatedAt, IsActive, ValueType) VALUES ('A27F08EF-4C63-4074-989E-5F9F2B39012B', 'F75AAD41-F62E-4DF3-B63C-66CB1BA4888E', 'ItemCategory', 'EQUALS', 'IT_ASSET', GETUTCDATE(), 1, 'string');
INSERT INTO WorkflowConditions (Id, WorkflowDefinitionId, Field, Operator, Value, CreatedAt, IsActive, ValueType) VALUES ('B9BA31BD-85CC-4971-938F-5C272828B5E7', 'A89EAFEB-A731-450E-A9B3-272077B50983', 'ItemCategory', 'EQUALS', 'LOGISTICS-ASSETS', GETUTCDATE(), 1, 'string');
INSERT INTO WorkflowConditions (Id, WorkflowDefinitionId, Field, Operator, Value, CreatedAt, IsActive, ValueType) VALUES ('E1A95D1D-E250-47E4-AE73-AF5CD3E84106', '379A6A25-EE52-42CB-AD8F-4E37C70D5E23', 'ItemCategory', 'EQUALS', 'LOGISTICS-ASSETS', GETUTCDATE(), 1, 'string');
GO

PRINT 'WorkflowConditions inserted. Count should be 15 (4 for GENERAL + 11 others):';
SELECT COUNT(*) AS ConditionsCount FROM WorkflowConditions;
GO

-- ============================================================
-- STEP 5: Final verification before commit
-- ============================================================
SELECT wd.Code, wd.Name, wd.CompanyId, wd.ConditionMatchLogic,
       (SELECT COUNT(*) FROM WorkflowSteps ws WHERE ws.WorkflowDefinitionId = wd.Id) AS StepCount,
       (SELECT COUNT(*) FROM WorkflowConditions wc WHERE wc.WorkflowDefinitionId = wd.Id) AS ConditionCount
FROM WorkflowDefinitions wd
ORDER BY wd.Code;

-- ============================================================
-- >>> REVIEW the results above carefully.
-- >>> If everything looks correct (12 definitions, 55 steps total,
-- >>>  15 conditions total, GENERAL flow has 4 conditions):
--
--         COMMIT TRAN DeleteOld;
--
-- >>> If something looks wrong:
--
--         ROLLBACK TRAN DeleteOld;
-- ============================================================

-- ============================================================
-- MANUAL STEPS AFTER COMMIT (via Settings > Workflow UI):
-- 1. Set Priority on all 12 workflows per agreed tiering
--    (10=GENERAL catch-all, 20=single-category, 50=company override)
-- 2. Set IsDefault = 1 on 101-GL-GENERAL only
-- ============================================================

