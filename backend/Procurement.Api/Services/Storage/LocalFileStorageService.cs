using Microsoft.Extensions.Options;
namespace Procurement.Api.Services.Storage
{
    public class FileStorageOptions
    {
        public string RootPath { get; set; } = "App_Data/attachments";
    }

    public class LocalFileStorageService : IFileStorageService
    {
        private readonly string _root;

        public LocalFileStorageService(IWebHostEnvironment env, IOptions<FileStorageOptions> options)
        {
            var configuredRoot = options.Value.RootPath;
            _root = Path.IsPathRooted(configuredRoot)
                ? configuredRoot
                : Path.Combine(env.ContentRootPath, configuredRoot);

            Directory.CreateDirectory(_root);
        }

        public async Task<string> SaveAsync(Stream fileStream, string originalFileName, Guid companyId, string category)
        {
            var ext = Path.GetExtension(originalFileName).ToLowerInvariant();
            var storedName = $"{Guid.NewGuid()}{ext}";

            var relativeDir = Path.Combine(companyId.ToString(), category);
            var absoluteDir = Path.Combine(_root, relativeDir);
            Directory.CreateDirectory(absoluteDir);

            var absolutePath = Path.Combine(absoluteDir, storedName);
            using (var output = new FileStream(absolutePath, FileMode.Create))
            {
                await fileStream.CopyToAsync(output);
            }

            return $"{companyId}/{category}/{storedName}".Replace("\\", "/");
        }

        public Task<(Stream Stream, string ContentType, string FileName)?> GetAsync(string storageKey)
        {
            var safeKey = storageKey.Replace("..", "").TrimStart('/');
            var absolutePath = Path.Combine(_root, safeKey.Replace('/', Path.DirectorySeparatorChar));

            if (!File.Exists(absolutePath))
                return Task.FromResult<(Stream, string, string)?>(null);

            Stream stream = File.OpenRead(absolutePath);
            var contentType = GetContentType(Path.GetExtension(absolutePath));
            var fileName = Path.GetFileName(absolutePath);

            return Task.FromResult<(Stream, string, string)?>((stream, contentType, fileName));
        }

        public Task DeleteAsync(string storageKey)
        {
            var safeKey = storageKey.Replace("..", "").TrimStart('/');
            var absolutePath = Path.Combine(_root, safeKey.Replace('/', Path.DirectorySeparatorChar));
            if (File.Exists(absolutePath)) File.Delete(absolutePath);
            return Task.CompletedTask;
        }

        private static string GetContentType(string ext) => ext.ToLowerInvariant() switch
        {
            ".jpg" or ".jpeg" => "image/jpeg",
            ".png" => "image/png",
            ".gif" => "image/gif",
            ".webp" => "image/webp",
            ".pdf" => "application/pdf",
            ".doc" => "application/msword",
            ".docx" => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            ".xls" => "application/vnd.ms-excel",
            ".xlsx" => "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            _ => "application/octet-stream"
        };
    }
}
