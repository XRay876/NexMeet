using FluentValidation;
using IdentityService.Common;
using IdentityService.DTO.Request;

namespace IdentityService.Validators;

public class UpdateProfileRequestValidator : AbstractValidator<UpdateProfileRequest>
{
    public UpdateProfileRequestValidator()
    {
        RuleFor(x => x.DisplayName)
            .NotEmpty().WithMessage("Display Name is required.")
            .MaximumLength(UserConstants.MaxNameLength);

        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("Email is required.")
            .EmailAddress().WithMessage("Invalid email format.");

        RuleFor(x => x.ThemePreference)
            .Must(x => x is "Light" or "Dark").WithMessage("Theme must be 'Light' or 'Dark'.");
    }
}