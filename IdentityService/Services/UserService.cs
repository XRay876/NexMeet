using AutoMapper;
using IdentityService.Common;
using IdentityService.Data;
using IdentityService.Data.Entities;
using IdentityService.DTO.Request;
using IdentityService.DTO.Response;
using IdentityService.Services.Abstractions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace IdentityService.Services;

public class UserService(
    AppDbContext context,
    ITokenService tokenService,
    IMapper mapper,
    IOptions<JwtSettings> jwtSettings,
    ILogger<UserService> logger) : IUserService
{
    private readonly JwtSettings _jwtSettings = jwtSettings.Value;
    public async Task<AuthResult> RegisterAsync(RegisterRequest request, CancellationToken cancellationToken = default)
    {
        var exists = await context.Users.AnyAsync(u => u.Login == request.Login || u.Email == request.Email, cancellationToken);
        if (exists)
        {
            logger.LogWarning("Registration failed: Login {Login} or Email {Email} already exists.", request.Login, request.Email);
            throw new InvalidOperationException("User with this login or email already exists.");
        }

        var user = mapper.Map<User>(request);
        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);

        context.Users.Add(user);
        await context.SaveChangesAsync(cancellationToken);

        logger.LogInformation("User {Login} registered successfully.", user.Login);

        return await BuildAuthResultAsync(user, cancellationToken);
    }

    public async Task<AuthResult> LoginAsync(LoginRequest request, CancellationToken cancellationToken = default)
    {
        var identifier = request.Identifier.Trim();
        var user = await context.Users.FirstOrDefaultAsync(
            u => u.Login == identifier || u.Email == identifier, cancellationToken);

        if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        {
            logger.LogWarning("Failed login attempt for identifier {Identifier}.", identifier);
            throw new UnauthorizedAccessException("Invalid login or password.");
        }

        return await BuildAuthResultAsync(user, cancellationToken);
    }

    public async Task<AuthResult> RefreshTokenAsync(string refreshToken, CancellationToken cancellationToken = default)
    {
        var stored = await context.RefreshTokens
            .Include(rt => rt.User)
            .FirstOrDefaultAsync(rt => rt.Token == refreshToken, cancellationToken);

        if (stored == null || stored.ExpiresAt <= DateTime.UtcNow)
        {
            logger.LogWarning("Refresh token attempt with invalid or expired token.");
            throw new UnauthorizedAccessException("Invalid or expired refresh token.");
        }

        var user = stored.User;

        // Delete the old token before issuing new ones
        context.RefreshTokens.Remove(stored);
        await context.SaveChangesAsync(cancellationToken);

        return await BuildAuthResultAsync(user, cancellationToken);
    }

    public async Task<UserProfileResponse> GetProfileAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var user = await context.Users.FindAsync([userId], cancellationToken)
            ?? throw new UnauthorizedAccessException("User not found.");

        return mapper.Map<UserProfileResponse>(user);
    }

    public async Task UpdateProfileAsync(Guid userId, UpdateProfileRequest request, CancellationToken cancellationToken = default)
    {
        var user = await context.Users.FindAsync([userId], cancellationToken)
            ?? throw new UnauthorizedAccessException("User not found.");

        if (user.Email != request.Email)
        {
            var emailExists = await context.Users.AnyAsync(u => u.Email == request.Email && u.Id != userId, cancellationToken);
            if (emailExists) throw new InvalidOperationException("Email is already in use.");
        }

        user.DisplayName = request.DisplayName;
        user.Email = request.Email;
        user.AvatarUrl = request.AvatarUrl;
        user.ThemePreference = request.ThemePreference;
        user.UpdatedAt = DateTime.UtcNow;

        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("User {UserId} updated their profile.", userId);
    }

    public async Task ChangePasswordAsync(Guid userId, ChangePasswordRequest request, CancellationToken cancellationToken = default)
    {
        var user = await context.Users.FindAsync([userId], cancellationToken)
            ?? throw new UnauthorizedAccessException("User not found.");

        if (!BCrypt.Net.BCrypt.Verify(request.CurrentPassword, user.PasswordHash))
            throw new UnauthorizedAccessException("Current password is incorrect.");

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
        user.UpdatedAt = DateTime.UtcNow;

        // Invalidate all existing refresh tokens so other sessions are logged out
        var tokens = context.RefreshTokens.Where(rt => rt.UserId == userId);
        context.RefreshTokens.RemoveRange(tokens);

        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("User {UserId} changed their password.", userId);
    }

    // -------------------------------------------------------------------------

    private async Task<AuthResult> BuildAuthResultAsync(User user, CancellationToken cancellationToken)
    {
        var accessToken = tokenService.GenerateAccessToken(user);
        var refreshTokenValue = tokenService.GenerateRefreshTokenValue();

        context.RefreshTokens.Add(new RefreshToken
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Token = refreshTokenValue,
            ExpiresAt = DateTime.UtcNow.AddDays(_jwtSettings.RefreshTokenExpiryDays)
        });

        await context.SaveChangesAsync(cancellationToken);

        var response = new AuthResponse(user.Id, accessToken, user.DisplayName, user.AvatarUrl, user.ThemePreference, user.CreatedAt);
        return new AuthResult(response, refreshTokenValue);
    }
}
