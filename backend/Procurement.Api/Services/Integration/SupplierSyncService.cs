using Microsoft.EntityFrameworkCore;
using Procurement.Api.Data;
using Procurement.Api.Models;
using Procurement.Api.Models.Integration;
using Procurement.Api.Models.InternationalPO;

namespace Procurement.Api.Services.Integration
{
    public class SupplierSyncResult
    {
        public int Processed { get; set; }
        public int Created { get; set; }
        public int Updated { get; set; }
        public int Skipped { get; set; }
        public List<string> Errors { get; set; } = new();
    }

    public class SupplierSyncService
    {
        private readonly AppDbContext _db;
        private const int BatchSize = 200;

        public SupplierSyncService(AppDbContext db)
        {
            _db = db;
        }

        public async Task<SupplierSyncResult> SyncAsync(IErpConnector connector, string sourceType)
        {
            _db.Database.SetCommandTimeout(300);
            var result = new SupplierSyncResult();

            var erpSuppliers = await connector.FetchSuppliersAsync();
            if (erpSuppliers.Count == 0)
                return result;

            var existingByCode = await _db.Suppliers
                .Where(s => s.OracleVendorCode != null)
                .ToDictionaryAsync(s => s.OracleVendorCode!, s => s);

            var now = DateTime.UtcNow;
            var branchToCompany = await _db.OracleSourceMappings
                .Where(m => m.OracleSource == connector.ConnectorName
                         && m.EffectiveFrom <= now
                         && (m.EffectiveTo == null || m.EffectiveTo >= now))
                .ToDictionaryAsync(m => m.BranchId, m => m.CompanyId);

            var usedCodes = new HashSet<string>(
                (await _db.Suppliers.Select(s => s.SupplierCode).ToListAsync()),
                StringComparer.OrdinalIgnoreCase);

            foreach (var erp in erpSuppliers)
            {
                if (string.IsNullOrWhiteSpace(erp.SourceSupplierId))
                    continue;

                try
                {
                    // ── NEW: combine Address_P (primary) + Address_S (secondary)
                    // from Oracle into a single Address field, skipping any
                    // blank parts.
                    var combinedAddress = string.Join(", ", new[] { erp.AddressP, erp.AddressS }
                        .Where(a => !string.IsNullOrWhiteSpace(a)));

                    if (existingByCode.TryGetValue(erp.SourceSupplierId, out var existing))
                    {
                        existing.Name = erp.PrimaryName;
                        var newCode = !string.IsNullOrWhiteSpace(erp.UserCode)
                            ? $"{erp.BranchId}-{erp.UserCode}"
                            : null;
                        if (newCode != null &&
                            !string.Equals(existing.SupplierCode, newCode, StringComparison.OrdinalIgnoreCase) &&
                            !usedCodes.Contains(newCode))
                        {
                            usedCodes.Remove(existing.SupplierCode);
                            existing.SupplierCode = newCode;
                            usedCodes.Add(newCode);
                        }
                        existing.CreditLimitDays = erp.CreditLimitDays;
                        existing.PaymentType = erp.PaymentType;
                        existing.IsActive = erp.IsActive;
                        existing.CompanyId = branchToCompany.TryGetValue(erp.BranchId, out var updCompanyId) ? updCompanyId : existing.CompanyId;

                        // ── NEW: keep contact/address fields in sync with Bright
                        // on every refresh, so edits made directly in Bright
                        // (not in this app) still flow through. Only overwrite
                        // when Oracle actually has a value, so we never wipe
                        // out data someone entered manually in this app.
                        existing.Landline = erp.TelNo1;
                        existing.Mobile = erp.Mobile;
                        if (!string.IsNullOrWhiteSpace(combinedAddress))
                            existing.Address = combinedAddress;
                        if (!string.IsNullOrWhiteSpace(erp.Country))
                            existing.Country = erp.Country;
                        if (!string.IsNullOrWhiteSpace(erp.Email))
                            existing.Email = erp.Email;

                        existing.UpdatedAt = DateTime.UtcNow;
                        result.Updated++;
                    }
                    else
                    {
                        var candidateCode = !string.IsNullOrWhiteSpace(erp.UserCode)
                            ? $"{erp.BranchId}-{erp.UserCode}"
                            : erp.SourceSupplierId;

                        if (usedCodes.Contains(candidateCode))
                            candidateCode = $"{candidateCode}-{erp.SourceSupplierId}";

                        var supplier = new Supplier
                        {
                            Id = Guid.NewGuid(),
                            SupplierCode = candidateCode,
                            Name = string.IsNullOrWhiteSpace(erp.PrimaryName) ? candidateCode : erp.PrimaryName,
                            SourceType = sourceType,
                            OracleVendorCode = erp.SourceSupplierId,
                            CompanyId = branchToCompany.TryGetValue(erp.BranchId, out var newCompanyId) ? newCompanyId : (Guid?)null,
                            CreditLimitDays = erp.CreditLimitDays,
                            PaymentType = erp.PaymentType,
                            // ── NEW: pull contact/address details in from Bright
                            // at creation time too, not just Name/Code.
                            Landline = erp.TelNo1,
                            Mobile = erp.Mobile,
                            Address = combinedAddress,
                            Country = erp.Country,
                            Email = erp.Email,
                            CreatedAt = DateTime.UtcNow,
                            IsActive = erp.IsActive
                        };
                        _db.Suppliers.Add(supplier);
                        existingByCode[erp.SourceSupplierId] = supplier;
                        usedCodes.Add(candidateCode);
                        result.Created++;
                    }

                    result.Processed++;

                    if (result.Processed % BatchSize == 0)
                        await _db.SaveChangesAsync();
                }
                catch (Exception ex)
                {
                    result.Skipped++;
                    if (result.Errors.Count < 10)
                        result.Errors.Add($"{erp.SourceSupplierId} ({erp.PrimaryName}): {ex.InnerException?.Message ?? ex.Message}");

                    _db.ChangeTracker.Clear();

                    existingByCode = await _db.Suppliers
                        .Where(s => s.OracleVendorCode != null)
                        .ToDictionaryAsync(s => s.OracleVendorCode!, s => s);
                    usedCodes = new HashSet<string>(
                        await _db.Suppliers.Select(s => s.SupplierCode).ToListAsync(),
                        StringComparer.OrdinalIgnoreCase);
                }
            }

            try
            {
                await _db.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                result.Skipped += result.Processed - result.Created - result.Updated;
                if (result.Errors.Count < 10)
                    result.Errors.Add($"Final batch save: {ex.InnerException?.Message ?? ex.Message}");
            }

            _db.AuditLogs.Add(new AuditLog
            {
                Id = Guid.NewGuid(),
                Module = "Supplier Sync",
                Action = sourceType,
                UserName = "System",
                Details = $"Processed: {result.Processed}, Created: {result.Created}, Updated: {result.Updated}, Skipped: {result.Skipped}" +
                          (result.Errors.Count > 0 ? $" | Errors: {string.Join(" ;; ", result.Errors)}" : ""),
                CreatedAt = DateTime.UtcNow
            });
            await _db.SaveChangesAsync();

            return result;
        }
    }
}