namespace IdentityService.DTO.Request;

public record UpdateProfileRequest(
    string DisplayName,
    string Email,
    string? AvatarUrl,
    string ThemePreference);