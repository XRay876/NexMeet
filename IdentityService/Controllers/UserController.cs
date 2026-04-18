using FluentValidation;
using IdentityService.Common;
using IdentityService.DTO.Request;
using IdentityService.Services.Abstractions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace IdentityService.Controllers;

[Authorize(Roles = "Member")]
[ApiController]
[Route("api/[controller]")]
public class UserController(
    IUserService userService,
    IValidator<UpdateProfileRequest> updateValidator,
    IValidator<ChangePasswordRequest> changePasswordValidator) : ControllerBase
{
    [HttpGet("profile")]
    public async Task<IActionResult> GetProfile(CancellationToken cancellationToken)
    {
        var userId = GetCurrentUserId();
        var profile = await userService.GetProfileAsync(userId, cancellationToken);
        return Ok(ApiResponse<object>.Ok(profile));
    }

    [HttpPut("profile")]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileRequest request, CancellationToken cancellationToken)
    {
        var validationResult = await updateValidator.ValidateAsync(request, cancellationToken);
        if (!validationResult.IsValid)
            return BadRequest(ApiResponse<object>.Fail("Validation failed", validationResult.Errors.Select(e => e.ErrorMessage)));

        var userId = GetCurrentUserId();
        await userService.UpdateProfileAsync(userId, request, cancellationToken);
        
        return NoContent();
    }

    [HttpPut("password")]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request, CancellationToken cancellationToken)
    {
        var validationResult = await changePasswordValidator.ValidateAsync(request, cancellationToken);
        if (!validationResult.IsValid)
            return BadRequest(ApiResponse<object>.Fail("Validation failed", validationResult.Errors.Select(e => e.ErrorMessage)));

        var userId = GetCurrentUserId();
        await userService.ChangePasswordAsync(userId, request, cancellationToken);

        return NoContent();
    }

    private Guid GetCurrentUserId()
    {
        var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userIdString) || !Guid.TryParse(userIdString, out var userId))
        {
            throw new UnauthorizedAccessException("Invalid token claims.");
        }
        return userId;
    }
}