using FluentValidation;
using IdentityService.Common;
using IdentityService.DTO.Request;

namespace IdentityService.Validators;

public class ChangePasswordRequestValidator : AbstractValidator<ChangePasswordRequest>
{
    public ChangePasswordRequestValidator()
    {
        RuleFor(x => x.CurrentPassword)
            .NotEmpty().WithMessage("Current password is required.");

        RuleFor(x => x.NewPassword)
            .NotEmpty().WithMessage("New password is required.")
            .MinimumLength(UserConstants.MinPasswordLength).WithMessage($"New password must be at least {UserConstants.MinPasswordLength} characters.")
            .MaximumLength(UserConstants.MaxPasswordLength).WithMessage($"New password cannot exceed {UserConstants.MaxPasswordLength} characters.")
            .NotEqual(x => x.CurrentPassword).WithMessage("New password must differ from the current password.");
    }
}
