using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using VeterinariaAPI.Models;

namespace VeterinariaAPI.Tests;

public class AppointmentDeletionPermissionsTests
{
    [Theory]
    [InlineData(null, 401)] [InlineData("Veterinario", 403)]
    [InlineData("Recepcionista", 403)] [InlineData("Administrador", 204)]
    public async Task OnlyAdministratorCanDeleteUnrelatedAppointment(string? role, int status)
    {
        using var factory = new FacialFactory(); using var bootstrap = factory.Client();
        int id;
        using (var scope = factory.Services.CreateScope()) {
            var db = scope.ServiceProvider.GetRequiredService<VeterinariodbContext>();
            var appointment = new Cita { PacienteId = 1, UsuarioId = 2, EspecialidadId = 1, FechaHora = DateTime.Today.AddDays(30), Estado = "Pendiente" };
            db.Citas.Add(appointment); await db.SaveChangesAsync(); id = appointment.Id;
        }
        using var client = factory.Client(role);
        Assert.Equal(status, (int)(await client.DeleteAsync($"/api/v1/citas/{id}")).StatusCode);
        using var verification = factory.Services.CreateScope(); var store = verification.ServiceProvider.GetRequiredService<VeterinariodbContext>();
        Assert.Equal(status != 204, await store.Citas.AnyAsync(x => x.Id == id));
        if (status == 204) Assert.True(await store.Auditorias.AnyAsync(x => x.Entidad == "Citas" && x.RegistroId == id && x.Accion == "ELIMINAR" && x.UsuarioId == 1));
    }

    [Fact]
    public async Task AdministratorCannotDeleteAppointmentWithBilledConsultation()
    {
        using var factory = new FacialFactory(); using var client = factory.Client();
        using var scope = factory.Services.CreateScope(); var db = scope.ServiceProvider.GetRequiredService<VeterinariodbContext>();
        var id = await db.Consultas.Where(x => x.CitaId.HasValue && db.DetallesFacturas.Any(d => d.ConsultaId == x.Id)).Select(x => x.CitaId!.Value).FirstAsync();
        Assert.Equal(400, (int)(await client.DeleteAsync($"/api/v1/citas/{id}")).StatusCode);
        Assert.True(await db.Citas.AnyAsync(x => x.Id == id));
    }

    [Fact]
    public async Task MissingAppointmentReturnsNotFoundForAdministrator()
    {
        using var factory = new FacialFactory(); using var client = factory.Client();
        Assert.Equal(404, (int)(await client.DeleteAsync("/api/v1/citas/9999999")).StatusCode);
    }
}
