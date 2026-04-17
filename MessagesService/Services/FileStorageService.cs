public class FileStorageService
{
    private readonly string _basePath = "uploads";

    public FileStorageService()
    {
        if (!Directory.Exists(_basePath))
            Directory.CreateDirectory(_basePath);
    }

    public async Task<string> SaveFileAsync(IFormFile file)
    {
        var fileName = Guid.NewGuid() + Path.GetExtension(file.FileName);
        var path = Path.Combine(_basePath, fileName);

        using var stream = new FileStream(path, FileMode.Create);
        await file.CopyToAsync(stream);

        return fileName;
    }

    public string GetFilePath(string storedName)
    {
        return Path.Combine(_basePath, storedName);
    }
}