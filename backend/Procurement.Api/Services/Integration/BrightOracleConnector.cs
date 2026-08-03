using Oracle.ManagedDataAccess.Client;
using Procurement.Api.Models.Integration;
using Procurement.Api.Services.Integration;

namespace Procurement.Api.Services.Integration
{
    public class BrightOracleConnector : IErpConnector
    {
        private readonly string _connectionString;
        private readonly string _connectorName;

        // branchOffset: FMCG branch IDs need +300000 to match the HQ-side
        // branch numbering scheme (confirmed from the existing Oracle view definition).
        private readonly int _branchOffset;

        public BrightOracleConnector(string connectorName, string connectionString, int branchOffset = 0)
        {
            _connectorName = connectorName;
            _connectionString = connectionString;
            _branchOffset = branchOffset;
        }

        public string ConnectorName => _connectorName;

        public async Task<List<ErpItemDto>> FetchItemsSinceAsync(DateTime watermark)
        {
            var items = new List<ErpItemDto>();

            using var conn = new OracleConnection(_connectionString);
            await conn.OpenAsync();

            using var cmd = new OracleCommand(@"
    SELECT BRANCH_ID, GROUP_NAME, MGROUP_NAME, LONG_DESCRIPTION,
           ITEM_ID, VISIBLE_RES_CODE, RES_NAME, UOM, UPDATED_DATE,
           CREATTION_DATE, STATUS
    FROM ResourceMaster_AppSync_VW
    WHERE NVL(UPDATED_DATE, CREATTION_DATE) > :watermark
    ORDER BY NVL(UPDATED_DATE, CREATTION_DATE)", conn);

            cmd.Parameters.Add(new OracleParameter("watermark", watermark));
            cmd.CommandTimeout = 300;

            using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                var updatedDate = reader.IsDBNull(reader.GetOrdinal("UPDATED_DATE"))
                    ? reader.GetDateTime(reader.GetOrdinal("CREATTION_DATE"))   // fallback if never modified
                    : reader.GetDateTime(reader.GetOrdinal("UPDATED_DATE"));

                items.Add(new ErpItemDto
                {
                    SourceItemId = reader["ITEM_ID"]?.ToString() ?? "",
                    ItemCode = reader["VISIBLE_RES_CODE"]?.ToString()?.Trim() ?? "",
                    Name = reader["RES_NAME"]?.ToString()?.Trim() ?? "",
                    Description = reader["LONG_DESCRIPTION"]?.ToString()?.Trim(),
                    GroupName = reader["GROUP_NAME"]?.ToString()?.Trim() ?? "",
                    SubGroupName = reader["MGROUP_NAME"]?.ToString()?.Trim() ?? "",
                    Uom = reader["UOM"]?.ToString()?.Trim() ?? "",
                    BranchId = reader["BRANCH_ID"]?.ToString()?.Trim() ?? "",
                    Status = reader["STATUS"]?.ToString()?.Trim(),
                    LastModified = updatedDate
                });
            }

            return items;
        }

        public async Task<List<ErpProjectDto>> FetchProjectsSinceAsync(DateTime watermark)
        {
            var projects = new List<ErpProjectDto>();

            using var conn = new OracleConnection(_connectionString);
            await conn.OpenAsync();

            using var cmd = new OracleCommand(@"
    SELECT COST_CENTER_ID, BRANCH_ID, PARENT_COST_CENTER_ID,
           USER_CODE, PRIMARY_NAME, ACTIVE, UPDATED_DATE, CREATION_DATE
    FROM CostCenters_AppSync_VW
    WHERE NVL(UPDATED_DATE, CREATION_DATE) > :watermark
    ORDER BY NVL(UPDATED_DATE, CREATION_DATE)", conn);

            cmd.Parameters.Add(new OracleParameter("watermark", watermark));
            cmd.CommandTimeout = 300;
            using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                var updatedDate = reader.IsDBNull(reader.GetOrdinal("UPDATED_DATE"))
                    ? reader.GetDateTime(reader.GetOrdinal("CREATION_DATE"))
                    : reader.GetDateTime(reader.GetOrdinal("UPDATED_DATE"));

                projects.Add(new ErpProjectDto
                {
                    SourceProjectId = reader["COST_CENTER_ID"]?.ToString() ?? "",
                    Code = reader["USER_CODE"]?.ToString()?.Trim() ?? "",
                    Name = reader["PRIMARY_NAME"]?.ToString()?.Trim() ?? "",
                    ParentSourceProjectId = reader["PARENT_COST_CENTER_ID"]?.ToString()?.Trim(),
                    BranchId = reader["BRANCH_ID"]?.ToString()?.Trim() ?? "",
                    IsActive = reader["ACTIVE"]?.ToString()?.Trim() == "1",
                    LastModified = updatedDate
                });
            }

            return projects;
        }

        public async Task<List<ErpSupplierDto>> FetchSuppliersAsync()
        {
            var suppliers = new List<ErpSupplierDto>();

            using var conn = new OracleConnection(_connectionString);
            await conn.OpenAsync();

            using var cmd = new OracleCommand(@"
    SELECT Supplier_ID, User_Code, Primary_Name, Branch_ID,
           Credit_Limit_Days, Payment_Type, Active,
           Tel_No1, Mobile, Address_P, Address_S, Country, Email
    FROM Suppliers", conn);

            cmd.CommandTimeout = 300;

            using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                suppliers.Add(new ErpSupplierDto
                {
                    SourceSupplierId = reader["Supplier_ID"]?.ToString()?.Trim() ?? "",
                    UserCode = reader["User_Code"]?.ToString()?.Trim() ?? "",
                    PrimaryName = reader["Primary_Name"]?.ToString()?.Trim() ?? "",
                    BranchId = reader["Branch_ID"]?.ToString()?.Trim() ?? "",
                    CreditLimitDays = reader["Credit_Limit_Days"] is DBNull
                        ? null
                        : Convert.ToInt32(reader["Credit_Limit_Days"]),
                    PaymentType = reader["Payment_Type"]?.ToString()?.Trim(),
                    IsActive = reader["Active"]?.ToString()?.Trim() == "1",
                    TelNo1 = reader["Tel_No1"]?.ToString()?.Trim(),
                    Mobile = reader["Mobile"]?.ToString()?.Trim(),
                    AddressP = reader["Address_P"]?.ToString()?.Trim(),
                    AddressS = reader["Address_S"]?.ToString()?.Trim(),
                    Country = reader["Country"]?.ToString()?.Trim(),
                    Email = reader["Email"]?.ToString()?.Trim()
                });
            }

            return suppliers;
        }
    }
}