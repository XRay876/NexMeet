using FluentValidation;
using IdentityService.DTO.Request;

namespace IdentityService.Validators;

public class LoginRequestValidator : AbstractValidator<LoginRequest>
{
    public LoginRequestValidator()
    {
        RuleFor(x => x.Login).NotEmpty().WithMessage("Login is required.");
        RuleFor(x => x.Password).NotEmpty().WithMessage("Password is required.");
    }
}