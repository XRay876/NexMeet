using System.Security.Claims;
using FluentValidation;
using IdentityService.DTO.Request;
using IdentityService.Services.Abstractions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace IdentityService.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController(
    IUserService userService,
    ITokenService tokenService,
    IValidator<RegisterRequest> registerValidator,
    IValidator<LoginRequest> loginValidator,
    IValidator<ChangePasswordRequest> changePasswordValidator) : ControllerBase
{
    private const string RefreshTokenCookie = "refresh_token";

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request, CancellationToken cancellationToken)
    {
        var validationResult = await registerValidator.ValidateAsync(request, cancellationToken);
        if (!validationResult.IsValid)
            return BadRequest(validationResult.Errors);

        var result = await userService.RegisterAsync(request, cancellationToken);
        SetRefreshTokenCookie(result.RefreshToken);
        return Ok(result.Response);
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request, CancellationToken cancellationToken)
    {
        var validationResult = await loginValidator.ValidateAsync(request, cancellationToken);
        if (!validationResult.IsValid)
            return BadRequest(validationResult.Errors);

        var result = await userService.LoginAsync(request, cancellationToken);
        SetRefreshTokenCookie(result.RefreshToken);
        return Ok(result.Response);
    }

    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh(CancellationToken cancellationToken)
    {
        var refreshToken = Request.Cookies[RefreshTokenCookie];
        if (string.IsNullOrEmpty(refreshToken))
            return Unauthorized("Refresh token cookie is missing.");

        var result = await userService.RefreshTokenAsync(refreshToken, cancellationToken);
        SetRefreshTokenCookie(result.RefreshToken);
        return Ok(result.Response);
    }

    /// <summary>
    /// Issues a short-lived guest token for unauthenticated users joining a meeting by name.
    /// No refresh token is issued — guests re-authenticate per session.
    /// </summary>
    /// <summary>
    /// Issues a short-lived guest token scoped to a specific meeting.
    /// The meeting_code claim is validated by MeetingService when joining.
    /// No refresh token — guests re-authenticate per session.
    /// </summary>
    [HttpPost("guest")]
    public IActionResult GuestToken([FromBody] GuestTokenRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.GuestName))
            return BadRequest("Guest name is required.");

        if (string.IsNullOrWhiteSpace(request.MeetingCode))
            return BadRequest("Meeting code is required.");

        var token = tokenService.GenerateGuestToken(request.GuestName, request.MeetingCode);
        return Ok(new { AccessToken = token });
    }

    [Authorize]
    [HttpPut("password")]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request, CancellationToken cancellationToken)
    {
        var validationResult = await changePasswordValidator.ValidateAsync(request, cancellationToken);
        if (!validationResult.IsValid)
            return BadRequest(validationResult.Errors);

        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userIdClaim == null || !Guid.TryParse(userIdClaim, out var userId))
            return Unauthorized();

        await userService.ChangePasswordAsync(userId, request, cancellationToken);
        return NoContent();
    }

    // -------------------------------------------------------------------------

    private void SetRefreshTokenCookie(string token)
    {
        Response.Cookies.Append(RefreshTokenCookie, token, new CookieOptions
        {
            HttpOnly = true,
            Secure = Request.IsHttps,      // false on http://localhost → cookie works without HTTPS
            SameSite = SameSiteMode.Lax,   // Lax: sent on same-site + top-level navigations; safe default
            Expires = DateTimeOffset.UtcNow.AddDays(7)
        });
    }
}
