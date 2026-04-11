using AutoMapper;
using IdentityService.Data;
using IdentityService.Data.Entities;
using IdentityService.DTO.Request;
using IdentityService.DTO.Response;
using IdentityService.Services.Abstractions;
using Microsoft.EntityFrameworkCore;

namespace IdentityService.Services;

public class UserService(
    AppDbContext context,
    ITokenService tokenService,
    IMapper mapper,
    ILogger<UserService> logger) : IUserService
{
    public async Task<AuthResponse> RegisterAsync(RegisterRequest request, CancellationToken cancellationToken = default)
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

        var token = tokenService.GenerateToken(user);
        return new AuthResponse(user.Id, token, user.DisplayName, user.ThemePreference);
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken cancellationToken = default)
    {
        var user = await context.Users.FirstOrDefaultAsync(u => u.Login == request.Login, cancellationToken);
        
        if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        {
            logger.LogWarning("Failed login attempt for {Login}.", request.Login);
            throw new UnauthorizedAccessException("Invalid login or password.");
        }

        var token = tokenService.GenerateToken(user);
        return new AuthResponse(user.Id, token, user.DisplayName, user.ThemePreference);
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

        // Check if email is being changed to one that already exists
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
}