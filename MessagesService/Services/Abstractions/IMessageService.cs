using MessagesService.DTO.Response;

namespace MessagesService.Services.Abstractions;

public interface IMessageService
{
    Task<ChatMessageResponse> SaveMessageAsync(string roomId, string userId, string displayName, string text, CancellationToken cancellationToken = default);
    Task<IEnumerable<ChatMessageResponse>> GetHistoryAsync(string roomId, int limit, DateTime? before, CancellationToken cancellationToken = default);
    Task DeleteMessageAsync(string messageId, string requesterUserId, CancellationToken cancellationToken = default);
}