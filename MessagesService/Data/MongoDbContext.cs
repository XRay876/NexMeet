using MessagesService.Common;
using MessagesService.Data.Entities;
using Microsoft.Extensions.Options;
using MongoDB.Driver;

namespace MessagesService.Data;

public class MongoDbContext
{
    private readonly IMongoDatabase _database;

    public MongoDbContext(IOptions<MongoSettings> settings)
    {
        var client = new MongoClient(settings.Value.ConnectionString);
        _database = client.GetDatabase(settings.Value.DatabaseName);

        // Optional: Create indexes programmatically
        var messageIndex = new CreateIndexModel<ChatMessage>(Builders<ChatMessage>.IndexKeys.Ascending(x => x.RoomId).Descending(x => x.CreatedAt));
        Messages.Indexes.CreateOne(messageIndex);
    }

    public IMongoCollection<ChatMessage> Messages => _database.GetCollection<ChatMessage>("messages");
    public IMongoCollection<SharedFile> Files => _database.GetCollection<SharedFile>("files");
}