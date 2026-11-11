using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using VeterinariaAPI.Models;

namespace VeterinariaAPI.Data;

/// <summary>
/// Creates migration metadata without starting the API or reading production secrets.
/// Database commands require an explicit --connection override to reach a real server.
/// </summary>
public sealed class VeterinariodbContextFactory : IDesignTimeDbContextFactory<VeterinariodbContext>
{
    public VeterinariodbContext CreateDbContext(string[] args)
    {
        var options = new DbContextOptionsBuilder<VeterinariodbContext>()
            .UseNpgsql("Host=127.0.0.1;Port=1;Database=vetclinic_migrations_offline;Username=offline;Timeout=1")
            .Options;
        return new VeterinariodbContext(options);
    }
}
