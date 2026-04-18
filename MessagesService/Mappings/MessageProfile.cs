using AutoMapper;
using MessagesService.Data.Entities;
using MessagesService.DTO.Response;

namespace MessagesService.Mappings;

public class MessageProfile : Profile
{
    public MessageProfile()
    {
        CreateMap<ChatMessage, ChatMessageResponse>();
        CreateMap<SharedFile, SharedFileResponse>();
    }
}