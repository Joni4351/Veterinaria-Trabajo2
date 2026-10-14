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
                var query = repo.Query();

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

                var listaUsuarios = await query.ToListAsync();

                var respuesta = listaUsuarios.Select(u => new
                {
                    u.Id,
                    u.NombreCompleto,
                    u.Email,
                    Rol = u.Rol != null ? u.Rol.Nombre : "Sin Rol"
                });

                return Results.Ok(respuesta);
            }).RequireAuthorization(policy => policy.RequireRole("Administrador", "Veterinario", "Recepcionista"));

            // API para registrar/crear un usuario (Protegido con AuthPolicy)
            usuarios.MapPost("/register", async (UsuarioRegisterDto dto, IUsuarioRepository repo, AuthService auth) =>
            {
                // Validar DTO antes de procesar
                var errores = dto.Validar();
                if (errores.Count > 0)
                {
                    return Results.ValidationProblem(errores);
                }

                var nuevoUsuario = new Usuario
                {
                    RolId = dto.RolId,
                    NombreCompleto = dto.NombreCompleto,
                    Email = dto.Email
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
            }).RequireRateLimiting("AuthPolicy");

            // API para Iniciar Sesión (Login) y obtener JWT Token (Protegido con AuthPolicy)
            usuarios.MapPost("/login", async (LoginRequest login, IUsuarioRepository repo, AuthService auth, IConfiguration config) =>
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

                var claims = new List<Claim>
                {
                    new Claim(ClaimTypes.NameIdentifier, usuario.Id.ToString()),
                    new Claim(ClaimTypes.Name, usuario.NombreCompleto),
                    new Claim(ClaimTypes.Email, usuario.Email),
                    new Claim(ClaimTypes.Role, usuario.Rol?.Nombre ?? "Cliente")
                };

                var jwtKey = config["Jwt:Key"]!;
                var jwtIssuer = config["Jwt:Issuer"]!;
                var jwtAudience = config["Jwt:Audience"]!;
                var jwtExpireMinutes = config["Jwt:ExpireMinutes"]!;

                var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
                var credenciales = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

                var token = new JwtSecurityToken(
                    issuer: jwtIssuer,
                    audience: jwtAudience,
                    claims: claims,
                    expires: DateTime.UtcNow.AddMinutes(int.Parse(jwtExpireMinutes)),
                    signingCredentials: credenciales
                );

                return Results.Ok(new { token = new JwtSecurityTokenHandler().WriteToken(token) });
            }).RequireRateLimiting("AuthPolicy");

            // API para eliminar usuario por ID
            usuarios.MapDelete("/{id:int}", async (int id, IUsuarioRepository repo) =>
            {
                var usuario = await repo.ObtenerPorIdAsync(id);
                if (usuario is null) return Results.NotFound();

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