using IdentityService.Common;
using IdentityService.Data.Entities;
using IdentityService.Services.Abstractions;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;

namespace IdentityService.Services;

public class TokenService(IOptions<JwtSettings> jwtSettings) : ITokenService
{
    private readonly JwtSettings _settings = jwtSettings.Value;

    public string GenerateAccessToken(User user)
    {
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(JwtRegisteredClaimNames.UniqueName, user.Login),
            new(JwtRegisteredClaimNames.Name, user.Login),
            new(JwtRegisteredClaimNames.Email, user.Email),
            new("role", "Member")
        };

        return CreateJwt(claims, TimeSpan.FromMinutes(_settings.AccessTokenExpiryMinutes));
    }

    public string GenerateGuestToken(string guestName, string meetingCode)
    {
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, Guid.NewGuid().ToString()),
            new(JwtRegisteredClaimNames.Name, guestName),
            new("role", "Guest"),
            new("meeting_code", meetingCode)   // MeetingService validates this against the requested room
        };

        return CreateJwt(claims, TimeSpan.FromMinutes(_settings.GuestTokenExpiryMinutes));
    }

    public string GenerateRefreshTokenValue()
    {
        var bytes = new byte[64];
        RandomNumberGenerator.Fill(bytes);
        return Convert.ToBase64String(bytes);
    }

    private string CreateJwt(IEnumerable<Claim> claims, TimeSpan expiry)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_settings.Secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: _settings.Issuer,
            audience: _settings.Audience,
            claims: claims,
            expires: DateTime.UtcNow.Add(expiry),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
