using System.ComponentModel.DataAnnotations;
using Microsoft.EntityFrameworkCore;
using VeterinariaAPI.Extensions;
using VeterinariaAPI.Models;
using VeterinariaAPI.Repositories;
using VeterinariaAPI.Services;

namespace VeterinariaAPI.Endpoints
{
    public static class DetalleFacturasAPI
    {
        public static void MapDetalleFacApi(this WebApplication app)
        {
            var detallefac = app.MapGroup("/api/v1/detallefac").WithTags("DetalleFactura (v1)").AddEndpointFilter<BusinessValidationFilter>();

            // API para listar detalle factura con filtros
            detallefac.MapGet("/", async (
                int? facturaId,
                int? consultaId,
                int? insumoId,
                IRepository<DetallesFactura> repo) =>
            {
                var query = repo.Query().AsNoTracking();

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

            detallefac.MapPost("/", async (DetalleFacturaCreateDto dto, VeterinariodbContext db) =>
            {
                var errors = dto.Validar();
                if (errors.Count > 0) return Results.ValidationProblem(errors);
                await using var tx = db.Database.IsRelational() ? await db.Database.BeginTransactionAsync() : null;
                decimal price = dto.Subtotal;
                if (dto.InsumoId.HasValue) {
                    var supply = await db.Insumos.FindAsync(dto.InsumoId.Value);
                    if (supply == null) return Results.BadRequest(new { message = "El insumo ya no existe." });
                    if (supply.StockActual < dto.Cantidad) return Results.BadRequest(new { message = "Stock insuficiente para agregar el insumo." });
                    price = supply.PrecioUnitario;
                    supply.StockActual -= dto.Cantidad;
                } else if (dto.Cantidad != 1) return Results.BadRequest(new { message = "Una atención debe tener cantidad 1." });
                var line = new DetallesFactura { FacturaId = dto.FacturaId, ConsultaId = dto.ConsultaId, InsumoId = dto.InsumoId,
                    Cantidad = dto.Cantidad, PrecioUnitario = price, Subtotal = price * dto.Cantidad };
                db.DetallesFacturas.Add(line);
                await db.SaveChangesAsync();
                await BillingConsistency.Recalculate(db, dto.FacturaId);
                if (tx != null) await tx.CommitAsync();
                return Results.Created($"/api/v1/detallefac/{line.Id}", line);
            }).RequireAuthorization(p => p.RequireRole("Administrador"));

            detallefac.MapPut("/{id:int}", async (int id, DetalleFacturaCreateDto dto, VeterinariodbContext db) =>
            {
                var errors = dto.Validar();
                if (errors.Count > 0) return Results.ValidationProblem(errors);
                await using var tx = db.Database.IsRelational() ? await db.Database.BeginTransactionAsync() : null;
                var line = await db.DetallesFacturas.FindAsync(id);
                if (line == null) return Results.NotFound();
                if (line.FacturaId != dto.FacturaId || line.InsumoId != dto.InsumoId)
                    return Results.BadRequest(new { message = "No puede mover una línea a otra factura ni cambiar su insumo." });
                decimal price = dto.Subtotal;
                if (line.InsumoId.HasValue) {
                    var oldQuantity = BillingConsistency.Quantity(line);
                    price = BillingConsistency.Price(line);
                    var supply = await db.Insumos.FindAsync(line.InsumoId.Value);
                    if (supply == null) return Results.BadRequest(new { message = "El insumo ya no existe." });
                    var difference = dto.Cantidad - oldQuantity;
                    if (supply.StockActual < difference) return Results.BadRequest(new { message = "Stock insuficiente para actualizar la cantidad." });
                    supply.StockActual -= difference;
                } else if (dto.Cantidad != 1) return Results.BadRequest(new { message = "Una atención debe tener cantidad 1." });
                line.ConsultaId = dto.ConsultaId; line.Cantidad = dto.Cantidad;
                line.PrecioUnitario = price; line.Subtotal = price * dto.Cantidad;
                await db.SaveChangesAsync();
                await BillingConsistency.Recalculate(db, line.FacturaId);
                if (tx != null) await tx.CommitAsync();
                return Results.Ok(line);
            }).RequireAuthorization(p => p.RequireRole("Administrador"));

            detallefac.MapDelete("/{id:int}", async (int id, VeterinariodbContext db) =>
            {
                await using var tx = db.Database.IsRelational() ? await db.Database.BeginTransactionAsync() : null;
                var line = await db.DetallesFacturas.FindAsync(id);
                if (line == null) return Results.NotFound();
                if (line.InsumoId.HasValue) {
                    var quantity = BillingConsistency.Quantity(line);
                    var supply = await db.Insumos.FindAsync(line.InsumoId.Value);
                    if (supply == null) throw new BillingDataException("El insumo asociado ya no está disponible.");
                    supply.StockActual = checked(supply.StockActual + quantity);
                }
                var invoiceId = line.FacturaId;
                db.DetallesFacturas.Remove(line);
                await db.SaveChangesAsync();
                await BillingConsistency.Recalculate(db, invoiceId);
                if (tx != null) await tx.CommitAsync();
                return Results.NoContent();
            }).RequireAuthorization(p => p.RequireRole("Administrador"));
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
            decimal Subtotal,
            [property: Range(1, 1000000, ErrorMessage = "La cantidad debe estar entre 1 y 1.000.000.")] int Cantidad = 1
        );
    }
}
