using Microsoft.Extensions.Options;
using SignalingService.Common;
using SignalingService.DTO.Response;
using SignalingService.Services.Abstractions;

namespace SignalingService.Services;

public class IceServerService(IOptions<WebRtcSettings> settings) : IIceServerService
{
    private readonly WebRtcSettings _settings = settings.Value;

    public Task<IceServerResponse> GetIceServerConfigurationAsync(CancellationToken cancellationToken = default)
    {
        var servers = new List<IceServerConfig>();

        // 1. Add STUN Servers (Free, Google/Cloudflare)
        if (_settings.StunServers.Length != 0)
        {
            foreach (var stun in _settings.StunServers)
            {
                servers.Add(new IceServerConfig(stun));
            }
        }

        // 2. Add TURN Server (Requires Auth, handles symmetric NAT)
        if (!string.IsNullOrWhiteSpace(_settings.TurnServerUrl))
        {
            servers.Add(new IceServerConfig(
                _settings.TurnServerUrl,
                _settings.TurnServerUsername,
                _settings.TurnServerCredential));
        }

        var response = new IceServerResponse(servers);
        return Task.FromResult(response);
    }
}