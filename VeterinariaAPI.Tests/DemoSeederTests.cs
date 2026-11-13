using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using VeterinariaAPI.Extensions;
using VeterinariaAPI.Models;
using VeterinariaAPI.Services;

namespace VeterinariaAPI.Tests;

public class DemoSeederTests(FacialFactory factory) : IClassFixture<FacialFactory>
{
    [Theory]
    [InlineData(null, 401)]
    [InlineData("Veterinario", 403)]
    [InlineData("Recepcionista", 403)]
    public async Task PreviewAndGenerationAreRestrictedToAdmins(string? role, int status)
    {
        using var client = factory.Client(role);
        Assert.Equal(status, (int)(await client.GetAsync("/api/v1/admin/datos-prueba")).StatusCode);
        Assert.Equal(status, (int)(await client.PostAsJsonAsync("/api/v1/admin/datos-prueba", new { dataset = DemoSeederService.Dataset, confirmado = true })).StatusCode);
    }

    [Fact]
    public async Task ConfirmationIsRequiredAndPreviewDoesNotWrite()
    {
        using var client = factory.Client();
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<VeterinariodbContext>();
        var count = await db.Clientes.CountAsync();
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/v1/admin/datos-prueba")).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsJsonAsync("/api/v1/admin/datos-prueba", new { dataset = DemoSeederService.Dataset, confirmado = false })).StatusCode);
        Assert.Equal(count, await db.Clientes.CountAsync());
    }

    [Fact]
    public async Task CompleteDatasetIsConsistentAndRepeatedLoadsAreIdempotent()
    {
        using var client = factory.Client();
        var payload = new { dataset = DemoSeederService.Dataset, confirmado = true };
        var first = await client.PostAsJsonAsync("/api/v1/admin/datos-prueba", payload);
        Assert.Equal(HttpStatusCode.OK, first.StatusCode);
        var firstCounts = (await first.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("creados");
        Assert.Equal(3, firstCounts.GetProperty("clientes").GetInt32());
        Assert.Equal(4, firstCounts.GetProperty("pacientes").GetInt32());
        Assert.Equal(2, firstCounts.GetProperty("facturas").GetInt32());
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<VeterinariodbContext>();
        var demoClients = await db.Clientes.Where(x => x.Email != null && x.Email.EndsWith("@seed.vetclinic.invalid")).ToListAsync();
        Assert.All(demoClients, x => Assert.True(RutChilenoAttribute.ValidarRut(x.DocumentoIdentidad)));
        var ids = demoClients.Select(x => x.Id).ToArray();
        var invoices = await db.Facturas.Include(x => x.DetallesFacturas).Where(x => ids.Contains(x.ClienteId)).ToListAsync();
        Assert.Equal(2, invoices.Count);
        foreach (var invoice in invoices)
        {
            var net = invoice.DetallesFacturas.Sum(x => x.Subtotal);
            Assert.Equal(Math.Round(net * 0.19m, 0, MidpointRounding.AwayFromZero), invoice.MontoImpuestos);
            Assert.Equal(net + invoice.MontoImpuestos, invoice.MontoTotal);
            var consultationId = invoice.DetallesFacturas.Single(x => x.ConsultaId.HasValue).ConsultaId;
            var consultation = await db.Consultas.Include(x => x.Paciente).Include(x => x.Cita).SingleAsync(x => x.Id == consultationId);
            Assert.Equal(invoice.ClienteId, consultation.Paciente.ClienteId);
            Assert.Equal("Completada", consultation.Cita!.Estado);
        }
        var supplies = await db.Insumos.Where(x => x.NombreProducto.StartsWith(DemoSeederService.Prefix)).ToListAsync();
        Assert.All(supplies, x => Assert.Equal(19, x.StockActual));
        var second = await client.PostAsJsonAsync("/api/v1/admin/datos-prueba", payload);
        Assert.Equal(HttpStatusCode.OK, second.StatusCode);
        var secondCounts = (await second.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("creados");
        Assert.All(secondCounts.EnumerateObject(), x => Assert.Equal(0, x.Value.GetInt32()));
        await db.Entry(supplies[0]).ReloadAsync();
        Assert.Equal(19, supplies[0].StockActual);
    }
}
