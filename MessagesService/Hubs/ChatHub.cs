using System.Security.Claims;
using MessagesService.Common;
using MessagesService.Services.Abstractions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace MessagesService.Hubs;

[Authorize]
public class ChatHub(
    IMessageService messageService,
    ILogger<ChatHub> logger) : Hub
{
    public async Task JoinRoom(string roomId)
    {
        var role = Context.User?.FindFirst(ClaimTypes.Role)?.Value;
        if (role == Constants.GuestRole)
        {
            var meetingCode = Context.User?.FindFirst("meeting_code")?.Value;
            if (meetingCode != roomId)
            {
                logger.LogWarning("Connection {ConnectionId} attempted to join unauthorized room {RoomCode}", Context.ConnectionId, roomId);
                throw new HubException("Access denied: Invalid meeting code for this guest token.");
            }
        }

        await Groups.AddToGroupAsync(Context.ConnectionId, roomId);
        await Clients.OthersInGroup(roomId).SendAsync("UserJoined", Context.ConnectionId);
        logger.LogInformation("User {UserId} joined chat room {RoomId}", Context.UserIdentifier, roomId);
    }

    public async Task LeaveRoom(string roomId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, roomId);
        await Clients.OthersInGroup(roomId).SendAsync("UserLeft", Context.ConnectionId);
    }

    public async Task SendMessage(string roomId, string text)
    {
        var userId =
            Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value ??
            Context.User?.FindFirst("sub")?.Value ??
            "unknown";

        var displayName =
            Context.User?.FindFirst(ClaimTypes.Name)?.Value ??
            Context.User?.FindFirst("name")?.Value ??
            Context.User?.FindFirst("displayName")?.Value ??
            Context.User?.FindFirst("unique_name")?.Value ??
            "Unknown";

        var savedMessage = await messageService.SaveMessageAsync(roomId, userId, displayName, text);

        await Clients.Group(roomId).SendAsync("ReceiveMessage", savedMessage);
    }

    public async Task SendTypingStatus(string roomId, bool isTyping)
    {
        var displayName =
            Context.User?.FindFirst(ClaimTypes.Name)?.Value ??
            Context.User?.FindFirst("name")?.Value ??
            Context.User?.FindFirst("displayName")?.Value ??
            Context.User?.FindFirst("unique_name")?.Value ??
            "Unknown";

        await Clients.OthersInGroup(roomId).SendAsync("UserTyping", displayName, isTyping);
    }
}

