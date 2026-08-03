-- ============================================================
-- FIX: Add missing WorkflowDefinitionCompanies junction rows
-- for the 4 Global combo workflows (company insert failed due
-- to missing CreatedAt value in original script)
-- Date: 2026-07-26
-- Safe to run: only inserts if not already present.
-- ============================================================

USE MaterialRequestDB_App;
GO

-- 113-GL-IT-LOG
INSERT INTO WorkflowDefinitionCompanies (Id, WorkflowDefinitionId, CompanyId, CreatedAt)
SELECT NEWID(), wd113.Id, wdc.CompanyId, GETUTCDATE()
FROM WorkflowDefinitionCompanies wdc
JOIN WorkflowDefinitions wdSource ON wdSource.Id = wdc.WorkflowDefinitionId AND wdSource.Code = '103-GL-LOGISTICS'
CROSS JOIN (SELECT Id FROM WorkflowDefinitions WHERE Code = '113-GL-IT-LOG') wd113
WHERE NOT EXISTS (
    SELECT 1 FROM WorkflowDefinitionCompanies existing
    WHERE existing.WorkflowDefinitionId = wd113.Id AND existing.CompanyId = wdc.CompanyId
);

-- 115-GL-IT-AST-COMBO
INSERT INTO WorkflowDefinitionCompanies (Id, WorkflowDefinitionId, CompanyId, CreatedAt)
SELECT NEWID(), wd115.Id, wdc.CompanyId, GETUTCDATE()
FROM WorkflowDefinitionCompanies wdc
JOIN WorkflowDefinitions wdSource ON wdSource.Id = wdc.WorkflowDefinitionId AND wdSource.Code = '103-GL-LOGISTICS'
CROSS JOIN (SELECT Id FROM WorkflowDefinitions WHERE Code = '115-GL-IT-AST-COMBO') wd115
WHERE NOT EXISTS (
    SELECT 1 FROM WorkflowDefinitionCompanies existing
    WHERE existing.WorkflowDefinitionId = wd115.Id AND existing.CompanyId = wdc.CompanyId
);

-- 117-GL-LOG-AST-COMBO
INSERT INTO WorkflowDefinitionCompanies (Id, WorkflowDefinitionId, CompanyId, CreatedAt)
SELECT NEWID(), wd117.Id, wdc.CompanyId, GETUTCDATE()
FROM WorkflowDefinitionCompanies wdc
JOIN WorkflowDefinitions wdSource ON wdSource.Id = wdc.WorkflowDefinitionId AND wdSource.Code = '103-GL-LOGISTICS'
CROSS JOIN (SELECT Id FROM WorkflowDefinitions WHERE Code = '117-GL-LOG-AST-COMBO') wd117
WHERE NOT EXISTS (
    SELECT 1 FROM WorkflowDefinitionCompanies existing
    WHERE existing.WorkflowDefinitionId = wd117.Id AND existing.CompanyId = wdc.CompanyId
);

-- 119-GL-IT-LOG-AST
INSERT INTO WorkflowDefinitionCompanies (Id, WorkflowDefinitionId, CompanyId, CreatedAt)
SELECT NEWID(), wd119.Id, wdc.CompanyId, GETUTCDATE()
FROM WorkflowDefinitionCompanies wdc
JOIN WorkflowDefinitions wdSource ON wdSource.Id = wdc.WorkflowDefinitionId AND wdSource.Code = '103-GL-LOGISTICS'
CROSS JOIN (SELECT Id FROM WorkflowDefinitions WHERE Code = '119-GL-IT-LOG-AST') wd119
WHERE NOT EXISTS (
    SELECT 1 FROM WorkflowDefinitionCompanies existing
    WHERE existing.WorkflowDefinitionId = wd119.Id AND existing.CompanyId = wdc.CompanyId
);
GO

-- ================================================================
-- VERIFY — all 8 workflows, with company count
-- ================================================================
SELECT wd.Code, wd.Name, wd.Priority, wd.ScopeType, wd.ConditionMatchLogic,
       (SELECT COUNT(*) FROM WorkflowSteps ws WHERE ws.WorkflowDefinitionId = wd.Id) AS StepCount,
       (SELECT STRING_AGG(wc.Value, ' + ') FROM WorkflowConditions wc WHERE wc.WorkflowDefinitionId = wd.Id) AS Categories,
       (SELECT COUNT(*) FROM WorkflowDefinitionCompanies wdc WHERE wdc.WorkflowDefinitionId = wd.Id) AS CompanyCount
FROM WorkflowDefinitions wd
WHERE wd.Code IN ('113-GL-IT-LOG','114-SW-IT-LOG','115-GL-IT-AST-COMBO','116-SW-IT-AST-COMBO',
                  '117-GL-LOG-AST-COMBO','118-SW-LOG-AST-COMBO','119-GL-IT-LOG-AST','120-SW-IT-LOG-AST')
ORDER BY wd.Code;