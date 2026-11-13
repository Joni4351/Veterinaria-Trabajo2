using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using VeterinariaAPI.Models;
using VeterinariaAPI.Services;

namespace VeterinariaAPI.Tests;

public class UserRegistrationTests : IClassFixture<FacialFactory>
{
    private readonly FacialFactory factory;
    public UserRegistrationTests(FacialFactory factory) { this.factory = factory; }

    [Theory]
    [InlineData(null, 401)]
    [InlineData("Veterinario", 403)]
    [InlineData("Recepcionista", 403)]
    public async Task OnlyAdministratorsCanCreateAccounts(string? role, int status)
    {
        using var client = factory.Client(role);
        var response = await client.PostAsJsonAsync("/api/v1/usuarios/register", new {
            rolId = 1, nombreCompleto = "No autorizado", email = "blocked@example.com", password = "Password123!"
        });
        Assert.Equal(status, (int)response.StatusCode);
        using var scope = factory.Services.CreateScope();
        Assert.False(await scope.ServiceProvider.GetRequiredService<VeterinariodbContext>().Usuarios.AnyAsync(u => u.Email == "blocked@example.com"));
    }

    [Fact]
    public async Task AdministratorCreatesAccountWithHashedPasswordAndValidRole()
    {
        using var client = factory.Client();
        var email = $"new-{Guid.NewGuid():N}@example.com";
        var response = await client.PostAsJsonAsync("/api/v1/usuarios/register", new {
            rolId = 2, nombreCompleto = "Nuevo Veterinario", email, password = "Password123!"
        });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.DoesNotContain("password", await response.Content.ReadAsStringAsync(), StringComparison.OrdinalIgnoreCase);
        using var scope = factory.Services.CreateScope();
        var account = await scope.ServiceProvider.GetRequiredService<VeterinariodbContext>().Usuarios.SingleAsync(u => u.Email == email);
        Assert.Equal(2, account.RolId);
        Assert.NotEqual("Password123!", account.PasswordHash);
        Assert.True(scope.ServiceProvider.GetRequiredService<AuthService>().VerifyPassword(account, "Password123!"));
        var invalid = await client.PostAsJsonAsync("/api/v1/usuarios/register", new {
            rolId = 999999, nombreCompleto = "Rol inexistente", email = "invalid-role@example.com", password = "Password123!"
        });
        Assert.Equal(HttpStatusCode.BadRequest, invalid.StatusCode);
    }
}
