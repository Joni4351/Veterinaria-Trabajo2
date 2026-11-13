using System.ComponentModel.DataAnnotations;
using Microsoft.EntityFrameworkCore;
using VeterinariaAPI.Extensions;
using VeterinariaAPI.Models;
using VeterinariaAPI.Repositories;
using VeterinariaAPI.Services;

namespace VeterinariaAPI.Endpoints
{
    public static class FacturasApi
    {
        public static void MapFacturasApi(this WebApplication app)
        {
            var facturas = app.MapGroup("/api/v1/facturas").WithTags("Facturas (v1)").AddEndpointFilter<BusinessValidationFilter>();

            // API para listar facturas con filtros
            facturas.MapGet("/", async (
                int? clienteId,
                DateOnly? fechaDesde,
                DateOnly? fechaHasta,
                decimal? montoMin,
                decimal? montoMax,
                IRepository<Factura> repo) =>
            {
                var query = repo.Query().AsNoTracking();

                if (clienteId.HasValue)
                {
                    query = query.Where(f => f.ClienteId == clienteId.Value);
                }

                if (fechaDesde.HasValue)
                {
                    query = query.Where(f => f.FechaEmision >= fechaDesde.Value);
                }

                if (fechaHasta.HasValue)
                {
                    query = query.Where(f => f.FechaEmision <= fechaHasta.Value);
                }

                if (montoMin.HasValue)
                {
                    query = query.Where(f => f.MontoTotal >= montoMin.Value);
                }

                if (montoMax.HasValue)
                {
                    query = query.Where(f => f.MontoTotal <= montoMax.Value);
                }

                var listaFacturas = await query.ToListAsync();
                return Results.Ok(listaFacturas);
            }).RequireAuthorization(policy => policy.RequireRole("Administrador", "Veterinario", "Recepcionista"));

            // API para crear una factura (con soporte transaccional para líneas de detalle y descuento automático de inventario)
            facturas.MapPost("/", async (FacturaCreateDto dto, IRepository<Factura> repo, VeterinariodbContext db) =>
            {
                var errores = dto.Validar();
                if (errores.Count > 0)
                {
                    return Results.ValidationProblem(errores);
                }

                // Si la factura incluye líneas de ítems (citas / insumos), procesamos con transacción atómica
                if (dto.Items != null && dto.Items.Count > 0)
                {
                    var isRelational = db.Database.IsRelational();
                    await using Microsoft.EntityFrameworkCore.Storage.IDbContextTransaction? transaction = isRelational
                        ? await db.Database.BeginTransactionAsync()
                        : null;

                    try
                    {
                        // 1. Validar que no haya más de una cita médica asociada a la factura
                        var citasItems = dto.Items.Where(i => i.Tipo == "cita").ToList();
                        if (citasItems.Count > 1)
                        {
                            return Results.BadRequest(new { message = "Solo se permite asociar una única cita médica por factura. Elimine la cita actual antes de seleccionar otra." });
                        }

                        // 2. Validar stock de insumos antes de cualquier descuento
                        var insumosAfectados = new List<(Insumo Insumo, int Cantidad, decimal Subtotal)>();
                        foreach (var item in dto.Items.Where(i => i.Tipo == "insumo" && i.InsumoId.HasValue))
                        {
                            if (item.Cantidad <= 0)
                            {
                                return Results.BadRequest(new { message = "La cantidad para cada insumo debe ser mayor a cero." });
                            }

                            var insumoDb = await db.Insumos.FindAsync(item.InsumoId!.Value);
                            if (insumoDb is null)
                            {
                                return Results.BadRequest(new { message = $"El insumo con ID {item.InsumoId} no existe en el catálogo." });
                            }

                            if (insumoDb.StockActual < item.Cantidad)
                            {
                                return Results.BadRequest(new {
                                    message = $"Stock insuficiente para '{insumoDb.NombreProducto}'. Stock disponible: {insumoDb.StockActual}, solicitado: {item.Cantidad}."
                                });
                            }

                            insumosAfectados.Add((insumoDb, item.Cantidad, item.Cantidad * insumoDb.PrecioUnitario));
                        }

                        // 3. Recalcular subtotal neto acumulado en backend para garantizar consistencia tributaria
                        decimal subtotalNetoCalculado = 0m;
                        foreach (var item in dto.Items)
                        {
                            if (item.Tipo == "insumo" && item.InsumoId.HasValue)
                            {
                                var itemInsumo = insumosAfectados.First(x => x.Insumo.Id == item.InsumoId.Value);
                                subtotalNetoCalculado += itemInsumo.Subtotal;
                            }
                            else if (item.Tipo == "cita")
                            {
                                if (item.CitaId.HasValue)
                                {
                                    var cita = await db.Citas.Include(c => c.Especialidad).FirstOrDefaultAsync(c => c.Id == item.CitaId.Value);
                                    subtotalNetoCalculado += (cita?.Especialidad != null ? cita.Especialidad.CostoBase : item.PrecioUnitario);
                                }
                                else if (item.EspecialidadId.HasValue)
                                {
                                    var esp = await db.Especialidades.FindAsync(item.EspecialidadId.Value);
                                    subtotalNetoCalculado += (esp != null ? esp.CostoBase : item.PrecioUnitario);
                                }
                                else
                                {
                                    subtotalNetoCalculado += item.Subtotal;
                                }
                            }
                            else
                            {
                                subtotalNetoCalculado += item.Subtotal;
                            }
                        }

                        // 4. Cálculo automático de IVA (19%) con precisión monetaria y redondeo chileno CLP
                        decimal ivaCalculado = Math.Round(subtotalNetoCalculado * 0.19m, 0, MidpointRounding.AwayFromZero);
                        decimal totalCalculado = subtotalNetoCalculado + ivaCalculado;
                        if (totalCalculado > 10000000m) throw new BillingDataException("El total no puede superar 10.000.000.");

                        // 5. Crear cabecera de la factura
                        var nuevaFactura = new Factura
                        {
                            ClienteId = dto.ClienteId,
                            FechaEmision = dto.FechaEmision,
                            MontoImpuestos = ivaCalculado,
                            MontoTotal = totalCalculado
                        };

                        await db.Facturas.AddAsync(nuevaFactura);
                        await db.SaveChangesAsync();

                        // 6. Registrar líneas de detalle y descontar stock
                        foreach (var item in dto.Items)
                        {
                            decimal subtotalLinea = item.Subtotal;
                            int? consultaId = item.ConsultaId;

                            if (item.Tipo == "insumo" && item.InsumoId.HasValue)
                            {
                                var itemInsumo = insumosAfectados.First(x => x.Insumo.Id == item.InsumoId.Value);
                                itemInsumo.Insumo.StockActual -= itemInsumo.Cantidad; // Descuento seguro de inventario
                                subtotalLinea = itemInsumo.Subtotal;
                            }
                            else if (item.Tipo == "cita")
                            {
                                if (item.CitaId.HasValue)
                                {
                                    var cita = await db.Citas.Include(c => c.Especialidad).FirstOrDefaultAsync(c => c.Id == item.CitaId.Value);
                                    if (cita?.Especialidad != null) subtotalLinea = cita.Especialidad.CostoBase;
                                    var consultaDb = await db.Consultas.FirstOrDefaultAsync(c => c.CitaId == item.CitaId.Value);
                                    if (consultaDb != null) consultaId = consultaDb.Id;
                                }
                                else if (item.EspecialidadId.HasValue)
                                {
                                    var esp = await db.Especialidades.FindAsync(item.EspecialidadId.Value);
                                    if (esp != null) subtotalLinea = esp.CostoBase;
                                }
                            }

                            var detalle = new DetallesFactura
                            {
                                FacturaId = nuevaFactura.Id,
                                ConsultaId = consultaId,
                                InsumoId = item.Tipo == "insumo" ? item.InsumoId : null,
                                Cantidad = item.Tipo == "insumo" ? item.Cantidad : 1,
                                PrecioUnitario = subtotalLinea / (item.Tipo == "insumo" ? item.Cantidad : 1),
                                Subtotal = subtotalLinea
                            };

                            await db.DetallesFacturas.AddAsync(detalle);
                        }

                        await db.SaveChangesAsync();

                        if (transaction != null)
                        {
                            await transaction.CommitAsync();
                        }

                        return Results.Created($"/api/v1/facturas/{nuevaFactura.Id}", nuevaFactura);
                    }
                    catch (Exception)
                    {
                        if (transaction != null)
                        {
                            await transaction.RollbackAsync();
                        }
                        throw;
                    }
                }
                else
                {
                    if (dto.MontoTotal <= 0)
                    {
                        return Results.BadRequest(new { message = "El monto total debe ser mayor a 0 cuando no se especifican ítems." });
                    }

                    // Flujo directo tradicional sin ítems embebidos
                    var nuevaFactura = new Factura
                    {
                        ClienteId = dto.ClienteId,
                        FechaEmision = dto.FechaEmision,
                        MontoImpuestos = dto.MontoImpuestos,
                        MontoTotal = dto.MontoTotal
                    };

                    await repo.CrearAsync(nuevaFactura);
                    await repo.GuardarCambiosAsync();

                    return Results.Created($"/api/v1/facturas/{nuevaFactura.Id}", nuevaFactura);
                }
            }).RequireAuthorization(policy => policy.RequireRole("Administrador", "Recepcionista"));

            // API para editar factura por ID con recalculación de IVA (19%) y sincronización de ítems/stock
            facturas.MapPut("/{id:int}", async (int id, FacturaCreateDto dto, IRepository<Factura> repo, VeterinariodbContext db) =>
            {
                var errores = dto.Validar();
                if (errores.Count > 0)
                {
                    return Results.ValidationProblem(errores);
                }

                var facturaExistente = await db.Facturas
                    .Include(f => f.DetallesFacturas)
                    .FirstOrDefaultAsync(f => f.Id == id);

                if (facturaExistente is null) return Results.NotFound();

                if (dto.Items != null && dto.Items.Count > 0)
                {
                    var citasItems = dto.Items.Where(i => i.Tipo == "cita").ToList();
                    if (citasItems.Count > 1)
                    {
                        return Results.BadRequest(new { message = "Solo se permite asociar una única cita médica por factura. Elimine la cita actual antes de seleccionar otra." });
                    }

                    var isRelational = db.Database.IsRelational();
                    await using Microsoft.EntityFrameworkCore.Storage.IDbContextTransaction? transaction = isRelational
                        ? await db.Database.BeginTransactionAsync()
                        : null;

                    try
                    {
                        // 1. Revertir temporalmente el stock de los insumos previamente descontados por esta factura
                        foreach (var detViejo in facturaExistente.DetallesFacturas.Where(d => d.InsumoId.HasValue))
                        {
                            var insumoViejo = await db.Insumos.FindAsync(detViejo.InsumoId!.Value);
                            if (insumoViejo != null)
                            {
                                int cantVieja = BillingConsistency.Quantity(detViejo);
                                insumoViejo.StockActual += cantVieja;
                            }
                        }

                        // 2. Validar stock disponible para los nuevos insumos
                        var insumosAfectados = new List<(Insumo Insumo, int Cantidad, decimal Subtotal)>();
                        foreach (var item in dto.Items.Where(i => i.Tipo == "insumo" && i.InsumoId.HasValue))
                        {
                            if (item.Cantidad <= 0)
                            {
                                return Results.BadRequest(new { message = "La cantidad para cada insumo debe ser mayor a cero." });
                            }

                            var insumoDb = await db.Insumos.FindAsync(item.InsumoId!.Value);
                            if (insumoDb is null)
                            {
                                return Results.BadRequest(new { message = $"El insumo con ID {item.InsumoId} no existe en el catálogo." });
                            }

                            if (insumoDb.StockActual < item.Cantidad)
                            {
                                return Results.BadRequest(new {
                                    message = $"Stock insuficiente para '{insumoDb.NombreProducto}'. Stock disponible: {insumoDb.StockActual}, solicitado: {item.Cantidad}."
                                });
                            }

                            var previousLine = facturaExistente.DetallesFacturas.FirstOrDefault(x => x.InsumoId == item.InsumoId);
                            var price = previousLine == null ? insumoDb.PrecioUnitario : BillingConsistency.Price(previousLine);
                            insumosAfectados.Add((insumoDb, item.Cantidad, item.Cantidad * price));
                        }

                        // 3. Recalcular subtotal neto, IVA (19%) y total para la factura editada
                        decimal subtotalNetoCalculado = 0m;
                        foreach (var item in dto.Items)
                        {
                            if (item.Tipo == "insumo" && item.InsumoId.HasValue)
                            {
                                var itemInsumo = insumosAfectados.First(x => x.Insumo.Id == item.InsumoId.Value);
                                subtotalNetoCalculado += itemInsumo.Subtotal;
                            }
                            else if (item.Tipo == "cita")
                            {
                                var previousService = facturaExistente.DetallesFacturas.FirstOrDefault(x => !x.InsumoId.HasValue && x.ConsultaId == item.ConsultaId);
                                if (previousService != null) { subtotalNetoCalculado += BillingConsistency.Price(previousService); continue; }
                                if (item.CitaId.HasValue)
                                {
                                    var cita = await db.Citas.Include(c => c.Especialidad).FirstOrDefaultAsync(c => c.Id == item.CitaId.Value);
                                    subtotalNetoCalculado += (cita?.Especialidad != null ? cita.Especialidad.CostoBase : item.PrecioUnitario);
                                }
                                else if (item.EspecialidadId.HasValue)
                                {
                                    var esp = await db.Especialidades.FindAsync(item.EspecialidadId.Value);
                                    subtotalNetoCalculado += (esp != null ? esp.CostoBase : item.PrecioUnitario);
                                }
                                else
                                {
                                    subtotalNetoCalculado += item.Subtotal;
                                }
                            }
                            else
                            {
                                subtotalNetoCalculado += item.Subtotal;
                            }
                        }

                        decimal ivaCalculado = Math.Round(subtotalNetoCalculado * 0.19m, 0, MidpointRounding.AwayFromZero);
                        decimal totalCalculado = subtotalNetoCalculado + ivaCalculado;
                        if (totalCalculado > 10000000m) throw new BillingDataException("El total no puede superar 10.000.000.");

                        // 4. Actualizar cabecera con montos reformulados
                        facturaExistente.ClienteId = dto.ClienteId;
                        facturaExistente.FechaEmision = dto.FechaEmision;
                        facturaExistente.MontoImpuestos = ivaCalculado;
                        facturaExistente.MontoTotal = totalCalculado;

                        // 5. Reemplazar detalles y aplicar descuentos definitivos
                        db.DetallesFacturas.RemoveRange(facturaExistente.DetallesFacturas);

                        foreach (var item in dto.Items)
                        {
                            decimal subtotalLinea = item.Subtotal;
                            int? consultaId = item.ConsultaId;

                            if (item.Tipo == "insumo" && item.InsumoId.HasValue)
                            {
                                var itemInsumo = insumosAfectados.First(x => x.Insumo.Id == item.InsumoId.Value);
                                itemInsumo.Insumo.StockActual -= itemInsumo.Cantidad;
                                subtotalLinea = itemInsumo.Subtotal;
                            }
                            else if (item.Tipo == "cita")
                            {
                                var previousService = facturaExistente.DetallesFacturas.FirstOrDefault(x => !x.InsumoId.HasValue && x.ConsultaId == item.ConsultaId);
                                if (previousService != null) subtotalLinea = BillingConsistency.Price(previousService);
                                else
                                if (item.CitaId.HasValue)
                                {
                                    var cita = await db.Citas.Include(c => c.Especialidad).FirstOrDefaultAsync(c => c.Id == item.CitaId.Value);
                                    if (cita?.Especialidad != null) subtotalLinea = cita.Especialidad.CostoBase;
                                    var consultaDb = await db.Consultas.FirstOrDefaultAsync(c => c.CitaId == item.CitaId.Value);
                                    if (consultaDb != null) consultaId = consultaDb.Id;
                                }
                                else if (item.EspecialidadId.HasValue)
                                {
                                    var esp = await db.Especialidades.FindAsync(item.EspecialidadId.Value);
                                    if (esp != null) subtotalLinea = esp.CostoBase;
                                }
                            }

                            var nuevoDetalle = new DetallesFactura
                            {
                                FacturaId = facturaExistente.Id,
                                ConsultaId = consultaId,
                                InsumoId = item.Tipo == "insumo" ? item.InsumoId : null,
                                Cantidad = item.Tipo == "insumo" ? item.Cantidad : 1,
                                PrecioUnitario = subtotalLinea / (item.Tipo == "insumo" ? item.Cantidad : 1),
                                Subtotal = subtotalLinea
                            };

                            await db.DetallesFacturas.AddAsync(nuevoDetalle);
                        }

                        await db.SaveChangesAsync();

                        if (transaction != null)
                        {
                            await transaction.CommitAsync();
                        }

                        return Results.Ok(facturaExistente);
                    }
                    catch (Exception)
                    {
                        if (transaction != null)
                        {
                            await transaction.RollbackAsync();
                        }
                        throw;
                    }
                }
                else
                {
                    if (facturaExistente.DetallesFacturas.Any()) return Results.BadRequest(new { message = "Actualice la factura con sus conceptos para mantener importes e inventario consistentes." });
                    facturaExistente.ClienteId = dto.ClienteId;
                    facturaExistente.FechaEmision = dto.FechaEmision;
                    facturaExistente.MontoImpuestos = dto.MontoImpuestos;
                    facturaExistente.MontoTotal = dto.MontoTotal;

                    await db.SaveChangesAsync();
                    return Results.Ok(facturaExistente);
                }
            }).RequireAuthorization(policy => policy.RequireRole("Administrador"));

            // API para eliminar Facturas
            facturas.MapDelete("/{id:int}", async (int id, IRepository<Factura> repo, VeterinariodbContext db) =>
            {
                var facturaExistente = await repo.ObtenerPorIdAsync(id);
                if (facturaExistente is null) return Results.NotFound();

                // Validación preventiva de dependencias (no permitir borrado si tiene líneas de detalle)
                var tieneDetalles = await db.DetallesFacturas.AnyAsync(d => d.FacturaId == id);
                if (tieneDetalles)
                {
                    return Results.BadRequest(new { message = "No es posible eliminar la factura porque tiene líneas de detalle asociadas. Elimine los detalles de la factura primero." });
                }

                await repo.EliminarAsync(facturaExistente);
                await repo.GuardarCambiosAsync();
                return Results.NoContent();
            }).RequireAuthorization(policy => policy.RequireRole("Administrador"));
        }

        // DTO estructurado con el prefijo 'property:' para la correcta validación por reflexión
        public record FacturaCreateDto(
            [property: Required(ErrorMessage = "El ID del cliente es obligatorio.")]
            [property: Range(1, int.MaxValue, ErrorMessage = "El ID del cliente debe ser un número entero positivo.")]
            int ClienteId,

            [property: Required(ErrorMessage = "La fecha de emisión es obligatoria.")]
            DateOnly FechaEmision,

            [property: Range(0.0, 10000000.0, ErrorMessage = "El monto de impuestos debe ser igual o mayor a 0.")]
            decimal MontoImpuestos,

            [property: Required(ErrorMessage = "El monto total es obligatorio.")]
            [property: Range(0.0, 10000000.0, ErrorMessage = "El monto total debe ser igual o mayor a 0.")]
            decimal MontoTotal,

            List<FacturaItemDto>? Items = null
        );

        public record FacturaItemDto(
            string Tipo,
            int? EspecialidadId = null,
            int? ConsultaId = null,
            int? InsumoId = null,
            int? CitaId = null,
            int Cantidad = 1,
            decimal PrecioUnitario = 0m,
            decimal Subtotal = 0m
        );
    }
}
