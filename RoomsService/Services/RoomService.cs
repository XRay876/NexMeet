using AutoMapper;
using Microsoft.EntityFrameworkCore;
using NanoidDotNet;
using RoomsService.Data;
using RoomsService.Data.Entities;
using RoomsService.DTO.Request;
using RoomsService.DTO.Response;
using RoomsService.Services.Abstractions;

namespace RoomsService.Services;

public class RoomService(
    AppDbContext context,
    IMapper mapper,
    ILogger<RoomService> logger) : IRoomService
{
    public async Task<RoomResponse> CreateRoomAsync(Guid ownerId, CreateRoomRequest request, CancellationToken cancellationToken = default)
    {
        // Generate a URL-friendly unique code (e.g., abc-defg-hij)
        var code = $"{Nanoid.Generate("abcdefghijklmnopqrstuvwxyz0123456789", 3)}-{Nanoid.Generate("abcdefghijklmnopqrstuvwxyz0123456789", 4)}-{Nanoid.Generate("abcdefghijklmnopqrstuvwxyz0123456789", 3)}";

        var room = new Room
        {
            Id = Guid.NewGuid(),
            Code = code,
            Name = request.Name,
            OwnerId = ownerId,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        context.Rooms.Add(room);
        await context.SaveChangesAsync(cancellationToken);

        logger.LogInformation("Room {RoomId} created successfully by user {OwnerId} with code {Code}", room.Id, ownerId, code);

        return mapper.Map<RoomResponse>(room);
    }

    public async Task<RoomResponse> GetRoomByCodeAsync(string code, CancellationToken cancellationToken = default)
    {
        var room = await context.Rooms
            .AsNoTracking()
            .FirstOrDefaultAsync(r => r.Code == code, cancellationToken)
            ?? throw new KeyNotFoundException($"Room with code '{code}' was not found.");

        return mapper.Map<RoomResponse>(room);
    }

    public async Task JoinRoomAsync(string code, Guid? userId, string? guestName, CancellationToken cancellationToken = default)
    {
        var room = await context.Rooms
            .FirstOrDefaultAsync(r => r.Code == code, cancellationToken)
            ?? throw new KeyNotFoundException($"Room with code '{code}' was not found.");

        if (!room.IsActive)
        {
            logger.LogWarning("Attempted to join closed room {Code}", code);
            throw new InvalidOperationException("This room is no longer active.");
        }

        var participant = new RoomParticipant
        {
            Id = Guid.NewGuid(),
            RoomId = room.Id,
            UserId = userId,
            GuestName = guestName,
            JoinedAt = DateTime.UtcNow
        };

        context.RoomParticipants.Add(participant);
        await context.SaveChangesAsync(cancellationToken);

        logger.LogInformation("Participant joined room {Code}. UserId: {UserId}, GuestName: {GuestName}", code, userId, guestName);
    }

    public async Task CloseRoomAsync(Guid roomId, Guid ownerId, CancellationToken cancellationToken = default)
    {
        var room = await context.Rooms.FindAsync([roomId], cancellationToken)
            ?? throw new KeyNotFoundException("Room not found.");

        if (room.OwnerId != ownerId)
        {
            logger.LogWarning("User {UserId} attempted to close room {RoomId} without permissions.", ownerId, roomId);
            throw new UnauthorizedAccessException("Only the room owner can close the room.");
        }

        room.IsActive = false;
        room.EndedAt = DateTime.UtcNow;

        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Room {RoomId} was closed by owner {OwnerId}.", roomId, ownerId);
    }

    public async Task<IEnumerable<RoomHistoryResponse>> GetMyHistoryAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var history = await context.RoomParticipants
            .AsNoTracking()
            .Include(p => p.Room)
            .Where(p => p.UserId == userId)
            .OrderByDescending(p => p.JoinedAt)
            .Select(p => new RoomHistoryResponse(
                p.Room.Code,
                p.Room.Name,
                p.JoinedAt,
                p.Room.OwnerId == userId))
            .ToListAsync(cancellationToken);

        return history;
    }

    public async Task ClearHistoryAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var participantRecords = await context.RoomParticipants
            .Where(p => p.UserId == userId)
            .ToListAsync(cancellationToken);

        if (participantRecords.Count > 0)
        {
            context.RoomParticipants.RemoveRange(participantRecords);
            await context.SaveChangesAsync(cancellationToken);
            logger.LogInformation("Cleared room history for user {UserId}. Deleted {Count} participant records.", userId, participantRecords.Count);
        }
    }
}