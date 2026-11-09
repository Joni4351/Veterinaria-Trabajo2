using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using VeterinariaAPI.Models;

namespace VeterinariaAPI.Tests;

public class ListOrderingTests
{
    [Theory]
    [InlineData("clientes")]
    [InlineData("insumos")]
    [InlineData("usuarios")]
    public async Task ListsUseStableIdOrderEvenWhenStoredOutOfOrder(string endpoint)
    {
        using var factory = new FacialFactory();
        using var client = factory.Client();
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<VeterinariodbContext>();
            foreach (var id in new[] { 100, 90 })
            {
                db.Clientes.Add(new Cliente { Id = id, DocumentoIdentidad = $"TEST-{id}", NombreCompleto = $"Cliente {id}", Telefono = "+56912345678", Email = $"client{id}@example.com" });
                db.Insumos.Add(new Insumo { Id = id, NombreProducto = $"Insumo {id}", Tipo = "Ejemplo", StockActual = 10, PrecioUnitario = 1000 });
                db.Usuarios.Add(new Usuario { Id = id, RolId = 1, NombreCompleto = $"Usuario {id}", Email = $"user{id}@example.com", PasswordHash = "test-only" });
                await db.SaveChangesAsync();
            }
        }
        async Task<int[]> ReadIds() => (await client.GetFromJsonAsync<JsonElement[]>($"/api/v1/{endpoint}"))!
            .Select(row => row.GetProperty("id").GetInt32()).ToArray();
        var before = await ReadIds();
        Assert.Equal(before.OrderBy(id => id), before);
        Assert.Contains(90, before);
        Assert.Contains(100, before);

        if (endpoint == "clientes")
        {
            var result = await client.PutAsJsonAsync("/api/v1/clientes/1", new
            {
                documentoIdentidad = "18.765.432-7", nombreCompleto = "Jonathan Garrido actualizado",
                telefono = "+56992027789", email = "joni@gmail.com"
            });
            Assert.Equal(HttpStatusCode.OK, result.StatusCode);
            Assert.Equal(before, await ReadIds());
        }
    }
}
