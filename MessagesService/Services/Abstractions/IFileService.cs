using MessagesService.Data.Entities;
using MessagesService.DTO.Response;

namespace MessagesService.Services.Abstractions;

public interface IFileService
{
    Task<SharedFileResponse> UploadFileAsync(string roomId, string userId, string displayName, IFormFile file, CancellationToken cancellationToken = default);
    Task<IEnumerable<SharedFileResponse>> GetFilesByRoomAsync(string roomId, CancellationToken cancellationToken = default);
    Task<(Stream Stream, SharedFile FileInfo)> DownloadFileAsync(string fileId, CancellationToken cancellationToken = default);
    Task DeleteFileAsync(string fileId, string requesterUserId, CancellationToken cancellationToken = default);
}