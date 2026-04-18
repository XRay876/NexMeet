namespace SignalingService.Common;

public class WebRtcSettings
{
    public const string SectionName = "WebRtcSettings";
    public string[] StunServers { get; init; } = [];
    public string TurnServerUrl { get; init; } = string.Empty;
    public string TurnServerUsername { get; init; } = string.Empty;
    public string TurnServerCredential { get; init; } = string.Empty;
}