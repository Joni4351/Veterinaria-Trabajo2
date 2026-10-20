using System.ComponentModel.DataAnnotations;
using Microsoft.EntityFrameworkCore;
using VeterinariaAPI.Extensions;
using VeterinariaAPI.Models;
using VeterinariaAPI.Repositories;

namespace VeterinariaAPI.Endpoints
{
    public static class RolesApi
    {
        public static void MapRolApi(this WebApplication app)
        {
            var roles = app.MapGroup("/api/v1/roles").WithTags("Roles (v1)");

            // API para listar roles con filtros
            roles.MapGet("/", async (
                string? nombre,
                bool? permisosEscritura,
                IRepository<Role> repo) =>
            {
                var query = repo.Query();

                if (!string.IsNullOrWhiteSpace(nombre))
                {
                    query = query.Where(r => r.Nombre.Contains(nombre));
                }

                if (permisosEscritura.HasValue)
                {
                    query = query.Where(r => r.PermisosEscritura == permisosEscritura.Value);
                }

                var listaRoles = await query.ToListAsync();
                return Results.Ok(listaRoles);
            }).RequireAuthorization(policy => policy.RequireRole("Administrador"));

            // API para crear un rol
            roles.MapPost("/", async (RoleCreateDto dto, IRepository<Role> repo) =>
            {
                var errores = dto.Validar();
                if (errores.Count > 0)
                {
                    return Results.ValidationProblem(errores);
                }

                var nuevoRol = new Role
                {
                    Nombre = dto.Nombre,
                    PermisosEscritura = dto.PermisosEscritura
                };

                await repo.CrearAsync(nuevoRol);
                await repo.GuardarCambiosAsync();

                return Results.Created($"/api/v1/roles/{nuevoRol.Id}", nuevoRol);
            }).RequireAuthorization(policy => policy.RequireRole("Administrador"));

            // API para editar rol por ID
            roles.MapPut("/{id:int}", async (int id, RoleCreateDto dto, IRepository<Role> repo) =>
            {
                var errores = dto.Validar();
                if (errores.Count > 0)
                {
                    return Results.ValidationProblem(errores);
                }

                var rolExistente = await repo.ObtenerPorIdAsync(id);
                if (rolExistente is null) return Results.NotFound();

                rolExistente.Nombre = dto.Nombre;
                rolExistente.PermisosEscritura = dto.PermisosEscritura;

                await repo.GuardarCambiosAsync();
                return Results.Ok(rolExistente);
            }).RequireAuthorization(policy => policy.RequireRole("Administrador"));

            // API para eliminar roles
            roles.MapDelete("/{id:int}", async (int id, IRepository<Role> repo, VeterinariodbContext db) =>
            {
                var rolExistente = await repo.ObtenerPorIdAsync(id);
                if (rolExistente is null) return Results.NotFound();

                // Validación preventiva de dependencias (no permitir borrado si está asignado a usuarios)
                var tieneUsuarios = await db.Usuarios.AnyAsync(u => u.RolId == id);
                if (tieneUsuarios)
                {
                    return Results.BadRequest(new { message = "No es posible eliminar el rol porque está asignado a uno o más usuarios del sistema." });
                }

                await repo.EliminarAsync(rolExistente);
                await repo.GuardarCambiosAsync();
                return Results.NoContent();
            }).RequireAuthorization(policy => policy.RequireRole("Administrador"));
        }

        // DTO estructurado con el prefijo 'property:' para que ValidationContext detecte las reglas
        public record RoleCreateDto(
            [property: Required(ErrorMessage = "El nombre del rol es obligatorio.")]
            [property: StringLength(50, MinimumLength = 2, ErrorMessage = "El nombre del rol debe tener entre 2 y 50 caracteres.")]
            string Nombre,

            bool PermisosEscritura
        );
    }
}