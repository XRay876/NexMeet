namespace SignalingService.DTO.Response;

public record IceServerConfig(string Urls, string? Username = null, string? Credential = null);

public record IceServerResponse(IEnumerable<IceServerConfig> IceServers);