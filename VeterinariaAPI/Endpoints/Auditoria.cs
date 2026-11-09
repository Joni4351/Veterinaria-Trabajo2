using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using VeterinariaAPI.Models;

namespace VeterinariaAPI.Endpoints;

public static class AuditoriaApi
{
    private static DateTimeOffset StartOfDay(DateOnly date, TimeZoneInfo zone)
    {
        var local = date.ToDateTime(TimeOnly.MinValue);
        // Chile can advance its clock at midnight: use the first valid instant of that day.
        while (zone.IsInvalidTime(local)) local = local.AddMinutes(1);
        return new DateTimeOffset(TimeZoneInfo.ConvertTimeToUtc(local, zone));
    }

    public static void MapAuditoriaApi(this WebApplication app)
    {
        var group = app.MapGroup("/api/v1/admin/auditoria").WithTags("Auditoría")
            .RequireAuthorization(policy => policy.RequireRole("Administrador"));
        group.AddEndpointFilter(async (context, next) =>
        {
            context.HttpContext.Response.Headers.CacheControl = "no-store";
            var db = context.HttpContext.RequestServices.GetRequiredService<VeterinariodbContext>();
            if (!int.TryParse(context.HttpContext.User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ||
                !await db.Usuarios.AnyAsync(x => x.Id == id && x.Rol.Nombre == "Administrador")) return Results.Forbid();
            return await next(context);
        });
        group.MapGet("/entidades", () => Results.Ok(VeterinariodbContext.AuditTables));
        group.MapGet("/", async (VeterinariodbContext db, string? entidad, string? accion, string? origen,
            string? usuario, string? buscar, DateOnly? desde, DateOnly? hasta, Guid? operacionId, int pagina = 1, int tamano = 25) =>
        {
            if (pagina < 1 || pagina > 100000 || tamano < 1 || tamano > 100 || desde.HasValue && hasta.HasValue && desde > hasta)
                return Results.BadRequest(new { message = "Revise el rango de fechas y la paginación (1 a 100 resultados por página)." });
            if (accion != null && accion is not ("CREAR" or "MODIFICAR" or "ELIMINAR") || origen != null && origen is not ("API" or "SISTEMA" or "SQL"))
                return Results.BadRequest(new { message = "Seleccione una acción y un origen válidos." });
            var query = db.Auditorias.AsNoTracking();
            if (!string.IsNullOrWhiteSpace(buscar))
            {
                var term = buscar.Trim().ToLower();
                query = query.Where(x => (x.UsuarioNombre != null && x.UsuarioNombre.ToLower().Contains(term)) ||
                    x.Entidad.ToLower().Contains(term) || x.Accion.ToLower().Contains(term));
            }
            if (!string.IsNullOrEmpty(entidad)) query = query.Where(x => x.Entidad == entidad);
            if (accion != null) query = query.Where(x => x.Accion == accion);
            if (origen != null) query = query.Where(x => x.Origen == origen);
            if (!string.IsNullOrWhiteSpace(usuario))
            {
                var term = usuario.Trim().ToLower();
                query = query.Where(x => x.UsuarioNombre != null && x.UsuarioNombre.ToLower().Contains(term));
            }
            if (operacionId.HasValue) query = query.Where(x => x.OperacionId == operacionId.Value);
            var zone = TimeZoneInfo.FindSystemTimeZoneById("America/Santiago");
            if (desde.HasValue)
            {
                var start = StartOfDay(desde.Value, zone);
                query = query.Where(x => x.FechaHora >= start);
            }
            if (hasta.HasValue)
            {
                if (hasta.Value == DateOnly.MaxValue) return Results.BadRequest(new { message = "La fecha final está fuera del rango permitido." });
                var end = StartOfDay(hasta.Value.AddDays(1), zone);
                query = query.Where(x => x.FechaHora < end);
            }
            var total = await query.CountAsync();
            var resumen = await query.GroupBy(x => x.Accion).Select(g => new { accion = g.Key, cantidad = g.Count() }).ToListAsync();
            var registros = await query.OrderByDescending(x => x.FechaHora).ThenByDescending(x => x.Id)
                .Skip((pagina - 1) * tamano).Take(tamano).Select(x => new
                { x.Id, x.FechaHora, x.UsuarioId, x.UsuarioNombre, x.Accion, x.Entidad, x.RegistroId, x.Origen, x.OperacionId }).ToListAsync();
            return Results.Ok(new { registros, total, pagina, tamano, resumen });
        });
        group.MapGet("/{id:long}", async (long id, VeterinariodbContext db) =>
        {
            var row = await db.Auditorias.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
            return row == null ? Results.NotFound() : Results.Ok(new
            {
                row.Id, row.FechaHora, row.UsuarioId, row.UsuarioNombre, row.Accion, row.Entidad, row.RegistroId, row.Origen, row.OperacionId,
                valoresAnteriores = VeterinariodbContext.SafeAuditValues(row.Entidad, row.ValoresAnteriores),
                valoresNuevos = VeterinariodbContext.SafeAuditValues(row.Entidad, row.ValoresNuevos)
            });
        });
    }
}
