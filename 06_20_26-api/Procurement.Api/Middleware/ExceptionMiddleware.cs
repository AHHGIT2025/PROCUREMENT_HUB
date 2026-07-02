namespace Procurement.Api.Middleware;

public class ExceptionMiddleware
{
    private readonly RequestDelegate _next;
    public ExceptionMiddleware(RequestDelegate next) => _next = next;
    public async Task InvokeAsync(HttpContext context)
    {
        try { await _next(context); }
        catch (Exception ex)
        {
            Console.WriteLine("===== UNHANDLED EXCEPTION =====");
            Console.WriteLine(ex.ToString());
            Console.WriteLine("================================");

            context.Response.StatusCode = 500;

            var fullMessage = ex.Message;
            var inner = ex.InnerException;
            while (inner != null)
            {
                fullMessage += " | INNER: " + inner.Message;
                inner = inner.InnerException;
            }

            await context.Response.WriteAsJsonAsync(new { error = fullMessage });
        }
    }
}