namespace MessagesService.DTO.Response;

public record SharedFileResponse(
    string Id,
    string RoomId,
    string UploaderUserId,
    string UploaderDisplayName,
    string OriginalFileName,
    string ContentType,
    long Size,
    DateTime UploadedAt);