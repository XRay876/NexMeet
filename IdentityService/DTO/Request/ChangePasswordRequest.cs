namespace IdentityService.DTO.Request;

public record ChangePasswordRequest(string CurrentPassword, string NewPassword);
