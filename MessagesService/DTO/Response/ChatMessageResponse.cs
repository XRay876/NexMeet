namespace MessagesService.DTO.Response;

public record ChatMessageResponse(
    string Id,
    string RoomId,
    string SenderUserId,
    string SenderDisplayName,
    string Text,
    DateTime CreatedAt);