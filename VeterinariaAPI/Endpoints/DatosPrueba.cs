using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using VeterinariaAPI.Models;
using VeterinariaAPI.Services;

namespace VeterinariaAPI.Endpoints;

public static class DatosPruebaApi
{
    public static void MapDatosPruebaApi(this WebApplication app)
    {
        var group = app.MapGroup("/api/v1/admin/datos-prueba").WithTags("Datos de prueba")
            .RequireAuthorization(p => p.RequireRole("Administrador"));
        group.AddEndpointFilter(async (context, next) =>
        {
            context.HttpContext.Response.Headers.CacheControl = "no-store";
            var db = context.HttpContext.RequestServices.GetRequiredService<VeterinariodbContext>();
            var id = context.HttpContext.User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(id, out var admin) || !await db.Usuarios.AnyAsync(x => x.Id == admin && x.Rol.Nombre == "Administrador"))
                return Results.Forbid();
            return await next(context);
        });
        group.MapGet("/", (DemoSeederService service) => service.Preview());
        group.MapPost("/", async (DemoRequest dto, DemoSeederService service) =>
        {
            if (dto.Dataset != DemoSeederService.Dataset || !dto.Confirmado)
                return Results.BadRequest(new { message = "Debe confirmar el lote de demostración vigente." });
            try { return Results.Ok(new { dataset = DemoSeederService.Dataset, creados = await service.Generate() }); }
            catch (InvalidOperationException ex) { return Results.Conflict(new { message = ex.Message }); }
        });
    }
    public record DemoRequest(string? Dataset, bool Confirmado);
}
