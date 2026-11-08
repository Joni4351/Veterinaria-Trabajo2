using Microsoft.EntityFrameworkCore;
using VeterinariaAPI.Models;

namespace VeterinariaAPI.Services;

public class DefaultRoleService(VeterinariodbContext db)
{
    public async Task<IReadOnlyDictionary<string, Role>> EnsureAsync()
    {
        await using var transaction = db.Database.IsRelational() ? await db.Database.BeginTransactionAsync() : null;
        if (db.Database.IsNpgsql())
            await db.Database.ExecuteSqlRawAsync("SELECT pg_advisory_xact_lock(7810243502)");

        var existing = await db.Roles.OrderBy(x => x.Id).ToListAsync();
        var result = new Dictionary<string, Role>();
        foreach (var (name, canWrite) in new[] { ("Administrador", true), ("Veterinario", true), ("Recepcionista", false) })
        {
            var matches = existing.Where(x => string.Equals(x.Nombre?.Trim(), name, StringComparison.OrdinalIgnoreCase)).ToList();
            if (matches.Count == 0)
            {
                // Let PostgreSQL generate the ID: existing databases do not necessarily use 1, 2 and 3.
                var role = new Role { Nombre = name, PermisosEscritura = canWrite };
                db.Roles.Add(role);
                result[name] = role;
            }
            else
            {
                // Preserve IDs, user associations and custom roles; repair canonical names and flags.
                foreach (var role in matches)
                {
                    role.Nombre = name;
                    role.PermisosEscritura = canWrite;
                }
                result[name] = matches[0];
            }
        }
        await db.SaveChangesAsync();
        if (transaction != null) await transaction.CommitAsync();
        return result;
    }
}
