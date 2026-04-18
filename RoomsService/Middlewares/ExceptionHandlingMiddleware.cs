using System.Net;
using System.Text.Json;
using RoomsService.Common;

namespace RoomsService.Middlewares;

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

        var statusCode = exception switch
        {
            UnauthorizedAccessException => (int)HttpStatusCode.Forbidden,
            KeyNotFoundException => (int)HttpStatusCode.NotFound,
            InvalidOperationException => (int)HttpStatusCode.BadRequest,
            _ => (int)HttpStatusCode.InternalServerError
        };

        context.Response.StatusCode = statusCode;

        var message = env.IsDevelopment() ? exception.Message : "An error occurred while processing your request.";
        if (exception is not UnauthorizedAccessException and not KeyNotFoundException and not InvalidOperationException)
        {
             message = "An internal server error occurred.";
        }

        var response = ApiResponse<object>.Fail(message);
        var jsonOptions = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
        
        return context.Response.WriteAsync(JsonSerializer.Serialize(response, jsonOptions));
    }
}