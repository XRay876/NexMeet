using RoomsService.DTO.Request;
using RoomsService.DTO.Response;

namespace RoomsService.Services.Abstractions;

public interface IRoomService
{
    Task<RoomResponse> CreateRoomAsync(Guid ownerId, CreateRoomRequest request, CancellationToken cancellationToken = default);
    Task<RoomResponse> GetRoomByCodeAsync(string code, CancellationToken cancellationToken = default);
    Task JoinRoomAsync(string code, Guid? userId, string? guestName, CancellationToken cancellationToken = default);
    Task CloseRoomAsync(Guid roomId, Guid ownerId, CancellationToken cancellationToken = default);
    Task<IEnumerable<RoomHistoryResponse>> GetMyHistoryAsync(Guid userId, CancellationToken cancellationToken = default);
    Task ClearHistoryAsync(Guid userId, CancellationToken cancellationToken = default);
}