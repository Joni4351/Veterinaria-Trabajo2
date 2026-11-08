using Microsoft.EntityFrameworkCore;
using VeterinariaAPI.Models;
using VeterinariaAPI.Services;

namespace VeterinariaAPI.Tests;

public class DefaultRoleTests
{
    private static VeterinariodbContext CreateDb() => new(new DbContextOptionsBuilder<VeterinariodbContext>()
        .UseInMemoryDatabase("roles-" + Guid.NewGuid()).Options);

    [Fact]
    public async Task EmptyDatabaseGetsThreeDefaultsAndRepeatedStartupDoesNotDuplicate()
    {
        await using var db = CreateDb();
        var service = new DefaultRoleService(db);
        var roles = await service.EnsureAsync();
        Assert.Equal(3, roles.Count);
        Assert.True(roles["Administrador"].PermisosEscritura);
        Assert.True(roles["Veterinario"].PermisosEscritura);
        Assert.False(roles["Recepcionista"].PermisosEscritura);
        var ids = roles.ToDictionary(x => x.Key, x => x.Value.Id);
        var repeated = await service.EnsureAsync();
        Assert.Equal(3, await db.Roles.CountAsync());
        foreach (var entry in repeated) Assert.Equal(ids[entry.Key], entry.Value.Id);
    }

    [Fact]
    public async Task MissingRolesAreCreatedWithoutAssumingIdsOrChangingUsers()
    {
        await using var db = CreateDb();
        db.Roles.AddRange(new Role { Id = 17, Nombre = "Administrador", PermisosEscritura = false },
            new Role { Id = 29, Nombre = "Auditor", PermisosEscritura = false });
        db.Usuarios.Add(new Usuario { Id = 88, RolId = 17, NombreCompleto = "Administrador existente", Email = "admin@example.com", PasswordHash = "test-hash" });
        await db.SaveChangesAsync();
        var roles = await new DefaultRoleService(db).EnsureAsync();
        Assert.Equal(17, roles["Administrador"].Id);
        Assert.True(roles["Administrador"].PermisosEscritura);
        Assert.Equal(4, await db.Roles.CountAsync());
        Assert.Equal(17, (await db.Usuarios.SingleAsync()).RolId);
        Assert.False((await db.Roles.SingleAsync(x => x.Nombre == "Auditor")).PermisosEscritura);
    }

    [Fact]
    public async Task ExistingRoleFlagsAndNamesAreRepairedWithoutDuplicating()
    {
        await using var db = CreateDb();
        db.Roles.AddRange(new Role { Id = 10, Nombre = " administrador ", PermisosEscritura = false },
            new Role { Id = 20, Nombre = "veterinario", PermisosEscritura = false },
            new Role { Id = 30, Nombre = "Recepcionista", PermisosEscritura = true });
        await db.SaveChangesAsync();
        var roles = await new DefaultRoleService(db).EnsureAsync();
        Assert.Equal(3, await db.Roles.CountAsync());
        Assert.Equal(10, roles["Administrador"].Id);
        Assert.Equal(20, roles["Veterinario"].Id);
        Assert.Equal("Veterinario", roles["Veterinario"].Nombre);
        Assert.True(roles["Veterinario"].PermisosEscritura);
        Assert.False(roles["Recepcionista"].PermisosEscritura);
    }

    [Theory]
    [InlineData("Administrador")]
    [InlineData("Veterinario")]
    [InlineData("Recepcionista")]
    public async Task MissingDefaultIsRestoredOnNextRun(string name)
    {
        await using var db = CreateDb();
        var service = new DefaultRoleService(db);
        var roles = await service.EnsureAsync();
        db.Roles.Remove(roles[name]); await db.SaveChangesAsync();
        await service.EnsureAsync();
        Assert.Equal(1, await db.Roles.CountAsync(x => x.Nombre == name));
        Assert.Equal(3, await db.Roles.CountAsync());
    }
}
