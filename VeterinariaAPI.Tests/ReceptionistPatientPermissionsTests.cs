using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using VeterinariaAPI.Models;

namespace VeterinariaAPI.Tests;

public class ReceptionistPatientPermissionsTests
{
    [Fact]
    public async Task ReceptionistCanCreateAndEditPatientsButCannotDelete()
    {
        using var factory = new FacialFactory(); using var client = factory.Client("Recepcionista", 3);
        using var scope = factory.Services.CreateScope(); var db = scope.ServiceProvider.GetRequiredService<VeterinariodbContext>();
        var patient = await db.Pacientes.AsNoTracking().FirstAsync();
        var payload = new { clienteId = patient.ClienteId, nombre = "Paciente actualizado", especie = patient.Especie, raza = patient.Raza, peso = 12m, alergias = "Sin antecedentes" };
        Assert.Equal(HttpStatusCode.OK, (await client.PutAsJsonAsync($"/api/v1/pacientes/{patient.Id}", payload)).StatusCode);
        Assert.Equal(HttpStatusCode.Created, (await client.PostAsJsonAsync("/api/v1/pacientes", payload)).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await client.DeleteAsync($"/api/v1/pacientes/{patient.Id}")).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PutAsJsonAsync($"/api/v1/pacientes/{patient.Id}", payload with { clienteId = 9999999 })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PutAsJsonAsync($"/api/v1/pacientes/{patient.Id}", payload with { peso = 0m })).StatusCode);
        Assert.Equal("Paciente actualizado", (await db.Pacientes.AsNoTracking().SingleAsync(x => x.Id == patient.Id)).Nombre);
        Assert.True(await db.Auditorias.AnyAsync(x => x.Entidad == "Pacientes" && x.RegistroId == patient.Id && x.Accion == "MODIFICAR" && x.UsuarioId == 3));
    }
}
