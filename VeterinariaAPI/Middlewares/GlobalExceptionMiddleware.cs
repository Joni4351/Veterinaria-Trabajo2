using System.Net;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using VeterinariaAPI.Services;

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
            var databaseError = exception as PostgresException ?? (exception as DbUpdateException)?.InnerException as PostgresException;
            var status = databaseError?.SqlState switch { "23503" or "23505" => 409, "23514" or "23502" => 400, _ => exception is DbUpdateConcurrencyException or BillingDataException ? 409 : 500 };
            context.Response.StatusCode = status;

            var respuesta = new
            {
                status = context.Response.StatusCode,
                error = status == 500 ? "Error Interno del Servidor" : "Restricción de datos",
                message = exception is BillingDataException billing ? billing.Message : status == 409 ? "La operación entra en conflicto con datos relacionados o un registro existente. Actualice y revise la información." : status == 400 ? "Los datos no cumplen las restricciones de integridad. Revise los valores ingresados." : "Ocurrió un error inesperado al procesar la solicitud. Por favor contacte al soporte si el problema persiste.",
                traceId = context.TraceIdentifier,
                detalle = env.IsDevelopment() ? exception.Message : null
            };

            var jsonOpciones = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
            return context.Response.WriteAsync(JsonSerializer.Serialize(respuesta, jsonOpciones));
        }
    }
}
