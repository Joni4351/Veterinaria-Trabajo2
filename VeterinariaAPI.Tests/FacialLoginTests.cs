using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using VeterinariaAPI.Models;
using VeterinariaAPI.Services;

namespace VeterinariaAPI.Tests;

public class FacialLoginTests
{
    private static readonly double[] Descriptor = Enumerable.Repeat(.01, 128).ToArray();
    private static async Task Register(FacialFactory factory, bool active = true)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<VeterinariodbContext>();
        db.ReconocimientosFaciales.Add(new ReconocimientoFacial { UsuarioId = 1, Activo = active,
            DescriptorFacial = scope.ServiceProvider.GetRequiredService<FacialEncryptionService>().Encrypt(Descriptor, 1),
            FechaRegistro = DateTimeOffset.UtcNow, ConsentimientoFecha = DateTimeOffset.UtcNow, ConsentimientoVersion = "registro-facial-v1" });
        await db.SaveChangesAsync();
    }
    private static Task<HttpResponseMessage> Login(HttpClient client, string password = "Admin123*") =>
        client.PostAsJsonAsync("/api/v1/usuarios/login", new { email = "admin@veterinaria.com", password });

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task NoActiveFaceSkipsTheFacialStep(bool inactive)
    {
        using var factory = new FacialFactory(); using var client = factory.Client(null);
        if (inactive) await Register(factory, false);
        var response = await Login(client);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.True((await response.Content.ReadFromJsonAsync<JsonElement>()).TryGetProperty("token", out _));
    }

    [Fact]
    public async Task ActiveFaceRequiresPasswordThenMatchingFaceAndCannotReplay()
    {
        using var factory = new FacialFactory(); using var client = factory.Client(null); await Register(factory);
        Assert.Equal(HttpStatusCode.Unauthorized, (await Login(client, "wrong-password")).StatusCode);
        var response = await Login(client);
        var payload = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(payload.GetProperty("requiresFacial").GetBoolean());
        Assert.False(payload.TryGetProperty("token", out _));
        var challenge = payload.GetProperty("challenge").GetString();
        client.DefaultRequestHeaders.Authorization = new("Bearer", challenge);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/v1/clientes")).StatusCode);
        client.DefaultRequestHeaders.Authorization = null;
        var verified = await client.PostAsJsonAsync("/api/v1/usuarios/login/facial", new { challenge, descriptor = Descriptor });
        Assert.Equal(HttpStatusCode.OK, verified.StatusCode);
        var token = (await verified.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("token").GetString();
        client.DefaultRequestHeaders.Authorization = new("Bearer", token);
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/v1/clientes")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.PostAsJsonAsync("/api/v1/usuarios/login/facial", new { challenge, descriptor = Descriptor })).StatusCode);
        using var scope = factory.Services.CreateScope();
        Assert.NotNull((await scope.ServiceProvider.GetRequiredService<VeterinariodbContext>().ReconocimientosFaciales.SingleAsync()).UltimoAcceso);
        var accessEvent = await scope.ServiceProvider.GetRequiredService<VeterinariodbContext>().Auditorias
            .SingleAsync(x => x.Entidad == "ReconocimientoFacial" && x.Accion == "MODIFICAR");
        Assert.Equal(1, accessEvent.UsuarioId);
    }

    [Fact]
    public async Task WrongFaceIsRejectedAndConsumesTheChallenge()
    {
        using var factory = new FacialFactory(); using var client = factory.Client(null); await Register(factory);
        var challenge = (await (await Login(client)).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("challenge").GetString();
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.PostAsJsonAsync("/api/v1/usuarios/login/facial", new { challenge, descriptor = Enumerable.Repeat(.9, 128) })).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.PostAsJsonAsync("/api/v1/usuarios/login/facial", new { challenge, descriptor = Descriptor })).StatusCode);
    }

    [Fact]
    public async Task MissingChallengeAndChangedRegistrationCannotAuthenticate()
    {
        using var factory = new FacialFactory(); using var client = factory.Client(null); await Register(factory);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.PostAsJsonAsync("/api/v1/usuarios/login/facial", new { descriptor = Descriptor })).StatusCode);
        var challenge = (await (await Login(client)).Content.ReadFromJsonAsync<JsonElement>()).GetProperty("challenge").GetString();
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<VeterinariodbContext>();
            (await db.ReconocimientosFaciales.SingleAsync()).Activo = false;
            await db.SaveChangesAsync();
        }
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.PostAsJsonAsync("/api/v1/usuarios/login/facial", new { challenge, descriptor = Descriptor })).StatusCode);
    }

    [Fact]
    public void ChallengesExpireAndAreSingleUse()
    {
        var clock = new TestClock(); var service = new FacialLoginChallenges(clock);
        var challenge = service.Create(1, "hash", "encrypted")!;
        Assert.NotNull(service.Take(challenge)); Assert.Null(service.Take(challenge));
        challenge = service.Create(1, "hash", "encrypted")!;
        clock.Now = clock.Now.AddMinutes(2);
        Assert.Null(service.Take(challenge));
    }
    private sealed class TestClock : TimeProvider
    {
        public DateTimeOffset Now = DateTimeOffset.UtcNow;
        public override DateTimeOffset GetUtcNow() => Now;
    }
}
