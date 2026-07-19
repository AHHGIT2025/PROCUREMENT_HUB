using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Procurement.Api.Common;
using Procurement.Api.Data;
using Procurement.Api.Middleware;
using Procurement.Api.Services;
using Procurement.Api.Services.Common;
using Procurement.Api.Services.Integration;
using Procurement.Api.Services.Storage;
using Procurement.Api.Services.Workflow;
using System.Text;
using Procurement.Api.Models;
using Procurement.Api.Services.Integration;
var builder = WebApplication.CreateBuilder(args);
builder.WebHost.UseUrls("http://0.0.0.0:5000");
builder.Services.AddDbContext<AppDbContext>(o => o.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));
builder.Services.AddScoped<TokenService>();
builder.Services.AddScoped<SeedService>();
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        // SQL Server datetime/datetime2 columns don't preserve DateTimeKind.
        // EF Core reads UTC-stored values back as Kind=Unspecified, so
        // System.Text.Json omits the "Z" suffix and every frontend page
        // (Oracle Monitor, mappings, logs, etc.) misinterprets these as
        // already-local times, causing wrong displayed times depending on
        // the viewer's browser timezone. This converter forces Kind=Utc on
        // every DateTime before serialization so the "Z" is always present
        // and the frontend can safely convert to Asia/Qatar for display.
        options.JsonSerializerOptions.Converters.Add(new UtcDateTimeJsonConverter());
    });
builder.Services.Configure<FileStorageOptions>(
    builder.Configuration.GetSection("FileStorage"));
builder.Services.AddSingleton<IFileStorageService, LocalFileStorageService>();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddScoped<RequestNumberGeneratorService>();
builder.Services.AddSwaggerGen(options =>
{
    options.CustomSchemaIds(type => type.FullName);
    options.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Description = "Enter 'Bearer {your_token}'"
    });
    //builder.Services.AddScoped<SupplierSyncService>();
    options.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
    {
        {
            new Microsoft.OpenApi.Models.OpenApiSecurityScheme
            {
                Reference = new Microsoft.OpenApi.Models.OpenApiReference
                {
                    Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            new string[] {}
        }
    });
});
builder.Services.AddScoped<IApprovalEngineService, ApprovalEngineService>();
builder.Services.AddScoped<OracleIndentTransferService>();
// ── Oracle Bright ERP integration ──────────────────────────────────
// Two Oracle sources (HQ, FMCG) registered as KEYED singletons so each
// gets its own connection string / ConnectorName without needing two
// separate interfaces. ErpSyncOrchestrator stays Scoped because it
// depends on AppDbContext (which is Scoped) — a Scoped service cannot
// be safely consumed from a Singleton, so don't change this to Singleton.
var hqConnectionString = builder.Configuration["OracleSources:HQ:ConnectionString"];
var fmcgConnectionString = builder.Configuration["OracleSources:FMCG:ConnectionString"];

if (string.IsNullOrWhiteSpace(hqConnectionString))
    throw new InvalidOperationException("Missing configuration: OracleSources:HQ:ConnectionString");

if (string.IsNullOrWhiteSpace(fmcgConnectionString))
    throw new InvalidOperationException("Missing configuration: OracleSources:FMCG:ConnectionString");

builder.Services.AddKeyedSingleton<IErpConnector>("HQ",
    (sp, key) => new BrightOracleConnector("BrightOracle-HQ", hqConnectionString!));

builder.Services.AddKeyedSingleton<IErpConnector>("FMCG",
    (sp, key) => new BrightOracleConnector("BrightOracle-FMCG", fmcgConnectionString!, branchOffset: 300000));

builder.Services.AddScoped<ErpSyncOrchestrator>();

// ── ERP Sync Scheduler (automatic background sync every N minutes) ─
// Reads interval/enabled from appsettings.json "ErpSyncScheduler" section.
// Uses IOptionsMonitor internally so Enabled/IntervalMinutes can be
// changed in appsettings.json without restarting the app.
builder.Services.Configure<ErpSyncSchedulerOptions>(
    builder.Configuration.GetSection(ErpSyncSchedulerOptions.SectionName));
builder.Services.AddSingleton<ErpSyncSchedulerStatus>();
builder.Services.AddHostedService<ErpSyncSchedulerService>();
// ─────────────────────────────────────────────────────────────────
builder.Services.AddScoped<SupplierSyncService>();   // ← NEW LINE
//builder.Services.AddCors(o => o.AddPolicy("Frontend", p => p.WithOrigins("http://localhost:5173", "https://localhost:5173").AllowAnyHeader().AllowAnyMethod()));
builder.Services.AddCors(o => o.AddPolicy("Frontend", p => p
    .WithOrigins(
        "http://localhost:5173",
        "https://localhost:5173",
        "http://localhost:5174",
        "https://localhost:5174",
        "http://10.10.50.23:3000",
        "http://localhost:3000",
           "http://10.10.50.23:5173"
    )
    .AllowAnyHeader()
    .AllowAnyMethod()));
var jwtKey = builder.Configuration["Jwt:Key"]!;
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(o => o.TokenValidationParameters = new TokenValidationParameters
{
    ValidateIssuer = true,
    ValidateAudience = true,
    ValidateIssuerSigningKey = true,
    ValidateLifetime = true,
    ValidIssuer = builder.Configuration["Jwt:Issuer"],
    ValidAudience = builder.Configuration["Jwt:Audience"],
    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
});
builder.Services.AddAuthorization();
var app = builder.Build();
app.UseMiddleware<ExceptionMiddleware>();
app.UseSwagger(); app.UseSwaggerUI();
app.UseCors("Frontend"); app.UseAuthentication();
app.UseStaticFiles();
app.UseAuthorization(); app.MapControllers();
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    try
    {
        //await new WorkflowSeedService(db).SeedAsync();
        //Console.WriteLine("✅ Workflow seed completed.");
    }
    catch (Exception ex)
    {
        //Console.WriteLine($"❌ Workflow seed failed: {ex.Message}");
        //Console.WriteLine($"Inner: {ex.InnerException?.Message}");
    }
}

app.Run();