using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using VeterinariaAPI.Endpoints;
using VeterinariaAPI.Models;

namespace VeterinariaAPI.Tests;

public class QueryOptimizationTests
{
    [Fact]
    public async Task DashboardReturnsExactCountsWithBoundedPreviewAndNoSecrets()
    {
        using var factory = new FacialFactory(); using var client = factory.Client();
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<VeterinariodbContext>();
        for (var i = 0; i < 12; i++)
            db.Insumos.Add(new Insumo { NombreProducto = $"Stock de prueba {i}", Tipo = "Ejemplo", StockActual = i, PrecioUnitario = 100 });
        await db.SaveChangesAsync();
        var response = await client.GetAsync("/api/v1/dashboard");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        var stats = json.GetProperty("estadisticas");
        Assert.Equal(await db.Pacientes.CountAsync(), stats.GetProperty("pacientes").GetInt32());
        Assert.Equal(await db.Clientes.CountAsync(), stats.GetProperty("clientes").GetInt32());
        Assert.Equal(await db.Citas.CountAsync(), stats.GetProperty("citas").GetInt32());
        Assert.Equal(await db.Facturas.CountAsync(), stats.GetProperty("facturas").GetInt32());
        Assert.Equal(await db.Insumos.CountAsync(), stats.GetProperty("insumos").GetInt32());
        Assert.Equal(await db.Consultas.CountAsync(), stats.GetProperty("consultas").GetInt32());
        var low = json.GetProperty("insumosBajoStock").EnumerateArray().ToArray();
        Assert.Equal(5, low.Length);
        Assert.All(low, item => Assert.True(item.GetProperty("stockActual").GetInt32() <= 10));
        Assert.Equal(await db.Insumos.Where(x => x.StockActual <= 10).OrderBy(x => x.Id).Take(5).Select(x => x.Id).ToArrayAsync(),
            low.Select(x => x.GetProperty("id").GetInt32()));
        Assert.True(json.GetProperty("citasRecientes").GetArrayLength() <= 5);
        Assert.DoesNotContain("passwordHash", json.ToString(), StringComparison.OrdinalIgnoreCase);
    }

    [Theory]
    [InlineData(null, 401)]
    [InlineData("Administrador", 200)]
    [InlineData("Recepcionista", 403)]
    [InlineData("Veterinario", 403)]
    public async Task DashboardPreservesAccessRules(string? role, int expected)
    {
        using var factory = new FacialFactory(); using var client = factory.Client(role);
        Assert.Equal(expected, (int)(await client.GetAsync("/api/v1/dashboard")).StatusCode);
    }

    [Fact]
    public void PostgreSqlDashboardUsesScalarAggregatesWithoutLoadingRows()
    {
        using var db = new VeterinariodbContext(new DbContextOptionsBuilder<VeterinariodbContext>()
            .UseNpgsql("Host=localhost;Database=unused;Username=test;Password=test").Options);
        var sql = DashboardApi.TotalsQuery(db).ToQueryString();
        Assert.Equal(6, sql.Split("COUNT(*)").Length - 1);
        foreach (var table in new[] { "Pacientes", "Clientes", "Citas", "Facturas", "Insumos", "Consultas" })
            Assert.Contains($"public.\"{table}\"", sql);
        Assert.Empty(db.ChangeTracker.Entries());
    }

    [Fact]
    public async Task ProjectedListsPreserveDisplayFieldsAndOmitPasswordHashes()
    {
        using var factory = new FacialFactory(); using var client = factory.Client();
        foreach (var endpoint in new[] { "usuarios", "citas" })
        {
            var response = await client.GetAsync($"/api/v1/{endpoint}");
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var json = await response.Content.ReadFromJsonAsync<JsonElement>();
            Assert.True(json.GetArrayLength() > 0);
            Assert.DoesNotContain("passwordHash", json.ToString(), StringComparison.OrdinalIgnoreCase);
            if (endpoint == "usuarios") Assert.True(json[0].TryGetProperty("rol", out _));
            else { Assert.True(json[0].GetProperty("paciente").TryGetProperty("cliente", out _)); Assert.True(json[0].GetProperty("usuario").TryGetProperty("nombreCompleto", out _)); }
        }
    }

    [Fact]
    public async Task SqlDuplicateChecksKeepRutAndEmailNormalization()
    {
        using var factory = new FacialFactory(); using var client = factory.Client();
        using var scope = factory.Services.CreateScope();
        var seed = await scope.ServiceProvider.GetRequiredService<VeterinariodbContext>().Clientes.FindAsync(1);
        var rut = await client.PostAsJsonAsync("/api/v1/clientes", new { documentoIdentidad = seed!.DocumentoIdentidad.Replace(".", ""), nombreCompleto = "Duplicado de prueba", telefono = "+56912345678", email = "unique@example.invalid" });
        Assert.Equal(HttpStatusCode.BadRequest, rut.StatusCode);
        Assert.Contains("DocumentoIdentidad", await rut.Content.ReadAsStringAsync());
        var email = await client.PostAsJsonAsync("/api/v1/clientes", new { documentoIdentidad = "22.222.222-2", nombreCompleto = "Duplicado de prueba", telefono = "+56912345678", email = "CLIENTE1@EXAMPLE.INVALID" });
        Assert.Equal(HttpStatusCode.BadRequest, email.StatusCode);
        Assert.Contains("Email", await email.Content.ReadAsStringAsync());
        Assert.Contains("ya se encuentra registrado", await email.Content.ReadAsStringAsync());
        var unchanged = await client.PutAsJsonAsync("/api/v1/clientes/1", new { documentoIdentidad = seed.DocumentoIdentidad, nombreCompleto = "Cliente sintético actualizado", telefono = "+56912345678", email = "cliente1@example.invalid" });
        Assert.Equal(HttpStatusCode.OK, unchanged.StatusCode);
    }
}
