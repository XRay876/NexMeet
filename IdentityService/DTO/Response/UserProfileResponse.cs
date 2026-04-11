namespace IdentityService.DTO.Response;

public record UserProfileResponse(
    Guid Id,
    string Login,
    string Email,
    string DisplayName,
    string? AvatarUrl,
    string ThemePreference,
    DateTime CreatedAt);