using System.ComponentModel.DataAnnotations;
using Microsoft.EntityFrameworkCore;
using VeterinariaAPI.Extensions;
using VeterinariaAPI.Models;
using VeterinariaAPI.Repositories;

namespace VeterinariaAPI.Endpoints
{
    public static class DetallesRecetaApi
    {
        public static void MapDetalleRecetaApi(this WebApplication app)
        {
            var detallesRe = app.MapGroup("/api/v1/detallesRe").WithTags("DetalleReceta (v1)");

            // API para listar detalles de receta con filtros
            detallesRe.MapGet("/", async (
                int? recetaId,
                int? insumoId,
                IRepository<DetallesRecetum> repo) =>
            {
                var query = repo.Query();

                if (recetaId.HasValue)
                {
                    query = query.Where(d => d.RecetaId == recetaId.Value);
                }

                if (insumoId.HasValue)
                {
                    query = query.Where(d => d.InsumoId == insumoId.Value);
                }

                var listaDetallesRe = await query.ToListAsync();
                return Results.Ok(listaDetallesRe);
            }).RequireAuthorization(policy => policy.RequireRole("Administrador", "Veterinario", "Recepcionista"));

            // API para crear un detalle de receta
            detallesRe.MapPost("/", async (DetalleRecetaCreateDto dto, IRepository<DetallesRecetum> repo) =>
            {
                var errores = dto.Validar();
                if (errores.Count > 0)
                {
                    return Results.ValidationProblem(errores);
                }

                var nuevoDetalle = new DetallesRecetum
                {
                    RecetaId = dto.RecetaId,
                    InsumoId = dto.InsumoId,
                    Dosis = dto.Dosis,
                    DuracionDias = dto.DuracionDias
                };

                await repo.CrearAsync(nuevoDetalle);
                await repo.GuardarCambiosAsync();

                return Results.Created($"/api/v1/detallesRe/{nuevoDetalle.Id}", nuevoDetalle);
            }).RequireAuthorization(policy => policy.RequireRole("Administrador", "Veterinario"));

            // API para editar detalle de receta por ID
            detallesRe.MapPut("/{id:int}", async (int id, DetalleRecetaCreateDto dto, IRepository<DetallesRecetum> repo) =>
            {
                var errores = dto.Validar();
                if (errores.Count > 0)
                {
                    return Results.ValidationProblem(errores);
                }

                var detalleReExistente = await repo.ObtenerPorIdAsync(id);
                if (detalleReExistente is null) return Results.NotFound();

                detalleReExistente.RecetaId = dto.RecetaId;
                detalleReExistente.InsumoId = dto.InsumoId;
                detalleReExistente.Dosis = dto.Dosis;
                detalleReExistente.DuracionDias = dto.DuracionDias;

                await repo.GuardarCambiosAsync();
                return Results.Ok(detalleReExistente);
            }).RequireAuthorization(policy => policy.RequireRole("Administrador", "Veterinario"));

            // API para eliminar detalles de receta
            detallesRe.MapDelete("/{id:int}", async (int id, IRepository<DetallesRecetum> repo) =>
            {
                var detalleReExistente = await repo.ObtenerPorIdAsync(id);
                if (detalleReExistente is null) return Results.NotFound();

                await repo.EliminarAsync(detalleReExistente);
                await repo.GuardarCambiosAsync();
                return Results.NoContent();
            }).RequireAuthorization(policy => policy.RequireRole("Administrador", "Veterinario"));
        }

        // DTO estructurado con el prefijo 'property:' para la correcta validación por reflexión
        public record DetalleRecetaCreateDto(
            [property: Required(ErrorMessage = "El ID de la receta es obligatorio.")]
            [property: Range(1, int.MaxValue, ErrorMessage = "El ID de la receta debe ser un número entero positivo.")]
            int RecetaId,

            [property: Required(ErrorMessage = "El ID del insumo es obligatorio.")]
            [property: Range(1, int.MaxValue, ErrorMessage = "El ID del insumo debe ser un número entero positivo.")]
            int InsumoId,

            [property: Required(ErrorMessage = "La dosis es obligatoria.")]
            [property: StringLength(100, ErrorMessage = "La dosis no puede superar los 100 caracteres.")]
            string Dosis,

            [property: Required(ErrorMessage = "La duración en días es obligatoria.")]
            [property: Range(1, 365, ErrorMessage = "La duración debe estar entre 1 y 365 días.")]
            int DuracionDias
        );
    }
}