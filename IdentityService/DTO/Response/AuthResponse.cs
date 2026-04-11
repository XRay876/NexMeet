namespace IdentityService.DTO.Response;

public record AuthResponse(
    Guid UserId,
    string Token,
    string DisplayName,
    string ThemePreference);