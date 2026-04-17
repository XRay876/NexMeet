using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;

[ApiController]
[Route("api/history")]
public class HistoryController : ControllerBase
{
    private readonly MongoService _mongo;

    public HistoryController(MongoService mongo)
    {
        _mongo = mongo;
    }

    [HttpGet("{roomId}")]
    public async Task<IActionResult> GetHistory(string roomId)
    {
        var messages = await _mongo.Messages
            .Find(x => x.RoomId == roomId)
            .SortByDescending(x => x.CreatedAt)
            .Limit(50)
            .ToListAsync();

        var files = await _mongo.Files
            .Find(x => x.RoomId == roomId)
            .ToListAsync();

        return Ok(new
        {
            messages,
            files
        });
    }

    [HttpDelete("delete/{messageId}")]
    public async Task<IActionResult> DeleteMessage(string messageId)
    {
        await _mongo.Messages.DeleteOneAsync(x => x.Id == MongoDB.Bson.ObjectId.Parse(messageId));
        return Ok();
    }
}