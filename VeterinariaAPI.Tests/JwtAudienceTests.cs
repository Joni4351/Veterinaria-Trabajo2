using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using Microsoft.IdentityModel.Tokens;

namespace VeterinariaAPI.Tests;

public class JwtAudienceTests(FacialFactory factory) : IClassFixture<FacialFactory>
{
    private static string Token(string? audience, string issuer = "FacialTests", string role = "Administrador",
        string? key = null, bool expired = false)
    {
        var jwt = new JwtSecurityToken(issuer, audience, new[] {
            new Claim(ClaimTypes.NameIdentifier, "1"), new Claim(ClaimTypes.Role, role)
        }, expires: DateTime.UtcNow.AddMinutes(expired ? -15 : 10), signingCredentials: new SigningCredentials(
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key ?? FacialFactory.Key)), SecurityAlgorithms.HmacSha256));
        return new JwtSecurityTokenHandler().WriteToken(jwt);
    }

    [Theory]
    [InlineData("FacialTests", 200)]
    [InlineData("OtraAplicacion", 401)]
    [InlineData(null, 401)]
    [InlineData("", 401)]
    public async Task ProtectedEndpointChecksAudience(string? audience, int expected)
    {
        using var client = factory.Client(role: null);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", Token(audience));
        Assert.Equal(expected, (int)(await client.GetAsync("/api/v1/roles")).StatusCode);
    }

    [Theory]
    [InlineData("issuer")]
    [InlineData("signature")]
    [InlineData("expiry")]
    public async Task CorrectAudienceDoesNotBypassOtherTokenChecks(string invalid)
    {
        using var client = factory.Client(role: null);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", Token("FacialTests",
            issuer: invalid == "issuer" ? "OtroEmisor" : "FacialTests",
            key: invalid == "signature" ? "different-signing-key-test-only-at-least-32-bytes" : null,
            expired: invalid == "expiry"));
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/v1/roles")).StatusCode);
    }

    [Fact]
    public async Task ValidAudienceDoesNotGrantAdminPrivileges()
    {
        using var client = factory.Client(role: null);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", Token("FacialTests", role: "Veterinario"));
        Assert.Equal(HttpStatusCode.Forbidden, (await client.GetAsync("/api/v1/roles")).StatusCode);
    }

    [Fact]
    public async Task LoginIssuesTokenWithAudienceAcceptedByProtectedEndpoint()
    {
        using var client = factory.Client(role: null);
        var login = await client.PostAsJsonAsync("/api/v1/usuarios/login", new {
            email = "admin@veterinaria.com", password = "Admin123*"
        });
        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
        var body = await login.Content.ReadFromJsonAsync<JsonElement>();
        var token = body.GetProperty("token").GetString()!;
        var decoded = new JwtSecurityTokenHandler().ReadJwtToken(token);
        Assert.Contains("FacialTests", decoded.Audiences);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/v1/roles")).StatusCode);
    }
}
