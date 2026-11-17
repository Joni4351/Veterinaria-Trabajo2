using System.Net;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using VeterinariaAPI.Models;

namespace VeterinariaAPI.Tests;

public class AdministratorDeletionTests
{
    [Theory]
    [InlineData(1)]
    [InlineData(2)]
    public async Task CannotDeleteSelfOrAnotherAdministrator(int target)
    {
        using var factory = new FacialFactory();
        using var client = factory.Client();
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<VeterinariodbContext>();
            var admin = await db.Usuarios.SingleAsync(u => u.Id == 1);
            (await db.Usuarios.SingleAsync(u => u.Id == target)).RolId = admin.RolId;
            await db.SaveChangesAsync();
        }
        var response = await client.DeleteAsync($"/api/v1/usuarios/{target}");
        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        using var verification = factory.Services.CreateScope();
        Assert.True(await verification.ServiceProvider.GetRequiredService<VeterinariodbContext>().Usuarios.AnyAsync(u => u.Id == target));
    }
}
