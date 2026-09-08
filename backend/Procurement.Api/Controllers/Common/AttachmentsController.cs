//using Microsoft.AspNetCore.Authorization;
//using Microsoft.AspNetCore.Mvc;
//using Procurement.Api.Services.Storage;

//namespace Procurement.Api.Controllers.System
//{
//    [ApiController]
//    [Route("api/attachments")]
//    public class AttachmentsController : ControllerBase
//    {
//        private readonly IFileStorageService _storage;

//        public AttachmentsController(IFileStorageService storage)
//        {
//            _storage = storage;
//        }

//        // POST /api/attachments/upload  (multipart/form-data: file, companyId)
//        [Authorize]
//        [HttpPost("upload")]
//        [RequestSizeLimit(10_000_000)] // 10 MB
//        public async Task<IActionResult> Upload(IFormFile file, [FromForm] Guid companyId)
//        {
//            if (file == null || file.Length == 0)
//                return BadRequest(new { success = false, message = "No file uploaded." });

//            if (companyId == Guid.Empty)
//                return BadRequest(new { success = false, message = "Company is required." });

//            var allowedExtensions = new[]
//            {
//                ".jpg", ".jpeg", ".png", ".gif", ".webp",
//                ".pdf", ".doc", ".docx", ".xls", ".xlsx"
//            };

//            var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
//            if (!allowedExtensions.Contains(ext))
//                return BadRequest(new { success = false, message = $"File type '{ext}' is not allowed." });

//            using var stream = file.OpenReadStream();
//            var storageKey = await _storage.SaveAsync(stream, file.FileName, companyId, "request-items");

//            return Ok(new
//            {
//                success = true,
//                storageKey,
//                fileName = file.FileName,
//                fileUrl = $"/api/attachments/file/{storageKey}"
//            });
//        }

//        // GET /api/attachments/file/{companyId}/{category}/{filename}
//        [AllowAnonymous]
//        [HttpGet("file/{**key}")]
//        public async Task<IActionResult> GetFile(string key)
//        {
//            var result = await _storage.GetAsync(key);
//            if (result == null) return NotFound();

//            var (stream, contentType, fileName) = result.Value;
//            return File(stream, contentType, fileName);
//        }
//    }
//}

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Procurement.Api.Services.Storage;

namespace Procurement.Api.Controllers.System
{
    [ApiController]
    [Route("api/attachments")]
    public class AttachmentsController : ControllerBase
    {
        private readonly IFileStorageService _storage;

        public AttachmentsController(IFileStorageService storage)
        {
            _storage = storage;
        }

        // POST /api/attachments/upload  (multipart/form-data: file, companyId)
        [Authorize]
        [HttpPost("upload")]
        [RequestSizeLimit(10_000_000)] // 10 MB
        public async Task<IActionResult> Upload(IFormFile file, [FromForm] Guid companyId)
        {
            if (file == null || file.Length == 0)
                return BadRequest(new { success = false, message = "No file uploaded." });

            if (companyId == Guid.Empty)
                return BadRequest(new { success = false, message = "Company is required." });

            var allowedExtensions = new[]
            {
                ".jpg", ".jpeg", ".png", ".gif", ".webp",
                ".pdf", ".doc", ".docx", ".xls", ".xlsx"
            };

            var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (!allowedExtensions.Contains(ext))
                return BadRequest(new { success = false, message = $"File type '{ext}' is not allowed." });

            using var stream = file.OpenReadStream();
            var storageKey = await _storage.SaveAsync(stream, file.FileName, companyId, "request-items");

            return Ok(new
            {
                success = true,
                storageKey,
                fileName = file.FileName,
                fileUrl = $"/api/attachments/file/{storageKey}"
            });
        }

        // GET /api/attachments/file/{companyId}/{category}/{filename}
        // ✅ FIX: Previously used the 3-arg File(stream, contentType, fileName)
        // overload, which makes ASP.NET Core set a Content-Disposition:
        // attachment header — forcing every file (including images) to
        // download instead of previewing inline in the browser. Dropping
        // the fileName argument here removes that header, so the browser
        // falls back to its normal behavior: images/PDFs preview inline,
        // other types (docx/xlsx) still download since browsers can't
        // render them anyway.
        [AllowAnonymous]
        [HttpGet("file/{**key}")]
        public async Task<IActionResult> GetFile(string key)
        {
            var result = await _storage.GetAsync(key);
            if (result == null) return NotFound();

            var (stream, contentType, fileName) = result.Value;
            return File(stream, contentType);
        }
    }
}
