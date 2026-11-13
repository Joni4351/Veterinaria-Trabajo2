using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using VeterinariaAPI.Models;

namespace VeterinariaAPI.Tests;

public class InvoicePermissionsTests
{
    [Theory]
    [InlineData("Administrador", 1, 201)] [InlineData("Recepcionista", 3, 201)]
    [InlineData("Veterinario", 2, 403)] [InlineData(null, 1, 401)]
    public async Task OnlyAdministrationAndReceptionCanIssueInvoices(string? role, int actor, int status)
    {
        using var factory = new FacialFactory(); using var bootstrap = factory.Client();
        using var scope = factory.Services.CreateScope(); var db = scope.ServiceProvider.GetRequiredService<VeterinariodbContext>();
        var supply = await db.Insumos.AsNoTracking().FirstAsync(x => x.StockActual > 0);
        var baseline = await db.Facturas.CountAsync();
        using var client = factory.Client(role, actor);
        var response = await client.PostAsJsonAsync("/api/v1/facturas", new {
            clienteId = 1, fechaEmision = DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeBySystemTimeZoneId(DateTime.UtcNow, "America/Santiago")),
            montoTotal = 0m, montoImpuestos = 0m,
            items = new[] { new { tipo = "insumo", insumoId = supply.Id, cantidad = 1 } }
        });
        Assert.Equal(status, (int)response.StatusCode);
        Assert.Equal(baseline + (status == 201 ? 1 : 0), await db.Facturas.CountAsync());
        Assert.Equal(supply.StockActual - (status == 201 ? 1 : 0), (await db.Insumos.AsNoTracking().SingleAsync(x => x.Id == supply.Id)).StockActual);
        if (status == 201) {
            var id = (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetInt32();
            Assert.True(await db.DetallesFacturas.AnyAsync(x => x.FacturaId == id && x.InsumoId == supply.Id));
            Assert.True(await db.Auditorias.AnyAsync(x => x.Entidad == "Facturas" && x.RegistroId == id && x.UsuarioId == actor));
        }
    }

    [Theory]
    [InlineData("Veterinario", 2)] [InlineData("Recepcionista", 3)]
    public async Task OperationalRolesCannotAlterExistingInvoicesOrDetails(string role, int id)
    {
        using var factory = new FacialFactory(); using var client = factory.Client(role, id);
        Assert.Equal(200, (int)(await client.GetAsync("/api/v1/facturas")).StatusCode);
        Assert.Equal(200, (int)(await client.GetAsync("/api/v1/detallefac")).StatusCode);
        Assert.Equal(403, (int)(await client.PutAsJsonAsync("/api/v1/facturas/1", new { clienteId = 1 })).StatusCode);
        Assert.Equal(403, (int)(await client.DeleteAsync("/api/v1/facturas/1")).StatusCode);
        foreach (var method in new[] { HttpMethod.Post, HttpMethod.Put, HttpMethod.Delete }) {
            using var request = new HttpRequestMessage(method, "/api/v1/detallefac" + (method == HttpMethod.Post ? "" : "/1")) { Content = JsonContent.Create(new { facturaId = 1, insumoId = 1, subtotal = 100m }) };
            Assert.Equal(403, (int)(await client.SendAsync(request)).StatusCode);
        }
    }
}
