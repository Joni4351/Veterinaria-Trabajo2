using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using VeterinariaAPI.Models;
using VeterinariaAPI.Services;

namespace VeterinariaAPI.Tests;

public class ReceptionistClientPermissionsTests
{
    [Fact]
    public async Task ReceptionistCanCreateAndEditButCannotDeleteClients()
    {
        using var factory = new FacialFactory(); using var client = factory.Client("Recepcionista", 3);
        var payload = new { documentoIdentidad = DemoSeederService.DemoRut(99000901), nombreCompleto = "Cliente recepción", telefono = "+56912345678", email = "recepcion-test@example.invalid" };
        var response = await client.PostAsJsonAsync("/api/v1/clientes", payload);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var id = (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetInt32();
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/v1/clientes")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await client.PutAsJsonAsync($"/api/v1/clientes/{id}", payload with { nombreCompleto = "Cliente actualizado" })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsJsonAsync("/api/v1/clientes", payload)).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await client.DeleteAsync($"/api/v1/clientes/{id}")).StatusCode);
        using var scope = factory.Services.CreateScope(); var db = scope.ServiceProvider.GetRequiredService<VeterinariodbContext>();
        Assert.Equal("Cliente actualizado", (await db.Clientes.FindAsync(id))!.NombreCompleto);
        var events = await db.Auditorias.Where(x => x.Entidad == "Clientes" && x.RegistroId == id).ToListAsync();
        Assert.Contains(events, x => x.Accion == "CREAR" && x.UsuarioId == 3);
        Assert.Contains(events, x => x.Accion == "MODIFICAR" && x.UsuarioId == 3);
    }

    [Theory]
    [InlineData(null, 401)] [InlineData("Veterinario", 403)]
    public async Task ExistingEditingRestrictionsRemain(string? role, int status)
    {
        using var factory = new FacialFactory(); using var client = factory.Client(role);
        var response = await client.PutAsJsonAsync("/api/v1/clientes/1", new { documentoIdentidad = "12.345.678-5", nombreCompleto = "Sin autorización", telefono = "+56912345678", email = "blocked@example.invalid" });
        Assert.Equal(status, (int)response.StatusCode);
    }
}
