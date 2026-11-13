using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using VeterinariaAPI.Models;

namespace VeterinariaAPI.Tests;

public class DashboardAnalyticsTests
{
    [Fact]
    public async Task AggregatesRespectInclusiveDatesAndScopedFiltersAndReflectChanges()
    {
        using var factory = new FacialFactory(); using var client = factory.Client();
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<VeterinariodbContext>();
        db.Especialidades.Add(new Especialidade { Id = 5001, Nombre = "Servicio analítico", CostoBase = 100 });
        db.Citas.AddRange(
            new Cita { Id = 5001, PacienteId = 1, UsuarioId = 2, EspecialidadId = 5001, Estado = "Pendiente", FechaHora = new DateTime(2035,1,1,0,0,0) },
            new Cita { Id = 5002, PacienteId = 1, UsuarioId = 2, EspecialidadId = 5001, Estado = "Cancelada", FechaHora = new DateTime(2035,1,2,23,59,59) },
            new Cita { Id = 5003, PacienteId = 1, UsuarioId = 2, EspecialidadId = 5001, Estado = "Completada", FechaHora = new DateTime(2035,1,3,0,0,0) });
        db.Facturas.AddRange(
            new Factura { ClienteId = 1, FechaEmision = new DateOnly(2035,1,1), MontoTotal = 119, MontoImpuestos = 19 },
            new Factura { ClienteId = 1, FechaEmision = new DateOnly(2035,1,2), MontoTotal = 238, MontoImpuestos = 38 },
            new Factura { ClienteId = 1, FechaEmision = new DateOnly(2035,1,3), MontoTotal = 999 });
        var supply = new Insumo { NombreProducto = "Existencia analítica", Tipo = "Categoría analítica", PrecioUnitario = 1, StockActual = 4 };
        db.Insumos.AddRange(supply, new Insumo { NombreProducto = "Agotado analítico", Tipo = "Categoría analítica", PrecioUnitario = 1, StockActual = 0 });
        await db.SaveChangesAsync();
        const string query = "/api/v1/dashboard/analitica?fechaDesde=2035-01-01&fechaHasta=2035-01-02&especialidadId=5001&veterinarioId=2&tipoInsumo=Categor%C3%ADa%20anal%C3%ADtica";
        var response = await client.GetAsync(query);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.True(response.Headers.CacheControl!.NoStore);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        var stats = json.GetProperty("indicadores");
        Assert.Equal(357, stats.GetProperty("totalFacturado").GetDecimal());
        Assert.Equal(178.5m, stats.GetProperty("promedioPorFactura").GetDecimal());
        Assert.Equal(50m, stats.GetProperty("porcentajeInsumosAgotados").GetDecimal());
        Assert.Equal(300, stats.GetProperty("netoFacturado").GetDecimal());
        Assert.Equal(2, stats.GetProperty("citas").GetInt32());
        Assert.Equal(50, stats.GetProperty("porcentajeCancelacion").GetDecimal());
        Assert.Equal(1, stats.GetProperty("agotados").GetInt32());
        Assert.Equal(1, stats.GetProperty("bajoStock").GetInt32());
        Assert.Equal(2, json.GetProperty("facturacion").GetArrayLength());
        Assert.Equal(2, Assert.Single(json.GetProperty("especialidades").EnumerateArray()).GetProperty("cantidad").GetInt32());
        var filtered = await client.GetFromJsonAsync<JsonElement>(query + "&estado=Cancelada&agrupacion=mes&stock=agotado");
        Assert.Equal(1, filtered.GetProperty("indicadores").GetProperty("citas").GetInt32());
        Assert.Equal(357, filtered.GetProperty("indicadores").GetProperty("totalFacturado").GetDecimal());
        Assert.Equal(178.5m, filtered.GetProperty("indicadores").GetProperty("promedioPorFactura").GetDecimal());
        Assert.Equal(50m, filtered.GetProperty("indicadores").GetProperty("porcentajeInsumosAgotados").GetDecimal());
        Assert.Equal(100m, Assert.Single(filtered.GetProperty("especialidades").EnumerateArray()).GetProperty("porcentaje").GetDecimal());
        Assert.Single(filtered.GetProperty("inventario").EnumerateArray());
        Assert.Single(filtered.GetProperty("facturacion").EnumerateArray());
        Assert.DoesNotContain("password", json.ToString(), StringComparison.OrdinalIgnoreCase);
        supply.StockActual = 0; await db.SaveChangesAsync();
        var refreshed = await client.GetFromJsonAsync<JsonElement>(query);
        Assert.Equal(2, refreshed.GetProperty("indicadores").GetProperty("agotados").GetInt32());
        Assert.Equal(100m, refreshed.GetProperty("indicadores").GetProperty("porcentajeInsumosAgotados").GetDecimal());
    }

    [Fact]
    public async Task IndicatorsWithoutDenominatorsAreNullRatherThanZero()
    {
        using var factory = new FacialFactory(); using var client = factory.Client();
        var json = await client.GetFromJsonAsync<JsonElement>("/api/v1/dashboard/analitica?fechaDesde=2090-01-01&fechaHasta=2090-01-02&tipoInsumo=CategoriaInexistente");
        var stats = json.GetProperty("indicadores");
        foreach (var name in new[] { "promedioPorFactura", "porcentajeInsumosAgotados", "porcentajeCancelacion" })
            Assert.Equal(JsonValueKind.Null, stats.GetProperty(name).ValueKind);
        Assert.Equal(0, stats.GetProperty("totalFacturado").GetDecimal());
        Assert.Empty(json.GetProperty("especialidades").EnumerateArray());
    }

    [Theory]
    [InlineData("fechaDesde=2035-02-01&fechaHasta=2035-01-01")]
    [InlineData("fechaDesde=2030-01-01&fechaHasta=2035-01-01")]
    [InlineData("agrupacion=invalida")]
    [InlineData("stock=invalido")]
    [InlineData("estado=invalido")]
    [InlineData("especialidadId=0")]
    public async Task InvalidFiltersAreRejected(string query)
    {
        using var factory = new FacialFactory(); using var client = factory.Client();
        Assert.Equal(HttpStatusCode.BadRequest, (await client.GetAsync("/api/v1/dashboard/analitica?" + query)).StatusCode);
    }

    [Theory]
    [InlineData(null, 401)]
    [InlineData("Administrador", 200)]
    [InlineData("Veterinario", 403)]
    [InlineData("Recepcionista", 403)]
    public async Task AccessIsProtectedAndBounded(string? role, int status)
    {
        using var factory = new FacialFactory(); using var client = factory.Client(role);
        var response = await client.GetAsync("/api/v1/dashboard/analitica");
        Assert.Equal(status, (int)response.StatusCode);
        if (status != 200) return;
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(30, json.GetProperty("facturacion").GetArrayLength());
        Assert.True(json.GetProperty("inventario").GetArrayLength() <= 12);
        Assert.True(json.GetProperty("proximasCitas").GetArrayLength() <= 5);
    }
}
