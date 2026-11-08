using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using VeterinariaAPI.Models;
using VeterinariaAPI.Services;

namespace VeterinariaAPI.Tests;

public class DemoSeederEdgeTests
{
    private const string Url = "/api/v1/admin/datos-prueba";
    private static readonly object Request = new { dataset = DemoSeederService.Dataset, confirmado = true };

    [Theory]
    [InlineData("otra-version", true)]
    [InlineData("vetclinic-demo-v1", false)]
    public async Task InvalidRequestsCannotCreateData(string dataset, bool confirmado)
    {
        using var factory = new FacialFactory(); using var client = factory.Client();
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<VeterinariodbContext>();
        var before = await db.Clientes.CountAsync();
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsJsonAsync(Url, new { dataset, confirmado })).StatusCode);
        Assert.Equal(before, await db.Clientes.CountAsync());
        Assert.False(await db.Usuarios.AnyAsync(x => x.Email == "veterinario@seed.vetclinic.invalid"));
    }

    [Theory]
    [InlineData(999999)]
    [InlineData(2)]
    public async Task ForgedOrOutdatedAdminClaimCannotLoadData(int id)
    {
        using var factory = new FacialFactory(); using var client = factory.Client(id: id);
        Assert.Equal(HttpStatusCode.Forbidden, (await client.GetAsync(Url)).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await client.PostAsJsonAsync(Url, Request)).StatusCode);
    }

    [Fact]
    public async Task ReusingReservedEmailOfAnotherClientMustNotAttachDemoData()
    {
        using var factory = new FacialFactory(); using var client = factory.Client();
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<VeterinariodbContext>();
        var owner = new Cliente { NombreCompleto = "Cliente existente", DocumentoIdentidad = "19.876.543-0", Email = "cliente1@seed.vetclinic.invalid" };
        db.Clientes.Add(owner); await db.SaveChangesAsync();
        Assert.Equal(HttpStatusCode.Conflict, (await client.PostAsJsonAsync(Url, Request)).StatusCode);
        Assert.False(await db.Pacientes.AnyAsync(x => x.ClienteId == owner.Id));
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task IncompleteInvoiceMustBeReportedWithoutNewCharges(bool removeConsultation)
    {
        using var factory = new FacialFactory(); using var client = factory.Client();
        Assert.Equal(HttpStatusCode.OK, (await client.PostAsJsonAsync(Url, Request)).StatusCode);
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<VeterinariodbContext>();
        var supply = await db.Insumos.FirstAsync(x => x.NombreProducto == DemoSeederService.Prefix + "Insumo académico 1");
        var supplyLine = await db.DetallesFacturas.SingleAsync(x => x.InsumoId == supply.Id);
        var removed = removeConsultation
            ? await db.DetallesFacturas.SingleAsync(x => x.FacturaId == supplyLine.FacturaId && x.ConsultaId.HasValue)
            : supplyLine;
        db.DetallesFacturas.Remove(removed); await db.SaveChangesAsync();
        var count = await db.Facturas.CountAsync();
        var stock = supply.StockActual;
        Assert.Equal(HttpStatusCode.Conflict, (await client.PostAsJsonAsync(Url, Request)).StatusCode);
        Assert.Equal(count, await db.Facturas.CountAsync());
        await db.Entry(supply).ReloadAsync(); Assert.Equal(stock, supply.StockActual);
    }

    [Fact]
    public async Task RepeatedLoadsPreserveEditedStockAndUnrelatedClients()
    {
        using var factory = new FacialFactory(); using var client = factory.Client();
        Assert.Equal(HttpStatusCode.OK, (await client.PostAsJsonAsync(Url, Request)).StatusCode);
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<VeterinariodbContext>();
        var supply = await db.Insumos.FirstAsync(x => x.NombreProducto.StartsWith(DemoSeederService.Prefix));
        supply.StockActual = 7; await db.SaveChangesAsync();
        var clients = await db.Clientes.CountAsync();
        for (var i = 0; i < 3; i++)
        {
            var response = await client.PostAsJsonAsync(Url, Request);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var counts = (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("creados");
            Assert.All(counts.EnumerateObject(), x => Assert.Equal(0, x.Value.GetInt32()));
        }
        await db.Entry(supply).ReloadAsync(); Assert.Equal(7, supply.StockActual);
        Assert.Equal(clients, await db.Clientes.CountAsync());
    }

    [Fact]
    public async Task MissingPrescriptionCanBeCompletedWithoutAnotherInvoiceOrStockDeduction()
    {
        using var factory = new FacialFactory(); using var client = factory.Client();
        Assert.Equal(HttpStatusCode.OK, (await client.PostAsJsonAsync(Url, Request)).StatusCode);
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<VeterinariodbContext>();
        var demoConsult = await db.Consultas.FirstAsync(x => x.Motivo.StartsWith(DemoSeederService.Prefix));
        var recipe = await db.Recetas.SingleAsync(x => x.ConsultaId == demoConsult.Id);
        db.DetallesReceta.RemoveRange(await db.DetallesReceta.Where(x => x.RecetaId == recipe.Id).ToListAsync());
        db.Recetas.Remove(recipe); await db.SaveChangesAsync();
        var invoiceCount = await db.Facturas.CountAsync();
        var response = await client.PostAsJsonAsync(Url, Request);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var counts = (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("creados");
        Assert.Equal(1, counts.GetProperty("recetas").GetInt32());
        Assert.Equal(1, counts.GetProperty("detallesReceta").GetInt32());
        Assert.Equal(0, counts.GetProperty("facturas").GetInt32());
        Assert.Equal(invoiceCount, await db.Facturas.CountAsync());
        Assert.All(await db.Insumos.Where(x => x.NombreProducto.StartsWith(DemoSeederService.Prefix)).ToListAsync(), x => Assert.Equal(19, x.StockActual));
    }

    [Fact]
    public async Task RutCollisionIsDetectedBeforeAnyDemoWrite()
    {
        using var factory = new FacialFactory(); using var client = factory.Client();
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<VeterinariodbContext>();
        db.Clientes.Add(new Cliente { NombreCompleto = "Cliente existente", DocumentoIdentidad = DemoSeederService.DemoRut(99000001), Email = "existente@example.com" });
        await db.SaveChangesAsync();
        var supplies = await db.Insumos.CountAsync();
        Assert.Equal(HttpStatusCode.Conflict, (await client.PostAsJsonAsync(Url, Request)).StatusCode);
        Assert.Equal(supplies, await db.Insumos.CountAsync());
        Assert.False(await db.Usuarios.AnyAsync(x => x.Email == "veterinario@seed.vetclinic.invalid"));
    }

    [Fact]
    public async Task CancelledDemoAppointmentCannotReceiveAnotherConsultation()
    {
        using var factory = new FacialFactory(); using var client = factory.Client();
        Assert.Equal(HttpStatusCode.OK, (await client.PostAsJsonAsync(Url, Request)).StatusCode);
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<VeterinariodbContext>();
        var appointment = await db.Citas.Include(x => x.Paciente).FirstAsync(x => x.Paciente.Nombre == DemoSeederService.Prefix + "Luna");
        appointment.Estado = "Cancelada"; await db.SaveChangesAsync();
        var count = await db.Consultas.CountAsync();
        Assert.Equal(HttpStatusCode.Conflict, (await client.PostAsJsonAsync(Url, Request)).StatusCode);
        Assert.Equal(count, await db.Consultas.CountAsync());
    }
}
