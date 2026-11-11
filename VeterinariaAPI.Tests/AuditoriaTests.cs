using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using VeterinariaAPI.Models;

namespace VeterinariaAPI.Tests;

public class AuditoriaTests
{
    [Fact]
    public async Task EditingClientPreservesPreviousValuesAndAppearsInHistory()
    {
        using var factory = new FacialFactory(); using var client = factory.Client();
        var created = await client.PostAsJsonAsync("/api/v1/clientes", new
        {
            documentoIdentidad = "22.222.222-2", nombreCompleto = "Cliente de prueba",
            telefono = "+56992027788", email = "audit-client@example.com"
        });
        Assert.True(created.StatusCode == HttpStatusCode.Created, await created.Content.ReadAsStringAsync());
        var id = (await created.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetInt32();
        var updated = await client.PutAsJsonAsync($"/api/v1/clientes/{id}", new
        {
            documentoIdentidad = "22.222.222-2", nombreCompleto = "Cliente actualizado",
            telefono = "+56992027788", email = "audit-client@example.com"
        });
        Assert.Equal(HttpStatusCode.OK, updated.StatusCode);
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<VeterinariodbContext>();
        Assert.Equal("Cliente actualizado", (await db.Clientes.FindAsync(id))!.NombreCompleto);
        var change = await db.Auditorias.SingleAsync(x => x.Entidad == "Clientes" && x.RegistroId == id && x.Accion == "MODIFICAR");
        var detail = await client.GetFromJsonAsync<JsonElement>($"/api/v1/admin/auditoria/{change.Id}");
        Assert.Equal("Cliente de prueba", detail.GetProperty("valoresAnteriores").GetProperty("NombreCompleto").GetString());
        Assert.Equal("Cliente actualizado", detail.GetProperty("valoresNuevos").GetProperty("NombreCompleto").GetString());
    }

    [Fact]
    public void PostgreSqlAuditWriterSharesTheExistingConnection()
    {
        var options = new DbContextOptionsBuilder<VeterinariodbContext>()
            .UseNpgsql("Host=localhost;Database=audit_test;Username=test;Password=test").Options;
        using var source = new VeterinariodbContext(options);
        var connection = source.Database.GetDbConnection();
        var writerOptions = source.CreateAuditWriterOptions();
        Assert.Null(writerOptions.Extensions.OfType<Microsoft.EntityFrameworkCore.Infrastructure.RelationalOptionsExtension>().Single().ConnectionString);
        using var writer = new VeterinariodbContext(writerOptions);
        Assert.Same(connection, writer.Database.GetDbConnection());
        Assert.NotNull(writer.Model.FindEntityType(typeof(Auditoria)));
    }

    [Fact]
    public async Task ApiChangesRecordActorBeforeAfterAndGeneratedIds()
    {
        using var factory = new FacialFactory(); using var client = factory.Client();
        var created = await client.PostAsJsonAsync("/api/v1/insumos", new { nombreProducto = "Insumo auditado", tipo = "Ejemplo", stockActual = 10, precioUnitario = 1000 });
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        var id = (await created.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetInt32();
        Assert.Equal(HttpStatusCode.OK, (await client.PutAsJsonAsync($"/api/v1/insumos/{id}", new { nombreProducto = "Insumo auditado", tipo = "Ejemplo", stockActual = 8, precioUnitario = 1000 })).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await client.DeleteAsync($"/api/v1/insumos/{id}")).StatusCode);
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<VeterinariodbContext>();
        var events = await db.Auditorias.Where(x => x.Entidad == "Insumos" && x.RegistroId == id).OrderBy(x => x.Id).ToListAsync();
        Assert.Equal(new[] { "CREAR", "MODIFICAR", "ELIMINAR" }, events.Select(x => x.Accion));
        Assert.All(events, x => { Assert.Equal(1, x.UsuarioId); Assert.Equal("API", x.Origen); Assert.NotEqual(Guid.Empty, x.OperacionId); });
        Assert.Null(events[0].ValoresAnteriores);
        Assert.Equal(10, JsonDocument.Parse(events[1].ValoresAnteriores!).RootElement.GetProperty("StockActual").GetInt32());
        Assert.Equal(8, JsonDocument.Parse(events[1].ValoresNuevos!).RootElement.GetProperty("StockActual").GetInt32());
        Assert.Null(events[2].ValoresNuevos);
        Assert.Equal(3, events.Select(x => x.OperacionId).Distinct().Count());
    }

    [Theory]
    [InlineData(null, 401)]
    [InlineData("Veterinario", 403)]
    [InlineData("Recepcionista", 403)]
    public async Task HistoryRequiresAdministrator(string? role, int status)
    {
        using var factory = new FacialFactory(); using var client = factory.Client(role);
        foreach (var path in new[] { "/api/v1/admin/auditoria", "/api/v1/admin/auditoria/entidades", "/api/v1/admin/auditoria/1" })
            Assert.Equal(status, (int)(await client.GetAsync(path)).StatusCode);
    }

    [Fact]
    public async Task PasswordsAndDescriptorsNeverEnterSnapshots()
    {
        using var factory = new FacialFactory(); using var client = factory.Client();
        var email = "audit-user@example.com";
        var created = await client.PostAsJsonAsync("/api/v1/usuarios/register", new { nombreCompleto = "Usuario auditoría", email, password = "NeverLogMe123!", rolId = 2 });
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        var userId = (await created.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetInt32();
        var facial = await client.PostAsJsonAsync($"/api/v1/registro-facial/{userId}", new { descriptor = Enumerable.Repeat(0.123456789, 128).ToArray(), consentimiento = true, consentimientoVersion = "registro-facial-v1" });
        Assert.Equal(HttpStatusCode.Created, facial.StatusCode);
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<VeterinariodbContext>();
        var userAudit = await db.Auditorias.SingleAsync(x => x.Entidad == "Usuarios" && x.RegistroId == userId && x.Accion == "CREAR");
        Assert.DoesNotContain("Password", userAudit.ValoresNuevos!, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("NeverLogMe", userAudit.ValoresNuevos!);
        var facialAudit = await db.Auditorias.SingleAsync(x => x.Entidad == "ReconocimientoFacial" && x.Accion == "CREAR");
        Assert.DoesNotContain("DescriptorFacial", facialAudit.ValoresNuevos!);
        Assert.DoesNotContain("ciphertext", facialAudit.ValoresNuevos!);
        Assert.DoesNotContain("0.123456789", facialAudit.ValoresNuevos!);

        // Defense in depth when an older/external writer stored an unsafe JSON snapshot.
        userAudit.ValoresNuevos = "{\"NombreCompleto\":\"Usuario\",\"PasswordHash\":\"DO-NOT-EXPOSE\"}";
        await db.SaveChangesAsync();
        var detail = await client.GetStringAsync($"/api/v1/admin/auditoria/{userAudit.Id}");
        Assert.DoesNotContain("DO-NOT-EXPOSE", detail);
        Assert.DoesNotContain("PasswordHash", detail);
    }

    [Fact]
    public async Task InvoiceEventsShareOperationIncludingStockAndDetails()
    {
        using var factory = new FacialFactory(); using var client = factory.Client();
        var response = await client.PostAsJsonAsync("/api/v1/facturas", new {
            clienteId = 1, fechaEmision = DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, TimeZoneInfo.FindSystemTimeZoneById("America/Santiago"))), montoTotal = 0, montoImpuestos = 0,
            items = new[] { new { tipo = "insumo", insumoId = 1, cantidad = 2 } }
        });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var invoiceId = (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetInt32();
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<VeterinariodbContext>();
        var header = await db.Auditorias.SingleAsync(x => x.Entidad == "Facturas" && x.RegistroId == invoiceId);
        var events = await db.Auditorias.Where(x => x.OperacionId == header.OperacionId).ToListAsync();
        Assert.Contains(events, x => x.Entidad == "DetallesFactura" && x.Accion == "CREAR");
        Assert.Contains(events, x => x.Entidad == "Insumos" && x.Accion == "MODIFICAR");
        var list = await client.GetFromJsonAsync<JsonElement>($"/api/v1/admin/auditoria?operacionId={header.OperacionId}&tamano=1");
        Assert.Equal(events.Count, list.GetProperty("total").GetInt32());
        Assert.Single(list.GetProperty("registros").EnumerateArray());
        Assert.Equal(events.Count, list.GetProperty("resumen").EnumerateArray().Sum(x => x.GetProperty("cantidad").GetInt32()));
        var search = await client.GetFromJsonAsync<JsonElement>($"/api/v1/admin/auditoria?operacionId={header.OperacionId}&buscar=insumos");
        Assert.True(search.GetProperty("total").GetInt32() > 0);
        Assert.All(search.GetProperty("registros").EnumerateArray(), row => Assert.Equal("Insumos", row.GetProperty("entidad").GetString()));
    }

    [Fact]
    public async Task UserDeletionPreservesHistoryAndDoesNotAuditHistoryReads()
    {
        using var factory = new FacialFactory(); using var client = factory.Client();
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<VeterinariodbContext>();
        var user = new Usuario { RolId = 2, NombreCompleto = "Actor histórico", Email = "historic@example.com", PasswordHash = "private" };
        db.Usuarios.Add(user); await db.SaveChangesAsync();
        var reference = new Auditoria { FechaHora = DateTimeOffset.UtcNow, UsuarioId = user.Id, UsuarioNombre = "Actor histórico", Accion = "MODIFICAR", Entidad = "Pacientes", RegistroId = 20, Origen = "API", OperacionId = Guid.NewGuid() };
        db.Auditorias.Add(reference); await db.SaveChangesAsync();
        Assert.Equal(HttpStatusCode.NoContent, (await client.DeleteAsync($"/api/v1/usuarios/{user.Id}")).StatusCode);
        await db.Entry(reference).ReloadAsync();
        Assert.Null(reference.UsuarioId); Assert.Equal("Actor histórico", reference.UsuarioNombre);
        var count = await db.Auditorias.CountAsync();
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/v1/admin/auditoria")).StatusCode);
        Assert.Equal(count, await db.Auditorias.CountAsync());
    }

    [Fact]
    public async Task RejectedRequestsDoNotCreateChangeEventsAndHistoryIsReadOnly()
    {
        using var factory = new FacialFactory(); using var client = factory.Client();
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<VeterinariodbContext>();
        var before = await db.Auditorias.CountAsync();
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsJsonAsync("/api/v1/insumos", new { nombreProducto = "Prueba", tipo = "Medicamento", stockActual = -1, precioUnitario = 1000 })).StatusCode);
        Assert.Equal(before, await db.Auditorias.CountAsync());
        Assert.Equal(HttpStatusCode.MethodNotAllowed, (await client.DeleteAsync("/api/v1/admin/auditoria/1")).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await client.GetAsync("/api/v1/admin/auditoria?pagina=0")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/v1/admin/auditoria?desde=2026-09-06&hasta=2026-09-06")).StatusCode);
    }
}
