using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using VeterinariaAPI.Models;

namespace VeterinariaAPI.Tests;

public class SupplyPermissionsTests
{
    [Theory]
    [InlineData(null, 401)] [InlineData("Veterinario", 403)] [InlineData("Recepcionista", 403)]
    public async Task OtherRolesCannotMutateSupplyCatalog(string? role, int status)
    {
        using var factory = new FacialFactory(); using var bootstrap = factory.Client();
        using var scope = factory.Services.CreateScope(); var db = scope.ServiceProvider.GetRequiredService<VeterinariodbContext>();
        var original = await db.Insumos.AsNoTracking().FirstAsync();
        using var client = factory.Client(role);
        var payload = new { nombreProducto = "Producto no autorizado", tipo = "Medicamento", stockActual = 10, precioUnitario = 1200m };
        Assert.Equal(status, (int)(await client.PostAsJsonAsync("/api/v1/insumos", payload)).StatusCode);
        Assert.Equal(status, (int)(await client.PutAsJsonAsync($"/api/v1/insumos/{original.Id}", payload)).StatusCode);
        Assert.Equal(status, (int)(await client.DeleteAsync($"/api/v1/insumos/{original.Id}")).StatusCode);
        Assert.Equal(role == null ? 401 : 200, (int)(await client.GetAsync("/api/v1/insumos")).StatusCode);
        var stored = await db.Insumos.AsNoTracking().SingleAsync(x => x.Id == original.Id);
        Assert.Equal(original.NombreProducto, stored.NombreProducto); Assert.Equal(original.StockActual, stored.StockActual); Assert.Equal(original.PrecioUnitario, stored.PrecioUnitario);
        Assert.False(await db.Insumos.AnyAsync(x => x.NombreProducto == payload.nombreProducto));
    }

    [Fact]
    public async Task AdministratorCanCreateEditAndDeleteUnusedSupply()
    {
        using var factory = new FacialFactory(); using var client = factory.Client();
        var payload = new { nombreProducto = "Producto de prueba", tipo = "Material", stockActual = 10, precioUnitario = 1200m };
        var response = await client.PostAsJsonAsync("/api/v1/insumos", payload);
        Assert.Equal(201, (int)response.StatusCode);
        var id = (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetInt32();
        Assert.Equal(200, (int)(await client.PutAsJsonAsync($"/api/v1/insumos/{id}", payload with { stockActual = 20 })).StatusCode);
        using var scope = factory.Services.CreateScope(); var db = scope.ServiceProvider.GetRequiredService<VeterinariodbContext>();
        Assert.Equal(20, (await db.Insumos.AsNoTracking().SingleAsync(x => x.Id == id)).StockActual);
        Assert.Equal(204, (int)(await client.DeleteAsync($"/api/v1/insumos/{id}")).StatusCode);
        Assert.False(await db.Insumos.AnyAsync(x => x.Id == id));
    }
}
