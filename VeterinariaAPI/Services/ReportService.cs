using Microsoft.EntityFrameworkCore;
using VeterinariaAPI.Models;

namespace VeterinariaAPI.Services;

public record ReportFilter(DateOnly Desde, DateOnly Hasta, string? Estado, int? EspecialidadId, int? ClienteId);
public record ReportColumn(string Title, string Kind = "text");
public record ReportDocument(string Tipo, string Titulo, DateTimeOffset Emitido, string Filtros,
    ReportColumn[] Columnas, List<object?[]> Filas, Dictionary<int, decimal> Totales, List<ReportBar> Grafico);
public record ReportBar(string Etiqueta, decimal Valor);

// Report queries remain separate from HTTP handling and file-format strategies.
public class ReportService(VeterinariodbContext db)
{
    public const int MaximumRows = 5000;
    public async Task<ReportDocument> Build(string tipo, ReportFilter f, CancellationToken ct)
    {
        var filters = $"Desde {f.Desde:yyyy-MM-dd}; hasta {f.Hasta:yyyy-MM-dd}; estado {f.Estado ?? "todos"}; especialidad {f.EspecialidadId?.ToString() ?? "todas"}; cliente {f.ClienteId?.ToString() ?? "todos"}";
        var columns = Array.Empty<ReportColumn>();
        var rows = new List<object?[]>();
        var totals = new Dictionary<int, decimal>();
        var bars = new List<ReportBar>();
        string title;
        if (tipo == "gerencial")
        {
            var invoices = db.Facturas.AsNoTracking().Where(x => x.FechaEmision >= f.Desde && x.FechaEmision <= f.Hasta);
            if (f.ClienteId.HasValue) invoices = invoices.Where(x => x.ClienteId == f.ClienteId);
            var groups = await invoices.GroupBy(x => new { x.FechaEmision.Year, x.FechaEmision.Month })
                .Select(g => new { g.Key.Year, g.Key.Month, Cantidad = g.Count(), Total = g.Sum(x => x.MontoTotal), Iva = g.Sum(x => x.MontoImpuestos) })
                .OrderBy(x => x.Year).ThenBy(x => x.Month).ToListAsync(ct);
            title = "Resumen gerencial de facturación";
            columns = [new("Mes"), new("Facturas", "integer"), new("Total facturado", "decimal"), new("Impuestos", "decimal")];
            rows = groups.Select(x => new object?[] { $"{x.Year:D4}-{x.Month:D2}", x.Cantidad, x.Total, x.Iva }).ToList();
            totals = new() { [1] = groups.Sum(x => x.Cantidad), [2] = groups.Sum(x => x.Total), [3] = groups.Sum(x => x.Iva) };
            bars = groups.Select(x => new ReportBar($"{x.Year:D4}-{x.Month:D2}", x.Total)).ToList();
            filters = $"Desde {f.Desde:yyyy-MM-dd}; hasta {f.Hasta:yyyy-MM-dd}; cliente {f.ClienteId?.ToString() ?? "todos"}. Montos emitidos con impuestos, no cobros.";
        }
        else
        {
            var start = f.Desde.ToDateTime(TimeOnly.MinValue); var end = f.Hasta.AddDays(1).ToDateTime(TimeOnly.MinValue);
            var query = db.Citas.AsNoTracking().Where(x => x.FechaHora >= start && x.FechaHora < end);
            if (f.Estado != null) query = query.Where(x => x.Estado == f.Estado);
            if (f.EspecialidadId.HasValue) query = query.Where(x => x.EspecialidadId == f.EspecialidadId);
            if (f.ClienteId.HasValue) query = query.Where(x => x.Paciente.ClienteId == f.ClienteId);
            if (tipo == "operativo") query = query.Where(x => x.Estado != "Cancelada");
            var data = await query.OrderBy(x => x.FechaHora).ThenBy(x => x.Id).Take(MaximumRows + 1)
                .Select(x => new { x.Id, x.FechaHora, Paciente = x.Paciente.Nombre, Cliente = x.Paciente.Cliente.NombreCompleto, Especialidad = x.Especialidad.Nombre, x.Estado }).ToListAsync(ct);
            if (data.Count > MaximumRows) throw new ReportLimitException();
            title = tipo == "operativo" ? "Agenda operativa de atenciones" : "Historial de citas por período";
            columns = [new("ID", "integer"), new("Fecha y hora", "date"), new("Paciente"), new("Cliente"), new("Especialidad"), new("Estado")];
            rows = data.Select(x => new object?[] { x.Id, x.FechaHora, x.Paciente, x.Cliente, x.Especialidad, x.Estado }).ToList();
            if (tipo == "operativo") filters += "; excluye citas canceladas";
        }
        return new(tipo, title, DateTimeOffset.UtcNow, filters, columns, rows, totals, bars);
    }
}
public class ReportLimitException : Exception;
