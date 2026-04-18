using FluentValidation;
using SignalingService.DTO.Request;

namespace SignalingService.Validators;

public class ReportIssueRequestValidator : AbstractValidator<ReportIssueRequest>
{
    public ReportIssueRequestValidator()
    {
        RuleFor(x => x.RoomCode)
            .NotEmpty().WithMessage("Room code is required.")
            .MaximumLength(50).WithMessage("Room code cannot exceed 50 characters.");

        RuleFor(x => x.Description)
            .NotEmpty().WithMessage("Description is required.")
            .MinimumLength(10).WithMessage("Please provide a more detailed description (min 10 characters).")
            .MaximumLength(500).WithMessage("Description cannot exceed 500 characters.");
    }
}