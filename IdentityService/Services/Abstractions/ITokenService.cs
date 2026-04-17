using IdentityService.Data.Entities;

namespace IdentityService.Services.Abstractions;

public interface ITokenService
{
    string GenerateAccessToken(User user);
    string GenerateGuestToken(string guestName, string meetingCode);
    string GenerateRefreshTokenValue();
}
