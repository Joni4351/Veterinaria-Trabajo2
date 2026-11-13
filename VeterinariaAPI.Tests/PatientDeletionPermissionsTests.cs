using System.Net;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using VeterinariaAPI.Models;

namespace VeterinariaAPI.Tests;

public class PatientDeletionPermissionsTests
{
    [Theory]
    [InlineData(null, 401)]
    [InlineData("Veterinario", 403)]
    [InlineData("Recepcionista", 403)]
    [InlineData("Administrador", 204)]
    public async Task OnlyAdministratorCanDeleteAnUnrelatedPatient(string? role, int status)
    {
        using var factory = new FacialFactory(); using var bootstrap = factory.Client();
        int id;
        using (var scope = factory.Services.CreateScope()) {
            var db = scope.ServiceProvider.GetRequiredService<VeterinariodbContext>();
            var patient = new Paciente { ClienteId = 1, Nombre = "Paciente de prueba", Especie = "Canino", Peso = 5m };
            db.Pacientes.Add(patient); await db.SaveChangesAsync(); id = patient.Id;
        }
        using var client = factory.Client(role);
        Assert.Equal(status, (int)(await client.DeleteAsync($"/api/v1/pacientes/{id}")).StatusCode);
        using var verification = factory.Services.CreateScope();
        Assert.Equal(status != 204, await verification.ServiceProvider.GetRequiredService<VeterinariodbContext>().Pacientes.AnyAsync(x => x.Id == id));
    }

    [Fact]
    public async Task AdministratorStillCannotDeletePatientWithAppointments()
    {
        using var factory = new FacialFactory(); using var client = factory.Client();
        using var scope = factory.Services.CreateScope(); var db = scope.ServiceProvider.GetRequiredService<VeterinariodbContext>();
        var id = await db.Citas.Select(x => x.PacienteId).FirstAsync();
        Assert.Equal(HttpStatusCode.BadRequest, (await client.DeleteAsync($"/api/v1/pacientes/{id}")).StatusCode);
        Assert.True(await db.Pacientes.AnyAsync(x => x.Id == id));
    }
}
