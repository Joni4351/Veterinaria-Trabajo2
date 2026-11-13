using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Storage;

namespace VeterinariaAPI.Models;

public partial class VeterinariodbContext
{
    // Explicit allowlist: adding a sensitive property later does not accidentally expose it in history.
    private static readonly Dictionary<Type, (string Table, string[] Fields)> AuditedTypes = new()
    {
        [typeof(Cliente)] = ("Clientes", ["DocumentoIdentidad", "NombreCompleto", "Telefono", "Email"]),
        [typeof(Paciente)] = ("Pacientes", ["ClienteId", "Nombre", "Especie", "Raza", "Peso", "Alergias"]),
        [typeof(Cita)] = ("Citas", ["PacienteId", "UsuarioId", "EspecialidadId", "FechaHora", "Estado"]),
        [typeof(Consulta)] = ("Consultas", ["PacienteId", "CitaId", "Motivo", "Diagnostico"]),
        [typeof(Receta)] = ("Recetas", ["ConsultaId", "FechaEmision", "ValidaHasta"]),
        [typeof(DetallesRecetum)] = ("DetallesReceta", ["RecetaId", "InsumoId", "Dosis", "DuracionDias"]),
        [typeof(Insumo)] = ("Insumos", ["NombreProducto", "Tipo", "StockActual", "PrecioUnitario"]),
        [typeof(Factura)] = ("Facturas", ["ClienteId", "FechaEmision", "MontoImpuestos", "MontoTotal"]),
        [typeof(DetallesFactura)] = ("DetallesFactura", ["FacturaId", "ConsultaId", "InsumoId", "Cantidad", "PrecioUnitario", "Subtotal"]),
        [typeof(Especialidade)] = ("Especialidades", ["Nombre", "CostoBase"]),
        [typeof(Role)] = ("Roles", ["Nombre", "PermisosEscritura"]),
        [typeof(Usuario)] = ("Usuarios", ["RolId", "NombreCompleto", "Email"]),
        [typeof(ReconocimientoFacial)] = ("ReconocimientoFacial", ["UsuarioId", "FechaRegistro", "FechaActualizacion", "UltimoAcceso", "Activo", "ConsentimientoFecha", "ConsentimientoAdministradorId", "ConsentimientoVersion"])
    };

    private sealed record PendingAudit(EntityEntry Entry, EntityState State, string Table,
        Dictionary<string, object?> Before, string[] Fields);

    public static string[] AuditTables => AuditedTypes.Values.Select(x => x.Table).OrderBy(x => x).ToArray();

    public static JsonElement? SafeAuditValues(string table, string? json)
    {
        var allowed = table == "Reportes" ? new[] { "Operacion", "tipo", "formato", "Filtros", "Registros" }
            : AuditedTypes.Values.FirstOrDefault(x => x.Table == table).Fields;
        if (allowed == null || json == null) return null;
        try
        {
            using var document = JsonDocument.Parse(json);
            if (document.RootElement.ValueKind != JsonValueKind.Object) return null;
            return JsonSerializer.SerializeToElement(document.RootElement.EnumerateObject()
                .Where(x => allowed.Contains(x.Name) && x.Value.ValueKind is not (JsonValueKind.Object or JsonValueKind.Array))
                .ToDictionary(x => x.Name, x => x.Value.Clone()));
        }
        catch (JsonException) { return null; }
    }

    public override int SaveChanges(bool acceptAllChangesOnSuccess) =>
        SaveAuditedAsync(acceptAllChangesOnSuccess, true, CancellationToken.None).GetAwaiter().GetResult();

    public override Task<int> SaveChangesAsync(bool acceptAllChangesOnSuccess, CancellationToken cancellationToken = default) =>
        SaveAuditedAsync(acceptAllChangesOnSuccess, false, cancellationToken);

    private async Task<int> SaveAuditedAsync(bool accept, bool synchronous, CancellationToken cancellationToken)
    {
        foreach (var entry in ChangeTracker.Entries<DetallesFactura>().Where(x => x.State == EntityState.Added))
            if (entry.Entity.Cantidad is > 0 && entry.Entity.PrecioUnitario == null)
                entry.Entity.PrecioUnitario = entry.Entity.Subtotal / entry.Entity.Cantidad.Value;
        ChangeTracker.DetectChanges();
        var pending = ChangeTracker.Entries().Where(x => x.State is EntityState.Added or EntityState.Modified or EntityState.Deleted)
            .Where(x => AuditedTypes.ContainsKey(x.Entity.GetType())).Select(entry =>
            {
                var spec = AuditedTypes[entry.Entity.GetType()];
                var fields = spec.Fields.Where(name => entry.State != EntityState.Modified || entry.Property(name).IsModified &&
                    !Equals(entry.Property(name).OriginalValue, entry.Property(name).CurrentValue)).ToArray();
                return new PendingAudit(entry, entry.State, spec.Table,
                    fields.ToDictionary(name => name, name => entry.Property(name).OriginalValue), fields);
            }).ToList();
        if (pending.Count == 0) return synchronous ? base.SaveChanges(accept) : await base.SaveChangesAsync(accept, cancellationToken);

        var actorId = _auditOperation.UserId;
        var actorName = _auditOperation.UserName;
        var origin = _auditOperation.Origin;
        await using var transaction = Database.IsRelational() && Database.CurrentTransaction == null
            ? await Database.BeginTransactionAsync(cancellationToken) : null;

        // The existing FK need not have ON DELETE SET NULL: explicitly unlink old history first.
        var deletedUsers = pending.Where(x => x.Entry.Entity is Usuario && x.State == EntityState.Deleted)
            .Select(x => (int)x.Entry.Property("Id").CurrentValue!).ToArray();
        if (deletedUsers.Length > 0)
        {
            var references = await Auditorias.Where(x => x.UsuarioId.HasValue && deletedUsers.Contains(x.UsuarioId.Value)).ToListAsync(cancellationToken);
            foreach (var reference in references) reference.UsuarioId = null;
        }
        var result = synchronous ? base.SaveChanges(accept) : await base.SaveChangesAsync(accept, cancellationToken);
        if (actorId.HasValue && !await Usuarios.AsNoTracking().AnyAsync(x => x.Id == actorId.Value, cancellationToken)) actorId = null;

        var events = pending.Select(change => new Auditoria
        {
            FechaHora = DateTimeOffset.UtcNow, UsuarioId = actorId, UsuarioNombre = actorName ?? (origin == "SISTEMA" ? "Sistema" : "Usuario autenticado"),
            Accion = change.State == EntityState.Added ? "CREAR" : change.State == EntityState.Deleted ? "ELIMINAR" : "MODIFICAR",
            Entidad = change.Table, RegistroId = (int)change.Entry.Property("Id").CurrentValue!,
            ValoresAnteriores = change.State == EntityState.Added ? null : JsonSerializer.Serialize(change.Before),
            ValoresNuevos = change.State == EntityState.Deleted ? null : JsonSerializer.Serialize(change.Fields.ToDictionary(
                name => name, name => change.Entry.Property(name).CurrentValue)),
            Origen = origin, OperacionId = _auditOperation.Id
        }).ToList();

        // A separate tracker avoids resaving business entities, including SaveChanges(false).
        await using var writer = new VeterinariodbContext(CreateAuditWriterOptions());
        if (Database.IsRelational())
            await writer.Database.UseTransactionAsync(Database.CurrentTransaction!.GetDbTransaction(), cancellationToken);
        writer.Auditorias.AddRange(events);
        await writer.SaveChangesAsync(cancellationToken);
        if (transaction != null) await transaction.CommitAsync(cancellationToken);
        return result;
    }

    internal DbContextOptions<VeterinariodbContext> CreateAuditWriterOptions() => Database.IsNpgsql()
        // Copying the original options retains its connection string. EF would assign that
        // string to the already-open shared connection, which Npgsql explicitly rejects.
        ? new DbContextOptionsBuilder<VeterinariodbContext>().UseNpgsql(Database.GetDbConnection()).Options
        : _contextOptions!;
}
