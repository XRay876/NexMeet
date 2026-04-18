using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace MessagesService.Data.Entities;

public class ChatMessage
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    public string RoomId { get; set; } = string.Empty;
    public string SenderUserId { get; set; } = string.Empty;
    public string SenderDisplayName { get; set; } = string.Empty;
    public string Text { get; set; } = string.Empty;
    
    [BsonRepresentation(BsonType.DateTime)]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}