namespace RoomsService.DTO.Response;

public record RoomHistoryResponse(
    string Code,
    string Name,
    DateTime JoinedAt,
    bool WasOwner);