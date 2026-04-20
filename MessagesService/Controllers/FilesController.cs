using MessagesService.Common;
using MessagesService.DTO.Response;
using MessagesService.Hubs;
using MessagesService.Services.Abstractions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using RoomsService.Common;

namespace MessagesService.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class FilesController(
    IFileService fileService,
    IHubContext<ChatHub> hubContext) : ControllerBase
{
    [HttpPost("upload/{roomId}")]
    [Authorize(Policy = Constants.MemberPolicy)]
    public async Task<ActionResult<ApiResponse<SharedFileResponse>>> Upload(string roomId, [FromQuery] string? roomCode, IFormFile file, CancellationToken cancellationToken)
    {
        if (file == null || file.Length == 0)
            return BadRequest(ApiResponse<object>.Fail("No file uploaded."));

        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? string.Empty;
        var name = User.FindFirst(System.Security.Claims.ClaimTypes.Name)?.Value ?? "Unknown";

        var response = await fileService.UploadFileAsync(roomId, userId, name, file, cancellationToken);
        
        // Broadcast file upload to all users in the room via SignalR if room code is provided
        if (!string.IsNullOrEmpty(roomCode))
        {
            await hubContext.Clients.Group(roomCode).SendAsync("FileUploaded", response, cancellationToken);
        }
        
        return Ok(ApiResponse<SharedFileResponse>.Ok(response));
    }

    [HttpGet("download/{fileId}")]
    public async Task<IActionResult> Download(string fileId, CancellationToken cancellationToken)
    {
        var (stream, fileInfo) = await fileService.DownloadFileAsync(fileId, cancellationToken);
        return File(stream, fileInfo.ContentType, fileInfo.OriginalFileName);
    }

    [HttpGet("room/{roomId}")]
    public async Task<ActionResult<ApiResponse<IEnumerable<SharedFileResponse>>>> GetByRoom(string roomId, CancellationToken cancellationToken)
    {
        var files = await fileService.GetFilesByRoomAsync(roomId, cancellationToken);
        return Ok(ApiResponse<IEnumerable<SharedFileResponse>>.Ok(files));
    }

    [HttpDelete("delete/{fileId}")]
    [Authorize(Policy = Constants.MemberPolicy)]
    public async Task<ActionResult<ApiResponse<object>>> Delete(string fileId, [FromQuery] string? roomCode, CancellationToken cancellationToken)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? string.Empty;
        await fileService.DeleteFileAsync(fileId, userId, cancellationToken);
        
        // Broadcast file deletion to all users in the room if room code is provided
        if (!string.IsNullOrEmpty(roomCode))
        {
            await hubContext.Clients.Group(roomCode).SendAsync("FileDeleted", fileId, cancellationToken);
        }
        
        return Ok(ApiResponse<object?>.Ok(null, "File deleted successfully."));
    }
}
