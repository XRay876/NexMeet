namespace IdentityService.DTO.Response;

/// <summary>
/// Internal service result that carries both the public response and the refresh token value
/// (which the controller moves into an HttpOnly cookie).
/// </summary>
public record AuthResult(AuthResponse Response, string RefreshToken);
