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
        private readonly string _dbName = "TestVeterinariaDb_" + Guid.NewGuid().ToString("N");

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
                    options.UseInMemoryDatabase(_dbName);
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
                if (!db.Clientes.Any())
                {
                    db.Clientes.Add(new Cliente { Id = 1, DocumentoIdentidad = "11.111.111-1", NombreCompleto = "Cliente Seed", Telefono = "+56911111111", Email = "cliente@test.com" });
                    db.SaveChanges();
                }
                if (!db.Especialidades.Any())
                {
                    db.Especialidades.Add(new Especialidade { Id = 1, Nombre = "Medicina General", CostoBase = 25000m });
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
            var key = Encoding.UTF8.GetBytes("Mi_super-claveultra-secreta1234:)");
            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(new[]
                {
                    new Claim(ClaimTypes.Name, "AdminTest"),
                    new Claim(ClaimTypes.Role, role)
                }),
                Expires = DateTime.UtcNow.AddHours(1),
                Issuer = "VeterinarioApi",
                Audience = "VeterinarioApiUsuarios",
                SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
            };
            var token = tokenHandler.CreateToken(tokenDescriptor);
            return tokenHandler.WriteToken(token);
        }

        [ExternalDatabaseFact]
        public async Task Test_Supabase_Connection()
        {
            var connectionString = Environment.GetEnvironmentVariable("VETCLINIC_TEST_POSTGRES_CONNECTION")
                ?? throw new InvalidOperationException("Configure la conexión de pruebas externa mediante una variable de entorno.");
            await using var conn = new Npgsql.NpgsqlConnection(connectionString);
            await conn.OpenAsync();
            await using var cmd = new Npgsql.NpgsqlCommand("SELECT 1", conn);
            var result = await cmd.ExecuteScalarAsync();
            Assert.NotNull(result);
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
            // Act: Invocación directa sin encabezado Authorization
            var response = await _client.GetAsync("/api/v1/usuarios");

            // Assert: Verifica que devuelva 401 Unauthorized
            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        }

        [Fact]
        public async Task Test_GetUsuarios_InsufficientRole_ReturnsForbidden()
        {
            // Act: Invocación autenticada con rol ajeno a la política
            var client = _factory.CreateClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", GenerateTestJwt("ClienteInvitado"));
            var response = await client.GetAsync("/api/v1/usuarios");

            // Assert: Verifica que devuelva 403 Forbidden
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
            _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", GenerateTestJwt());
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

        [Fact]
        public async Task Test_Facturacion_CalculoIvaYDescuentoStock()
        {
            var client = _factory.CreateClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", GenerateTestJwt("Administrador"));

            int clienteId;
            int espId = 100;
            int insumoId = 100;
            int consultaId;

            using (var scope = _factory.Services.CreateScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<VeterinariodbContext>();
                var cliente = new Cliente { DocumentoIdentidad = "15.432.123-K", NombreCompleto = "Cliente Test Factura", Telefono = "+56911223344", Email = "factura_test@veterinaria.com" };
                db.Clientes.Add(cliente);
                db.SaveChanges();
                clienteId = cliente.Id;

                var esp = new Especialidade { Id = espId, Nombre = "Consulta Test", CostoBase = 20000m };
                db.Especialidades.Add(esp);

                var insumo = new Insumo { Id = insumoId, NombreProducto = "Insumo Test", Tipo = "Fármaco", StockActual = 10, PrecioUnitario = 1000m };
                db.Insumos.Add(insumo);

                db.SaveChanges();
                var paciente = new Paciente { ClienteId = clienteId, Nombre = "Paciente facturado", Especie = "Canino", Peso = 5 };
                db.Pacientes.Add(paciente);
                db.SaveChanges();
                var consulta = new Consulta { PacienteId = paciente.Id, Motivo = "Control de prueba", Diagnostico = "Sin hallazgos" };
                db.Consultas.Add(consulta);
                db.SaveChanges();
                consultaId = consulta.Id;
            }

            var payload = new
            {
                ClienteId = clienteId,
                FechaEmision = DateOnly.FromDateTime(DateTime.Today),
                MontoImpuestos = 0m,
                MontoTotal = 0m,
                Items = new[]
                {
                    new { Tipo = "cita", EspecialidadId = (int?)espId, InsumoId = (int?)null, ConsultaId = (int?)consultaId, Cantidad = 1, PrecioUnitario = 20000m, Subtotal = 20000m },
                    new { Tipo = "insumo", EspecialidadId = (int?)null, InsumoId = (int?)insumoId, ConsultaId = (int?)null, Cantidad = 2, PrecioUnitario = 1000m, Subtotal = 2000m }
                }
            };

            var response = await client.PostAsJsonAsync("/api/v1/facturas", payload);
            Assert.Equal(HttpStatusCode.Created, response.StatusCode);

            var facturaCreada = await response.Content.ReadFromJsonAsync<Factura>();
            Assert.NotNull(facturaCreada);

            // Subtotal = 20.000 + 2.000 = 22.000
            // IVA 19% = Math.Round(22.000 * 0.19) = 4.180
            // Total = 22.000 + 4.180 = 26.180
            Assert.Equal(4180m, facturaCreada.MontoImpuestos);
            Assert.Equal(26180m, facturaCreada.MontoTotal);

            // Verificar que se descontaron 2 unidades del stock del insumo (de 10 a 8)
            using (var scope = _factory.Services.CreateScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<VeterinariodbContext>();
                var insumoActualizado = await db.Insumos.FindAsync(insumoId);
                Assert.NotNull(insumoActualizado);
                Assert.Equal(8, insumoActualizado.StockActual);
            }
        }

        [Fact]
        public async Task Test_Facturacion_RechazaCitasDuplicadas()
        {
            var client = _factory.CreateClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", GenerateTestJwt("Administrador"));

            var payload = new
            {
                ClienteId = 1,
                FechaEmision = DateOnly.FromDateTime(DateTime.Today),
                MontoImpuestos = 0m,
                MontoTotal = 0m,
                Items = new[]
                {
                    new { Tipo = "cita", EspecialidadId = (int?)1, InsumoId = (int?)null, ConsultaId = (int?)null, Cantidad = 1, PrecioUnitario = 25000m, Subtotal = 25000m },
                    new { Tipo = "cita", EspecialidadId = (int?)1, InsumoId = (int?)null, ConsultaId = (int?)null, Cantidad = 1, PrecioUnitario = 25000m, Subtotal = 25000m }
                }
            };

            var response = await client.PostAsJsonAsync("/api/v1/facturas", payload);
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }

        [Fact]
        public async Task Test_Facturacion_RechazaStockInsuficiente()
        {
            var client = _factory.CreateClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", GenerateTestJwt("Administrador"));

            int insumoId = 200;
            using (var scope = _factory.Services.CreateScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<VeterinariodbContext>();
                var insumo = new Insumo { Id = insumoId, NombreProducto = "Stock Limitado", Tipo = "Test", StockActual = 3, PrecioUnitario = 500m };
                db.Insumos.Add(insumo);
                db.SaveChanges();
            }

            var payload = new
            {
                ClienteId = 1,
                FechaEmision = DateOnly.FromDateTime(DateTime.Today),
                MontoImpuestos = 0m,
                MontoTotal = 0m,
                Items = new[]
                {
                    new { Tipo = "insumo", EspecialidadId = (int?)null, InsumoId = (int?)insumoId, ConsultaId = (int?)null, Cantidad = 10, PrecioUnitario = 500m, Subtotal = 5000m }
                }
            };

            var response = await client.PostAsJsonAsync("/api/v1/facturas", payload);
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

            // Verificar que el stock no fue modificado
            using (var scope = _factory.Services.CreateScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<VeterinariodbContext>();
                var insumoSinCambios = await db.Insumos.FindAsync(insumoId);
                Assert.NotNull(insumoSinCambios);
                Assert.Equal(3, insumoSinCambios.StockActual);
            }
        }

        [Fact]
        public async Task Test_Facturacion_ConCitaAgenda_CalculaIvaYAsociaDetalle()
        {
            var client = _factory.CreateClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", GenerateTestJwt("Administrador"));

            int citaId = 501;
            int espId = 502;
            int pacId = 503;

            using (var scope = _factory.Services.CreateScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<VeterinariodbContext>();
                var esp = new Especialidade { Id = espId, Nombre = "Dermatología Especializada", CostoBase = 30000m };
                db.Especialidades.Add(esp);

                var pac = new Paciente { Id = pacId, Nombre = "Bobby", Especie = "Perro", Raza = "Poodle", ClienteId = 1 };
                db.Pacientes.Add(pac);

                var cita = new Cita { Id = citaId, PacienteId = pacId, UsuarioId = 1, EspecialidadId = espId, FechaHora = DateTime.Now, Estado = "Confirmada" };
                db.Citas.Add(cita);
                db.Consultas.Add(new Consulta { PacienteId = pacId, CitaId = citaId, Motivo = "Consulta de prueba", Diagnostico = "Sin hallazgos" });
                db.SaveChanges();
            }

            var payload = new
            {
                ClienteId = 1,
                FechaEmision = DateOnly.FromDateTime(DateTime.Today),
                MontoImpuestos = 0m,
                MontoTotal = 0m,
                Items = new[]
                {
                    new { Tipo = "cita", EspecialidadId = (int?)null, InsumoId = (int?)null, ConsultaId = (int?)null, CitaId = (int?)citaId, Cantidad = 1, PrecioUnitario = 30000m, Subtotal = 30000m }
                }
            };

            var response = await client.PostAsJsonAsync("/api/v1/facturas", payload);
            Assert.Equal(HttpStatusCode.Created, response.StatusCode);

            var factura = await response.Content.ReadFromJsonAsync<Factura>();
            Assert.NotNull(factura);

            // Subtotal = 30.000
            // IVA 19% = 30.000 * 0.19 = 5.700
            // Total = 35.700
            Assert.Equal(5700m, factura.MontoImpuestos);
            Assert.Equal(35700m, factura.MontoTotal);
        }

        [Fact]
        public async Task Test_Facturacion_Edicion_ReformulaTotalEImpuestos()
        {
            var client = _factory.CreateClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", GenerateTestJwt("Administrador"));

            int facturaId;
            int insumoId = 601;

            using (var scope = _factory.Services.CreateScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<VeterinariodbContext>();
                var insumo = new Insumo { Id = insumoId, NombreProducto = "Antibiótico Test", Tipo = "Fármaco", StockActual = 20, PrecioUnitario = 10000m };
                db.Insumos.Add(insumo);

                var factura = new Factura
                {
                    ClienteId = 1,
                    FechaEmision = DateOnly.FromDateTime(DateTime.Today),
                    MontoImpuestos = 1900m,
                    MontoTotal = 11900m
                };
                db.Facturas.Add(factura);
                db.SaveChanges();
                facturaId = factura.Id;

                db.DetallesFacturas.Add(new DetallesFactura
                {
                    FacturaId = facturaId,
                    InsumoId = insumoId,
                    Subtotal = 10000m
                });
                insumo.StockActual -= 1; // 19
                db.SaveChanges();
            }

            // Editar la factura cambiando a 2 unidades de insumo (Subtotal = 20.000)
            var putPayload = new
            {
                ClienteId = 1,
                FechaEmision = DateOnly.FromDateTime(DateTime.Today),
                MontoImpuestos = 0m,
                MontoTotal = 0m,
                Items = new[]
                {
                    new { Tipo = "insumo", EspecialidadId = (int?)null, InsumoId = (int?)insumoId, ConsultaId = (int?)null, CitaId = (int?)null, Cantidad = 2, PrecioUnitario = 10000m, Subtotal = 20000m }
                }
            };

            var putResponse = await client.PutAsJsonAsync($"/api/v1/facturas/{facturaId}", putPayload);
            Assert.Equal(HttpStatusCode.OK, putResponse.StatusCode);

            var facturaEditada = await putResponse.Content.ReadFromJsonAsync<Factura>();
            Assert.NotNull(facturaEditada);

            // Subtotal = 20.000
            // IVA 19% = 20.000 * 0.19 = 3.800
            // Total = 23.800
            Assert.Equal(3800m, facturaEditada.MontoImpuestos);
            Assert.Equal(23800m, facturaEditada.MontoTotal);

            // Verificar que el inventario se ajustó correctamente (restituyó 1 y descontó 2 -> stock = 18)
            using (var scope = _factory.Services.CreateScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<VeterinariodbContext>();
                var insumoDb = await db.Insumos.FindAsync(insumoId);
                Assert.NotNull(insumoDb);
                Assert.Equal(18, insumoDb.StockActual);
            }
        }
    }
}
