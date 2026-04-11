using FluentValidation;
using IdentityService.Common;
using IdentityService.DTO.Request;

namespace IdentityService.Validators;

public class RegisterRequestValidator : AbstractValidator<RegisterRequest>
{
    public RegisterRequestValidator()
    {
        RuleFor(x => x.Login)
            .NotEmpty().WithMessage("Login is required.")
            .MaximumLength(UserConstants.MaxLoginLength).WithMessage($"Login cannot exceed {UserConstants.MaxLoginLength} characters.");

        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("Email is required.")
            .EmailAddress().WithMessage("Invalid email format.");

        RuleFor(x => x.Password)
            .NotEmpty().WithMessage("Password is required.")
            .MinimumLength(UserConstants.MinPasswordLength).WithMessage($"Password must be at least {UserConstants.MinPasswordLength} characters.")
            .MaximumLength(UserConstants.MaxPasswordLength).WithMessage($"Password cannot exceed {UserConstants.MaxPasswordLength} characters.");

        RuleFor(x => x.DisplayName)
            .NotEmpty().WithMessage("Display Name is required.")
            .MaximumLength(UserConstants.MaxNameLength).WithMessage($"Display Name cannot exceed {UserConstants.MaxNameLength} characters.");
    }
}