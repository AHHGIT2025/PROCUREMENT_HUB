//using Oracle.ManagedDataAccess.Client;
//using Procurement.Api.Data;
//using Procurement.Api.Models.PurchaseRequests;
//using Microsoft.EntityFrameworkCore;

//namespace Procurement.Api.Services.Integration
//{
//    public class OracleIndentTransferResult
//    {
//        public bool Success { get; set; }
//        public string? OracleDocumentId { get; set; }
//        public string? ErrorMessage { get; set; }
//    }

//    // Replicates the legacy "Indent Transfer" VB.NET desktop app's Oracle write
//    // logic, but as a manually-triggered web action (button click in our UI)
//    // instead of a separate desktop app. Only applicable to Oracle-integrated
//    // companies (SourceType=ORACLE items) — manual/Focus ERP companies don't
//    // have an Oracle ITEMS_ID and can't use this.
//    //
//    // StoresId is now stored directly in OracleSourceMappings (one-time setup
//    // per company) — no runtime dependency on MIS_DB or any external database.
//    public class OracleIndentTransferService
//    {
//        private readonly AppDbContext _db;
//        private readonly IConfiguration _config;

//        public OracleIndentTransferService(AppDbContext db, IConfiguration config)
//        {
//            _db = db;
//            _config = config;
//        }

//        public async Task<OracleIndentTransferResult> TransferAsync(
//            Guid purchaseRequestId,
//            List<Guid> selectedItemIds,
//            string procRemark,
//            string? xpeRefNo,
//            Guid performedByUserId)
//        {
//            var pr = await _db.PurchaseRequests
//                .FirstOrDefaultAsync(p => p.Id == purchaseRequestId);

//            if (pr == null)
//                return new OracleIndentTransferResult { Success = false, ErrorMessage = "Purchase Request not found." };

//            var allItems = await _db.PurchaseRequestItems
//                .Where(i => i.PurchaseRequestId == purchaseRequestId)
//                .ToListAsync();

//            var company = await _db.Companies.FindAsync(pr.CompanyId);
//            if (company == null || !company.IsOracleIntegrated)
//                return new OracleIndentTransferResult { Success = false, ErrorMessage = "Company is not Oracle-integrated. This transfer only applies to Oracle-synced companies." };

//            // Determine which Oracle instance (HQ or FMCG) this company's branch belongs to.
//            var mapping = await _db.OracleSourceMappings
//                .Where(m => m.CompanyId == pr.CompanyId && m.IsActive && m.EffectiveTo == null)
//                .FirstOrDefaultAsync();

//            if (mapping == null)
//                return new OracleIndentTransferResult { Success = false, ErrorMessage = "No active Oracle branch mapping found for this company." };

//            // StoresId is pre-configured per company in OracleSourceMappings.
//            // Resolved once from Oracle DEPARTMENTS table (USER_CODE='02' for the branch)
//            // and stored — no runtime dependency on MIS_DB or any external database.
//            if (mapping.StoresId == null || mapping.StoresId <= 0)
//                return new OracleIndentTransferResult
//                {
//                    Success = false,
//                    ErrorMessage = $"StoresId is not configured for branch {mapping.BranchId} ({company.Name}). " +
//                                   "Update the OracleSourceMappings table with the correct StoresId from Oracle DEPARTMENTS."
//                };

//            var connectionString = mapping.OracleSource == "BrightOracle-FMCG"
//                ? _config["OracleSources:FMCG:ConnectionString"]
//                : _config["OracleSources:HQ:ConnectionString"];

//            if (string.IsNullOrWhiteSpace(connectionString))
//                return new OracleIndentTransferResult { Success = false, ErrorMessage = "Oracle connection string not configured." };

//            var itemsToTransfer = allItems.Where(i => selectedItemIds.Contains(i.Id)).ToList();
//            if (itemsToTransfer.Count == 0)
//                return new OracleIndentTransferResult { Success = false, ErrorMessage = "No items selected for transfer." };

//            // Oracle's CREATED_BY column stores the human employee name
//            // (e.g. "Mohamed Hilmy", "SHABUJ") as free text — confirmed by
//            // inspecting existing PUR_STORES_REQS / PUR_STORES_REQS_ITEMS rows.
//            var performedByName = await _db.Users
//                .Where(u => u.Id == performedByUserId)
//                .Select(u => u.FullName)
//                .FirstOrDefaultAsync();

//            if (string.IsNullOrWhiteSpace(performedByName))
//                performedByName = "PROCUREMENT_HUB";

//            var storesId = mapping.StoresId.Value.ToString();

//            using var conn = new OracleConnection(connectionString);
//            await conn.OpenAsync();
//            using var txn = conn.BeginTransaction();

//            try
//            {
//                // Step 1: Resolve Financial Year ID for this branch + current year
//                string finYearId;
//                using (var cmd = new OracleCommand(@"
//                    SELECT FINANCIAL_YEARS_ID FROM FINANCIAL_YEARS
//                    WHERE BRANCH_ID = :branchId AND USER_CODE = :year", conn))
//                {
//                    cmd.Transaction = txn;
//                    cmd.Parameters.Add(new OracleParameter("branchId", mapping.BranchId));
//                    cmd.Parameters.Add(new OracleParameter("year", DateTime.UtcNow.Year.ToString()));
//                    var result = await cmd.ExecuteScalarAsync();
//                    if (result == null)
//                        throw new InvalidOperationException($"Financial year {DateTime.UtcNow.Year} not configured for branch {mapping.BranchId}.");
//                    finYearId = result.ToString()!;
//                }

//                // Step 2: Generate next DOCUMENT_ID safely within this transaction
//                string documentId;
//                using (var cmd = new OracleCommand(
//                    "SELECT NVL(MAX(DOCUMENT_ID), 999) + 1 FROM PUR_STORES_REQS", conn))
//                {
//                    cmd.Transaction = txn;
//                    var result = await cmd.ExecuteScalarAsync();
//                    documentId = result!.ToString()!;
//                }

//                // Step 3: Insert header row — columns matched to legacy VB.NET app
//                using (var cmd = new OracleCommand(@"
//                    INSERT INTO PUR_STORES_REQS
//                        (DOCUMENT_ID, STORES_ID, DOCUMENT_NO, DOCUMENT_DATE, DOCUMENT_TYPES_ID,
//                         FINANCIAL_YEARS_ID, CONFIRMED, CANCELED, BRANCH_ID, NOTES,
//                         CREATED_BY, CREATION_DATE, CREATION_MACHINE,
//                         UPDATED_BY, UPDATED_DATE, UPDATED_MACHINE,
//                         WORKFLOW_SUBMITTED, TEMPORARY_FLAG, DELIVERY_DATE,
//                         COST_CENTER_ID, DOCUMENT_DATE2, SUBMITTING_DATE)
//                    VALUES
//                        (:documentId, :storesId, :documentNo, SYSDATE, 223,
//                         :finYearId, 2, 2, :branchId, :notes,
//                         :createdBy, SYSDATE, 'ONLINE',
//                         NULL, NULL, NULL,
//                         2, 1, SYSDATE,
//                         NULL, SYSDATE, NULL)", conn))
//                {
//                    cmd.Transaction = txn;
//                    cmd.Parameters.Add(new OracleParameter("documentId", documentId));
//                    cmd.Parameters.Add(new OracleParameter("storesId", storesId));
//                    cmd.Parameters.Add(new OracleParameter("documentNo", pr.RequestNumber));
//                    cmd.Parameters.Add(new OracleParameter("finYearId", finYearId));
//                    cmd.Parameters.Add(new OracleParameter("branchId", mapping.BranchId));
//                    cmd.Parameters.Add(new OracleParameter("notes", procRemark ?? ""));
//                    cmd.Parameters.Add(new OracleParameter("createdBy", performedByName));
//                    await cmd.ExecuteNonQueryAsync();
//                }

//                // Step 4: Insert line items (resolve ITEMS_ID + UNITS_ID per item from Oracle)
//                int lineNo = 0;
//                foreach (var item in itemsToTransfer)
//                {
//                    lineNo++;

//                    // ItemCode comes from our own Items table via MaterialId FK
//                    var itemCode = await _db.Items
//                        .Where(m => m.Id == item.MaterialId)
//                        .Select(m => m.ItemCode)
//                        .FirstOrDefaultAsync()
//                        ?? throw new InvalidOperationException($"Item not found for MaterialId {item.MaterialId}.");

//                    string itemsId, itemStockType;
//                    using (var cmd = new OracleCommand(
//                        "SELECT ITEMS_ID, ITEM_STOCK_TYPE FROM ITEMS WHERE USER_CODE = :itemCode AND BRANCH_ID = :branchId",
//                        conn))
//                    {
//                        cmd.Transaction = txn;
//                        cmd.Parameters.Add(new OracleParameter("itemCode", itemCode));
//                        cmd.Parameters.Add(new OracleParameter("branchId", mapping.BranchId));
//                        using var reader = await cmd.ExecuteReaderAsync();
//                        if (!await reader.ReadAsync())
//                            throw new InvalidOperationException(
//                                $"Item '{itemCode}' not found in Oracle ITEMS table for branch {mapping.BranchId}. " +
//                                "This item may not be Oracle-synced yet.");
//                        itemsId = reader["ITEMS_ID"].ToString()!;
//                        itemStockType = reader["ITEM_STOCK_TYPE"]?.ToString() ?? "0";
//                    }

//                    // UNITS_ID must be Oracle's numeric CODES_ID (e.g. 2720 for "No",
//                    // 2719 for "Box", 22 for "Piece"), NOT the free-text UOM name.
//                    // If item.Uom is already numeric, use as-is; otherwise resolve
//                    // from Oracle's CODES table.
//                    string unitsId;
//                    if (int.TryParse(item.Uom, out _))
//                    {
//                        unitsId = item.Uom;
//                    }
//                    else
//                    {
//                        using var cmd = new OracleCommand(
//                            "SELECT CODES_ID FROM CODES WHERE UPPER(PRIMARY_NAME) = UPPER(:uom)", conn);
//                        cmd.Transaction = txn;
//                        cmd.Parameters.Add(new OracleParameter("uom", item.Uom));
//                        var result = await cmd.ExecuteScalarAsync();
//                        if (result == null)
//                            throw new InvalidOperationException(
//                                $"Unit of measure '{item.Uom}' (item '{itemCode}') was not found in Oracle's CODES table. " +
//                                "Cannot transfer this item until the UOM is mapped on the Oracle side.");
//                        unitsId = result.ToString()!;
//                    }

//                    using (var cmd = new OracleCommand(@"
//                        INSERT INTO PUR_STORES_REQS_ITEMS
//                            (DOCUMENT_ID, STORES_ID, ARRANGMENT_NO, ITEMS_ID, UNITS_ID,
//                             UNIT_QUANTITY, UNIT_FACTOR, CREATED_BY, CREATION_DATE,
//                             CREATION_MACHINE, UNITS_ID_STOCK, ITEM_STOCK_TYPE, NOTES)
//                        VALUES
//                            (:documentId, :storesId, :lineNo, :itemsId, :unitId,
//                             :qty, 1, :createdBy, SYSDATE,
//                             'ONLINE', 0, :itemStockType, :notes)", conn))
//                    {
//                        cmd.Transaction = txn;
//                        cmd.Parameters.Add(new OracleParameter("documentId", documentId));
//                        cmd.Parameters.Add(new OracleParameter("storesId", storesId));
//                        cmd.Parameters.Add(new OracleParameter("lineNo", lineNo));
//                        cmd.Parameters.Add(new OracleParameter("itemsId", itemsId));
//                        cmd.Parameters.Add(new OracleParameter("unitId", unitsId));
//                        cmd.Parameters.Add(new OracleParameter("qty", item.Quantity));
//                        cmd.Parameters.Add(new OracleParameter("createdBy", performedByName));
//                        cmd.Parameters.Add(new OracleParameter("itemStockType", itemStockType));
//                        cmd.Parameters.Add(new OracleParameter("notes", item.Justification ?? ""));
//                        await cmd.ExecuteNonQueryAsync();
//                    }
//                }

//                txn.Commit();

//                // Mark items as transferred in our own DB
//                foreach (var item in itemsToTransfer)
//                {
//                    item.OracleTransferredAt = DateTime.UtcNow;
//                    item.OracleDocumentId = documentId;
//                }
//                if (!string.IsNullOrWhiteSpace(xpeRefNo))
//                    pr.ExternalReferenceNo = xpeRefNo;
//                pr.UpdatedAt = DateTime.UtcNow;

//                _db.IntegrationLogs.Add(new Models.IntegrationLog
//                {
//                    Id = Guid.NewGuid(),
//                    Direction = "Outbound",
//                    Module = "Bright ERP - Indent Transfer",
//                    Status = Models.IntegrationStatus.Success,
//                    Message = $"PR {pr.RequestNumber} -> Oracle DOCUMENT_ID {documentId} ({itemsToTransfer.Count} items, {mapping.OracleSource})",
//                    IsActive = true,
//                    CreatedAt = DateTime.UtcNow,
//                    UpdatedAt = DateTime.UtcNow
//                });
//                await _db.SaveChangesAsync();

//                return new OracleIndentTransferResult { Success = true, OracleDocumentId = documentId };
//            }
//            catch (Exception ex)
//            {
//                txn.Rollback();

//                _db.IntegrationLogs.Add(new Models.IntegrationLog
//                {
//                    Id = Guid.NewGuid(),
//                    Direction = "Outbound",
//                    Module = "Bright ERP - Indent Transfer",
//                    Status = Models.IntegrationStatus.Failed,
//                    Message = $"PR {pr.RequestNumber} transfer failed: {ex.Message}",
//                    IsActive = true,
//                    CreatedAt = DateTime.UtcNow,
//                    UpdatedAt = DateTime.UtcNow
//                });
//                await _db.SaveChangesAsync();

//                return new OracleIndentTransferResult { Success = false, ErrorMessage = ex.Message };
//            }
//        }
//    }
//}

using Oracle.ManagedDataAccess.Client;
using Procurement.Api.Data;
using Procurement.Api.Models.PurchaseRequests;
using Microsoft.EntityFrameworkCore;

namespace Procurement.Api.Services.Integration
{
    public class OracleIndentTransferResult
    {
        public bool Success { get; set; }
        public string? OracleDocumentId { get; set; }
        public string? ErrorMessage { get; set; }
    }

    // Replicates the legacy "Indent Transfer" VB.NET desktop app's Oracle write
    // logic, but as a manually-triggered web action (button click in our UI)
    // instead of a separate desktop app. Only applicable to Oracle-integrated
    // companies (SourceType=ORACLE items) — manual/Focus ERP companies don't
    // have an Oracle ITEMS_ID and can't use this.
    //
    // StoresId is now stored directly in OracleSourceMappings (one-time setup
    // per company) — no runtime dependency on MIS_DB or any external database.
    public class OracleIndentTransferService
    {
        private readonly AppDbContext _db;
        private readonly IConfiguration _config;

        public OracleIndentTransferService(AppDbContext db, IConfiguration config)
        {
            _db = db;
            _config = config;
        }

        public async Task<OracleIndentTransferResult> TransferAsync(
            Guid purchaseRequestId,
            List<Guid> selectedItemIds,
            string procRemark,
            string? xpeRefNo,
            Guid performedByUserId)
        {
            var pr = await _db.PurchaseRequests
                .FirstOrDefaultAsync(p => p.Id == purchaseRequestId);

            if (pr == null)
                return new OracleIndentTransferResult { Success = false, ErrorMessage = "Purchase Request not found." };

            var allItems = await _db.PurchaseRequestItems
                .Where(i => i.PurchaseRequestId == purchaseRequestId)
                .ToListAsync();

            var company = await _db.Companies.FindAsync(pr.CompanyId);
            if (company == null || !company.IsOracleIntegrated)
                return new OracleIndentTransferResult { Success = false, ErrorMessage = "Company is not Oracle-integrated. This transfer only applies to Oracle-synced companies." };

            // Determine which Oracle instance (HQ or FMCG) this company's branch belongs to.
            // ✅ FIX: A company can have multiple active OracleSourceMappings rows —
            // e.g. one for Items (EntityType=null) and one for Suppliers
            // (EntityType="Suppliers"). Without this filter, FirstOrDefaultAsync()
            // could pick the Suppliers-only row, which has no relevance to item
            // transfer and may point at the wrong branch/store entirely.
            var mapping = await _db.OracleSourceMappings
                .Where(m => m.CompanyId == pr.CompanyId && m.IsActive && m.EffectiveTo == null
                    && (m.EntityType == null || m.EntityType == "Items"))
                .FirstOrDefaultAsync();

            if (mapping == null)
                return new OracleIndentTransferResult { Success = false, ErrorMessage = "No active Oracle Items mapping found for this company." };

            // StoresId is pre-configured per company in OracleSourceMappings.
            // Resolved once from Oracle DEPARTMENTS table (USER_CODE='02' for the branch)
            // and stored — no runtime dependency on MIS_DB or any external database.
            if (mapping.StoresId == null || mapping.StoresId <= 0)
                return new OracleIndentTransferResult
                {
                    Success = false,
                    ErrorMessage = $"StoresId is not configured for branch {mapping.BranchId} ({company.Name}). " +
                                   "Update the OracleSourceMappings table with the correct StoresId from Oracle DEPARTMENTS."
                };

            var isFmcg = mapping.OracleSource == "BrightOracle-FMCG";

            var connectionString = isFmcg
                ? _config["OracleSources:FMCG:ConnectionString"]
                : _config["OracleSources:HQ:ConnectionString"];

            if (string.IsNullOrWhiteSpace(connectionString))
                return new OracleIndentTransferResult { Success = false, ErrorMessage = "Oracle connection string not configured." };

            // ✅ FIX: FMCG branch IDs are stored in our system with a +300000 offset
            // (e.g. our BranchId "300001" = Oracle's real BRANCH_ID "1") to avoid
            // collisions with HQ branch numbering — same convention BrightOracleConnector
            // uses when reading items FROM Oracle (see BranchOffset in Program.cs).
            // We must reverse it here since we're writing directly to Oracle, which
            // only knows about its own real BRANCH_ID.
            var fmcgBranchOffset = _config.GetValue<int>("OracleSources:FMCG:BranchOffset", 300000);
            var oracleBranchId = isFmcg && int.TryParse(mapping.BranchId, out var rawBranchId) && rawBranchId > fmcgBranchOffset
                ? (rawBranchId - fmcgBranchOffset).ToString()
                : mapping.BranchId;

            var itemsToTransfer = allItems.Where(i => selectedItemIds.Contains(i.Id)).ToList();
            if (itemsToTransfer.Count == 0)
                return new OracleIndentTransferResult { Success = false, ErrorMessage = "No items selected for transfer." };

            // Oracle's CREATED_BY column stores the human employee name
            // (e.g. "Mohamed Hilmy", "SHABUJ") as free text — confirmed by
            // inspecting existing PUR_STORES_REQS / PUR_STORES_REQS_ITEMS rows.
            var performedByName = await _db.Users
                .Where(u => u.Id == performedByUserId)
                .Select(u => u.FullName)
                .FirstOrDefaultAsync();

            if (string.IsNullOrWhiteSpace(performedByName))
                performedByName = "PROCUREMENT_HUB";

            var storesId = mapping.StoresId.Value.ToString();

            using var conn = new OracleConnection(connectionString);
            await conn.OpenAsync();
            using var txn = conn.BeginTransaction();

            try
            {
                // Step 1: Resolve Financial Year ID for this branch + current year
                string finYearId;
                using (var cmd = new OracleCommand(@"
                    SELECT FINANCIAL_YEARS_ID FROM FINANCIAL_YEARS
                    WHERE BRANCH_ID = :branchId AND USER_CODE = :year", conn))
                {
                    cmd.Transaction = txn;
                    cmd.Parameters.Add(new OracleParameter("branchId", oracleBranchId));
                    cmd.Parameters.Add(new OracleParameter("year", DateTime.UtcNow.Year.ToString()));
                    var result = await cmd.ExecuteScalarAsync();
                    if (result == null)
                        throw new InvalidOperationException($"Financial year {DateTime.UtcNow.Year} not configured for branch {oracleBranchId} (mapping BranchId {mapping.BranchId}).");
                    finYearId = result.ToString()!;
                }

                // Step 2: Generate next DOCUMENT_ID safely within this transaction
                string documentId;
                using (var cmd = new OracleCommand(
                    "SELECT NVL(MAX(DOCUMENT_ID), 999) + 1 FROM PUR_STORES_REQS", conn))
                {
                    cmd.Transaction = txn;
                    var result = await cmd.ExecuteScalarAsync();
                    documentId = result!.ToString()!;
                }

                // Step 3: Insert header row — columns matched to legacy VB.NET app
                using (var cmd = new OracleCommand(@"
                    INSERT INTO PUR_STORES_REQS
                        (DOCUMENT_ID, STORES_ID, DOCUMENT_NO, DOCUMENT_DATE, DOCUMENT_TYPES_ID,
                         FINANCIAL_YEARS_ID, CONFIRMED, CANCELED, BRANCH_ID, NOTES,
                         CREATED_BY, CREATION_DATE, CREATION_MACHINE,
                         UPDATED_BY, UPDATED_DATE, UPDATED_MACHINE,
                         WORKFLOW_SUBMITTED, TEMPORARY_FLAG, DELIVERY_DATE)
                    VALUES
                        (:documentId, :storesId, :documentNo, SYSDATE, 223,
                         :finYearId, 2, 2, :branchId, :notes,
                         :createdBy, SYSDATE, 'ONLINE',
                         NULL, NULL, NULL,
                         2, 1, SYSDATE)", conn))
                {
                    cmd.Transaction = txn;
                    cmd.Parameters.Add(new OracleParameter("documentId", documentId));
                    cmd.Parameters.Add(new OracleParameter("storesId", storesId));
                    cmd.Parameters.Add(new OracleParameter("documentNo", pr.RequestNumber));
                    cmd.Parameters.Add(new OracleParameter("finYearId", finYearId));
                    cmd.Parameters.Add(new OracleParameter("branchId", oracleBranchId));
                    cmd.Parameters.Add(new OracleParameter("notes", procRemark ?? ""));
                    cmd.Parameters.Add(new OracleParameter("createdBy", performedByName));
                    await cmd.ExecuteNonQueryAsync();
                }

                // Step 4: Insert line items (resolve ITEMS_ID + UNITS_ID per item from Oracle)
                int lineNo = 0;
                foreach (var item in itemsToTransfer)
                {
                    lineNo++;

                    // ItemCode comes from our own Items table via MaterialId FK
                    var itemCode = await _db.Items
                        .Where(m => m.Id == item.MaterialId)
                        .Select(m => m.ItemCode)
                        .FirstOrDefaultAsync()
                        ?? throw new InvalidOperationException($"Item not found for MaterialId {item.MaterialId}.");

                    string itemsId, itemStockType;
                    using (var cmd = new OracleCommand(
                        "SELECT ITEMS_ID, ITEM_STOCK_TYPE FROM ITEMS WHERE USER_CODE = :itemCode AND BRANCH_ID = :branchId",
                        conn))
                    {
                        cmd.Transaction = txn;
                        cmd.Parameters.Add(new OracleParameter("itemCode", itemCode));
                        cmd.Parameters.Add(new OracleParameter("branchId", oracleBranchId));
                        using var reader = await cmd.ExecuteReaderAsync();
                        if (!await reader.ReadAsync())
                            throw new InvalidOperationException(
                                $"Item '{itemCode}' not found in Oracle ITEMS table for branch {oracleBranchId} (mapping BranchId {mapping.BranchId}). " +
                                "This item may not be Oracle-synced yet.");
                        itemsId = reader["ITEMS_ID"].ToString()!;
                        itemStockType = reader["ITEM_STOCK_TYPE"]?.ToString() ?? "0";
                    }

                    // UNITS_ID must be Oracle's numeric CODES_ID (e.g. 2720 for "No",
                    // 2719 for "Box", 22 for "Piece"), NOT the free-text UOM name.
                    // If item.Uom is already numeric, use as-is; otherwise resolve
                    // from Oracle's CODES table.
                    string unitsId;
                    if (int.TryParse(item.Uom, out _))
                    {
                        unitsId = item.Uom;
                    }
                    else
                    {
                        using var cmd = new OracleCommand(
                            "SELECT CODES_ID FROM CODES WHERE UPPER(PRIMARY_NAME) = UPPER(:uom)", conn);
                        cmd.Transaction = txn;
                        cmd.Parameters.Add(new OracleParameter("uom", item.Uom));
                        var result = await cmd.ExecuteScalarAsync();
                        if (result == null)
                            throw new InvalidOperationException(
                                $"Unit of measure '{item.Uom}' (item '{itemCode}') was not found in Oracle's CODES table. " +
                                "Cannot transfer this item until the UOM is mapped on the Oracle side.");
                        unitsId = result.ToString()!;
                    }

                    using (var cmd = new OracleCommand(@"
                        INSERT INTO PUR_STORES_REQS_ITEMS
                            (DOCUMENT_ID, STORES_ID, ARRANGMENT_NO, ITEMS_ID, UNITS_ID,
                             UNIT_QUANTITY, UNIT_FACTOR, CREATED_BY, CREATION_DATE,
                             CREATION_MACHINE, UNITS_ID_STOCK, ITEM_STOCK_TYPE, NOTES)
                        VALUES
                            (:documentId, :storesId, :lineNo, :itemsId, :unitId,
                             :qty, 1, :createdBy, SYSDATE,
                             'ONLINE', 0, :itemStockType, :notes)", conn))
                    {
                        cmd.Transaction = txn;
                        cmd.Parameters.Add(new OracleParameter("documentId", documentId));
                        cmd.Parameters.Add(new OracleParameter("storesId", storesId));
                        cmd.Parameters.Add(new OracleParameter("lineNo", lineNo));
                        cmd.Parameters.Add(new OracleParameter("itemsId", itemsId));
                        cmd.Parameters.Add(new OracleParameter("unitId", unitsId));
                        cmd.Parameters.Add(new OracleParameter("qty", item.Quantity));
                        cmd.Parameters.Add(new OracleParameter("createdBy", performedByName));
                        cmd.Parameters.Add(new OracleParameter("itemStockType", itemStockType));
                        cmd.Parameters.Add(new OracleParameter("notes", item.Justification ?? ""));
                        await cmd.ExecuteNonQueryAsync();
                    }
                }

                txn.Commit();

                // Mark items as transferred in our own DB
                foreach (var item in itemsToTransfer)
                {
                    item.OracleTransferredAt = DateTime.UtcNow;
                    item.OracleDocumentId = documentId;
                }
                if (!string.IsNullOrWhiteSpace(xpeRefNo))
                    pr.ExternalReferenceNo = xpeRefNo;
                pr.UpdatedAt = DateTime.UtcNow;

                _db.IntegrationLogs.Add(new Models.IntegrationLog
                {
                    Id = Guid.NewGuid(),
                    Direction = "Outbound",
                    Module = "Bright ERP - Indent Transfer",
                    Status = Models.IntegrationStatus.Success,
                    Message = $"PR {pr.RequestNumber} -> Oracle DOCUMENT_ID {documentId} ({itemsToTransfer.Count} items, {mapping.OracleSource})",
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                });
                await _db.SaveChangesAsync();

                return new OracleIndentTransferResult { Success = true, OracleDocumentId = documentId };
            }
            catch (Exception ex)
            {
                txn.Rollback();

                _db.IntegrationLogs.Add(new Models.IntegrationLog
                {
                    Id = Guid.NewGuid(),
                    Direction = "Outbound",
                    Module = "Bright ERP - Indent Transfer",
                    Status = Models.IntegrationStatus.Failed,
                    Message = $"PR {pr.RequestNumber} transfer failed: {ex.Message}",
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                });
                await _db.SaveChangesAsync();

                return new OracleIndentTransferResult { Success = false, ErrorMessage = ex.Message };
            }
        }
    }
}
