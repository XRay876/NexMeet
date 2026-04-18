using FluentValidation;
using RoomsService.DTO.Request;

namespace RoomsService.Validators;

public class CreateRoomRequestValidator : AbstractValidator<CreateRoomRequest>
{
    public CreateRoomRequestValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Room name is required.")
            .MaximumLength(100).WithMessage("Room name cannot exceed 100 characters.");
    }
}