namespace MessagesService.DTO.Request;

public record GetHistoryRequest(int Limit = 50, DateTime? Before = null);