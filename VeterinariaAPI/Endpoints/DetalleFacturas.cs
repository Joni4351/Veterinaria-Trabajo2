using System.ComponentModel.DataAnnotations;
using Microsoft.EntityFrameworkCore;
using VeterinariaAPI.Extensions;
using VeterinariaAPI.Models;
using VeterinariaAPI.Repositories;

namespace VeterinariaAPI.Endpoints
{
    public static class DetalleFacturasAPI
    {
        public static void MapDetalleFacApi(this WebApplication app)
        {
            var detallefac = app.MapGroup("/api/v1/detallefac").WithTags("DetalleFactura (v1)");

            // API para listar detalle factura con filtros
            detallefac.MapGet("/", async (
                int? facturaId,
                int? consultaId,
                int? insumoId,
                IRepository<DetallesFactura> repo) =>
            {
                var query = repo.Query();

                if (facturaId.HasValue)
                {
                    query = query.Where(d => d.FacturaId == facturaId.Value);
                }

                if (consultaId.HasValue)
                {
                    query = query.Where(d => d.ConsultaId == consultaId.Value);
                }

                if (insumoId.HasValue)
                {
                    query = query.Where(d => d.InsumoId == insumoId.Value);
                }

                var listaDetalleFac = await query.ToListAsync();
                return Results.Ok(listaDetalleFac);
            }).RequireAuthorization(policy => policy.RequireRole("Administrador", "Veterinario", "Recepcionista"));

            // API para crear un detalle de factura con sincronización de inventario y recálculo tributario
            detallefac.MapPost("/", async (DetalleFacturaCreateDto dto, IRepository<DetallesFactura> repo, VeterinariodbContext db) =>
            {
                var errores = dto.Validar();
                if (errores.Count > 0)
                {
                    return Results.ValidationProblem(errores);
                }

                if (dto.InsumoId.HasValue)
                {
                    var insumo = await db.Insumos.FindAsync(dto.InsumoId.Value);
                    if (insumo != null)
                    {
                        if (insumo.StockActual < 1)
                        {
                            return Results.BadRequest(new { message = $"Stock insuficiente para '{insumo.NombreProducto}'. Stock disponible: {insumo.StockActual}." });
                        }
                        insumo.StockActual -= 1;
                    }
                }

                var nuevoDetalle = new DetallesFactura
                {
                    FacturaId = dto.FacturaId,
                    ConsultaId = dto.ConsultaId,
                    InsumoId = dto.InsumoId,
                    Subtotal = dto.Subtotal
                };

                await repo.CrearAsync(nuevoDetalle);
                await repo.GuardarCambiosAsync();

                // Recalcular Subtotal neto, IVA (19%) y Total en la factura padre
                var fac = await db.Facturas.FindAsync(dto.FacturaId);
                if (fac != null)
                {
                    var subtotales = await db.DetallesFacturas.Where(d => d.FacturaId == dto.FacturaId).Select(d => d.Subtotal).ToListAsync();
                    decimal subtotalNeto = subtotales.Sum();
                    fac.MontoImpuestos = Math.Round(subtotalNeto * 0.19m, 0, MidpointRounding.AwayFromZero);
                    fac.MontoTotal = subtotalNeto + fac.MontoImpuestos;
                    await db.SaveChangesAsync();
                }

                return Results.Created($"/api/v1/detallefac/{nuevoDetalle.Id}", nuevoDetalle);
            }).RequireAuthorization(policy => policy.RequireRole("Administrador", "Veterinario"));

            // API para editar detalle factura por ID
            detallefac.MapPut("/{id:int}", async (int id, DetalleFacturaCreateDto dto, IRepository<DetallesFactura> repo, VeterinariodbContext db) =>
            {
                var errores = dto.Validar();
                if (errores.Count > 0)
                {
                    return Results.ValidationProblem(errores);
                }

                var detallefacExistente = await repo.ObtenerPorIdAsync(id);
                if (detallefacExistente is null) return Results.NotFound();

                detallefacExistente.FacturaId = dto.FacturaId;
                detallefacExistente.ConsultaId = dto.ConsultaId;
                detallefacExistente.InsumoId = dto.InsumoId;
                detallefacExistente.Subtotal = dto.Subtotal;

                await repo.GuardarCambiosAsync();

                var fac = await db.Facturas.FindAsync(detallefacExistente.FacturaId);
                if (fac != null)
                {
                    var subtotales = await db.DetallesFacturas.Where(d => d.FacturaId == detallefacExistente.FacturaId).Select(d => d.Subtotal).ToListAsync();
                    decimal subtotalNeto = subtotales.Sum();
                    fac.MontoImpuestos = Math.Round(subtotalNeto * 0.19m, 0, MidpointRounding.AwayFromZero);
                    fac.MontoTotal = subtotalNeto + fac.MontoImpuestos;
                    await db.SaveChangesAsync();
                }

                return Results.Ok(detallefacExistente);
            }).RequireAuthorization(policy => policy.RequireRole("Administrador", "Veterinario"));

            // API para eliminar un detalle de factura con reposición de inventario
            detallefac.MapDelete("/{id:int}", async (int id, IRepository<DetallesFactura> repo, VeterinariodbContext db) =>
            {
                var detallefacExistente = await repo.ObtenerPorIdAsync(id);
                if (detallefacExistente is null) return Results.NotFound();

                if (detallefacExistente.InsumoId.HasValue)
                {
                    var insumo = await db.Insumos.FindAsync(detallefacExistente.InsumoId.Value);
                    if (insumo != null)
                    {
                        insumo.StockActual += 1; // Restitución automática al stock
                    }
                }

                int facturaId = detallefacExistente.FacturaId;
                await repo.EliminarAsync(detallefacExistente);
                await repo.GuardarCambiosAsync();

                var fac = await db.Facturas.FindAsync(facturaId);
                if (fac != null)
                {
                    var subtotales = await db.DetallesFacturas.Where(d => d.FacturaId == facturaId).Select(d => d.Subtotal).ToListAsync();
                    decimal subtotalNeto = subtotales.Sum();
                    fac.MontoImpuestos = Math.Round(subtotalNeto * 0.19m, 0, MidpointRounding.AwayFromZero);
                    fac.MontoTotal = subtotalNeto + fac.MontoImpuestos;
                    await db.SaveChangesAsync();
                }

                return Results.NoContent();
            }).RequireAuthorization(policy => policy.RequireRole("Administrador", "Veterinario"));
        }

        // DTO estructurado con el prefijo 'property:' para la correcta validación por reflexión
        public record DetalleFacturaCreateDto(
            [property: Required(ErrorMessage = "El ID de la factura es obligatorio.")]
            [property: Range(1, int.MaxValue, ErrorMessage = "El ID de la factura debe ser un número entero positivo.")]
            int FacturaId,

            int? ConsultaId,

            int? InsumoId,

            [property: Required(ErrorMessage = "El subtotal es obligatorio.")]
            [property: Range(0.01, 10000000.0, ErrorMessage = "El subtotal debe ser mayor a 0.")]
            decimal Subtotal
        );
    }
}
