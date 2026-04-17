using Microsoft.AspNetCore.SignalR;

public class ChatHub : Hub
{
    private readonly MongoService _mongo;

    public ChatHub(MongoService mongo)
    {
        _mongo = mongo;
    }

    public async Task JoinRoom(string roomId)
    {
        await Groups.AddToGroupAsync(Context.ConnectionId, roomId);
        await Clients.Group(roomId).SendAsync("UserJoined", Context.UserIdentifier);
    }

    public async Task LeaveRoom(string roomId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, roomId);
        await Clients.Group(roomId).SendAsync("UserLeft", Context.UserIdentifier);
    }

    public async Task SendMessage(string roomId, string text)
    {
        var userId = Context.User?.FindFirst("userId")?.Value;
        var name = Context.User?.FindFirst("displayName")?.Value;

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
            .SendAsync("UserTyping", Context.UserIdentifier, isTyping);
    }
}