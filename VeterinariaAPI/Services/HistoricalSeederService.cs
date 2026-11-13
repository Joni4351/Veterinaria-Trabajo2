using System.Security.Cryptography;
using Microsoft.EntityFrameworkCore;
using VeterinariaAPI.Models;

namespace VeterinariaAPI.Services;

public class HistoricalSeederService(VeterinariodbContext db, AuthService auth)
{
    public const string Dataset = "vetclinic-historico-v1", Prefix = "DEMO HIST - ";
    public object Preview() => new { dataset = Dataset, pacientes = 500, citas = 500, consultas = 500, facturas = 500, meses = 12 };
    public async Task<Dictionary<string, int>> Generate(CancellationToken ct)
    {
        await using var tx = db.Database.IsRelational() ? await db.Database.BeginTransactionAsync(ct) : null;
        if (tx != null) await db.Database.ExecuteSqlRawAsync("SELECT pg_advisory_xact_lock(7810243502)", ct);
        var counts = new Dictionary<string, int> { ["clientes"] = 0, ["pacientes"] = 0, ["citas"] = 0, ["consultas"] = 0, ["facturas"] = 0 };
        var role = await db.Roles.SingleAsync(x => x.Nombre == "Veterinario", ct);
        var vet = await db.Usuarios.SingleOrDefaultAsync(x => x.Email == "historico@seed.vetclinic.invalid", ct);
        if (vet == null) {
            vet = new Usuario { NombreCompleto = Prefix + "Profesional sintético", Email = "historico@seed.vetclinic.invalid", RolId = role.Id };
            vet.PasswordHash = auth.HashPassword(vet, Convert.ToBase64String(RandomNumberGenerator.GetBytes(32))); db.Usuarios.Add(vet);
        } else if (vet.RolId != role.Id) throw new InvalidOperationException("La cuenta del lote histórico tiene otro rol.");
        var specialty = await db.Especialidades.SingleOrDefaultAsync(x => x.Nombre == Prefix + "Control general", ct);
        if (specialty == null) { specialty = new Especialidade { Nombre = Prefix + "Control general", CostoBase = 15000 }; db.Especialidades.Add(specialty); }
        var clients = await db.Clientes.Where(x => x.Email != null && x.Email.EndsWith("@history.vetclinic.invalid")).ToDictionaryAsync(x => x.Email!, ct);
        for (var i = 0; i < 50; i++) {
            var email = $"cliente{i}@history.vetclinic.invalid";
            if (clients.ContainsKey(email)) {
                if (!clients[email].NombreCompleto.StartsWith(Prefix)) throw new InvalidOperationException("Un correo reservado pertenece a un registro ajeno al lote.");
                continue;
            }
            var rut = DemoSeederService.DemoRut(99001000 + i);
            if (await db.Clientes.AnyAsync(x => x.DocumentoIdentidad.Replace(".", "") == rut, ct)) throw new InvalidOperationException("Un documento reservado ya existe. No se reemplazaron datos.");
            var c = new Cliente { NombreCompleto = Prefix + $"Cliente sintético {i:D3}", DocumentoIdentidad = rut, Email = email, Telefono = "+56000000000" };
            db.Clientes.Add(c); clients[email] = c; counts["clientes"]++;
        }
        await db.SaveChangesAsync(ct);
        var patients = await db.Pacientes.Where(x => x.Nombre.StartsWith(Prefix)).ToDictionaryAsync(x => x.Nombre, ct);
        for (var i = 0; i < 500; i++) {
            var name = Prefix + $"Paciente {i:D4}";
            if (patients.ContainsKey(name)) continue;
            var p = new Paciente { Nombre = name, ClienteId = clients[$"cliente{i % 50}@history.vetclinic.invalid"].Id, Especie = i % 2 == 0 ? "Canino" : "Felino", Raza = "Mestizo", Peso = i % 2 == 0 ? 12 : 4, Alergias = "Dato sintético" };
            patients[name] = p; db.Pacientes.Add(p); counts["pacientes"]++;
        }
        await db.SaveChangesAsync(ct);
        var ids = patients.Values.Select(x => x.Id).ToArray();
        var appointments = await db.Citas.Where(x => ids.Contains(x.PacienteId) && x.EspecialidadId == specialty.Id).ToDictionaryAsync(x => x.PacienteId, ct);
        var today = TimeZoneInfo.ConvertTimeBySystemTimeZoneId(DateTime.UtcNow, "America/Santiago").Date;
        for (var i = 0; i < 500; i++) {
            var patient = patients[Prefix + $"Paciente {i:D4}"];
            if (appointments.ContainsKey(patient.Id)) continue;
            var month = new DateTime(today.Year, today.Month, 1).AddMonths(-11 + i % 12);
            var days = month.Year == today.Year && month.Month == today.Month ? today.Day : 28;
            var date = month.AddDays((i / 12) % days).AddMinutes(9 * 60 + (i / 12) * 10);
            var appointment = new Cita { PacienteId = patient.Id, Usuario = vet, Especialidad = specialty, FechaHora = date, Estado = "Completada" };
            db.Citas.Add(appointment); appointments[patient.Id] = appointment; counts["citas"]++;
        }
        await db.SaveChangesAsync(ct);
        var appointmentIds = appointments.Values.Select(x => x.Id).ToArray();
        var consultations = await db.Consultas.Where(x => x.CitaId.HasValue && appointmentIds.Contains(x.CitaId.Value)).ToDictionaryAsync(x => x.CitaId!.Value, ct);
        foreach (var a in appointments.Values) {
            if (consultations.ContainsKey(a.Id)) continue;
            var c = new Consulta { CitaId = a.Id, PacienteId = a.PacienteId, Motivo = Prefix + "Control sintético", Diagnostico = "Ejemplo sintético sin valor clínico" };
            db.Consultas.Add(c); consultations[a.Id] = c; counts["consultas"]++;
        }
        await db.SaveChangesAsync(ct);
        var consultationIds = consultations.Values.Select(x => x.Id).ToArray();
        var invoiced = (await db.DetallesFacturas.Where(x => x.ConsultaId.HasValue && consultationIds.Contains(x.ConsultaId.Value)).Select(x => x.ConsultaId!.Value).ToListAsync(ct)).ToHashSet();
        var owners = patients.Values.ToDictionary(x => x.Id, x => x.ClienteId);
        foreach (var a in appointments.Values) {
            var c = consultations[a.Id]; if (invoiced.Contains(c.Id)) continue;
            var invoice = new Factura { ClienteId = owners[c.PacienteId], FechaEmision = DateOnly.FromDateTime(a.FechaHora), MontoImpuestos = 2850, MontoTotal = 17850 };
            db.Facturas.Add(invoice); db.DetallesFacturas.Add(new DetallesFactura { Factura = invoice, ConsultaId = c.Id, Subtotal = 15000 }); counts["facturas"]++;
        }
        await db.SaveChangesAsync(ct);
        if (tx != null) await tx.CommitAsync(ct);
        return counts;
    }
}
