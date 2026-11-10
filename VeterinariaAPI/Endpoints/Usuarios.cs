using System.ComponentModel.DataAnnotations;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using VeterinariaAPI.Extensions;
using VeterinariaAPI.Models;
using VeterinariaAPI.Repositories;
using VeterinariaAPI.Services;

namespace VeterinariaAPI.Endpoints
{
    public static class UsuariosApi
    {
        public static void MapUsuariosApi(this WebApplication app)
        {
            var usuarios = app.MapGroup("/api/v1/usuarios").WithTags("Usuarios (v1)");

            // API para listar usuarios con filtros
            usuarios.MapGet("/", async (
                string? nombre,
                string? email,
                int? rolId,
                IUsuarioRepository repo) =>
            {
                var query = repo.Query().AsNoTracking();

                if (!string.IsNullOrWhiteSpace(nombre))
                {
                    query = query.Where(u => u.NombreCompleto.Contains(nombre));
                }

                if (!string.IsNullOrWhiteSpace(email))
                {
                    query = query.Where(u => u.Email.Contains(email));
                }

                if (rolId.HasValue)
                {
                    query = query.Where(u => u.RolId == rolId.Value);
                }

                var respuesta = await query.Select(u => new
                {
                    u.Id,
                    u.NombreCompleto,
                    u.Email,
                    Rol = u.Rol != null ? u.Rol.Nombre : "Sin Rol"
                }).ToListAsync();

                return Results.Ok(respuesta);
            }).RequireAuthorization(policy => policy.RequireRole("Administrador", "Veterinario", "Recepcionista"));

            // API para registrar/crear un usuario (Protegido con AuthPolicy)
            usuarios.MapPost("/register", async (UsuarioRegisterDto dto, IUsuarioRepository repo, AuthService auth, VeterinariodbContext db) =>
            {
                // Validar DTO antes de procesar
                var errores = dto.Validar();
                if (errores.Count > 0)
                {
                    return Results.ValidationProblem(errores);
                }

                if (!await db.Roles.AnyAsync(r => r.Id == dto.RolId))
                    return Results.ValidationProblem(new Dictionary<string, string[]> { ["RolId"] = new[] { "Seleccione un rol existente." } });

                // Validar unicidad del correo electrónico
                var usuarioExistente = await repo.ObtenerPorEmailAsync(dto.Email.Trim().ToLower());
                if (usuarioExistente is not null)
                {
                    return Results.ValidationProblem(new Dictionary<string, string[]>
                    {
                        { "Email", new[] { "El correo electrónico ya se encuentra registrado en el sistema." } }
                    });
                }

                var nuevoUsuario = new Usuario
                {
                    RolId = dto.RolId,
                    NombreCompleto = dto.NombreCompleto.Trim(),
                    Email = dto.Email.Trim().ToLower()
                };

                nuevoUsuario.PasswordHash = auth.HashPassword(nuevoUsuario, dto.Password);

                await repo.CrearAsync(nuevoUsuario);
                await repo.GuardarCambiosAsync();

                return Results.Created($"/api/v1/usuarios/{nuevoUsuario.Id}", new
                {
                    nuevoUsuario.Id,
                    nuevoUsuario.NombreCompleto,
                    nuevoUsuario.Email,
                    nuevoUsuario.RolId
                });
            }).RequireAuthorization(policy => policy.RequireRole("Administrador"));

            // API para Iniciar Sesión (Login) y obtener JWT Token (Protegido con AuthPolicy)
            usuarios.MapPost("/login", async (LoginRequest login, IUsuarioRepository repo, AuthService auth, IConfiguration config, VeterinariodbContext db, FacialLoginChallenges challenges, HttpContext http) =>
            {
                // Validar credenciales de entrada
                var errores = login.Validar();
                if (errores.Count > 0)
                {
                    return Results.ValidationProblem(errores);
                }

                var usuario = await repo.ObtenerPorEmailAsync(login.Email);

                if (usuario is null || !auth.VerifyPassword(usuario, login.Password))
                    return Results.Unauthorized();

                http.Response.Headers.CacheControl = "no-store";
                var face = await db.ReconocimientosFaciales.AsNoTracking().SingleOrDefaultAsync(x => x.UsuarioId == usuario.Id && x.Activo);
                if (face != null)
                {
                    if (face.ConsentimientoFecha == null)
                        return Results.Problem(statusCode: 503, detail: "El administrador debe actualizar el consentimiento del registro facial.");
                    var challenge = challenges.Create(usuario.Id, usuario.PasswordHash, face.DescriptorFacial);
                    if (challenge == null) return Results.StatusCode(429);
                    return Results.Ok(new { requiresFacial = true, challenge, expiresIn = 120 });
                }
                return LoginFacialApi.Session(usuario, config);
            }).RequireRateLimiting("AuthPolicy");

            // API para eliminar usuario por ID
            usuarios.MapDelete("/{id:int}", async (int id, IUsuarioRepository repo, VeterinariodbContext db) =>
            {
                var usuario = await repo.ObtenerPorIdAsync(id);
                if (usuario is null) return Results.NotFound();

                // Validación preventiva de dependencias (no permitir borrado si tiene citas a cargo)
                var tieneCitas = await db.Citas.AnyAsync(c => c.UsuarioId == id);
                if (tieneCitas)
                {
                    return Results.BadRequest(new { message = "No es posible eliminar el usuario porque registra citas o atenciones médicas a su cargo." });
                }

                await repo.EliminarAsync(usuario);
                await repo.GuardarCambiosAsync();

                return Results.NoContent();
            }).RequireAuthorization(policy => policy.RequireRole("Administrador"));
        }

        // DTOs estructurados con el prefijo 'property:' para la correcta validación por reflexión
        public record UsuarioRegisterDto(
            [property: Required(ErrorMessage = "El ID de rol es obligatorio.")]
            int RolId,

            [property: Required(ErrorMessage = "El nombre completo es obligatorio.")]
            [property: StringLength(100, MinimumLength = 3, ErrorMessage = "El nombre debe tener entre 3 y 100 caracteres.")]
            string NombreCompleto,

            [property: Required(ErrorMessage = "El correo electrónico es obligatorio.")]
            [property: EmailAddress(ErrorMessage = "El formato del correo electrónico no es válido.")]
            string Email,

            [property: Required(ErrorMessage = "La contraseña es obligatoria.")]
            [property: MinLength(6, ErrorMessage = "La contraseña debe tener al menos 6 caracteres.")]
            string Password
        );

        public record LoginRequest(
            [property: Required(ErrorMessage = "El correo electrónico es obligatorio.")]
            [property: EmailAddress(ErrorMessage = "El formato del correo electrónico no es válido.")]
            string Email,

            [property: Required(ErrorMessage = "La contraseña es obligatoria.")]
            string Password
        );
    }
}
