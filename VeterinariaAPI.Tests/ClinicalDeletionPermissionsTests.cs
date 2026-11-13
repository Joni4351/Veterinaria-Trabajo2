using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using VeterinariaAPI.Models;

namespace VeterinariaAPI.Tests;

public class ClinicalDeletionPermissionsTests
{
    [Theory]
    [InlineData(null, 401)] [InlineData("Veterinario", 403)]
    [InlineData("Recepcionista", 403)] [InlineData("Administrador", 204)]
    public async Task ClinicalDeletesAreExclusiveToAdministrator(string? role, int expected)
    {
        using var factory = new FacialFactory(); using var bootstrap = factory.Client();
        int consultaId, recetaId, detalleId;
        using (var scope = factory.Services.CreateScope()) {
            var db = scope.ServiceProvider.GetRequiredService<VeterinariodbContext>();
            var consultation = new Consulta { PacienteId = 1, Motivo = "Consulta de prueba", Diagnostico = "Sin hallazgos" };
            db.Consultas.Add(consultation); await db.SaveChangesAsync(); consultaId = consultation.Id;
            recetaId = await db.Recetas.Select(x => x.Id).FirstAsync();
            detalleId = await db.DetallesReceta.Select(x => x.Id).FirstAsync();
        }
        using var client = factory.Client(role);
        foreach (var path in new[] { $"consultas/{consultaId}", $"detallesRe/{detalleId}", $"recetas/{recetaId}" })
            Assert.Equal(expected, (int)(await client.DeleteAsync("/api/v1/" + path)).StatusCode);
        using var verification = factory.Services.CreateScope(); var store = verification.ServiceProvider.GetRequiredService<VeterinariodbContext>();
        Assert.Equal(expected != 204, await store.Consultas.AnyAsync(x => x.Id == consultaId));
        Assert.Equal(expected != 204, await store.Recetas.AnyAsync(x => x.Id == recetaId));
        Assert.Equal(expected != 204, await store.DetallesReceta.AnyAsync(x => x.Id == detalleId));
        if (expected == 204) Assert.False(await store.DetallesReceta.AnyAsync(x => x.RecetaId == recetaId));
    }

    [Fact]
    public async Task AdministratorCannotDeleteConsultationWithPrescription()
    {
        using var factory = new FacialFactory(); using var client = factory.Client();
        using var scope = factory.Services.CreateScope(); var db = scope.ServiceProvider.GetRequiredService<VeterinariodbContext>();
        var id = await db.Recetas.Select(x => x.ConsultaId).FirstAsync();
        Assert.Equal(400, (int)(await client.DeleteAsync($"/api/v1/consultas/{id}")).StatusCode);
        Assert.True(await db.Consultas.AnyAsync(x => x.Id == id));
    }
}
