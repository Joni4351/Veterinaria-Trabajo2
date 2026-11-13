using Microsoft.EntityFrameworkCore;
using VeterinariaAPI.Models;

namespace VeterinariaAPI.Endpoints;

public static class DashboardAnalyticsApi
{
    public static void MapDashboardAnalyticsApi(this WebApplication app)
    {
        app.MapGet("/api/v1/dashboard/analitica", async (VeterinariodbContext db, HttpContext http,
            DateOnly? fechaDesde, DateOnly? fechaHasta, string? agrupacion, int? especialidadId,
            int? veterinarioId, string? estado, string? tipoInsumo, string? stock, CancellationToken ct) =>
        {
            var now = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, TimeZoneInfo.FindSystemTimeZoneById("America/Santiago"));
            var today = DateOnly.FromDateTime(now);
            var from = fechaDesde ?? today.AddDays(-29);
            var to = fechaHasta ?? today;
            var group = agrupacion ?? "dia";
            var stockFilter = stock ?? "todos";
            var states = new[] { "Pendiente", "Confirmada", "En Curso", "Completada", "Atendida", "Cancelada" };
            var errors = new Dictionary<string, string[]>();
            if (from > to || to.DayNumber - from.DayNumber > 365 || to == DateOnly.MaxValue)
                errors["fechaHasta"] = ["Seleccione un rango ordenado de hasta 366 días."];
            if (group is not ("dia" or "semana" or "mes")) errors["agrupacion"] = ["Agrupación no válida."];
            if (stockFilter is not ("todos" or "bajo" or "agotado")) errors["stock"] = ["Filtro de stock no válido."];
            if (especialidadId <= 0 || veterinarioId <= 0) errors["categoria"] = ["Los identificadores deben ser positivos."];
            if (!string.IsNullOrEmpty(estado) && !states.Contains(estado)) errors["estado"] = ["Estado de cita no válido."];
            if (tipoInsumo?.Length > 50) errors["tipoInsumo"] = ["La categoría no puede superar 50 caracteres."];
            if (errors.Count > 0) return Results.ValidationProblem(errors);
            http.Response.Headers.CacheControl = "no-store";

            // Only aggregates and bounded previews leave the database. Never parallelize one DbContext.
            var start = from.ToDateTime(TimeOnly.MinValue);
            var end = to.AddDays(1).ToDateTime(TimeOnly.MinValue);
            var appointments = db.Citas.AsNoTracking().Where(x => x.FechaHora >= start && x.FechaHora < end);
            if (especialidadId.HasValue) appointments = appointments.Where(x => x.EspecialidadId == especialidadId);
            if (veterinarioId.HasValue) appointments = appointments.Where(x => x.UsuarioId == veterinarioId);
            if (!string.IsNullOrEmpty(estado)) appointments = appointments.Where(x => x.Estado == estado);
            var invoices = db.Facturas.AsNoTracking().Where(x => x.FechaEmision >= from && x.FechaEmision <= to);
            var supplies = db.Insumos.AsNoTracking().AsQueryable();
            if (!string.IsNullOrEmpty(tipoInsumo)) supplies = supplies.Where(x => x.Tipo == tipoInsumo);

            var finance = await invoices.GroupBy(x => 1).Select(g => new {
                Total = g.Sum(x => x.MontoTotal), Impuestos = g.Sum(x => x.MontoImpuestos), Cantidad = g.Count()
            }).SingleOrDefaultAsync(ct);
            var dailyInvoices = await invoices.GroupBy(x => x.FechaEmision)
                .Select(g => new { Fecha = g.Key, Total = g.Sum(x => x.MontoTotal), Cantidad = g.Count() }).ToListAsync(ct);
            var dailyAppointments = await appointments.GroupBy(x => new { Fecha = x.FechaHora.Date, x.Estado })
                .Select(g => new { g.Key.Fecha, g.Key.Estado, Cantidad = g.Count() }).ToListAsync(ct);
            var specialties = await appointments.GroupBy(x => new { Id = x.EspecialidadId, x.Especialidad.Nombre })
                .Select(g => new { g.Key.Id, g.Key.Nombre, Cantidad = g.Count() })
                .OrderByDescending(x => x.Cantidad).ThenBy(x => x.Id).ToListAsync(ct);
            var stockSummary = await supplies.GroupBy(x => 1).Select(g => new {
                Total = g.Count(), Agotados = g.Count(x => x.StockActual == 0), BajoStock = g.Count(x => x.StockActual > 0 && x.StockActual <= 10)
            }).SingleOrDefaultAsync(ct);
            var shownSupplies = stockFilter switch {
                "agotado" => supplies.Where(x => x.StockActual == 0),
                "bajo" => supplies.Where(x => x.StockActual <= 10),
                _ => supplies
            };
            var inventory = await shownSupplies.OrderBy(x => x.StockActual).ThenBy(x => x.Id).Take(12)
                .Select(x => new { x.Id, x.NombreProducto, x.Tipo, x.StockActual }).ToListAsync(ct);
            var upcoming = await appointments.Where(x => x.FechaHora >= now && x.Estado != "Cancelada" && x.Estado != "Completada" && x.Estado != "Atendida")
                .OrderBy(x => x.FechaHora).ThenBy(x => x.Id).Take(5)
                .Select(x => new { x.Id, x.FechaHora, x.Estado, Paciente = x.Paciente.Nombre }).ToListAsync(ct);
            var specialtyOptions = await db.Especialidades.AsNoTracking().OrderBy(x => x.Nombre).Select(x => new { x.Id, x.Nombre }).ToListAsync(ct);
            var vetOptions = await db.Usuarios.AsNoTracking().Where(x => x.Rol != null && x.Rol.Nombre == "Veterinario")
                .OrderBy(x => x.NombreCompleto).Select(x => new { x.Id, Nombre = x.NombreCompleto }).ToListAsync(ct);
            var types = await db.Insumos.AsNoTracking().Select(x => x.Tipo).Distinct().OrderBy(x => x).ToListAsync(ct);

            // At most 366 daily groups; only the bounded aggregates are bucketed in memory.
            var periods = new SortedSet<DateOnly>();
            for (var day = from; day <= to; day = day.AddDays(1)) periods.Add(Bucket(day, group));
            var invoiceBuckets = dailyInvoices.GroupBy(x => Bucket(x.Fecha, group))
                .ToDictionary(g => g.Key, g => new { Total = g.Sum(x => x.Total), Cantidad = g.Sum(x => x.Cantidad) });
            var appointmentBuckets = dailyAppointments.GroupBy(x => new { Fecha = Bucket(DateOnly.FromDateTime(x.Fecha), group), x.Estado })
                .ToDictionary(g => (g.Key.Fecha, g.Key.Estado), g => g.Sum(x => x.Cantidad));
            var count = dailyAppointments.Sum(x => x.Cantidad);
            var cancelled = dailyAppointments.Where(x => x.Estado == "Cancelada").Sum(x => x.Cantidad);
            return Results.Ok(new {
                Periodo = new { Desde = from, Hasta = to, Agrupacion = group, ZonaHoraria = "America/Santiago" },
                Indicadores = new { TotalFacturado = finance?.Total ?? 0, Impuestos = finance?.Impuestos ?? 0,
                    PromedioPorFactura = finance is { Cantidad: > 0 } ? (decimal?)Math.Round(finance.Total / finance.Cantidad, 2) : null,
                    PorcentajeInsumosAgotados = stockSummary is { Total: > 0 } ? (decimal?)Math.Round(100m * stockSummary.Agotados / stockSummary.Total, 1) : null,
                    NetoFacturado = (finance?.Total ?? 0) - (finance?.Impuestos ?? 0), Facturas = finance?.Cantidad ?? 0,
                    Citas = count, Canceladas = cancelled, PorcentajeCancelacion = count == 0 ? (decimal?)null : Math.Round(100m * cancelled / count, 1),
                    Agotados = stockSummary?.Agotados ?? 0, BajoStock = stockSummary?.BajoStock ?? 0, Insumos = stockSummary?.Total ?? 0 },
                Facturacion = periods.Select(p => new { Periodo = p, Total = invoiceBuckets.TryGetValue(p, out var b) ? b.Total : 0,
                    Facturas = invoiceBuckets.TryGetValue(p, out var c) ? c.Cantidad : 0 }),
                CitasPorFecha = periods.Select(p => new { Periodo = p, Estados = states.Select(s => new { Estado = s,
                    Cantidad = appointmentBuckets.GetValueOrDefault((p, s)) }) }),
                Especialidades = specialties.Select(s => new { s.Id, s.Nombre, s.Cantidad, Porcentaje = count == 0 ? (decimal?)null : Math.Round(100m * s.Cantidad / count, 1) }), Inventario = inventory, ProximasCitas = upcoming,
                Opciones = new { Especialidades = specialtyOptions, Veterinarios = vetOptions, TiposInsumo = types }
            });
        }).WithTags("Dashboard").RequireAuthorization(p => p.RequireRole("Administrador"));
    }

    internal static DateOnly Bucket(DateOnly date, string group) => group switch {
        "mes" => new DateOnly(date.Year, date.Month, 1),
        "semana" => date.AddDays(-(((int)date.DayOfWeek + 6) % 7)),
        _ => date
    };
}
