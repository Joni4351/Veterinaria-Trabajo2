using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using VeterinariaAPI.Models;

namespace VeterinariaAPI.Tests;

public class AppointmentVisibilityTests
{
    private static async Task<int> AddOtherAppointment(FacialFactory factory)
    {
        using var scope = factory.Services.CreateScope(); var db = scope.ServiceProvider.GetRequiredService<VeterinariodbContext>();
        var vetRole = await db.Roles.SingleAsync(x => x.Nombre == "Veterinario");
        var vet = new Usuario { NombreCompleto = "Otro veterinario", Email = "other-vet@example.invalid", PasswordHash = "unused-test-hash", RolId = vetRole.Id };
        db.Usuarios.Add(vet); await db.SaveChangesAsync();
        db.Citas.Add(new Cita { UsuarioId = vet.Id, PacienteId = 1, EspecialidadId = 1, FechaHora = DateTime.Today.AddDays(10), Estado = "Pendiente" });
        await db.SaveChangesAsync(); return vet.Id;
    }

    [Fact]
    public async Task VeterinarianCannotOverrideScopeWithAnotherUserId()
    {
        using var factory = new FacialFactory(); using var bootstrap = factory.Client();
        var other = await AddOtherAppointment(factory);
        using var vet = factory.Client("Veterinario", 2);
        foreach (var query in new[] { "", $"?usuarioId={other}", "?usuarioId=1", "?usuarioId=0" }) {
            var rows = await vet.GetFromJsonAsync<JsonElement[]>("/api/v1/citas" + query);
            Assert.NotEmpty(rows!); Assert.All(rows!, x => Assert.Equal(2, x.GetProperty("usuarioId").GetInt32()));
        }
        var filtered = await vet.GetFromJsonAsync<JsonElement[]>("/api/v1/citas?estado=Confirmada");
        Assert.All(filtered!, x => { Assert.Equal(2, x.GetProperty("usuarioId").GetInt32()); Assert.Equal("Confirmada", x.GetProperty("estado").GetString()); });
    }

    [Theory]
    [InlineData("Administrador", 1)] [InlineData("Recepcionista", 3)]
    public async Task AdministrationAndReceptionKeepGeneralAgendaAndFilters(string role, int id)
    {
        using var factory = new FacialFactory(); using var bootstrap = factory.Client(); var other = await AddOtherAppointment(factory);
        using var client = factory.Client(role, id);
        var rows = await client.GetFromJsonAsync<JsonElement[]>("/api/v1/citas");
        Assert.Contains(rows!, x => x.GetProperty("usuarioId").GetInt32() == other);
        var filtered = await client.GetFromJsonAsync<JsonElement[]>($"/api/v1/citas?usuarioId={other}");
        Assert.Single(filtered!); Assert.All(filtered!, x => Assert.Equal(other, x.GetProperty("usuarioId").GetInt32()));
    }

    [Theory]
    [InlineData(null, 1, 401)] [InlineData("Veterinario", 0, 403)]
    public async Task InvalidOrMissingIdentityCannotReadAgenda(string? role, int id, int status)
    {
        using var factory = new FacialFactory(); using var client = factory.Client(role, id);
        Assert.Equal(status, (int)(await client.GetAsync("/api/v1/citas")).StatusCode);
    }
}
