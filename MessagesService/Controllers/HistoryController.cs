using FluentValidation;
using MessagesService.Common;
using MessagesService.DTO.Request;
using MessagesService.DTO.Response;
using MessagesService.Services.Abstractions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RoomsService.Common;

namespace MessagesService.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Policy = Constants.MemberPolicy)]
public class HistoryController(
    IMessageService messageService,
    IFileService fileService,
    IValidator<GetHistoryRequest> validator) : ControllerBase
{
    [HttpGet("{roomId}")]
    public async Task<ActionResult<ApiResponse<HistoryResponse>>> GetFullHistory(string roomId, [FromQuery] GetHistoryRequest request, CancellationToken cancellationToken)
    {
        var validationResult = await validator.ValidateAsync(request, cancellationToken);
        if (!validationResult.IsValid)
            return BadRequest(ApiResponse<object>.Fail("Validation failed", validationResult.Errors.Select(e => e.ErrorMessage)));

        var messages = await messageService.GetHistoryAsync(roomId, request.Limit, request.Before, cancellationToken);
        
        // Only fetch files if we are requesting the initial load (no pagination cursor)
        var files = request.Before == null 
            ? await fileService.GetFilesByRoomAsync(roomId, cancellationToken)
            : [];

        return Ok(ApiResponse<HistoryResponse>.Ok(new HistoryResponse(messages, files)));
    }

    [HttpDelete("messages/{messageId}")]
    public async Task<ActionResult<ApiResponse<object>>> DeleteMessage(string messageId, CancellationToken cancellationToken)
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? string.Empty;
        await messageService.DeleteMessageAsync(messageId, userId, cancellationToken);
        return Ok(ApiResponse<object?>.Ok(null, "Message deleted successfully."));
    }
}