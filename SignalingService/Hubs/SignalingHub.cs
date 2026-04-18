using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace SignalingService.Hubs;

[Authorize]
public class SignalingHub(ILogger<SignalingHub> logger) : Hub
{
    public async Task JoinMeeting(string roomCode)
    {
        // 1. Guest Validation
        var role = Context.User?.FindFirst(ClaimTypes.Role)?.Value;
        if (role == "Guest")
        {
            var allowedCode = Context.User?.FindFirst("meeting_code")?.Value;
            if (allowedCode != roomCode)
            {
                logger.LogWarning("Connection {ConnectionId} attempted to join unauthorized room {RoomCode}", Context.ConnectionId, roomCode);
                throw new HubException("Access denied: Invalid meeting code for this guest token.");
            }
        }

        // 2. Add to SignalR Group
        await Groups.AddToGroupAsync(Context.ConnectionId, roomCode);
        logger.LogInformation("Connection {ConnectionId} joined room {RoomCode}", Context.ConnectionId, roomCode);

        // 3. Notify others in the room that a new peer is ready to connect
        await Clients.OthersInGroup(roomCode).SendAsync("PeerJoined", Context.ConnectionId);
    }

    public async Task LeaveMeeting(string roomCode)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, roomCode);
        logger.LogInformation("Connection {ConnectionId} left room {RoomCode}", Context.ConnectionId, roomCode);

        await Clients.OthersInGroup(roomCode).SendAsync("PeerLeft", Context.ConnectionId);
    }

    // WebRTC: Step 1 - Send Offer (SDP)
    public async Task SendOffer(string targetConnectionId, object sdpOffer)
    {
        logger.LogDebug("Offer sent from {Source} to {Target}", Context.ConnectionId, targetConnectionId);
        await Clients.Client(targetConnectionId).SendAsync("ReceiveOffer", Context.ConnectionId, sdpOffer);
    }

    // WebRTC: Step 2 - Send Answer (SDP)
    public async Task SendAnswer(string targetConnectionId, object sdpAnswer)
    {
        logger.LogDebug("Answer sent from {Source} to {Target}", Context.ConnectionId, targetConnectionId);
        await Clients.Client(targetConnectionId).SendAsync("ReceiveAnswer", Context.ConnectionId, sdpAnswer);
    }

    // WebRTC: Step 3 - Exchange ICE Candidates (Network paths)
    public async Task SendIceCandidate(string targetConnectionId, object candidate)
    {
        logger.LogDebug("ICE Candidate sent from {Source} to {Target}", Context.ConnectionId, targetConnectionId);
        await Clients.Client(targetConnectionId).SendAsync("ReceiveIceCandidate", Context.ConnectionId, candidate);
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        logger.LogInformation("Connection {ConnectionId} disconnected.", Context.ConnectionId);
        // Note: It's best practice for the frontend to call LeaveMeeting explicitly, 
        // but if they close the tab, SignalR cleans up groups automatically.
        await base.OnDisconnectedAsync(exception);
    }
}