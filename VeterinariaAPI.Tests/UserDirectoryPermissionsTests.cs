using System.Net.Http.Json;
using System.Text.Json;

namespace VeterinariaAPI.Tests;

public class UserDirectoryPermissionsTests
{
    [Theory]
    [InlineData("Administrador", 200)] [InlineData("Veterinario", 403)] [InlineData("Recepcionista", 403)]
    public async Task FullDirectoryIsAdministrativeAndProfessionalSelectorIsLimited(string role, int status)
    {
        using var factory = new FacialFactory(); using var client = factory.Client(role);
        Assert.Equal(status, (int)(await client.GetAsync("/api/v1/usuarios")).StatusCode);
        var rows = await client.GetFromJsonAsync<JsonElement[]>("/api/v1/usuarios/profesionales");
        Assert.NotEmpty(rows!);
        Assert.All(rows!, row => {
            Assert.Equal("Veterinario", row.GetProperty("rol").GetString());
            Assert.Equal(new[] { "id", "nombreCompleto", "rol" }, row.EnumerateObject().Select(x => x.Name).OrderBy(x => x).ToArray());
        });
    }
}
