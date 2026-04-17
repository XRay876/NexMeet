using System.Security.Claims;
using Microsoft.AspNetCore.SignalR;

[Authorize]
public class ChatHub : Hub
{
    private readonly MongoService _mongo;

    public ChatHub(MongoService mongo)
    {
        _mongo = mongo;
    }

    public async Task JoinRoom(string roomId)
    {
        // Guests carry a meeting_code claim scoped to one room.
        // Verify it matches before allowing them into the SignalR group.
        var role = Context.User?.FindFirst(ClaimTypes.Role)?.Value;
        if (role == "Guest")
        {
            var meetingCode = Context.User?.FindFirst("meeting_code")?.Value;
            if (meetingCode != roomId)
                throw new HubException("Access denied: your guest token is not valid for this room.");
        }

        await Groups.AddToGroupAsync(Context.ConnectionId, roomId);
        await Clients.Group(roomId).SendAsync("UserJoined", Context.ConnectionId);
    }

    public async Task LeaveRoom(string roomId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, roomId);
        await Clients.Group(roomId).SendAsync("UserLeft", Context.ConnectionId);
    }

    public async Task SendMessage(string roomId, string text)
    {
        var userId = Context.User?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? "unknown";
        var name = Context.User?.FindFirst(System.Security.Claims.ClaimTypes.Name)?.Value ?? "Unknown";

        var msg = new ChatMessage
        {
            RoomId = roomId,
            SenderUserId = userId,
            SenderDisplayName = name,
            Text = text,
            CreatedAt = DateTime.UtcNow
        };

        await _mongo.Messages.InsertOneAsync(msg);

        await Clients.Group(roomId).SendAsync("ReceiveMessage", msg);
    }

    public async Task SendTypingStatus(string roomId, bool isTyping)
    {
        await Clients.OthersInGroup(roomId)
            .SendAsync("UserTyping", Context.ConnectionId, isTyping);
    }
}