using FluentValidation;
using MessagesService.DTO.Request;

namespace MessagesService.Validators;

public class GetHistoryRequestValidator : AbstractValidator<GetHistoryRequest>
{
    public GetHistoryRequestValidator()
    {
        RuleFor(x => x.Limit)
            .GreaterThan(0).WithMessage("Limit must be greater than 0.")
            .LessThanOrEqualTo(100).WithMessage("Cannot request more than 100 messages at once.");
    }
}