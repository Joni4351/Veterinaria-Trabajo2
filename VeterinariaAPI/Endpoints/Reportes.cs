using System.Security.Claims;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using VeterinariaAPI.Models;
using VeterinariaAPI.Services;

namespace VeterinariaAPI.Endpoints;

public static class ReportesApi
{
    public static void MapReportesApi(this WebApplication app)
    {
        var group = app.MapGroup("/api/v1/admin/reportes").WithTags("Reportes")
            .RequireAuthorization(p => p.RequireRole("Administrador"));
        group.AddEndpointFilter(async (ctx, next) => {
            ctx.HttpContext.Response.Headers.CacheControl = "no-store";
            var db = ctx.HttpContext.RequestServices.GetRequiredService<VeterinariodbContext>();
            if (!int.TryParse(ctx.HttpContext.User.FindFirstValue(ClaimTypes.NameIdentifier), out var actor) ||
                !await db.Usuarios.AnyAsync(x => x.Id == actor && x.Rol.Nombre == "Administrador")) return Results.Forbid();
            return await next(ctx);
        });
        group.MapGet("/{tipo}", async (string tipo, DateOnly? desde, DateOnly? hasta, string? estado, int? especialidadId, int? clienteId,
            int? pagina, int? tamano, ReportService service, CancellationToken ct) => {
            var filter = Validate(tipo, desde, hasta, estado, especialidadId, clienteId, out var errors);
            var page = pagina ?? 1; var size = tamano ?? 25;
            if (page < 1 || page > 10000 || size < 1 || size > 100) errors["paginacion"] = ["Use páginas positivas y entre 1 y 100 filas."];
            if (errors.Count > 0) return Results.ValidationProblem(errors);
            try {
                var result = await service.Build(tipo, filter, ct);
                return Results.Ok(new { result.Tipo, result.Titulo, result.Emitido, result.Filtros, result.Columnas,
                    Filas = result.Filas.Skip((page - 1) * size).Take(size), result.Totales, result.Grafico, Total = result.Filas.Count, Pagina = page, Tamano = size });
            } catch (ReportLimitException) { return Results.UnprocessableEntity(new { message = "El reporte supera 5000 filas. Reduzca el rango o aplique filtros." }); }
        });
        group.MapGet("/{tipo}/exportar/{formato}", async (string tipo, string formato, DateOnly? desde, DateOnly? hasta, string? estado,
            int? especialidadId, int? clienteId, ReportService service, IEnumerable<IReportFormat> formats, VeterinariodbContext db, HttpContext http, CancellationToken ct) => {
            var filter = Validate(tipo, desde, hasta, estado, especialidadId, clienteId, out var errors);
            var writer = formats.SingleOrDefault(f => f.Extension == formato);
            if (writer == null) errors["formato"] = ["Seleccione xlsx, pdf o csv."];
            if (errors.Count > 0) return Results.ValidationProblem(errors);
            try {
                var report = await service.Build(tipo, filter, ct);
                var file = writer!.Encode(report);
                var actor = int.TryParse(http.User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? await db.Usuarios.FindAsync([id], ct) : null;
                db.Auditorias.Add(new Auditoria { FechaHora = DateTimeOffset.UtcNow, UsuarioId = actor?.Id,
                    // Existing installations restrict Accion to CRUD. This event creates a report;
                    // its export semantics remain explicit in metadata and the audit API.
                    UsuarioNombre = actor?.NombreCompleto ?? "Usuario autenticado", Accion = "CREAR", Entidad = "Reportes", RegistroId = 0,
                    Origen = "API", OperacionId = Guid.NewGuid(), ValoresNuevos = JsonSerializer.Serialize(new { Operacion = "EXPORTAR", tipo, formato, report.Filtros, Registros = report.Filas.Count }) });
                await db.SaveChangesAsync(ct);
                return Results.File(file, writer.ContentType, $"vetclinic-{tipo}-{filter.Desde:yyyyMMdd}-{filter.Hasta:yyyyMMdd}.{formato}");
            } catch (ReportLimitException) { return Results.UnprocessableEntity(new { message = "El reporte supera 5000 filas. Reduzca el rango o aplique filtros." }); }
        });
    }
    public static ReportFilter Validate(string tipo, DateOnly? desde, DateOnly? hasta, string? estado, int? especialidadId, int? clienteId, out Dictionary<string, string[]> errors)
    {
        var today = DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeBySystemTimeZoneId(DateTime.UtcNow, "America/Santiago"));
        var from = desde ?? today.AddDays(-29); var to = hasta ?? today;
        errors = new();
        if (tipo is not ("operativo" or "gerencial" or "periodo")) errors["tipo"] = ["Reporte no válido."];
        if (from > to || to.DayNumber - from.DayNumber > 730 || to == DateOnly.MaxValue) errors["hasta"] = ["Seleccione un intervalo ordenado de hasta 731 días."];
        if (estado != null && !AppointmentStates.All.Contains(estado)) errors["estado"] = ["Estado no válido."];
        if (especialidadId <= 0 || clienteId <= 0) errors["filtros"] = ["Los identificadores deben ser positivos."];
        if (tipo == "gerencial" && (estado != null || especialidadId != null)) errors["filtros"] = ["El resumen financiero admite fechas y cliente, no filtros de agenda."];
        return new(from, to, estado, especialidadId, clienteId);
    }
}
