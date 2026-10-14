using System.Net;
using System.Text.Json;

namespace VeterinariaAPI.Middlewares
{
    public class GlobalExceptionMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<GlobalExceptionMiddleware> _logger;

        private readonly IHostEnvironment _env;

        public GlobalExceptionMiddleware(RequestDelegate next, ILogger<GlobalExceptionMiddleware> logger, IHostEnvironment env)
        {
            _next = next;
            _logger = logger;
            _env = env;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            try
            {
                // Continúa con la ejecución de la petición
                await _next(context);
            }
            catch (Exception ex)
            {
                // Registra el error en la consola o archivo log con stack trace interno
                _logger.LogError(ex, "Excepción no controlada capturada por GlobalExceptionMiddleware.");

                // Genera la respuesta estandarizada sin filtrar detalles internos en producción
                await ManejarExcepcionAsync(context, ex, _env);
            }
        }

        private static Task ManejarExcepcionAsync(HttpContext context, Exception exception, IHostEnvironment env)
        {
            context.Response.ContentType = "application/json";
            context.Response.StatusCode = (int)HttpStatusCode.InternalServerError;

            var respuesta = new
            {
                status = context.Response.StatusCode,
                error = "Error Interno del Servidor",
                message = "Ocurrió un error inesperado al procesar la solicitud. Por favor contacte al soporte si el problema persiste.",
                traceId = context.TraceIdentifier,
                detalle = env.IsDevelopment() ? exception.Message : null
            };

            var jsonOpciones = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
            return context.Response.WriteAsync(JsonSerializer.Serialize(respuesta, jsonOpciones));
        }
    }
}