using SignalingService.DTO.Response;

namespace SignalingService.Services.Abstractions;

public interface IIceServerService
{
    Task<IceServerResponse> GetIceServerConfigurationAsync(CancellationToken cancellationToken = default);
}