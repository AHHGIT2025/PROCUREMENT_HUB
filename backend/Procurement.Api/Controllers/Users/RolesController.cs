using Microsoft.AspNetCore.Mvc;
using Procurement.Api.Data;
using Procurement.Api.Models;

namespace Procurement.Api.Controllers.Users
{
    [ApiController]
    [Route("api/roles")] public class RolesController : CrudController<Role> { public RolesController(AppDbContext db) : base(db) { } }
    //[Route("api/material-requests")] public class MaterialsController:CrudController<Material>{public MaterialsController(AppDbContext db):base(db){}}
}
