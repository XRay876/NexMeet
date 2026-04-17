using Microsoft.AspNetCore.Mvc;
using MongoDB.Bson;
using MongoDB.Driver;

[ApiController]
[Route("api/files")]
public class FilesController : ControllerBase
{
    private readonly MongoService _mongo;
    private readonly FileStorageService _storage;

    public FilesController(MongoService mongo, FileStorageService storage)
    {
        _mongo = mongo;
        _storage = storage;
    }

    [HttpPost("upload/{roomId}")]
    public async Task<IActionResult> Upload(string roomId, IFormFile file)
    {
        var userId = User.FindFirst("userId")?.Value;
        var name = User.FindFirst("displayName")?.Value;

        var storedName = await _storage.SaveFileAsync(file);

        var fileDoc = new SharedFile
        {
            RoomId = roomId,
            UploaderUserId = userId,
            UploaderDisplayName = name,
            OriginalFileName = file.FileName,
            StoredFileName = storedName,
            ContentType = file.ContentType,
            Size = file.Length,
            UploadedAt = DateTime.UtcNow
        };

        await _mongo.Files.InsertOneAsync(fileDoc);

        return Ok(fileDoc);
    }

    [HttpGet("room/{roomId}")]
    public async Task<IActionResult> GetRoomFiles(string roomId)
    {
        var files = await _mongo.Files
            .Find(x => x.RoomId == roomId)
            .ToListAsync();

        return Ok(files);
    }

    [HttpGet("download/{fileId}")]
    public async Task<IActionResult> Download(string fileId)
    {
        var file = await _mongo.Files
            .Find(x => x.Id == ObjectId.Parse(fileId))
            .FirstOrDefaultAsync();

        var path = _storage.GetFilePath(file.StoredFileName);

        return PhysicalFile(path, file.ContentType, file.OriginalFileName);
    }

    [HttpDelete("delete/{fileId}")]
    public async Task<IActionResult> Delete(string fileId)
    {
        var file = await _mongo.Files
            .Find(x => x.Id == ObjectId.Parse(fileId))
            .FirstOrDefaultAsync();

        var path = _storage.GetFilePath(file.StoredFileName);

        if (System.IO.File.Exists(path))
            System.IO.File.Delete(path);

        await _mongo.Files.DeleteOneAsync(x => x.Id == file.Id);

        return Ok();
    }
}