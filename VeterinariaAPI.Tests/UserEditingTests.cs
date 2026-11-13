using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using VeterinariaAPI.Models;
using VeterinariaAPI.Services;

namespace VeterinariaAPI.Tests;

public class UserEditingTests
{
    [Theory]
    [InlineData(null, 401)] [InlineData("Veterinario", 403)] [InlineData("Recepcionista", 403)]
    public async Task EditingRequiresAdministrator(string? role, int status)
    {
        using var factory = new FacialFactory(); using var client = factory.Client(role);
        Assert.Equal(status, (int)(await client.PutAsJsonAsync("/api/v1/usuarios/2", new { rolId = 2, nombreCompleto = "Sin permiso", email = "blocked@example.invalid" })).StatusCode);
    }

    [Fact]
    public async Task EditPreservesPasswordUnlessReplacedAndRecordsSafeAudit()
    {
        using var factory = new FacialFactory(); using var client = factory.Client();
        string original;
        using (var scope = factory.Services.CreateScope()) original = (await scope.ServiceProvider.GetRequiredService<VeterinariodbContext>().Usuarios.FindAsync(2))!.PasswordHash;
        var response = await client.PutAsJsonAsync("/api/v1/usuarios/2", new { rolId = 3, nombreCompleto = "Usuario editado", email = " UPDATED@EXAMPLE.INVALID " });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.DoesNotContain("password", await response.Content.ReadAsStringAsync(), StringComparison.OrdinalIgnoreCase);
        using (var scope = factory.Services.CreateScope()) {
            var db = scope.ServiceProvider.GetRequiredService<VeterinariodbContext>(); var user = (await db.Usuarios.FindAsync(2))!;
            Assert.Equal(original, user.PasswordHash); Assert.Equal(3, user.RolId); Assert.Equal("updated@example.invalid", user.Email);
        }
        response = await client.PutAsJsonAsync("/api/v1/usuarios/2", new { rolId = 3, nombreCompleto = "Usuario editado", email = "updated@example.invalid", password = "NewPassword123!" });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using (var scope = factory.Services.CreateScope()) {
            var db = scope.ServiceProvider.GetRequiredService<VeterinariodbContext>(); var user = (await db.Usuarios.FindAsync(2))!;
            Assert.True(scope.ServiceProvider.GetRequiredService<AuthService>().VerifyPassword(user, "NewPassword123!"));
            var events = await db.Auditorias.Where(x => x.Entidad == "Usuarios" && x.RegistroId == 2).ToListAsync();
            Assert.Contains(events, x => x.Accion == "MODIFICAR");
            Assert.All(events, x => Assert.DoesNotContain("Password", x.ValoresNuevos ?? ""));
        }
    }

    [Fact]
    public async Task RejectsDuplicateEmailInvalidRoleAndSelfDemotion()
    {
        using var factory = new FacialFactory(); using var client = factory.Client();
        using var scope = factory.Services.CreateScope(); var db = scope.ServiceProvider.GetRequiredService<VeterinariodbContext>();
        var admin = (await db.Usuarios.FindAsync(1))!;
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PutAsJsonAsync("/api/v1/usuarios/2", new { rolId = 2, nombreCompleto = "Duplicado", email = admin.Email.ToUpperInvariant() })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PutAsJsonAsync("/api/v1/usuarios/2", new { rolId = 99999, nombreCompleto = "Rol inválido", email = "valid@example.invalid" })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PutAsJsonAsync("/api/v1/usuarios/1", new { rolId = 2, nombreCompleto = admin.NombreCompleto, email = admin.Email })).StatusCode);
    }
}
