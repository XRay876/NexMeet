using System.Net;
using System.Text.Json;

namespace IdentityService.Middlewares;

public class ExceptionHandlingMiddleware(
    RequestDelegate next,
    ILogger<ExceptionHandlingMiddleware> logger,
    IHostEnvironment env)
{
    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Unhandled exception on {Method} {Path}", context.Request.Method, context.Request.Path);
            await HandleExceptionAsync(context, ex);
        }
    }

    private Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        context.Response.ContentType = "application/json";

        var (statusCode, message) = exception switch
        {
            UnauthorizedAccessException => ((int)HttpStatusCode.Unauthorized, exception.Message),
            ArgumentException => ((int)HttpStatusCode.BadRequest, exception.Message),
            InvalidOperationException => ((int)HttpStatusCode.Conflict, exception.Message),
            _ => ((int)HttpStatusCode.InternalServerError, "An internal server error occurred.")
        };

        context.Response.StatusCode = statusCode;

        // In development include the real exception so it's visible in Postman without needing docker logs
        object body = env.IsDevelopment() && statusCode == (int)HttpStatusCode.InternalServerError
            ? new { error = message, detail = exception.Message, type = exception.GetType().Name }
            : new { error = message };

        return context.Response.WriteAsync(JsonSerializer.Serialize(body));
    }
}
