# Database Files

- `MaterialRequestDB_Schema.sql` is the full SQL Server schema provided for the material and purchase request management system.
- The working .NET app uses EF Core migrations and seed data from `backend/Procurement.Api/Services/SeedService.cs`.

Recommended startup for beginners:

1. Run the backend migrations using `dotnet ef database update`.
2. Let the backend seed sample data automatically.
3. Use the SQL script as a full enterprise reference schema.
