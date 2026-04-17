using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

public class SharedFile
{
    [BsonId]
    public ObjectId Id { get; set; }

    public string RoomId { get; set; }
    public string UploaderUserId { get; set; }
    public string UploaderDisplayName { get; set; }

    public string OriginalFileName { get; set; }
    public string StoredFileName { get; set; }

    public string ContentType { get; set; }
    public long Size { get; set; }

    public DateTime UploadedAt { get; set; }
}