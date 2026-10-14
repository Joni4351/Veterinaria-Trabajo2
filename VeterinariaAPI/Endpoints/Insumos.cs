using System.ComponentModel.DataAnnotations;
using Microsoft.EntityFrameworkCore;
using VeterinariaAPI.Extensions;
using VeterinariaAPI.Models;
using VeterinariaAPI.Repositories;

namespace VeterinariaAPI.Endpoints
{
    public static class InsumosApi
    {
        public static void MapInsumosApi(this WebApplication app)
        {
            var insumos = app.MapGroup("/api/v1/insumos").WithTags("Insumos (v1)");

            // API para listar insumos con filtros
            insumos.MapGet("/", async (
                string? nombre,
                string? tipo,
                int? stockMinimo,
                int? stockMaximo,
                decimal? precioMin,
                decimal? precioMax,
                IRepository<Insumo> repo) =>
            {
                var query = repo.Query();

                if (!string.IsNullOrWhiteSpace(nombre))
                {
                    query = query.Where(i => i.NombreProducto.Contains(nombre));
                }

                if (!string.IsNullOrWhiteSpace(tipo))
                {
                    query = query.Where(i => i.Tipo.Contains(tipo));
                }

                if (stockMinimo.HasValue)
                {
                    query = query.Where(i => i.StockActual >= stockMinimo.Value);
                }

                if (stockMaximo.HasValue)
                {
                    query = query.Where(i => i.StockActual <= stockMaximo.Value);
                }

                if (precioMin.HasValue)
                {
                    query = query.Where(i => i.PrecioUnitario >= precioMin.Value);
                }

                if (precioMax.HasValue)
                {
                    query = query.Where(i => i.PrecioUnitario <= precioMax.Value);
                }

                var listaInsumos = await query.ToListAsync();
                return Results.Ok(listaInsumos);
            }).RequireAuthorization(policy => policy.RequireRole("Administrador", "Veterinario", "Recepcionista"));

            // API para crear un insumo
            insumos.MapPost("/", async (InsumoCreateDto dto, IRepository<Insumo> repo) =>
            {
                var errores = dto.Validar();
                if (errores.Count > 0)
                {
                    return Results.ValidationProblem(errores);
                }

                var nuevoInsumo = new Insumo
                {
                    NombreProducto = dto.NombreProducto,
                    Tipo = dto.Tipo,
                    StockActual = dto.StockActual,
                    PrecioUnitario = dto.PrecioUnitario
                };

                await repo.CrearAsync(nuevoInsumo);
                await repo.GuardarCambiosAsync();

                return Results.Created($"/api/v1/insumos/{nuevoInsumo.Id}", nuevoInsumo);
            }).RequireAuthorization(policy => policy.RequireRole("Administrador", "Veterinario"));

            // API para editar insumo por ID
            insumos.MapPut("/{id:int}", async (int id, InsumoCreateDto dto, IRepository<Insumo> repo) =>
            {
                var errores = dto.Validar();
                if (errores.Count > 0)
                {
                    return Results.ValidationProblem(errores);
                }

                var insumoExistente = await repo.ObtenerPorIdAsync(id);
                if (insumoExistente is null) return Results.NotFound();

                insumoExistente.NombreProducto = dto.NombreProducto;
                insumoExistente.Tipo = dto.Tipo;
                insumoExistente.StockActual = dto.StockActual;
                insumoExistente.PrecioUnitario = dto.PrecioUnitario;

                await repo.GuardarCambiosAsync();
                return Results.Ok(insumoExistente);
            }).RequireAuthorization(policy => policy.RequireRole("Administrador", "Veterinario"));

            // API para eliminar insumos
            insumos.MapDelete("/{id:int}", async (int id, IRepository<Insumo> repo) =>
            {
                var insumoExistente = await repo.ObtenerPorIdAsync(id);
                if (insumoExistente is null) return Results.NotFound();

                await repo.EliminarAsync(insumoExistente);
                await repo.GuardarCambiosAsync();
                return Results.NoContent();
            }).RequireAuthorization(policy => policy.RequireRole("Administrador", "Veterinario"));
        }

        // DTO estructurado con el prefijo 'property:' para la correcta validación por reflexión
        public record InsumoCreateDto(
            [property: Required(ErrorMessage = "El nombre del producto es obligatorio.")]
            [property: StringLength(100, MinimumLength = 2, ErrorMessage = "El nombre del producto debe tener entre 2 y 100 caracteres.")]
            string NombreProducto,

            [property: Required(ErrorMessage = "El tipo de insumo es obligatorio.")]
            [property: StringLength(50, ErrorMessage = "El tipo de insumo no puede superar los 50 caracteres.")]
            string Tipo,

            [property: Required(ErrorMessage = "El stock actual es obligatorio.")]
            [property: Range(0, int.MaxValue, ErrorMessage = "El stock actual debe ser un número entero mayor o igual a 0.")]
            int StockActual,

            [property: Required(ErrorMessage = "El precio unitario es obligatorio.")]
            [property: Range(0.01, 10000000.0, ErrorMessage = "El precio unitario debe ser mayor a 0.")]
            decimal PrecioUnitario
        );
    }
}