namespace MessagesService.DTO.Response;

public record HistoryResponse(
    IEnumerable<ChatMessageResponse> Messages,
    IEnumerable<SharedFileResponse> Files);