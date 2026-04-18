using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SignalingService.Common;
using SignalingService.DTO.Request;
using SignalingService.DTO.Response;
using SignalingService.Services.Abstractions;

namespace SignalingService.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SignalingController(
    IIceServerService iceServerService,
    IValidator<ReportIssueRequest> reportValidator,
    ILogger<SignalingController> logger) : ControllerBase
{
    [HttpGet("ice-servers")]
    public async Task<ActionResult<ApiResponse<IceServerResponse>>> GetIceServers(CancellationToken cancellationToken)
    {
        var config = await iceServerService.GetIceServerConfigurationAsync(cancellationToken);
        return Ok(ApiResponse<IceServerResponse>.Ok(config));
    }

    [HttpPost("report-issue")]
    public async Task<ActionResult<ApiResponse<object>>> ReportConnectionIssue([FromBody] ReportIssueRequest request, CancellationToken cancellationToken)
    {
        var validationResult = await reportValidator.ValidateAsync(request, cancellationToken);
        if (!validationResult.IsValid)
        {
            return BadRequest(ApiResponse<object>.Fail("Validation failed", validationResult.Errors.Select(e => e.ErrorMessage)));
        }

        logger.LogWarning("Connection issue reported for room {RoomCode}: {Description}", request.RoomCode, request.Description);

        return Ok(ApiResponse<object>.Ok(null, "Issue reported successfully."));
    }
}