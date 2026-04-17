using MongoDB.Driver;

public class MongoService
{
    private readonly IMongoDatabase _db;

    public MongoService(IConfiguration config)
    {
        var connectionString = config.GetConnectionString("MongoDB")
            ?? throw new InvalidOperationException("ConnectionStrings:MongoDB is not configured.");
        var client = new MongoClient(connectionString);
        _db = client.GetDatabase("messages_db");
    }

    public IMongoCollection<ChatMessage> Messages =>
        _db.GetCollection<ChatMessage>("messages");

    public IMongoCollection<SharedFile> Files =>
        _db.GetCollection<SharedFile>("files");
}