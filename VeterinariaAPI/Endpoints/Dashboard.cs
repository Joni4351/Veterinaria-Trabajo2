using Microsoft.EntityFrameworkCore;
using VeterinariaAPI.Models;

namespace VeterinariaAPI.Endpoints;

public static class DashboardApi
{
    internal static IQueryable<DashboardTotals> TotalsQuery(VeterinariodbContext db) => db.Database.SqlQuery<DashboardTotals>($"""
        SELECT
            (SELECT COUNT(*) FROM public."Pacientes")::int AS "Pacientes",
            (SELECT COUNT(*) FROM public."Clientes")::int AS "Clientes",
            (SELECT COUNT(*) FROM public."Citas")::int AS "Citas",
            (SELECT COUNT(*) FROM public."Facturas")::int AS "Facturas",
            (SELECT COUNT(*) FROM public."Insumos")::int AS "Insumos",
            (SELECT COUNT(*) FROM public."Consultas")::int AS "Consultas"
        """);

    public static void MapDashboardApi(this WebApplication app)
    {
        app.MapDashboardAnalyticsApi();
        app.MapGet("/api/v1/dashboard", async (VeterinariodbContext db, CancellationToken cancellationToken) =>
        {
            // PostgreSQL returns all six scalar counts in a single round trip.
            // The InMemory fallback keeps the integration fixtures isolated.
            var estadisticas = db.Database.IsNpgsql()
                ? await TotalsQuery(db).SingleAsync(cancellationToken)
                : new DashboardTotals
            {
                Pacientes = await db.Pacientes.CountAsync(cancellationToken),
                Clientes = await db.Clientes.CountAsync(cancellationToken),
                Citas = await db.Citas.CountAsync(cancellationToken),
                Facturas = await db.Facturas.CountAsync(cancellationToken),
                Insumos = await db.Insumos.CountAsync(cancellationToken),
                Consultas = await db.Consultas.CountAsync(cancellationToken)
            };
            // Preserve the previous first-five-by-ID display order.
            var citasRecientes = await db.Citas.AsNoTracking().OrderBy(x => x.Id).Take(5)
                .Select(x => new { x.Id, x.FechaHora, x.Estado,
                    Paciente = new { x.Paciente.Nombre,
                        Cliente = new { x.Paciente.Cliente.NombreCompleto, x.Paciente.Cliente.DocumentoIdentidad } } })
                .ToListAsync(cancellationToken);
            var insumosBajoStock = await db.Insumos.AsNoTracking().Where(x => x.StockActual <= 10).OrderBy(x => x.Id).Take(5)
                .Select(x => new { x.Id, x.NombreProducto, x.StockActual }).ToListAsync(cancellationToken);
            return Results.Ok(new { estadisticas, citasRecientes, insumosBajoStock });
        }).WithTags("Dashboard").RequireAuthorization(policy => policy.RequireRole("Administrador"));
    }

    public sealed class DashboardTotals
    {
        public int Pacientes { get; set; }
        public int Clientes { get; set; }
        public int Citas { get; set; }
        public int Facturas { get; set; }
        public int Insumos { get; set; }
        public int Consultas { get; set; }
    }
}
