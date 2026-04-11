namespace IdentityService.DTO.Request;

public record RegisterRequest(
    string Login,
    string Password,
    string Email,
    string DisplayName);