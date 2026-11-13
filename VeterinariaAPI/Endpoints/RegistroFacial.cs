using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using VeterinariaAPI.Models;
using VeterinariaAPI.Services;

namespace VeterinariaAPI.Endpoints;

public static class RegistroFacialApi
{
    public const string ConsentVersion = "registro-facial-v1";

    public static void MapRegistroFacialApi(this WebApplication app)
    {
        var group = app.MapGroup("/api/v1/registro-facial")
            .WithTags("Registro Facial")
            .RequireAuthorization(p => p.RequireRole("Administrador"));

        group.AddEndpointFilter(async (context, next) =>
        {
            context.HttpContext.Response.Headers.CacheControl = "no-store";
            var id = context.HttpContext.User.FindFirstValue(ClaimTypes.NameIdentifier);
            var db = context.HttpContext.RequestServices.GetRequiredService<VeterinariodbContext>();
            if (!int.TryParse(id, out var adminId) || !await db.Usuarios.AnyAsync(u =>
                u.Id == adminId && u.Rol.Nombre == "Administrador")) return Results.Forbid();
            try { return await next(context); }
            catch (DbUpdateConcurrencyException)
            { return Results.Conflict(new { message = "El registro cambió. Actualice la selección antes de continuar." }); }
            catch (DbUpdateException ex) when (ex.InnerException is PostgresException { SqlState: "23505" })
            { return Results.Conflict(new { message = "El usuario ya tiene un registro facial." }); }
            catch (Exception ex) when (ex is DbUpdateException or PostgresException)
            {
                // Do not propagate provider details (which can contain biometric values) to logs/responses.
                return Results.Problem(statusCode: 503, detail: "No se pudo guardar el registro facial. Revise la configuración de la base de datos.");
            }
        });

        group.MapGet("/usuarios", async (VeterinariodbContext db, string? buscar, int pagina = 1) =>
        {
            var query = db.Usuarios.AsNoTracking();
            if (!string.IsNullOrWhiteSpace(buscar))
            {
                var term = buscar.Trim().ToLower();
                query = query.Where(u => u.NombreCompleto.ToLower().Contains(term) || u.Email.ToLower().Contains(term));
            }
            var total = await query.CountAsync();
            var page = Math.Clamp(pagina, 1, 100000);
            var usuarios = await query.OrderBy(u => u.NombreCompleto).ThenBy(u => u.Id)
                .Skip((page - 1) * 25).Take(25).Select(u => new
                {
                    u.Id, u.NombreCompleto, u.Email, Rol = u.Rol.Nombre,
                    RegistroFacial = db.ReconocimientosFaciales.Where(r => r.UsuarioId == u.Id).Select(r => new
                    { r.Id, r.FechaRegistro, r.FechaActualizacion, r.Activo }).FirstOrDefault()
                }).ToListAsync();
            return Results.Ok(new { usuarios, total, pagina = page });
        });

        group.MapGet("/{usuarioId:int}", async (int usuarioId, VeterinariodbContext db) =>
        {
            if (!await db.Usuarios.AnyAsync(u => u.Id == usuarioId)) return Results.NotFound();
            var metadata = await Metadata(db, usuarioId).FirstOrDefaultAsync();
            return Results.Ok(new { registroFacial = metadata });
        });

        group.MapPost("/{usuarioId:int}", (int usuarioId, FacialWriteDto dto, VeterinariodbContext db,
            FacialEncryptionService encryption, ClaimsPrincipal principal) => Save(usuarioId, dto, false, db, encryption, principal));
        group.MapPut("/{usuarioId:int}", (int usuarioId, FacialWriteDto dto, VeterinariodbContext db,
            FacialEncryptionService encryption, ClaimsPrincipal principal) => Save(usuarioId, dto, true, db, encryption, principal));

        group.MapDelete("/{usuarioId:int}", async (int usuarioId, VeterinariodbContext db) =>
        {
            var record = await db.ReconocimientosFaciales.SingleOrDefaultAsync(r => r.UsuarioId == usuarioId);
            if (record is null) return Results.NotFound();
            db.ReconocimientosFaciales.Remove(record);
            await db.SaveChangesAsync();
            return Results.NoContent();
        });
    }

    private static IQueryable<FacialMetadata> Metadata(VeterinariodbContext db, int id) =>
        db.ReconocimientosFaciales.AsNoTracking().Where(r => r.UsuarioId == id).Select(r =>
            new FacialMetadata(r.Id, r.FechaRegistro, r.FechaActualizacion, r.Activo));

    private static async Task<IResult> Save(int usuarioId, FacialWriteDto dto, bool replace,
        VeterinariodbContext db, FacialEncryptionService encryption, ClaimsPrincipal principal)
    {
        if (dto.Descriptor is not { Length: 128 } || dto.Descriptor.Any(x => !double.IsFinite(x)))
            return Results.BadRequest(new { message = "El descriptor debe contener exactamente 128 números finitos." });
        if (!dto.Consentimiento || dto.ConsentimientoVersion != ConsentVersion)
            return Results.BadRequest(new { message = "Debe registrar el consentimiento informado vigente del usuario." });
        if (!await db.Usuarios.AnyAsync(u => u.Id == usuarioId)) return Results.NotFound();
        var record = await db.ReconocimientosFaciales.SingleOrDefaultAsync(r => r.UsuarioId == usuarioId);
        if (!replace && record != null) return Results.Conflict(new { message = "El usuario ya tiene un registro facial. Utilice reemplazar." });
        if (replace && record == null) return Results.NotFound();
        if (replace && record!.FechaActualizacion != dto.FechaActualizacion)
            return Results.Conflict(new { message = "El registro cambió. Actualice la selección antes de reemplazarlo." });

        string encrypted;
        try { encrypted = encryption.Encrypt(dto.Descriptor, usuarioId); }
        catch (InvalidOperationException)
        { return Results.Problem(statusCode: 503, detail: "Configure Biometrics:EncryptionKey en el servidor antes de registrar rostros."); }
        var now = DateTimeOffset.UtcNow;
        if (record is null)
        {
            record = new ReconocimientoFacial { UsuarioId = usuarioId };
            db.ReconocimientosFaciales.Add(record);
        }
        else record.FechaActualizacion = now;
        record.DescriptorFacial = encrypted;
        record.ConsentimientoFecha = now;
        record.ConsentimientoAdministradorId = int.Parse(principal.FindFirstValue(ClaimTypes.NameIdentifier)!);
        record.ConsentimientoVersion = ConsentVersion;
        // Preserve Activo and UltimoAcceso on replacement; use DB defaults on creation.
        await db.SaveChangesAsync();
        var metadata = await Metadata(db, usuarioId).SingleAsync();
        return replace ? Results.Ok(new { registroFacial = metadata })
            : Results.Created($"/api/v1/registro-facial/{usuarioId}", new { registroFacial = metadata });
    }

    public record FacialWriteDto(double[]? Descriptor, bool Consentimiento, string? ConsentimientoVersion,
        DateTimeOffset? FechaActualizacion = null);
    public record FacialMetadata(int Id, DateTimeOffset FechaRegistro, DateTimeOffset? FechaActualizacion, bool Activo);
}
