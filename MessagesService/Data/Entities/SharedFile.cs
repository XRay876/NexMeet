using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace MessagesService.Data.Entities;

public class SharedFile
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = string.Empty;

    public string RoomId { get; set; } = string.Empty;
    public string UploaderUserId { get; set; } = string.Empty;
    public string UploaderDisplayName { get; set; } = string.Empty;

    public string OriginalFileName { get; set; } = string.Empty;
    public string StoredFileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public long Size { get; set; }

    [BsonRepresentation(BsonType.DateTime)]
    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
}