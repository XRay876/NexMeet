using AutoMapper;
using MessagesService.Common;
using MessagesService.Data;
using MessagesService.Data.Entities;
using MessagesService.DTO.Response;
using MessagesService.Services.Abstractions;
using Microsoft.Extensions.Options;
using MongoDB.Driver;

namespace MessagesService.Services;

public class FileService(
    MongoDbContext context,
    IFileStorageProvider storageProvider,
    IOptions<FileStorageSettings> settings,
    IMapper mapper,
    ILogger<FileService> logger) : IFileService
{
    private readonly FileStorageSettings _settings = settings.Value;

    public async Task<SharedFileResponse> UploadFileAsync(string roomId, string userId, string displayName, IFormFile file, CancellationToken cancellationToken = default)
    {
        if (file.Length > _settings.MaxFileSizeMb * 1024 * 1024)
            throw new ArgumentException($"File exceeds maximum allowed size of {_settings.MaxFileSizeMb}MB.");

        var extension = Path.GetExtension(file.FileName);
        using var stream = file.OpenReadStream();
        
        var storedFileName = await storageProvider.SaveFileAsync(stream, extension, cancellationToken);

        var sharedFile = new SharedFile
        {
            RoomId = roomId,
            UploaderUserId = userId,
            UploaderDisplayName = displayName,
            OriginalFileName = file.FileName,
            StoredFileName = storedFileName,
            ContentType = file.ContentType,
            Size = file.Length,
            UploadedAt = DateTime.UtcNow
        };

        await context.Files.InsertOneAsync(sharedFile, cancellationToken: cancellationToken);
        logger.LogInformation("File {FileName} uploaded to room {RoomId} by user {UserId}", file.FileName, roomId, userId);

        return mapper.Map<SharedFileResponse>(sharedFile);
    }

    public async Task<IEnumerable<SharedFileResponse>> GetFilesByRoomAsync(string roomId, CancellationToken cancellationToken = default)
    {
        var files = await context.Files.Find(f => f.RoomId == roomId).ToListAsync(cancellationToken);
        return mapper.Map<IEnumerable<SharedFileResponse>>(files);
    }

    public async Task<(Stream Stream, SharedFile FileInfo)> DownloadFileAsync(string fileId, CancellationToken cancellationToken = default)
    {
        var fileInfo = await context.Files.Find(f => f.Id == fileId).FirstOrDefaultAsync(cancellationToken)
            ?? throw new KeyNotFoundException("File record not found.");

        var stream = await storageProvider.GetFileStreamAsync(fileInfo.StoredFileName, cancellationToken)
            ?? throw new FileNotFoundException("Physical file not found on server.");

        return (stream, fileInfo);
    }

    public async Task DeleteFileAsync(string fileId, string requesterUserId, CancellationToken cancellationToken = default)
    {
        var fileInfo = await context.Files.Find(f => f.Id == fileId).FirstOrDefaultAsync(cancellationToken)
            ?? throw new KeyNotFoundException("File not found.");

        if (fileInfo.UploaderUserId != requesterUserId)
            throw new UnauthorizedAccessException("You can only delete your own files.");

        await storageProvider.DeleteFileAsync(fileInfo.StoredFileName, cancellationToken);
        await context.Files.DeleteOneAsync(f => f.Id == fileId, cancellationToken);
        
        logger.LogInformation("File {FileId} deleted by user {UserId}", fileId, requesterUserId);
    }
}