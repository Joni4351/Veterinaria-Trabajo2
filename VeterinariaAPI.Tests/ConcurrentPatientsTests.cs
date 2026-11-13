using System.Diagnostics;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using VeterinariaAPI.Models;
using VeterinariaAPI.Services;
using Xunit.Abstractions;

namespace VeterinariaAPI.Tests;

// A concurrent API smoke test, not a production/database benchmark.
public class ConcurrentPatientsTests(ITestOutputHelper output)
{
    private const int Users = 20;
    private sealed record Sample(double Milliseconds, int Status);
    private sealed record Phase(string Operation, int Requests, int Errors, int PeakInFlight,
        double MeanMs, double P95Ms, double MaxMs, double ElapsedMs);

    [Fact]
    public async Task TwentyAuthenticatedUsersCanCreateReadUpdateAndAdministratorCanDeletePatients()
    {
        using var factory = new FacialFactory();
        using var bootstrap = factory.Client();
        var prefix = "CARGA-" + Guid.NewGuid().ToString("N")[..8];
        var actors = new List<Usuario>();
        int ownerId, baseline;
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<VeterinariodbContext>();
            // Fail closed if the fixture is ever changed to use an external database.
            Assert.True(db.Database.IsInMemory(), "Esta prueba solo admite una base InMemory aislada.");
            baseline = await db.Pacientes.CountAsync();
            var roleId = await db.Roles.Where(x => x.Nombre == "Veterinario").Select(x => x.Id).SingleAsync();
            var owner = new Cliente { DocumentoIdentidad = "22.222.222-2", NombreCompleto = prefix,
                Telefono = "+56912345678", Email = prefix.ToLowerInvariant() + "@example.invalid" };
            db.Clientes.Add(owner);
            var auth = scope.ServiceProvider.GetRequiredService<AuthService>();
            for (var index = 0; index < Users; index++)
            {
                var actor = new Usuario { RolId = roleId, NombreCompleto = $"{prefix}-Usuario-{index}",
                    Email = $"{prefix.ToLowerInvariant()}-{index}@example.invalid" };
                actor.PasswordHash = auth.HashPassword(actor, Guid.NewGuid().ToString("N"));
                actors.Add(actor);
            }
            db.Usuarios.AddRange(actors); await db.SaveChangesAsync(); ownerId = owner.Id;
        }
        var clients = actors.Select(actor => factory.Client("Veterinario", actor.Id)).ToArray();
        var patients = new int[Users];
        var phases = new List<Phase>();
        var run = Stopwatch.StartNew();
        try
        {
            // Warm the same authenticated route; exclude startup/JIT from the samples.
            using (var warm = await bootstrap.GetAsync($"/api/v1/pacientes?clienteId={ownerId}")) warm.EnsureSuccessStatusCode();
            var baselineReads = new List<double>();
            for (var index = 0; index < Users; index++)
            {
                var timer = Stopwatch.StartNew();
                using var response = await clients[index].GetAsync($"/api/v1/pacientes?clienteId={ownerId}");
                response.EnsureSuccessStatusCode(); baselineReads.Add(timer.Elapsed.TotalMilliseconds);
            }

            async Task RunPhase(string name, HttpStatusCode expected, Func<int, Task<HttpResponseMessage>> send,
                Func<int, HttpResponseMessage, Task>? check = null)
            {
                var gate = new TaskCompletionSource<bool>(TaskCreationOptions.RunContinuationsAsynchronously);
                var active = 0; var peak = 0;
                var wall = Stopwatch.StartNew();
                var tasks = Enumerable.Range(0, Users).Select(async index =>
                {
                    await gate.Task;
                    var count = Interlocked.Increment(ref active);
                    int previous;
                    do { previous = Volatile.Read(ref peak); if (count <= previous) break; }
                    while (Interlocked.CompareExchange(ref peak, count, previous) != previous);
                    var timer = Stopwatch.StartNew();
                    try
                    {
                        using var response = await send(index);
                        var sample = new Sample(timer.Elapsed.TotalMilliseconds, (int)response.StatusCode);
                        if (response.StatusCode == expected && check != null) await check(index, response);
                        return sample;
                    }
                    finally { Interlocked.Decrement(ref active); }
                }).ToArray();
                gate.SetResult(true);
                var samples = await Task.WhenAll(tasks);
                var ordered = samples.Select(x => x.Milliseconds).OrderBy(x => x).ToArray();
                phases.Add(new(name, Users, samples.Count(x => x.Status != (int)expected), peak,
                    ordered.Average(), ordered[(int)Math.Ceiling(Users * .95) - 1], ordered[^1], wall.Elapsed.TotalMilliseconds));
                Assert.All(samples, sample => Assert.Equal((int)expected, sample.Status));
            }

            await RunPhase("Crear pacientes", HttpStatusCode.Created, index => clients[index].PostAsJsonAsync("/api/v1/pacientes",
                new { clienteId = ownerId, nombre = $"{prefix}-{index}", especie = "Canino", raza = "Mestizo", peso = 12.5m, alergias = "Sin antecedentes" }),
                async (index, response) => patients[index] = (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetInt32());
            Assert.Equal(Users, patients.Distinct().Count());
            Assert.All(patients, id => Assert.True(id > 0));

            await RunPhase("Consultar pacientes", HttpStatusCode.OK, index => clients[index].GetAsync($"/api/v1/pacientes?clienteId={ownerId}"),
                async (index, response) =>
                {
                    var list = await response.Content.ReadFromJsonAsync<JsonElement[]>();
                    Assert.Equal(Users, list!.Length);
                    Assert.Contains(list, patient => patient.GetProperty("id").GetInt32() == patients[index]);
                });
            await RunPhase("Actualizar pacientes", HttpStatusCode.OK, index => clients[index].PutAsJsonAsync($"/api/v1/pacientes/{patients[index]}",
                new { clienteId = ownerId, nombre = $"{prefix}-{index}-actualizado", especie = "Canino", raza = "Mestizo", peso = 13.5m, alergias = "Sin antecedentes" }));
            await RunPhase("Comprobar actualizaciones", HttpStatusCode.OK, index => clients[index].GetAsync($"/api/v1/pacientes?clienteId={ownerId}"),
                async (index, response) =>
                {
                    var list = await response.Content.ReadFromJsonAsync<JsonElement[]>();
                    var patient = Assert.Single(list!, x => x.GetProperty("id").GetInt32() == patients[index]);
                    Assert.Equal($"{prefix}-{index}-actualizado", patient.GetProperty("nombre").GetString());
                    Assert.Equal(13.5m, patient.GetProperty("peso").GetDecimal());
                });
            await RunPhase("Eliminar pacientes como administrador", HttpStatusCode.NoContent, index => bootstrap.DeleteAsync($"/api/v1/pacientes/{patients[index]}"));

            using (var scope = factory.Services.CreateScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<VeterinariodbContext>();
                Assert.Equal(baseline, await db.Pacientes.CountAsync());
                Assert.False(await db.Pacientes.AnyAsync(x => x.ClienteId == ownerId));
                var events = await db.Auditorias.Where(x => x.Entidad == "Pacientes" && patients.Contains(x.RegistroId)).ToListAsync();
                Assert.Equal(Users * 3, events.Count);
                for (var index = 0; index < Users; index++)
                {
                    var own = events.Where(x => x.RegistroId == patients[index]).ToArray();
                    Assert.Equal(new[] { "CREAR", "ELIMINAR", "MODIFICAR" }, own.Select(x => x.Accion).OrderBy(x => x));
                    Assert.All(own, item => Assert.Equal(item.Accion == "ELIMINAR" ? 1 : actors[index].Id, item.UsuarioId));
                }
                // Dispose the complete isolated store afterwards; remove test-only actors/owner as well.
                db.Clientes.Remove(await db.Clientes.FindAsync(ownerId) ?? throw new InvalidOperationException());
                db.Usuarios.RemoveRange(await db.Usuarios.Where(x => actors.Select(a => a.Id).Contains(x.Id)).ToListAsync());
                await db.SaveChangesAsync();
            }
            var report = new
            {
                GeneratedUtc = DateTimeOffset.UtcNow, VirtualUsers = Users, PatientsCreated = Users, PatientsDeleted = Users,
                PatientsRemaining = 0, BaselinePatients = baseline, AuditEventsVerified = Users * 3,
                Provider = "EF Core InMemory / ASP.NET Core TestServer", TotalElapsedMs = run.Elapsed.TotalMilliseconds,
                SequentialReadMeanMs = baselineReads.Average(), SequentialReadMaxMs = baselineReads.Max(),
                Phases = phases, ErrorRatePercent = phases.Sum(x => x.Errors) * 100.0 / phases.Sum(x => x.Requests),
                ReadsWithin3000Ms = phases.Where(x => x.Operation.Contains("Consultar") || x.Operation.Contains("Comprobar")).All(x => x.MaxMs <= 3000),
                WritesWithin5000Ms = phases.Where(x => !x.Operation.Contains("Consultar") && !x.Operation.Contains("Comprobar")).All(x => x.MaxMs <= 5000),
                Limitations = "Ráfagas de 20 sesiones autenticadas con JWT de prueba para alta, consulta y edición; borrados concurrentes por una cuenta administradora. No prueba sostenida, ni login concurrente, ni navegador, red real, PostgreSQL o Supabase. No acredita los RNF de producción."
            };
            var path = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "TestResults", "concurrencia-pacientes-20.json"));
            Directory.CreateDirectory(Path.GetDirectoryName(path)!);
            await File.WriteAllTextAsync(path, JsonSerializer.Serialize(report, new JsonSerializerOptions { WriteIndented = true }));
            output.WriteLine("Informe de prueba aislada: " + path);
            foreach (var phase in phases) output.WriteLine($"{phase.Operation}: {phase.Requests} solicitudes, {phase.Errors} errores, pico {phase.PeakInFlight}, máximo {phase.MaxMs:F2} ms");
            // Twenty virtual users start together, but fast responses can complete before
            // the scheduler dispatches every continuation. Preserve the measured overlap;
            // an exact peak of twenty is not a portable correctness requirement.
            Assert.All(phases, phase => Assert.InRange(phase.PeakInFlight, 1, Users));
            Assert.True(report.ReadsWithin3000Ms, "Las consultas excedieron 3 s en el entorno aislado.");
            Assert.True(report.WritesWithin5000Ms, "Las escrituras excedieron 5 s en el entorno aislado.");
        }
        finally { foreach (var client in clients) client.Dispose(); }
    }
}
