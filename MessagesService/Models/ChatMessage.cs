using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

public class ChatMessage
{
    [BsonId]
    public ObjectId Id { get; set; }

    public string RoomId { get; set; }
    public string SenderUserId { get; set; }
    public string SenderDisplayName { get; set; }
    public string Text { get; set; }
    public DateTime CreatedAt { get; set; }
}