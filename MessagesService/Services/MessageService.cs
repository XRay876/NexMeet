using AutoMapper;
using MessagesService.Data;
using MessagesService.Data.Entities;
using MessagesService.DTO.Response;
using MessagesService.Services.Abstractions;
using MongoDB.Driver;

namespace MessagesService.Services;

public class MessageService(
    MongoDbContext context,
    IMapper mapper,
    ILogger<MessageService> logger) : IMessageService
{
    public async Task<ChatMessageResponse> SaveMessageAsync(string roomId, string userId, string displayName, string text, CancellationToken cancellationToken = default)
    {
        var message = new ChatMessage
        {
            RoomId = roomId,
            SenderUserId = userId,
            SenderDisplayName = displayName,
            Text = text,
            CreatedAt = DateTime.UtcNow
        };

        await context.Messages.InsertOneAsync(message, cancellationToken: cancellationToken);
        
        logger.LogDebug("Message saved in room {RoomId} by user {UserId}", roomId, userId);
        return mapper.Map<ChatMessageResponse>(message);
    }

    public async Task<IEnumerable<ChatMessageResponse>> GetHistoryAsync(string roomId, int limit, DateTime? before, CancellationToken cancellationToken = default)
    {
        var builder = Builders<ChatMessage>.Filter;
        var filter = builder.Eq(m => m.RoomId, roomId);

        if (before.HasValue)
        {
            filter &= builder.Lt(m => m.CreatedAt, before.Value);
        }

        var messages = await context.Messages
            .Find(filter)
            .SortByDescending(m => m.CreatedAt)
            .Limit(limit)
            .ToListAsync(cancellationToken);

        messages.Reverse(); // Return in chronological order
        return mapper.Map<IEnumerable<ChatMessageResponse>>(messages);
    }

    public async Task DeleteMessageAsync(string messageId, string requesterUserId, CancellationToken cancellationToken = default)
    {
        var message = await context.Messages.Find(m => m.Id == messageId).FirstOrDefaultAsync(cancellationToken)
            ?? throw new KeyNotFoundException("Message not found.");

        if (message.SenderUserId != requesterUserId)
            throw new UnauthorizedAccessException("You can only delete your own messages.");

        await context.Messages.DeleteOneAsync(m => m.Id == messageId, cancellationToken);
        logger.LogInformation("Message {MessageId} deleted by user {UserId}", messageId, requesterUserId);
    }
}