using IdentityService.Data.Entities;

namespace IdentityService.Services.Abstractions;

public interface ITokenService
{
    string GenerateToken(User user);
    string GenerateGuestToken(string guestName);
}