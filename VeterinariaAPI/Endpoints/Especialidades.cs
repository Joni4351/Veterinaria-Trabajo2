using System.ComponentModel.DataAnnotations;
using Microsoft.EntityFrameworkCore;
using VeterinariaAPI.Extensions;
using VeterinariaAPI.Models;
using VeterinariaAPI.Repositories;

namespace VeterinariaAPI.Endpoints
{
    public static class EspecialidadesApi
    {
        public static void MapEspecialidadApi(this WebApplication app)
        {
            var especialidad = app.MapGroup("/api/v1/especialidades").WithTags("Especialidades (v1)");

            // API para listar especialidades con filtros
            especialidad.MapGet("/", async (
                string? nombre,
                decimal? costoMin,
                decimal? costoMax,
                IRepository<Especialidade> repo) =>
            {
                var query = repo.Query();

                if (!string.IsNullOrWhiteSpace(nombre))
                {
                    query = query.Where(e => e.Nombre.Contains(nombre));
                }

                if (costoMin.HasValue)
                {
                    query = query.Where(e => e.CostoBase >= costoMin.Value);
                }

                if (costoMax.HasValue)
                {
                    query = query.Where(e => e.CostoBase <= costoMax.Value);
                }

                var listaEspecialidades = await query.ToListAsync();
                return Results.Ok(listaEspecialidades);
            }).RequireAuthorization(policy => policy.RequireRole("Administrador", "Veterinario", "Recepcionista"));

            // API para crear una especialidad
            especialidad.MapPost("/", async (EspecialidadCreateDto dto, IRepository<Especialidade> repo) =>
            {
                var errores = dto.Validar();
                if (errores.Count > 0)
                {
                    return Results.ValidationProblem(errores);
                }

                var nuevaEspecialidad = new Especialidade
                {
                    Nombre = dto.Nombre,
                    CostoBase = dto.CostoBase
                };

                await repo.CrearAsync(nuevaEspecialidad);
                await repo.GuardarCambiosAsync();

                return Results.Created($"/api/v1/especialidades/{nuevaEspecialidad.Id}", nuevaEspecialidad);
            }).RequireAuthorization(policy => policy.RequireRole("Administrador"));

            // API para editar especialidad por ID
            especialidad.MapPut("/{id:int}", async (int id, EspecialidadCreateDto dto, IRepository<Especialidade> repo) =>
            {
                var errores = dto.Validar();
                if (errores.Count > 0)
                {
                    return Results.ValidationProblem(errores);
                }

                var especialidadExistente = await repo.ObtenerPorIdAsync(id);
                if (especialidadExistente is null) return Results.NotFound();

                especialidadExistente.Nombre = dto.Nombre;
                especialidadExistente.CostoBase = dto.CostoBase;

                await repo.GuardarCambiosAsync();
                return Results.Ok(especialidadExistente);
            }).RequireAuthorization(policy => policy.RequireRole("Administrador"));

            // API para eliminar especialidades
            especialidad.MapDelete("/{id:int}", async (int id, IRepository<Especialidade> repo, VeterinariodbContext db) =>
            {
                var especialidadExistente = await repo.ObtenerPorIdAsync(id);
                if (especialidadExistente is null) return Results.NotFound();

                // Validación preventiva de dependencias (no permitir borrado si está vinculada a citas)
                var tieneCitas = await db.Citas.AnyAsync(c => c.EspecialidadId == id);
                if (tieneCitas)
                {
                    return Results.BadRequest(new { message = "No es posible eliminar la especialidad porque está vinculada a una o más citas médicas." });
                }

                await repo.EliminarAsync(especialidadExistente);
                await repo.GuardarCambiosAsync();
                return Results.NoContent();
            }).RequireAuthorization(policy => policy.RequireRole("Administrador"));
        }

        // DTO estructurado con el prefijo 'property:' para la correcta validación por reflexión
        public record EspecialidadCreateDto(
            [property: Required(ErrorMessage = "El nombre de la especialidad es obligatorio.")]
            [property: StringLength(100, MinimumLength = 3, ErrorMessage = "El nombre debe tener entre 3 y 100 caracteres.")]
            string Nombre,

            [property: Required(ErrorMessage = "El costo base es obligatorio.")]
            [property: Range(0.0, 10000000.0, ErrorMessage = "El costo base debe ser mayor o igual a 0.")]
            decimal CostoBase
        );
    }
}