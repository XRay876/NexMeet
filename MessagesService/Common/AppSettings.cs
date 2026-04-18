namespace MessagesService.Common;

public class JwtSettings
{
    public const string SectionName = "JwtSettings";
    public string Secret { get; init; } = string.Empty;
    public string Issuer { get; init; } = string.Empty;
    public string Audience { get; init; } = string.Empty;
}

public class MongoSettings
{
    public const string SectionName = "MongoSettings";
    public string ConnectionString { get; init; } = string.Empty;
    public string DatabaseName { get; init; } = string.Empty;
}

public class FileStorageSettings
{
    public const string SectionName = "FileStorageSettings";
    public string BasePath { get; init; } = "uploads";
    public long MaxFileSizeMb { get; init; } = 50;
}