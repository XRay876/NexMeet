using MongoDB.Driver;

public class MongoService
{
    private readonly IMongoDatabase _db;

    public MongoService(IConfiguration config)
    {
        var client = new MongoClient("mongodb://localhost:27017");
        _db = client.GetDatabase("messages_db");
    }

    public IMongoCollection<ChatMessage> Messages =>
        _db.GetCollection<ChatMessage>("messages");

    public IMongoCollection<SharedFile> Files =>
        _db.GetCollection<SharedFile>("files");
}