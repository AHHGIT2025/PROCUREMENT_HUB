namespace Procurement.Api.Services.Storage
{

    public interface IFileStorageService
    {
        Task<string> SaveAsync(Stream fileStream, string originalFileName, Guid companyId, string category);
        Task<(Stream Stream, string ContentType, string FileName)?> GetAsync(string storageKey);
        Task DeleteAsync(string storageKey);
    }
}
