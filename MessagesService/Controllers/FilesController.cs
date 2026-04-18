using MessagesService.Common;
using MessagesService.DTO.Response;
using MessagesService.Services.Abstractions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RoomsService.Common;

namespace MessagesService.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class FilesController(IFileService fileService) : ControllerBase
{
    [HttpPost("upload/{roomId}")]
    [Authorize(Policy = Constants.MemberPolicy)]
    public async Task<ActionResult<ApiResponse<SharedFileResponse>>> Upload(string roomId, IFormFile file, CancellationToken cancellationToken)
    {
        if (file == null || file.Length == 0)
            return BadRequest(ApiResponse<object>.Fail("No file uploaded."));

        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? string.Empty;
        var name = User.FindFirst(System.Security.Claims.ClaimTypes.Name)?.Value ?? "Unknown";

        var response = await fileService.UploadFileAsync(roomId, userId, name, file, cancellationToken);
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
    public async Task<ActionResult<ApiResponse<object>>> Delete(string fileId, CancellationToken cancellationToken)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? string.Empty;
        await fileService.DeleteFileAsync(fileId, userId, cancellationToken);
        return Ok(ApiResponse<object?>.Ok(null, "File deleted successfully."));
    }
}
