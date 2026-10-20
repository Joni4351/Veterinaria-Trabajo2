using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using VeterinariaAPI.Models;
using Xunit;

namespace VeterinariaAPI.Tests
{
    public class TestBodyStreamStartupFilter : IStartupFilter
    {
        public Action<IApplicationBuilder> Configure(Action<IApplicationBuilder> next)
        {
            return app =>
            {
                app.Use(async (context, nextMiddleware) =>
                {
                    var originalBody = context.Response.Body;
                    using var memStream = new MemoryStream();
                    context.Response.Body = memStream;

                    await nextMiddleware();

                    memStream.Position = 0;
                    await memStream.CopyToAsync(originalBody);
                    context.Response.Body = originalBody;
                });

                next(app);
            };
        }
    }

    public class CustomWebApplicationFactory : WebApplicationFactory<Program>
    {
        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            builder.ConfigureServices(services =>
            {
                services.AddTransient<IStartupFilter, TestBodyStreamStartupFilter>();

                var descriptor = services.SingleOrDefault(d => d.ServiceType == typeof(DbContextOptions<VeterinariodbContext>));
                if (descriptor != null)
                {
                    services.Remove(descriptor);
                }

                services.AddDbContext<VeterinariodbContext>(options =>
                {
                    options.UseInMemoryDatabase("TestVeterinariaDb_" + Guid.NewGuid());
                });

                var sp = services.BuildServiceProvider();
                using var scope = sp.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<VeterinariodbContext>();
                db.Database.EnsureCreated();
                if (!db.Roles.Any())
                {
                    db.Roles.Add(new Role { Id = 1, Nombre = "Administrador", PermisosEscritura = true });
                    db.SaveChanges();
                }
            });
        }
    }

    public class ApiIntegrationTests : IClassFixture<CustomWebApplicationFactory>
    {
        private readonly CustomWebApplicationFactory _factory;
        private readonly HttpClient _client;

        public ApiIntegrationTests(CustomWebApplicationFactory factory)
        {
            _factory = factory;
            _client = factory.CreateClient();
        }

        private string GenerateTestJwt(string role = "Administrador")
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.UTF8.GetBytes("VeterinariaAPISecretKeyParaJWT2026_DebeTenerAlMenos32Caracteres!");
            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(new[]
                {
                    new Claim(ClaimTypes.Name, "AdminTest"),
                    new Claim(ClaimTypes.Role, role)
                }),
                Expires = DateTime.UtcNow.AddHours(1),
                Issuer = "VeterinariaAPI",
                Audience = "VeterinariaAPI",
                SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
            };
            var token = tokenHandler.CreateToken(tokenDescriptor);
            return tokenHandler.WriteToken(token);
        }

        [Fact]
        public async Task Test_GetUsuarios_Authenticated_ReturnsSuccessAndJson()
        {
            // Act: Invocación autenticada con rol Administrador
            var client = _factory.CreateClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", GenerateTestJwt("Administrador"));
            var response = await client.GetAsync("/api/v1/usuarios");

            // Assert: Verifica que la ruta responde 200 OK y no falla
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.NotNull(response.Content.Headers.ContentType);
            Assert.Equal("application/json; charset=utf-8", response.Content.Headers.ContentType.ToString());
        }

        [Fact]
        public async Task Test_GetUsuarios_Unauthenticated_ReturnsUnauthorized()
        {
            // Act: Invocación sin token
            var client = _factory.CreateClient();
            var response = await client.GetAsync("/api/v1/usuarios");

            // Assert: Rechazo 401 Unauthorized
            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        }

        [Fact]
        public async Task Test_GetUsuarios_InsufficientRole_ReturnsForbidden()
        {
            // Act: Invocación con rol sin permisos (e.g. Invitado)
            var client = _factory.CreateClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", GenerateTestJwt("ClienteInvitado"));
            var response = await client.GetAsync("/api/v1/usuarios");

            // Assert: Rechazo 403 Forbidden
            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }

        [Fact]
        public async Task Test_Login_InvalidCredentials_ReturnsUnauthorized()
        {
            // Arrange: Payload con credenciales falsas
            var invalidLogin = new
            {
                Email = "desconocido@veterinaria.com",
                Password = "Password123!"
            };

            // Act: Invocación al POST /login
            var response = await _client.PostAsJsonAsync("/api/v1/usuarios/login", invalidLogin);

            // Assert: Verifica que devuelva 401 Unauthorized
            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        }

        [Fact]
        public async Task Test_Register_InvalidModel_ReturnsValidationProblem()
        {
            // Arrange: DTO con datos inválidos (correo erróneo y contraseña corta)
            var invalidRegister = new
            {
                RolId = 1,
                NombreCompleto = "A",
                Email = "correo-invalido",
                Password = "123"
            };

            // Act: Invocación al POST /register
            var response = await _client.PostAsJsonAsync("/api/v1/usuarios/register", invalidRegister);

            // Assert: Verifica que el middleware/validación devuelva 400 Bad Request
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }

        [Fact]
        public async Task Test_RateLimiting_ExceedLimit_Returns429TooManyRequests()
        {
            // Arrange: Intentos de login seguidos para activar la AuthPolicy (Límite = 5)
            var payload = new { Email = "fail@test.com", Password = "wrong" };
            HttpResponseMessage lastResponse = null!;

            // Act: Realizar 7 peticiones consecutivas
            for (int i = 0; i < 7; i++)
            {
                lastResponse = await _client.PostAsJsonAsync("/api/v1/usuarios/login", payload);
            }

            // Assert: Las últimas peticiones deben ser bloqueadas con HTTP 429
            Assert.Equal((HttpStatusCode)429, lastResponse.StatusCode);
        }
    }
}