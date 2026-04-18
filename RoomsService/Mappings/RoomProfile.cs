using AutoMapper;
using RoomsService.Data.Entities;
using RoomsService.DTO.Response;

namespace RoomsService.Mappings;

public class RoomProfile : Profile
{
    public RoomProfile()
    {
        CreateMap<Room, RoomResponse>();
    }
}