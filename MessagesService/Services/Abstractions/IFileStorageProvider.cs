namespace MessagesService.Services.Abstractions;

public interface IFileStorageProvider
{
    Task<string> SaveFileAsync(Stream content, string extension, CancellationToken cancellationToken = default);
    Task<Stream?> GetFileStreamAsync(string storedFileName, CancellationToken cancellationToken = default);
    Task DeleteFileAsync(string storedFileName, CancellationToken cancellationToken = default);
}