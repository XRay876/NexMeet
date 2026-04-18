namespace RoomsService.DTO.Response;

public record RoomResponse(
    Guid Id,
    string Code,
    string Name,
    Guid OwnerId,
    bool IsActive,
    DateTime CreatedAt);