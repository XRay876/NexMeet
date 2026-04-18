using MessagesService.Common;
using MessagesService.Services.Abstractions;
using Microsoft.Extensions.Options;

namespace MessagesService.Services;

public class LocalFileStorageProvider : IFileStorageProvider
{
    private readonly string _basePath;

    public LocalFileStorageProvider(IOptions<FileStorageSettings> settings)
    {
        _basePath = settings.Value.BasePath;
        if (!Directory.Exists(_basePath))
        {
            Directory.CreateDirectory(_basePath);
        }
    }

    public async Task<string> SaveFileAsync(Stream content, string extension, CancellationToken cancellationToken = default)
    {
        var storedFileName = $"{Guid.NewGuid()}{extension}";
        var filePath = Path.Combine(_basePath, storedFileName);

        using var fileStream = new FileStream(filePath, FileMode.Create, FileAccess.Write, FileShare.None, 4096, true);
        await content.CopyToAsync(fileStream, cancellationToken);

        return storedFileName;
    }

    public Task<Stream?> GetFileStreamAsync(string storedFileName, CancellationToken cancellationToken = default)
    {
        var filePath = Path.Combine(_basePath, storedFileName);
        if (!File.Exists(filePath)) return Task.FromResult<Stream?>(null);

        var stream = new FileStream(filePath, FileMode.Open, FileAccess.Read, FileShare.Read, 4096, true);
        return Task.FromResult<Stream?>(stream);
    }

    public Task DeleteFileAsync(string storedFileName, CancellationToken cancellationToken = default)
    {
        var filePath = Path.Combine(_basePath, storedFileName);
        if (File.Exists(filePath))
        {
            File.Delete(filePath);
        }
        return Task.CompletedTask;
    }
}