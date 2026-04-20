using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace SignalingService.Hubs;

[Authorize]
public class SignalingHub(ILogger<SignalingHub> logger) : Hub
{
    // Track which room each connection is in
    private static readonly Dictionary<string, string> ConnectionRooms = new();
    
    // Track peer information per room: roomCode -> List of (connectionId, displayName, isHost)
    private static readonly Dictionary<string, List<(string ConnectionId, string DisplayName, bool IsHost)>> RoomPeers = new();
    private static readonly object LockObject = new();

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

        // 2. Track this connection in the room
        lock (LockObject)
        {
            ConnectionRooms[Context.ConnectionId] = roomCode;
        }

        // 3. Add to SignalR Group
        await Groups.AddToGroupAsync(Context.ConnectionId, roomCode);
        logger.LogInformation("Connection {ConnectionId} joined room {RoomCode}", Context.ConnectionId, roomCode);

        // 4. Extract user information from JWT claims
        var userId = Context.User?.FindFirst("sub")?.Value ?? Context.User?.FindFirst("nameid")?.Value;
        var displayName = Context.User?.FindFirst("preferred_username")?.Value ?? 
                         Context.User?.FindFirst("name")?.Value ?? 
                         Context.User?.FindFirst("given_name")?.Value ??
                         "Guest";

        // 5. Determine if this is the first user (host)
        bool isHost = false;
        lock (LockObject)
        {
            if (!RoomPeers.ContainsKey(roomCode))
            {
                RoomPeers[roomCode] = new List<(string, string, bool)>();
                isHost = true; // First person to join is the host
            }
            RoomPeers[roomCode].Add((Context.ConnectionId, displayName, isHost));
        }

        // 6. Send all existing peers to the new joiner
        List<(string ConnectionId, string DisplayName, bool IsHost)> existingPeers;
        lock (LockObject)
        {
            // Get all peers except the one joining (they're already added)
            existingPeers = RoomPeers[roomCode]
                .Where(p => p.ConnectionId != Context.ConnectionId)
                .ToList();
        }

        // Send each existing peer to the new joiner
        foreach (var (peerId, peerName, peerIsHost) in existingPeers)
        {
            await Clients.Caller.SendAsync("PeerJoined", peerId, peerName, peerIsHost);
        }

        // 7. Notify others in the room that a new peer is ready to connect
        // Send the new peer's info to existing peers
        await Clients.OthersInGroup(roomCode).SendAsync("PeerJoined", Context.ConnectionId, displayName, isHost);
    }

    public async Task LeaveMeeting(string roomCode)
    {
        // Remove tracking
        lock (LockObject)
        {
            ConnectionRooms.Remove(Context.ConnectionId);
            if (RoomPeers.ContainsKey(roomCode))
            {
                RoomPeers[roomCode].RemoveAll(p => p.ConnectionId == Context.ConnectionId);
                // If room is empty, clean it up
                if (RoomPeers[roomCode].Count == 0)
                {
                    RoomPeers.Remove(roomCode);
                }
            }
        }

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
        logger.LogInformation("Connection {ConnectionId} disconnected. Exception: {Exception}", Context.ConnectionId, exception?.Message);

        // Get the room this connection was in
        string? roomCode = null;
        lock (LockObject)
        {
            if (ConnectionRooms.TryGetValue(Context.ConnectionId, out var room))
            {
                roomCode = room;
                ConnectionRooms.Remove(Context.ConnectionId);
            }
        }

        // Notify peers in the room that this connection left
        if (!string.IsNullOrEmpty(roomCode))
        {
            logger.LogInformation("Notifying peers in room {RoomCode} that {ConnectionId} disconnected", roomCode, Context.ConnectionId);
            await Clients.OthersInGroup(roomCode).SendAsync("PeerLeft", Context.ConnectionId);
            
            // Clean up room tracking
            lock (LockObject)
            {
                if (RoomPeers.ContainsKey(roomCode))
                {
                    RoomPeers[roomCode].RemoveAll(p => p.ConnectionId == Context.ConnectionId);
                    if (RoomPeers[roomCode].Count == 0)
                    {
                        RoomPeers.Remove(roomCode);
                    }
                }
            }
        }

        await base.OnDisconnectedAsync(exception);
    }
}