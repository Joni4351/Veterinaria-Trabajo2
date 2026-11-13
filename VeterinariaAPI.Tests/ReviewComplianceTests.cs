using System.IO.Compression;
using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Xml.Linq;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using VeterinariaAPI.Models;
using VeterinariaAPI.Services;

namespace VeterinariaAPI.Tests;

public class ReviewComplianceTests
{
    [Theory]
    [InlineData(null, 401)] [InlineData("Recepcionista", 403)] [InlineData("Veterinario", 403)] [InlineData("Administrador", 200)]
    public async Task ReportsEnforceRoleAndFilters(string? role, int expected)
    {
        using var factory = new FacialFactory(); using var client = factory.Client(role);
        foreach (var type in new[] { "operativo", "gerencial", "periodo" })
            Assert.Equal(expected, (int)(await client.GetAsync($"/api/v1/admin/reportes/{type}")).StatusCode);
        if (expected != 200) return;
        Assert.Equal(HttpStatusCode.BadRequest, (await client.GetAsync("/api/v1/admin/reportes/operativo?desde=2030-01-01&hasta=2029-01-01")).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await client.GetAsync("/api/v1/admin/reportes/gerencial?estado=Cancelada")).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await client.GetAsync("/api/v1/admin/reportes/operativo?tamano=999")).StatusCode);
    }

    [Theory]
    [InlineData("operativo")] [InlineData("gerencial")] [InlineData("periodo")]
    public async Task EachReportExportsThreeValidRepresentationsAndAuditsActor(string type)
    {
        using var factory = new FacialFactory(); using var client = factory.Client();
        using var scope = factory.Services.CreateScope(); var db = scope.ServiceProvider.GetRequiredService<VeterinariodbContext>();
        foreach (var format in new[] { "csv", "pdf", "xlsx", "impresion" }) {
            var response = await client.GetAsync($"/api/v1/admin/reportes/{type}/exportar/{format}");
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var bytes = await response.Content.ReadAsByteArrayAsync();
            if (format == "pdf") { var text = Encoding.Latin1.GetString(bytes); Assert.StartsWith("%PDF-1.4", text); Assert.Contains("startxref", text); Assert.Contains("Página 1 de", text); }
            if (format == "csv") { Assert.Equal(new byte[] { 239, 187, 191 }, bytes[..3]); Assert.Contains(';', Encoding.UTF8.GetString(bytes)); }
            if (format == "xlsx") { using var zip = new ZipArchive(new MemoryStream(bytes)); Assert.NotNull(zip.GetEntry("xl/styles.xml")); using var reader = new StreamReader(zip.GetEntry("xl/worksheets/sheet1.xml")!.Open()); Assert.NotNull(XDocument.Parse(await reader.ReadToEndAsync())); if (type == "gerencial") Assert.NotNull(zip.GetEntry("xl/charts/chart1.xml")); }
            if (format == "impresion") Assert.True(JsonDocument.Parse(bytes).RootElement.TryGetProperty("filas", out _));
        }
        var audits = await db.Auditorias.Where(x => x.Entidad == "Reportes").ToListAsync();
        Assert.Equal(4, audits.Count); Assert.All(audits, a => Assert.Equal(1, a.UsuarioId));
        Assert.All(audits, a => { Assert.Equal("CREAR", a.Accion); Assert.Contains("EXPORTAR", a.ValoresNuevos); });
        var history = await client.GetFromJsonAsync<JsonElement>("/api/v1/admin/auditoria?accion=EXPORTAR&entidad=Reportes");
        Assert.Equal(4, history.GetProperty("total").GetInt32());
        Assert.All(history.GetProperty("registros").EnumerateArray(), a => Assert.Equal("EXPORTAR", a.GetProperty("accion").GetString()));
        var detail = await client.GetFromJsonAsync<JsonElement>($"/api/v1/admin/auditoria/{audits[0].Id}");
        Assert.Equal("EXPORTAR", detail.GetProperty("valoresNuevos").GetProperty("Operacion").GetString());
    }

    [Fact]
    public void CsvEscapesFormulaInjectionAndPreservesUnicode()
    {
        var document = new ReportDocument("operativo", "Prueba", DateTimeOffset.UtcNow, "", [new("Nombre"), new("Monto", "decimal")], [["=1+1;niño", 5.5m]], new(), new());
        var text = Encoding.UTF8.GetString(new CsvReportFormat().Encode(document));
        Assert.Contains("'=1+1;niño", text); Assert.Contains("5.50", text);
    }

    [Fact]
    public async Task SwaggerIncludesReportRoutesAndBearerSecurity()
    {
        using var factory = new FacialFactory(); using var client = factory.Client();
        var response = await client.GetAsync("/swagger/v1/swagger.json");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.True(json.RootElement.GetProperty("paths").TryGetProperty("/api/v1/admin/reportes/{tipo}", out var path));
        Assert.True(path.GetProperty("get").GetProperty("security").GetArrayLength() > 0);
        Assert.True(json.RootElement.GetProperty("components").GetProperty("securitySchemes").TryGetProperty("Bearer", out _));
    }

    [Fact]
    public async Task HistoricalDataIsSyntheticIdempotentAndSpansTwelveMonths()
    {
        using var factory = new FacialFactory(); using var client = factory.Client();
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsJsonAsync("/api/v1/admin/datos-prueba/historico", new { dataset = HistoricalSeederService.Dataset, confirmado = false })).StatusCode);
        var first = await client.PostAsJsonAsync("/api/v1/admin/datos-prueba/historico", new { dataset = HistoricalSeederService.Dataset, confirmado = true });
        Assert.Equal(HttpStatusCode.OK, first.StatusCode);
        using var scope = factory.Services.CreateScope(); var db = scope.ServiceProvider.GetRequiredService<VeterinariodbContext>();
        var appointments = await db.Citas.Where(x => x.Especialidad.Nombre.StartsWith(HistoricalSeederService.Prefix)).ToListAsync();
        Assert.Equal(500, appointments.Count); Assert.Equal(12, appointments.Select(x => (x.FechaHora.Year, x.FechaHora.Month)).Distinct().Count());
        Assert.Equal(500, await db.Pacientes.CountAsync(x => x.Nombre.StartsWith(HistoricalSeederService.Prefix)));
        var second = await client.PostAsJsonAsync("/api/v1/admin/datos-prueba/historico", new { dataset = HistoricalSeederService.Dataset, confirmado = true });
        var result = (await second.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("creados");
        Assert.All(result.EnumerateObject(), p => Assert.Equal(0, p.Value.GetInt32()));
    }

    [Theory]
    [InlineData("Pendiente", "Confirmada", true)] [InlineData("Confirmada", "En Curso", true)]
    [InlineData("En Curso", "Completada", true)] [InlineData("Cancelada", "Pendiente", false)]
    [InlineData("Completada", "Confirmada", false)] [InlineData("Pendiente", "Completada", false)]
    public void AppointmentStateMachineRejectsInvalidTransitions(string from, string to, bool allowed) => Assert.Equal(allowed, AppointmentStates.CanTransition(from, to));

    [Fact]
    public void PasswordsRequireAValidHash()
    {
        var auth = new AuthService(); var user = new Usuario { PasswordHash = "plaintext-import" };
        Assert.False(auth.VerifyPassword(user, "plaintext-import"));
        user.PasswordHash = auth.HashPassword(user, "test-password-only"); Assert.True(auth.VerifyPassword(user, "test-password-only")); Assert.False(auth.VerifyPassword(user, "wrong"));
    }

    [Fact]
    public async Task InitialDemoInvoiceAmountsMatchTheirDetailsAndTax()
    {
        using var factory = new FacialFactory(); using var client = factory.Client();
        using var scope = factory.Services.CreateScope(); var db = scope.ServiceProvider.GetRequiredService<VeterinariodbContext>();
        var invoices = await db.Facturas.Include(x => x.DetallesFacturas).ToListAsync();
        Assert.NotEmpty(invoices);
        foreach (var invoice in invoices) {
            var net = invoice.DetallesFacturas.Sum(x => x.Subtotal);
            Assert.Equal(decimal.Round(net * 0.19m, 2), invoice.MontoImpuestos);
            Assert.Equal(net + invoice.MontoImpuestos, invoice.MontoTotal);
        }
    }

}

