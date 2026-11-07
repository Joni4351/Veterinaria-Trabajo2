using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using VeterinariaAPI.Models;

namespace VeterinariaAPI.Tests;

public class FacialFactory : WebApplicationFactory<Program>
{
    public const string Key = "facial-tests-only-jwt-secret-32bytes-minimum";
    public static readonly byte[] EncryptionKey = Enumerable.Range(1, 32).Select(x => (byte)x).ToArray();
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseSetting("Jwt:Key", Key);
        builder.UseSetting("Jwt:Issuer", "FacialTests");
        builder.UseSetting("Jwt:Audience", "FacialTests");
        builder.UseSetting("Biometrics:EncryptionKey", Convert.ToBase64String(EncryptionKey));
        builder.ConfigureServices(services =>
        {
            services.AddTransient<IStartupFilter, TestBodyStreamStartupFilter>();
            var descriptors = services.Where(s => s.ServiceType == typeof(DbContextOptions<VeterinariodbContext>) ||
                s.ServiceType.FullName?.Contains("IDbContextOptionsConfiguration") == true).ToArray();
            foreach (var descriptor in descriptors) services.Remove(descriptor);
            services.AddDbContext<VeterinariodbContext>(o => o.UseInMemoryDatabase("Facial-" + GetHashCode()));
        });
    }

    public HttpClient Client(string? role = "Administrador", int id = 1)
    {
        var client = CreateClient();
        if (role != null)
        {
            var jwt = new JwtSecurityToken("FacialTests", "FacialTests", new[] {
                new Claim(ClaimTypes.NameIdentifier, id.ToString()), new Claim(ClaimTypes.Role, role)
            }, expires: DateTime.UtcNow.AddMinutes(10), signingCredentials: new SigningCredentials(
                new SymmetricSecurityKey(Encoding.UTF8.GetBytes(Key)), SecurityAlgorithms.HmacSha256));
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", new JwtSecurityTokenHandler().WriteToken(jwt));
        }
        return client;
    }
}

public class RegistroFacialTests : IClassFixture<FacialFactory>
{
    private readonly FacialFactory factory;
    public RegistroFacialTests(FacialFactory factory) { this.factory = factory; }
    private static object Payload(int length = 128, bool consent = true, DateTimeOffset? updated = null) => new {
        descriptor = Enumerable.Range(0, length).Select(i => i * 0.001).ToArray(),
        consentimiento = consent, consentimientoVersion = "registro-facial-v1", fechaActualizacion = updated
    };

    [Theory]
    [InlineData(null, 401)]
    [InlineData("Veterinario", 403)]
    [InlineData("Recepcionista", 403)]
    public async Task EveryOperationRejectsUnauthorizedRoles(string? role, int expected)
    {
        using var client = factory.Client(role);
        foreach (var response in new[] {
            await client.GetAsync("/api/v1/registro-facial/usuarios"),
            await client.GetAsync("/api/v1/registro-facial/2"),
            await client.PostAsJsonAsync("/api/v1/registro-facial/2", Payload()),
            await client.PutAsJsonAsync("/api/v1/registro-facial/2", Payload()),
            await client.DeleteAsync("/api/v1/registro-facial/2") })
            Assert.Equal(expected, (int)response.StatusCode);
    }

    [Fact]
    public async Task AdminClaimWithoutExistingAdminAccountIsRejected()
    {
        using var client = factory.Client(id: 999999);
        Assert.Equal(HttpStatusCode.Forbidden, (await client.GetAsync("/api/v1/registro-facial/usuarios")).StatusCode);
    }

    [Theory]
    [InlineData(127, true)]
    [InlineData(129, true)]
    [InlineData(128, false)]
    public async Task InvalidDescriptorOrMissingConsentIsRejected(int length, bool consent)
    {
        using var client = factory.Client();
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsJsonAsync("/api/v1/registro-facial/2", Payload(length, consent))).StatusCode);
    }

    [Fact]
    public async Task CrudEncryptsAndPreservesAccountAndAccessMetadata()
    {
        using var client = factory.Client();
        const string url = "/api/v1/registro-facial/2";
        var create = await client.PostAsJsonAsync(url, Payload());
        Assert.Equal(HttpStatusCode.Created, create.StatusCode);
        var body = await create.Content.ReadAsStringAsync();
        Assert.DoesNotContain("descriptor", body, StringComparison.OrdinalIgnoreCase);
        Assert.True(create.Headers.CacheControl?.NoStore);
        Assert.Equal(HttpStatusCode.Conflict, (await client.PostAsJsonAsync(url, Payload())).StatusCode);
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<VeterinariodbContext>();
            var record = await db.ReconocimientosFaciales.SingleAsync(r => r.UsuarioId == 2);
            Assert.Null(record.UltimoAcceso);
            Assert.NotNull(record.ConsentimientoFecha);
            Assert.Equal(1, record.ConsentimientoAdministradorId);
            var envelope = JsonDocument.Parse(record.DescriptorFacial).RootElement;
            var cipher = Convert.FromBase64String(envelope.GetProperty("ciphertext").GetString()!);
            var plain = new byte[cipher.Length];
            using var aes = new AesGcm(FacialFactory.EncryptionKey, 16);
            aes.Decrypt(Convert.FromBase64String(envelope.GetProperty("nonce").GetString()!), cipher,
                Convert.FromBase64String(envelope.GetProperty("tag").GetString()!), plain, Encoding.UTF8.GetBytes("VetClinic:face:v1:2"));
            Assert.Equal(128, JsonSerializer.Deserialize<double[]>(plain)!.Length);
            record.Activo = false;
            record.UltimoAcceso = DateTimeOffset.UtcNow.AddDays(-1);
            await db.SaveChangesAsync();
        }
        var update = await client.PutAsJsonAsync(url, Payload());
        Assert.Equal(HttpStatusCode.OK, update.StatusCode);
        var metadata = (await update.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("registroFacial");
        Assert.False(metadata.GetProperty("activo").GetBoolean());
        Assert.Equal(HttpStatusCode.Conflict, (await client.PutAsJsonAsync(url, Payload())).StatusCode);
        var list = await client.GetStringAsync("/api/v1/registro-facial/usuarios?buscar=vet%40veterinaria.com");
        Assert.Contains("vet@veterinaria.com", list);
        Assert.DoesNotContain("ciphertext", list);
        Assert.DoesNotContain("password", list, StringComparison.OrdinalIgnoreCase);
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync(url)).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await client.DeleteAsync(url)).StatusCode);
        using var checkScope = factory.Services.CreateScope();
        var checkDb = checkScope.ServiceProvider.GetRequiredService<VeterinariodbContext>();
        Assert.True(await checkDb.Usuarios.AnyAsync(u => u.Id == 2));
        Assert.False(await checkDb.ReconocimientosFaciales.AnyAsync(r => r.UsuarioId == 2));
    }

    [Fact]
    public async Task UnknownUserCannotReceiveFacialRecord()
    {
        using var client = factory.Client();
        Assert.Equal(HttpStatusCode.NotFound, (await client.PostAsJsonAsync("/api/v1/registro-facial/999999", Payload())).StatusCode);
    }
}
