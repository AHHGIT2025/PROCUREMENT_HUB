
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Procurement.Api.Data;
using Procurement.Api.Middleware;
using Procurement.Api.Services;
using Procurement.Api.Services.Workflow;
using Procurement.Api.Services.Storage;
using Procurement.Api.Services.Integration;
using System.Text;

var builder = WebApplication.CreateBuilder(args);
builder.WebHost.UseUrls("http://0.0.0.0:5000");
builder.Services.AddDbContext<AppDbContext>(o => o.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));
builder.Services.AddScoped<TokenService>();
builder.Services.AddScoped<SeedService>();
builder.Services.AddControllers();
builder.Services.Configure<FileStorageOptions>(
    builder.Configuration.GetSection("FileStorage"));
builder.Services.AddSingleton<IFileStorageService, LocalFileStorageService>();
builder.Services.AddEndpointsApiExplorer();

builder.Services.AddSwaggerGen(options =>
{
    options.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Description = "Enter 'Bearer {your_token}'"
    });

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
// ─────────────────────────────────────────────────────────────────

//builder.Services.AddCors(o => o.AddPolicy("Frontend", p => p.WithOrigins("http://localhost:5173", "https://localhost:5173").AllowAnyHeader().AllowAnyMethod()));
builder.Services.AddCors(o => o.AddPolicy("Frontend", p => p
    .WithOrigins(
        "http://localhost:5173",
        "https://localhost:5173",
        "http://localhost:5174",
        "https://localhost:5174",
        "http://10.10.50.23:3000",
        "http://localhost:3000"
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
















/////////////////////////june


//using Microsoft.AspNetCore.Authentication.JwtBearer;
//using Microsoft.EntityFrameworkCore;
//using Microsoft.IdentityModel.Tokens;
//using Procurement.Api.Data;
//using Procurement.Api.Middleware;
//using Procurement.Api.Services;
//using Procurement.Api.Services.Workflow;
//using Procurement.Api.Services.Storage;
//using System.Text;

//var builder = WebApplication.CreateBuilder(args);
//builder.WebHost.UseUrls("http://0.0.0.0:5000");
//builder.Services.AddDbContext<AppDbContext>(o => o.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));
//builder.Services.AddScoped<TokenService>();
//builder.Services.AddScoped<SeedService>();
//builder.Services.AddControllers();
//builder.Services.Configure<FileStorageOptions>(
//    builder.Configuration.GetSection("FileStorage"));
//builder.Services.AddSingleton<IFileStorageService, LocalFileStorageService>();
//builder.Services.AddEndpointsApiExplorer();

//builder.Services.AddSwaggerGen(options =>
//{
//    options.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
//    {
//        Name = "Authorization",
//        Type = Microsoft.OpenApi.Models.SecuritySchemeType.Http,
//        Scheme = "bearer",
//        BearerFormat = "JWT",
//        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
//        Description = "Enter 'Bearer {your_token}'"
//    });

//    options.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
//    {
//        {
//            new Microsoft.OpenApi.Models.OpenApiSecurityScheme
//            {
//                Reference = new Microsoft.OpenApi.Models.OpenApiReference
//                {
//                    Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
//                    Id = "Bearer"
//                }
//            },
//            new string[] {}
//        }
//    });
//});
//builder.Services.AddScoped<IApprovalEngineService, ApprovalEngineService>();
////builder.Services.AddCors(o => o.AddPolicy("Frontend", p => p.WithOrigins("http://localhost:5173", "https://localhost:5173").AllowAnyHeader().AllowAnyMethod()));
//builder.Services.AddCors(o => o.AddPolicy("Frontend", p => p
//    .WithOrigins(
//        "http://localhost:5173",
//        "https://localhost:5173",
//        "http://localhost:5174",
//        "https://localhost:5174",
//        "http://10.10.50.23:3000",
//        "http://localhost:3000"
//    )
//    .AllowAnyHeader()
//    .AllowAnyMethod()));
//var jwtKey = builder.Configuration["Jwt:Key"]!;
//builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(o => o.TokenValidationParameters = new TokenValidationParameters
//{
//    ValidateIssuer = true, ValidateAudience = true, ValidateIssuerSigningKey = true, ValidateLifetime = true,
//    ValidIssuer = builder.Configuration["Jwt:Issuer"], ValidAudience = builder.Configuration["Jwt:Audience"], IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
//});
//builder.Services.AddAuthorization();
//var app = builder.Build();
//app.UseMiddleware<ExceptionMiddleware>();
//app.UseSwagger(); app.UseSwaggerUI(); 
//app.UseCors("Frontend"); app.UseAuthentication();
//app.UseStaticFiles();
//app.UseAuthorization(); app.MapControllers();
////using(var scope = app.Services.CreateScope())
////{
////    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
////    //db.Database.Migrate();
////    //await scope.ServiceProvider.GetRequiredService<SeedService>().SeedAsync();
////}
////app.Run();
//using (var scope = app.Services.CreateScope())
//{
//    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
//    try
//    {
//        //await new WorkflowSeedService(db).SeedAsync();
//        //Console.WriteLine("✅ Workflow seed completed.");
//    }
//    catch (Exception ex)
//    {
//        //Console.WriteLine($"❌ Workflow seed failed: {ex.Message}");
//        //Console.WriteLine($"Inner: {ex.InnerException?.Message}");
//    }
//}

//app.Run();
