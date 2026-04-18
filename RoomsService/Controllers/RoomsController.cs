using System.Security.Claims;
using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RoomsService.Common;
using RoomsService.DTO.Request;
using RoomsService.DTO.Response;
using RoomsService.Services.Abstractions;

namespace RoomsService.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize] // Requires valid JWT by default
public class RoomsController(
    IRoomService roomService,
    IValidator<CreateRoomRequest> createRoomValidator) : ControllerBase
{
    [HttpPost]
    [Authorize(Roles = "Member")]
    public async Task<ActionResult<ApiResponse<RoomResponse>>> CreateRoom([FromBody] CreateRoomRequest request, CancellationToken cancellationToken)
    {
        var validationResult = await createRoomValidator.ValidateAsync(request, cancellationToken);
        if (!validationResult.IsValid)
        {
            var errors = validationResult.Errors.Select(e => e.ErrorMessage);
            return BadRequest(ApiResponse<object>.Fail("Validation failed", errors));
        }

        var ownerId = GetCurrentUserId();
        var room = await roomService.CreateRoomAsync(ownerId, request, cancellationToken);
        
        return CreatedAtAction(nameof(GetRoomByCode), new { code = room.Code }, ApiResponse<RoomResponse>.Ok(room));
    }

    [HttpGet("{code}")]
    [AllowAnonymous] // Allow anyone to query if a room exists before joining
    public async Task<ActionResult<ApiResponse<RoomResponse>>> GetRoomByCode(string code, CancellationToken cancellationToken)
    {
        var room = await roomService.GetRoomByCodeAsync(code, cancellationToken);
        return Ok(ApiResponse<RoomResponse>.Ok(room));
    }

    [HttpPost("{code}/join")]
    public async Task<ActionResult<ApiResponse<object>>> JoinRoom(string code, CancellationToken cancellationToken)
    {
        var role = User.FindFirstValue(ClaimTypes.Role);
        Guid? userId = null;
        string? guestName = null;

        if (role == "Member")
        {
            userId = GetCurrentUserId();
        }
        else if (role == "Guest")
        {
            guestName = User.FindFirstValue(ClaimTypes.Name);
            // Optional: validate the "meeting_code" claim matches the requested 'code'
            var tokenMeetingCode = User.FindFirstValue("meeting_code");
            if (tokenMeetingCode != code)
            {
                return Forbid();
            }
        }
        else
        {
            return Unauthorized(ApiResponse<object>.Fail("Invalid user role."));
        }

        await roomService.JoinRoomAsync(code, userId, guestName, cancellationToken);
        return Ok(ApiResponse<object>.Ok(new { Joined = true }, "Successfully joined the room."));
    }

    [HttpGet("my-history")]
    [Authorize(Roles = "Member")]
    public async Task<ActionResult<ApiResponse<IEnumerable<RoomHistoryResponse>>>> GetMyHistory(CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        var history = await roomService.GetMyHistoryAsync(userId, cancellationToken);
        return Ok(ApiResponse<IEnumerable<RoomHistoryResponse>>.Ok(history));
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Member")]
    public async Task<ActionResult<ApiResponse<object>>> CloseRoom(Guid id, CancellationToken cancellationToken)
    {
        var ownerId = GetCurrentUserId();
        await roomService.CloseRoomAsync(id, ownerId, cancellationToken);
        return Ok(ApiResponse<object?>.Ok(null, "Room closed successfully."));
    }

    private Guid GetCurrentUserId()
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userIdString) || !Guid.TryParse(userIdString, out var userId))
        {
            throw new UnauthorizedAccessException("Invalid token claims.");
        }
        return userId;
    }
}