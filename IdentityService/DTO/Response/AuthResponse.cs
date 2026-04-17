namespace IdentityService.DTO.Response;

public record AuthResponse(
    Guid UserId,
    string AccessToken,
    string DisplayName,
    string? AvatarUrl,
    string ThemePreference,
    DateTime CreatedAt);
