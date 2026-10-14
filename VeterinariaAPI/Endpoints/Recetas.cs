using System.ComponentModel.DataAnnotations;
using Microsoft.EntityFrameworkCore;
using VeterinariaAPI.Extensions;
using VeterinariaAPI.Models;
using VeterinariaAPI.Repositories;

namespace VeterinariaAPI.Endpoints
{
    public static class RecetasApi
    {
        public static void MapRecetaApi(this WebApplication app)
        {
            var recetas = app.MapGroup("/api/v1/recetas").WithTags("Recetas (v1)");

            // API para listar recetas con filtros
            recetas.MapGet("/", async (
                int? consultaId,
                DateOnly? fechaDesde,
                DateOnly? fechaHasta,
                bool? vigentes,
                IRepository<Receta> repo) =>
            {
                var query = repo.Query();

                if (consultaId.HasValue)
                {
                    query = query.Where(r => r.ConsultaId == consultaId.Value);
                }

                if (fechaDesde.HasValue)
                {
                    query = query.Where(r => r.FechaEmision >= fechaDesde.Value);
                }

                if (fechaHasta.HasValue)
                {
                    query = query.Where(r => r.FechaEmision <= fechaHasta.Value);
                }

                if (vigentes.HasValue)
                {
                    var hoy = DateOnly.FromDateTime(DateTime.Today);
                    if (vigentes.Value)
                    {
                        query = query.Where(r => r.ValidaHasta >= hoy);
                    }
                    else
                    {
                        query = query.Where(r => r.ValidaHasta < hoy);
                    }
                }

                var listaRecetas = await query.ToListAsync();
                return Results.Ok(listaRecetas);
            }).RequireAuthorization(policy => policy.RequireRole("Administrador", "Veterinario", "Recepcionista"));

            // API para crear una receta
            recetas.MapPost("/", async (RecetaCreateDto dto, IRepository<Receta> repo) =>
            {
                var errores = dto.Validar();
                if (errores.Count > 0)
                {
                    return Results.ValidationProblem(errores);
                }

                var nuevaReceta = new Receta
                {
                    ConsultaId = dto.ConsultaId,
                    FechaEmision = dto.FechaEmision,
                    ValidaHasta = dto.ValidaHasta
                };

                await repo.CrearAsync(nuevaReceta);
                await repo.GuardarCambiosAsync();

                return Results.Created($"/api/v1/recetas/{nuevaReceta.Id}", nuevaReceta);
            }).RequireAuthorization(policy => policy.RequireRole("Administrador", "Veterinario"));

            // API para editar una receta por ID
            recetas.MapPut("/{id:int}", async (int id, RecetaCreateDto dto, IRepository<Receta> repo) =>
            {
                var errores = dto.Validar();
                if (errores.Count > 0)
                {
                    return Results.ValidationProblem(errores);
                }

                var recetaExistente = await repo.ObtenerPorIdAsync(id);
                if (recetaExistente is null) return Results.NotFound("La receta no existe");

                recetaExistente.ConsultaId = dto.ConsultaId;
                recetaExistente.FechaEmision = dto.FechaEmision;
                recetaExistente.ValidaHasta = dto.ValidaHasta;

                await repo.GuardarCambiosAsync();
                return Results.Ok(recetaExistente);
            }).RequireAuthorization(policy => policy.RequireRole("Administrador", "Veterinario"));

            // API para eliminar recetas
            recetas.MapDelete("/{id:int}", async (int id, IRepository<Receta> repo) =>
            {
                var recetaExistente = await repo.ObtenerPorIdAsync(id);
                if (recetaExistente is null) return Results.NotFound();

                await repo.EliminarAsync(recetaExistente);
                await repo.GuardarCambiosAsync();
                return Results.NoContent();
            }).RequireAuthorization(policy => policy.RequireRole("Administrador", "Veterinario"));
        }

        // DTO estructurado con el prefijo 'property:' para la correcta validación por reflexión
        public record RecetaCreateDto(
            [property: Required(ErrorMessage = "El ID de la consulta es obligatorio.")]
            [property: Range(1, int.MaxValue, ErrorMessage = "El ID de la consulta debe ser un número entero positivo.")]
            int ConsultaId,

            [property: Required(ErrorMessage = "La fecha de emisión es obligatoria.")]
            DateOnly FechaEmision,

            [property: Required(ErrorMessage = "La fecha de vencimiento (Válida Hasta) es obligatoria.")]
            DateOnly ValidaHasta
        );
    }
}