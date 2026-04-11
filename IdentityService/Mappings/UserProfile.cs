using AutoMapper;
using IdentityService.Data.Entities;
using IdentityService.DTO.Request;
using IdentityService.DTO.Response;

namespace IdentityService.Mappings;

public class UserProfile : Profile
{
    public UserProfile()
    {
        CreateMap<RegisterRequest, User>()
            .ForMember(dest => dest.PasswordHash, opt => opt.Ignore())
            .ForMember(dest => dest.Id, opt => opt.Ignore())
            .ForMember(dest => dest.CreatedAt, opt => opt.Ignore())
            .ForMember(dest => dest.UpdatedAt, opt => opt.Ignore())
            .ForMember(dest => dest.AvatarUrl, opt => opt.Ignore())
            .ForMember(dest => dest.ThemePreference, opt => opt.Ignore());

        CreateMap<User, UserProfileResponse>();
    }
}