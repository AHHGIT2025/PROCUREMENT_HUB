# Al Hattab Holding - Procurement / Material Purchase Request Management System

This package contains a complete starter monorepo for an enterprise Procurement and Material Purchase Request Management System.

It includes:

- React + TypeScript + Vite frontend
- .NET 8 Web API backend
- SQL Server + Entity Framework Core database setup
- JWT login
- Role-based structure
- Seed sample data
- Dashboard APIs
- Material master
- Purchase requests
- Approval actions
- Upload center data model
- Oracle integration monitor data model
- Audit logs
- Stitch UI reference screens
- Original SQL Server schema script

> Note: This is source code, not a compiled installer. You need Node.js, .NET 8 SDK, and SQL Server to run it.

---

## 1. Software Required

Install these first:

1. Node.js LTS
2. .NET 8 SDK
3. SQL Server Developer Edition or SQL Server Express
4. SQL Server Management Studio
5. Visual Studio 2022 or VS Code

---

## 2. Folder Structure

```text
procurement-full-app/
  frontend/
    React TypeScript Vite app
  backend/
    Procurement.Api/
      .NET 8 Web API
  database/
    MaterialRequestDB_Schema.sql
  screens-reference/
    Stitch exported HTML/screenshots for UI reference
  README.md
```

---

## 3. Default Login Users

| User | Email | Password |
|---|---|---|
| System Admin | admin@alhattab.com | Admin@123 |
| Requester | requester@alhattab.com | User@123 |
| Approver | approver@alhattab.com | User@123 |
| Material Admin | material.admin@alhattab.com | User@123 |
| Workflow Admin | workflow.admin@alhattab.com | User@123 |

---

## 4. Configure SQL Server Connection

Open:

```text
backend/Procurement.Api/appsettings.json
```

Default connection:

```json
"DefaultConnection": "Server=localhost;Database=MaterialRequestDB_App;Trusted_Connection=True;TrustServerCertificate=True;MultipleActiveResultSets=true"
```

For SQL Server Express, use:

```json
"DefaultConnection": "Server=localhost\\SQLEXPRESS;Database=MaterialRequestDB_App;Trusted_Connection=True;TrustServerCertificate=True;MultipleActiveResultSets=true"
```

For SQL username/password, use:

```json
"DefaultConnection": "Server=localhost;Database=MaterialRequestDB_App;User Id=sa;Password=YourPassword;TrustServerCertificate=True;MultipleActiveResultSets=true"
```

---

## 5. Run Backend

Open a terminal:

```bash
cd backend/Procurement.Api
dotnet restore
dotnet tool install --global dotnet-ef
```

Create migration:

```bash
dotnet ef migrations add InitialCreate
```

Create/update database:

```bash
dotnet ef database update
```

Run API:

```bash
dotnet run
```

The API will run on a localhost URL shown in the terminal, usually:

```text
https://localhost:5001
```

Swagger:

```text
https://localhost:5001/swagger
```

The application seeds sample data automatically on startup.

---

## 6. Run Frontend

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open:

```text
http://localhost:5173
```

Login with:

```text
admin@alhattab.com
Admin@123
```

---

## 7. Important API Endpoints

```text
POST /api/auth/login
GET  /api/dashboard
GET  /api/companies
GET  /api/departments
GET  /api/users
GET  /api/roles
GET  /api/materials
GET  /api/purchase-requests
POST /api/purchase-requests
GET  /api/approvals/pending
POST /api/approvals/{id}/approve
POST /api/approvals/{id}/reject
GET  /api/workflows
GET  /api/uploads
GET  /api/audit-logs
GET  /api/integration-logs
GET  /api/notifications
```

---

## 8. Database Notes

There are two database paths included:

1. **EF Core working app database**
   - Created by the .NET backend using migrations
   - Database name: `MaterialRequestDB_App`
   - Recommended for running the application

2. **Original full SQL Server schema**
   - File: `database/MaterialRequestDB_Schema.sql`
   - Use this as a reference or to create a fuller enterprise database manually in SSMS

---

## 9. Included Seed Data

The backend seeds:

- Al Hattab Holding
- 4 companies
- 8 departments per company
- 13 roles
- 5 default users
- 25 materials
- 10 purchase requests
- Workflow definitions
- Workflow steps
- Approval actions
- Upload batch records
- Oracle integration logs
- Audit logs

---

## 10. Frontend Pages Included

- Login
- Dashboard
- Materials
- Purchase Requests
- Create Purchase Request
- Pending Approvals
- Workflow Configuration
- Organization Management
- User Management
- Upload Center
- Oracle Integration Monitor
- Audit Logs
- Notifications
- Settings

---

## 11. Notes for Production Use

Before production deployment:

1. Replace the JWT key in `appsettings.json`.
2. Use HTTPS only.
3. Store secrets in environment variables or Azure Key Vault.
4. Replace SHA256 demo password hashing with ASP.NET Core Identity or BCrypt.
5. Add file storage for attachments.
6. Add real Oracle API credentials and adapters.
7. Add email/SMS notifications.
8. Add detailed permission checks per screen and API.
9. Add validation classes and integration tests.
10. Deploy backend to IIS or Azure App Service.
11. Deploy frontend to IIS, Azure Static Web Apps, or similar.

---

## 12. Troubleshooting

### Backend cannot connect to SQL Server

Check:

- SQL Server is running
- Connection string server name is correct
- `TrustServerCertificate=True` exists
- SQL Server allows local connections

### Frontend login fails

Check:

- Backend is running
- Frontend `.env` points to the backend API
- Swagger opens correctly
- Browser did not block the backend HTTPS certificate

### EF command not found

Run:

```bash
dotnet tool install --global dotnet-ef
```

Then restart your terminal.

---

## 13. Development Roadmap

Recommended next upgrades:

1. Add full Clean Architecture project split
2. Add ASP.NET Core Identity
3. Add granular permissions
4. Add Excel upload parser
5. Add attachment upload storage
6. Add Oracle posting background job
7. Add SignalR live notifications
8. Add approval matrix builder UI
9. Add advanced dashboard filters
10. Add audit comparison old/new values

