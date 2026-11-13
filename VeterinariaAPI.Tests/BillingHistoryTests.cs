using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using VeterinariaAPI.Models;

namespace VeterinariaAPI.Tests;

public class BillingHistoryTests
{
    private static DateOnly Today => DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeBySystemTimeZoneId(DateTime.UtcNow, "America/Santiago"));
    [Fact]
    public async Task HistoryPreservesQuantityPriceAndRestoresExactStock()
    {
        using var factory = new FacialFactory(); using var client = factory.Client();
        int supplyId;
        using (var scope = factory.Services.CreateScope()) {
            var db = scope.ServiceProvider.GetRequiredService<VeterinariodbContext>();
            var supply = new Insumo { NombreProducto = "Histórico prueba", Tipo = "Material", StockActual = 10, PrecioUnitario = 1000 };
            db.Insumos.Add(supply); await db.SaveChangesAsync(); supplyId = supply.Id;
        }
        var payload = new { clienteId = 1, fechaEmision = Today, montoTotal = 0, montoImpuestos = 0,
            items = new[] { new { tipo = "insumo", insumoId = supplyId, cantidad = 3 } } };
        var response = await client.PostAsJsonAsync("/api/v1/facturas", payload); response.EnsureSuccessStatusCode();
        var invoiceId = (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetInt32();
        var lines = await client.GetFromJsonAsync<DetallesFactura[]>($"/api/v1/detallefac?facturaId={invoiceId}");
        var line = Assert.Single(lines!); Assert.Equal(3, line.Cantidad); Assert.Equal(1000m, line.PrecioUnitario); Assert.Equal(3000m, line.Subtotal);
        (await client.PutAsJsonAsync($"/api/v1/insumos/{supplyId}", new { nombreProducto = "Histórico prueba", tipo = "Material", stockActual = 7, precioUnitario = 2000 })).EnsureSuccessStatusCode();
        (await client.PutAsJsonAsync($"/api/v1/facturas/{invoiceId}", payload)).EnsureSuccessStatusCode();
        line = Assert.Single((await client.GetFromJsonAsync<DetallesFactura[]>($"/api/v1/detallefac?facturaId={invoiceId}"))!);
        Assert.Equal(1000m, line.PrecioUnitario); Assert.Equal(3000m, line.Subtotal);
        (await client.PutAsJsonAsync($"/api/v1/detallefac/{line.Id}", new { facturaId = invoiceId, insumoId = supplyId, cantidad = 2, subtotal = 1m })).EnsureSuccessStatusCode();
        using (var scope = factory.Services.CreateScope()) {
            var db = scope.ServiceProvider.GetRequiredService<VeterinariodbContext>();
            Assert.Equal(8, (await db.Insumos.FindAsync(supplyId))!.StockActual);
            Assert.Equal(2380m, (await db.Facturas.FindAsync(invoiceId))!.MontoTotal);
        }
        Assert.Equal(HttpStatusCode.NoContent, (await client.DeleteAsync($"/api/v1/detallefac/{line.Id}")).StatusCode);
        using (var scope = factory.Services.CreateScope()) {
            var db = scope.ServiceProvider.GetRequiredService<VeterinariodbContext>();
            Assert.Equal(10, (await db.Insumos.FindAsync(supplyId))!.StockActual);
            Assert.Equal(0m, (await db.Facturas.FindAsync(invoiceId))!.MontoTotal);
        }
    }

    [Fact]
    public async Task UnknownLegacyQuantityCannotSilentlyRestoreOneUnit()
    {
        using var factory = new FacialFactory(); using var client = factory.Client();
        int lineId, stock;
        using (var scope = factory.Services.CreateScope()) {
            var db = scope.ServiceProvider.GetRequiredService<VeterinariodbContext>();
            var line = await db.DetallesFacturas.FirstAsync(x => x.InsumoId.HasValue);
            stock = (await db.Insumos.FindAsync(line.InsumoId))!.StockActual;
            line.Cantidad = null; line.PrecioUnitario = null; lineId = line.Id; await db.SaveChangesAsync();
        }
        var response = await client.DeleteAsync($"/api/v1/detallefac/{lineId}");
        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Contains("histórica", (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("message").GetString());
        using var verify = factory.Services.CreateScope(); var store = verify.ServiceProvider.GetRequiredService<VeterinariodbContext>();
        var existing = await store.DetallesFacturas.FindAsync(lineId); Assert.NotNull(existing);
        Assert.Equal(stock, (await store.Insumos.FindAsync(existing.InsumoId))!.StockActual);
    }
}
