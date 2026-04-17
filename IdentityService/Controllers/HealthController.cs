using Microsoft.AspNetCore.Mvc;

namespace IdentityService.Controllers;

[ApiController]
[Route("api/[controller]")]
public class HealthController(ILogger<HealthController> logger) : ControllerBase
{
    [HttpGet]
    public IActionResult Get()
    {
        logger.LogInformation("Health check performed");
        
        return Ok(new 
        { 
            Status = "Healthy", 
            Timestamp = DateTime.UtcNow 
        });
    }
}