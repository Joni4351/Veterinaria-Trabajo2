using System.Security.Cryptography;
using Microsoft.EntityFrameworkCore;
using VeterinariaAPI.Models;

namespace VeterinariaAPI.Services;

public class DemoSeederService(VeterinariodbContext db, AuthService auth)
{
    public const string Dataset = "vetclinic-demo-v1";
    public const string Prefix = "DEMO V1 - ";
    public static readonly Dictionary<string, int> Expected = new()
    {
        ["usuarios"] = 1, ["especialidades"] = 2, ["insumos"] = 2, ["clientes"] = 3,
        ["pacientes"] = 4, ["citas"] = 4, ["consultas"] = 2, ["recetas"] = 2,
        ["detallesReceta"] = 2, ["facturas"] = 2, ["detallesFactura"] = 4
    };

    public async Task<object> Preview() => new
    {
        dataset = Dataset, previstos = Expected,
        clientesExistentes = await db.Clientes.CountAsync(x => x.Email != null && x.Email.EndsWith("@seed.vetclinic.invalid")),
        descripcion = "Lote académico con datos ficticios, una cuenta veterinaria sin contraseña publicada y registros identificados como DEMO V1. Incluye recetas de ejemplo sin indicaciones de uso clínico."
    };

    public async Task<Dictionary<string, int>> Generate()
    {
        // A transaction-scoped lock serializes simultaneous loads on PostgreSQL without adding tables.
        await using var transaction = db.Database.IsRelational() ? await db.Database.BeginTransactionAsync() : null;
        if (transaction != null) await db.Database.ExecuteSqlRawAsync("SELECT pg_advisory_xact_lock(7810243501)");
        await ValidateExistingDataset();
        var counts = Expected.Keys.ToDictionary(key => key, _ => 0);
        counts["roles"] = 0;

        var role = await db.Roles.FirstOrDefaultAsync(x => x.Nombre == "Veterinario");
        if (role == null)
        {
            role = new Role { Nombre = "Veterinario", PermisosEscritura = true };
            db.Roles.Add(role); counts["roles"]++;
            await db.SaveChangesAsync();
        }
        var vet = await db.Usuarios.FirstOrDefaultAsync(x => x.Email == "veterinario@seed.vetclinic.invalid");
        if (vet == null)
        {
            vet = new Usuario { NombreCompleto = Prefix + "Veterinario académico", Email = "veterinario@seed.vetclinic.invalid", RolId = role.Id };
            vet.PasswordHash = auth.HashPassword(vet, Convert.ToBase64String(RandomNumberGenerator.GetBytes(32)));
            db.Usuarios.Add(vet); counts["usuarios"]++;
            await db.SaveChangesAsync();
        }
        else if (vet.RolId != role.Id) throw new InvalidOperationException("La cuenta veterinaria de demostración tiene un rol distinto. Revise el registro antes de continuar.");

        var specialties = new List<Especialidade>();
        var supplies = new List<Insumo>();
        for (var i = 0; i < 2; i++)
        {
            var name = Prefix + (i == 0 ? "Consulta general" : "Control clínico");
            var specialty = await db.Especialidades.FirstOrDefaultAsync(x => x.Nombre == name);
            if (specialty == null)
            {
                specialty = new Especialidade { Nombre = name, CostoBase = i == 0 ? 15000 : 25000 };
                db.Especialidades.Add(specialty); counts["especialidades"]++;
            }
            specialties.Add(specialty);
            var product = Prefix + "Insumo académico " + (i + 1);
            var supply = await db.Insumos.FirstOrDefaultAsync(x => x.NombreProducto == product);
            if (supply == null)
            {
                supply = new Insumo { NombreProducto = product, Tipo = "Demostración", PrecioUnitario = 1000 + i * 1000, StockActual = 20 };
                db.Insumos.Add(supply); counts["insumos"]++;
            }
            supplies.Add(supply);
        }
        await db.SaveChangesAsync();

        var clients = new List<Cliente>();
        for (var i = 0; i < 3; i++)
        {
            var email = $"cliente{i + 1}@seed.vetclinic.invalid";
            var client = await db.Clientes.FirstOrDefaultAsync(x => x.Email == email);
            if (client == null)
            {
                var rut = DemoRut(99000001 + i);
                var compact = rut.Replace("-", "");
                if (await db.Clientes.AnyAsync(x => x.DocumentoIdentidad.Replace(".", "").Replace("-", "").Replace(" ", "").ToUpper() == compact))
                    throw new InvalidOperationException("Un RUT reservado para la demostración ya pertenece a otro cliente. No se modificaron sus datos.");
                client = new Cliente { NombreCompleto = Prefix + "Cliente " + (i + 1), DocumentoIdentidad = rut,
                    Email = email, Telefono = "+5600000000" + (i + 1) };
                db.Clientes.Add(client); counts["clientes"]++;
            }
            clients.Add(client);
        }
        await db.SaveChangesAsync();

        var today = TimeZoneInfo.ConvertTimeBySystemTimeZoneId(DateTime.UtcNow, "America/Santiago").Date;
        for (var i = 0; i < 4; i++)
        {
            var owner = clients[i < 2 ? 0 : i - 1];
            var name = Prefix + new[] { "Luna", "Max", "Milo", "Nala" }[i];
            var patient = await db.Pacientes.FirstOrDefaultAsync(x => x.ClienteId == owner.Id && x.Nombre == name);
            if (patient == null)
            {
                patient = new Paciente { ClienteId = owner.Id, Nombre = name, Especie = i % 2 == 0 ? "Felino" : "Canino",
                    Raza = "Mestizo", Peso = i % 2 == 0 ? 4.5m : 12m, Alergias = "Ejemplo académico; sin datos clínicos reales." };
                db.Pacientes.Add(patient); counts["pacientes"]++;
                await db.SaveChangesAsync();
            }
            var specialty = specialties[i % 2];
            var appointment = await db.Citas.FirstOrDefaultAsync(x => x.PacienteId == patient.Id && x.UsuarioId == vet.Id);
            if (appointment == null)
            {
                appointment = new Cita { PacienteId = patient.Id, UsuarioId = vet.Id, EspecialidadId = specialty.Id,
                    FechaHora = DateTime.SpecifyKind(today.AddDays(i < 2 ? -2 : i).AddHours(10 + i), DateTimeKind.Unspecified),
                    Estado = i < 2 ? "Completada" : i == 2 ? "Confirmada" : "Pendiente" };
                db.Citas.Add(appointment); counts["citas"]++;
                await db.SaveChangesAsync();
            }
            if (i >= 2) continue;
            if (appointment.Estado is not ("Completada" or "Atendida") || appointment.EspecialidadId != specialty.Id)
                throw new InvalidOperationException("La cita de demostración fue modificada. Revísela antes de completar el lote.");
            var consultation = await db.Consultas.FirstOrDefaultAsync(x => x.CitaId == appointment.Id);
            if (consultation == null)
            {
                consultation = new Consulta { PacienteId = patient.Id, CitaId = appointment.Id,
                    Motivo = Prefix + "Control de demostración", Diagnostico = "Registro ficticio para evaluación académica. No representa una evaluación clínica real." };
                db.Consultas.Add(consultation); counts["consultas"]++;
                await db.SaveChangesAsync();
            }
            else if (consultation.PacienteId != patient.Id)
                throw new InvalidOperationException("La consulta de demostración ya no corresponde al paciente esperado.");
            var issueDate = DateOnly.FromDateTime(appointment.FechaHora);
            var prescription = await db.Recetas.FirstOrDefaultAsync(x => x.ConsultaId == consultation.Id);
            if (prescription == null)
            {
                prescription = new Receta { ConsultaId = consultation.Id, FechaEmision = issueDate, ValidaHasta = issueDate.AddDays(7) };
                db.Recetas.Add(prescription); counts["recetas"]++;
                await db.SaveChangesAsync();
            }
            var supply = supplies[i];
            if (!await db.DetallesReceta.AnyAsync(x => x.RecetaId == prescription.Id && x.InsumoId == supply.Id))
            {
                db.DetallesReceta.Add(new DetallesRecetum { RecetaId = prescription.Id, InsumoId = supply.Id,
                    Dosis = "Ejemplo académico. No administrar ni utilizar como prescripción real.", DuracionDias = 3 });
                counts["detallesReceta"]++;
            }
            if (!await db.DetallesFacturas.AnyAsync(x => x.ConsultaId == consultation.Id))
            {
                if (supply.StockActual < 1) throw new InvalidOperationException("El insumo de demostración no tiene existencias para completar la factura.");
                var net = specialty.CostoBase + supply.PrecioUnitario;
                if (net <= 0 || net > 8000000) throw new InvalidOperationException("Revise los precios de demostración antes de generar facturas.");
                var tax = Math.Round(net * 0.19m, 0, MidpointRounding.AwayFromZero);
                var invoice = new Factura { ClienteId = owner.Id, FechaEmision = issueDate, MontoImpuestos = tax, MontoTotal = net + tax };
                db.Facturas.Add(invoice); counts["facturas"]++;
                await db.SaveChangesAsync();
                db.DetallesFacturas.AddRange(
                    new DetallesFactura { FacturaId = invoice.Id, ConsultaId = consultation.Id, Subtotal = specialty.CostoBase },
                    new DetallesFactura { FacturaId = invoice.Id, InsumoId = supply.Id, Subtotal = supply.PrecioUnitario });
                counts["detallesFactura"] += 2;
                supply.StockActual--;
            }
            await db.SaveChangesAsync();
        }
        if (transaction != null) await transaction.CommitAsync();
        return counts;
    }

    public static string DemoRut(int body)
    {
        var sum = 0; var factor = 2;
        foreach (var digit in body.ToString().Reverse()) { sum += (digit - '0') * factor; factor = factor == 7 ? 2 : factor + 1; }
        var result = 11 - sum % 11;
        return $"{body}-{(result == 11 ? "0" : result == 10 ? "K" : result.ToString())}";
    }

    private async Task ValidateExistingDataset()
    {
        // Preflight before any write: reserved identities must never bind demo records to unrelated accounts.
        var emails = Enumerable.Range(1, 3).Select(x => $"cliente{x}@seed.vetclinic.invalid").ToArray();
        var clients = await db.Clientes.AsNoTracking().Where(x => x.Email != null && emails.Contains(x.Email)).ToListAsync();
        for (var i = 0; i < 3; i++)
        {
            var email = emails[i];
            var expectedRut = DemoRut(99000001 + i).Replace("-", "");
            var reserved = await db.Clientes.AsNoTracking().Where(x =>
                x.DocumentoIdentidad.Replace(".", "").Replace("-", "").Replace(" ", "").ToUpper() == expectedRut).ToListAsync();
            if (reserved.Any(x => x.Email != email))
                throw new InvalidOperationException("Un RUT de demostración pertenece a otro cliente. Revise el conflicto antes de cargar el lote.");
            var existing = clients.FirstOrDefault(x => x.Email == email);
            if (existing != null && (!existing.NombreCompleto.StartsWith(Prefix) ||
                existing.DocumentoIdentidad.Replace(".", "").Replace("-", "").Replace(" ", "").ToUpper() != expectedRut))
                throw new InvalidOperationException("Un correo de demostración corresponde a un cliente ajeno al lote o modificado. No se asociarán datos nuevos a esa cuenta.");
        }
        var vet = await db.Usuarios.AsNoTracking().Include(x => x.Rol)
            .FirstOrDefaultAsync(x => x.Email == "veterinario@seed.vetclinic.invalid");
        if (vet != null && (!vet.NombreCompleto.StartsWith(Prefix) || vet.Rol.Nombre != "Veterinario"))
            throw new InvalidOperationException("La cuenta veterinaria de demostración fue modificada. Revísela antes de cargar el lote.");

        var ownerIds = clients.Select(x => x.Id).ToArray();
        if (ownerIds.Length == 0) return;
        var consultationIds = await db.Consultas.AsNoTracking().Where(x => ownerIds.Contains(x.Paciente.ClienteId)
            && x.Paciente.Nombre.StartsWith(Prefix)).Select(x => x.Id).ToListAsync();
        var supplyIds = await db.Insumos.AsNoTracking().Where(x => x.NombreProducto.StartsWith(Prefix)).Select(x => x.Id).ToListAsync();
        var invoices = await db.Facturas.AsNoTracking().Include(x => x.DetallesFacturas)
            .Where(x => ownerIds.Contains(x.ClienteId)).ToListAsync();
        foreach (var invoice in invoices)
        {
            var details = invoice.DetallesFacturas;
            var belongsToDemo = details.Count == 0 || details.Any(x =>
                (x.ConsultaId.HasValue && consultationIds.Contains(x.ConsultaId.Value)) ||
                (x.InsumoId.HasValue && supplyIds.Contains(x.InsumoId.Value)));
            if (!belongsToDemo) continue;
            var net = details.Sum(x => x.Subtotal);
            if (details.Count != 2 || details.Count(x => x.ConsultaId.HasValue && !x.InsumoId.HasValue) != 1 ||
                details.Count(x => x.InsumoId.HasValue && !x.ConsultaId.HasValue) != 1 ||
                invoice.MontoImpuestos != Math.Round(net * 0.19m, 0, MidpointRounding.AwayFromZero) ||
                invoice.MontoTotal != net + invoice.MontoImpuestos)
                throw new InvalidOperationException("Una factura de demostración está incompleta o fue modificada. Revísela antes de volver a cargar; no se generarán cobros adicionales.");
        }
    }
}
