//using Microsoft.AspNetCore.Authentication.JwtBearer;
//using Microsoft.EntityFrameworkCore;
//using Microsoft.IdentityModel.Tokens;
//using Scalar.AspNetCore;
//using System.Text;
//using System.Text.Json.Serialization;
//using VeterinariaAPI.Endpoints;
//using VeterinariaAPI.Models;
//using VeterinariaAPI.Repositories;
//using VeterinariaAPI.Services;
//using VeterinariaAPI.Middlewares;

//var builder = WebApplication.CreateBuilder(args);

//// Configuración de JSON para evitar errores por ciclos de navegación en EF Core
//builder.Services.ConfigureHttpJsonOptions(options =>
//{
//    options.SerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
//});

//// Configuración de JWT
//var jwtKey = builder.Configuration["Jwt:Key"];
//var jwtIssuer = builder.Configuration["Jwt:Issuer"];
//var jwtAudience = builder.Configuration["Jwt:Audience"];

//builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
//    .AddJwtBearer(options =>
//    {
//        options.TokenValidationParameters = new TokenValidationParameters
//        {
//            ValidateIssuer = true,
//            ValidateAudience = false,
//            ValidateLifetime = true,
//            ValidateIssuerSigningKey = true,
//            ValidIssuer = jwtIssuer,
//            ValidAudience = jwtAudience,
//            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
//        };
//    });

//// Inyección de Dependencias (Repositorios y Servicios)
//builder.Services.AddScoped(typeof(IRepository<>), typeof(Repository<>));
//builder.Services.AddScoped<IUsuarioRepository, UsuarioRepository>();
//builder.Services.AddScoped<AuthService>();

//builder.Services.AddAuthorization();
//builder.Services.AddOpenApi();

//builder.Services.AddDbContext<VeterinariodbContext>(options =>
//    options.UseSqlServer(builder.Configuration.GetConnectionString("miconexion")));

//// =========================================================
//// CONSTRUIR LA APLICACIÓN
//// =========================================================
//var app = builder.Build();

//// =========================================================
//// CONFIGURACIÓN DEL PIPELINE HTTP
//// =========================================================
//app.UseMiddleware<GlobalExceptionMiddleware>();
//if (app.Environment.IsDevelopment())
//{
//    app.MapOpenApi();
//    app.MapScalarApiReference();
//}

//app.UseAuthentication();
//app.UseAuthorization();

//// Mapeo de Endpoints
//app.MapRolApi();
//app.MapEspecialidadApi();
//app.MapClienteApi();
//app.MapFacturasApi();
//app.MapPacientesApi();
//app.MapInsumosApi();
//app.MapDetalleRecetaApi();
//app.MapCitasApi();
//app.MapRecetaApi();
//app.MapDetalleFacApi();
//app.MapConsultasApi();
//app.MapUsuariosApi();
//app.MapGet("/api/test-error", () =>
//{
//    throw new Exception("Prueba de falla capturada por el middleware");
//});

//app.Run();

using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using VeterinariaAPI.Endpoints;
using VeterinariaAPI.Middlewares;
using VeterinariaAPI.Models;
using VeterinariaAPI.Repositories;
using VeterinariaAPI.Services;

var builder = WebApplication.CreateBuilder(args);

// ==========================================
// 1. CONFIGURACIÓN DE JSON (Ciclos de EF Core)
// ==========================================
builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
});

// ==========================================
// 2. CONFIGURACIÓN DE AUTENTICACIÓN JWT
// ==========================================
var jwtKey = builder.Configuration["Jwt:Key"]!;
var jwtIssuer = builder.Configuration["Jwt:Issuer"]!;
var jwtAudience = builder.Configuration["Jwt:Audience"]!;

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = false,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtIssuer,
            ValidAudience = jwtAudience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
        };
    });

builder.Services.AddAuthorization();

// ==========================================
// 3. INYECCIÓN DE DEPENDENCIAS Y BASE DE DATOS
// ==========================================
builder.Services.AddScoped(typeof(IRepository<>), typeof(Repository<>));
builder.Services.AddScoped<IUsuarioRepository, UsuarioRepository>();
builder.Services.AddScoped<AuthService>();

builder.Services.AddDbContext<VeterinariodbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("miconexion")));

// OpenApi y Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// ==========================================
// 4. CONFIGURACIÓN DE CORS
// ==========================================
builder.Services.AddCors(options =>
{
    options.AddPolicy("FrontendPolicy", policy =>
    {
        policy.WithOrigins("http://localhost:3000", "http://localhost:5173")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

// ==========================================
// 5. CONFIGURACIÓN DE RATE LIMITING (Global e Individual)
// ==========================================
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    // Límite global por IP aumentado para soportar filtros rápidos y refresco continuo
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "global",
            factory: partition => new FixedWindowRateLimiterOptions
            {
                AutoReplenishment = true,
                PermitLimit = 1000,
                QueueLimit = 50,
                Window = TimeSpan.FromMinutes(1)
            }));

    // Política para Login / Register (Rate Limiting de seguridad)
    options.AddFixedWindowLimiter("AuthPolicy", opt =>
    {
        opt.PermitLimit = 5;
        opt.Window = TimeSpan.FromMinutes(1);
        opt.QueueLimit = 0;
    });
});

// =========================================================
// CONSTRUIR LA APLICACIÓN
// =========================================================
var app = builder.Build();

// =========================================================
// CONFIGURACIÓN DEL PIPELINE HTTP
// =========================================================
app.UseMiddleware<GlobalExceptionMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// =========================================================
// CABECERAS DE SEGURIDAD HTTP (OWASP API8 / Web Top 10)
// =========================================================
app.Use(async (context, next) =>
{
    context.Response.Headers.Append("X-Content-Type-Options", "nosniff");
    context.Response.Headers.Append("X-Frame-Options", "DENY");
    context.Response.Headers.Append("X-XSS-Protection", "1; mode=block");
    context.Response.Headers.Append("Referrer-Policy", "strict-origin-when-cross-origin");
    await next();
});

app.UseCors("FrontendPolicy");
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

// =========================================================
// MAPEO DE ENDPOINTS DIRECTO
// =========================================================
app.MapRolApi();
app.MapEspecialidadApi();
app.MapClienteApi();
app.MapFacturasApi();
app.MapPacientesApi();
app.MapInsumosApi();
app.MapDetalleRecetaApi();
app.MapCitasApi();
app.MapRecetaApi();
app.MapDetalleFacApi();
app.MapConsultasApi();
app.MapUsuariosApi();

app.MapGet("/api/test-error", () =>
{
    throw new Exception("Prueba de falla capturada por el middleware");
});

// =========================================================
// =========================================================
// SEMBRADO AUTOMÁTICO DE DATOS INICIALES (SEED DATA)
// =========================================================
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var db = services.GetRequiredService<VeterinariodbContext>();
        var auth = services.GetRequiredService<AuthService>();

        // 1. Roles
        if (!db.Roles.Any())
        {
            db.Roles.AddRange(
                new Role { Id = 1, Nombre = "Administrador", PermisosEscritura = true },
                new Role { Id = 2, Nombre = "Veterinario", PermisosEscritura = true },
                new Role { Id = 3, Nombre = "Recepcionista", PermisosEscritura = false }
            );
            db.SaveChanges();
        }

        // 2. Usuarios
        if (!db.Usuarios.Any())
        {
            var admin = new Usuario
            {
                RolId = 1,
                NombreCompleto = "Jonathan Garrido",
                Email = "admin@veterinaria.com"
            };
            admin.PasswordHash = auth.HashPassword(admin, "Admin123*");

            var vet = new Usuario
            {
                RolId = 2,
                NombreCompleto = "Dr. Carlos Mendoza",
                Email = "vet@veterinaria.com"
            };
            vet.PasswordHash = auth.HashPassword(vet, "Vet123*");

            var recep = new Usuario
            {
                RolId = 3,
                NombreCompleto = "Ana Silva",
                Email = "recep@veterinaria.com"
            };
            recep.PasswordHash = auth.HashPassword(recep, "Recep123*");

            db.Usuarios.AddRange(admin, vet, recep);
            db.SaveChanges();
        }

        // 3. Especialidades
        if (!db.Especialidades.Any())
        {
            db.Especialidades.AddRange(
                new Especialidade { Nombre = "Medicina General", CostoBase = 25000.00m },
                new Especialidade { Nombre = "Cirugía", CostoBase = 120000.00m },
                new Especialidade { Nombre = "Dermatología", CostoBase = 40000.00m },
                new Especialidade { Nombre = "Odontología", CostoBase = 50000.00m },
                new Especialidade { Nombre = "Traumatología", CostoBase = 75000.00m }
            );
            db.SaveChanges();
        }

        // 4. Insumos
        if (!db.Insumos.Any())
        {
            db.Insumos.AddRange(
                new Insumo { NombreProducto = "Amoxicilina 500mg", Tipo = "Antibiótico", StockActual = 150, PrecioUnitario = 8500.00m },
                new Insumo { NombreProducto = "Meloxicam Gotas 10ml", Tipo = "Antiinflamatorio", StockActual = 80, PrecioUnitario = 12000.00m },
                new Insumo { NombreProducto = "Vacuna Séxtuple Canina", Tipo = "Vacuna", StockActual = 45, PrecioUnitario = 18000.00m },
                new Insumo { NombreProducto = "Vacuna Triple Felina", Tipo = "Vacuna", StockActual = 30, PrecioUnitario = 16500.00m },
                new Insumo { NombreProducto = "NexGard Spectra Antiparasitario", Tipo = "Antiparasitario", StockActual = 60, PrecioUnitario = 22000.00m },
                new Insumo { NombreProducto = "Suero Fisiológico 500ml", Tipo = "Insumo Médico", StockActual = 200, PrecioUnitario = 4500.00m }
            );
            db.SaveChanges();
        }

        // 5. Clientes y Pacientes
        if (!db.Clientes.Any())
        {
            var cliente1 = new Cliente
            {
                DocumentoIdentidad = "18.765.432-7",
                NombreCompleto = "Jonathan Garrido",
                Telefono = "+56992027788",
                Email = "joni@gmail.com"
            };
            var cliente2 = new Cliente
            {
                DocumentoIdentidad = "12.345.678-5",
                NombreCompleto = "Juan Pérez",
                Telefono = "+56912345678",
                Email = "juan.perez@example.com"
            };
            var cliente3 = new Cliente
            {
                DocumentoIdentidad = "11.111.111-1",
                NombreCompleto = "María González",
                Telefono = "+56987654321",
                Email = "maria.gonzalez@example.com"
            };
            var cliente4 = new Cliente
            {
                DocumentoIdentidad = "7.654.321-6",
                NombreCompleto = "Pedro Soto",
                Telefono = "+56976543210",
                Email = "pedro.soto@example.com"
            };
            var cliente5 = new Cliente
            {
                DocumentoIdentidad = "19.876.543-0",
                NombreCompleto = "Camila Morales",
                Telefono = "+56954321678",
                Email = "camila.morales@example.com"
            };

            db.Clientes.AddRange(cliente1, cliente2, cliente3, cliente4, cliente5);
            db.SaveChanges();

            if (!db.Pacientes.Any())
            {
                var p1 = new Paciente { ClienteId = cliente1.Id, Nombre = "Thor", Especie = "Canino", Raza = "Pastor Alemán", Peso = 34.50m, Alergias = "Ninguna" };
                var p2 = new Paciente { ClienteId = cliente1.Id, Nombre = "Milo", Especie = "Felino", Raza = "Europeo Común", Peso = 4.80m, Alergias = "Sensibilidad digestiva" };
                var p3 = new Paciente { ClienteId = cliente2.Id, Nombre = "Max", Especie = "Canino", Raza = "Golden Retriever", Peso = 31.20m, Alergias = "Ninguna" };
                var p4 = new Paciente { ClienteId = cliente3.Id, Nombre = "Luna", Especie = "Felino", Raza = "Siamés", Peso = 3.90m, Alergias = "Polen de temporada" };
                var p5 = new Paciente { ClienteId = cliente4.Id, Nombre = "Rocky", Especie = "Canino", Raza = "Bulldog Francés", Peso = 13.10m, Alergias = "Dermatitis por pulgas" };
                var p6 = new Paciente { ClienteId = cliente5.Id, Nombre = "Simba", Especie = "Felino", Raza = "Persa", Peso = 5.20m, Alergias = "Ninguna" };

                db.Pacientes.AddRange(p1, p2, p3, p4, p5, p6);
                db.SaveChanges();

                // Citas
                var vetUser = db.Usuarios.FirstOrDefault(u => u.RolId == 2) ?? db.Usuarios.First();
                var espGeneral = db.Especialidades.FirstOrDefault(e => e.Nombre == "Medicina General") ?? db.Especialidades.First();
                var espDerma = db.Especialidades.FirstOrDefault(e => e.Nombre == "Dermatología") ?? db.Especialidades.First();
                var espOdonto = db.Especialidades.FirstOrDefault(e => e.Nombre == "Odontología") ?? db.Especialidades.First();
                var espCirugia = db.Especialidades.FirstOrDefault(e => e.Nombre == "Cirugía") ?? db.Especialidades.First();

                var c1 = new Cita { PacienteId = p1.Id, UsuarioId = vetUser.Id, EspecialidadId = espGeneral.Id, FechaHora = DateTime.Today.AddDays(1).AddHours(10), Estado = "Confirmada" };
                var c2 = new Cita { PacienteId = p2.Id, UsuarioId = vetUser.Id, EspecialidadId = espDerma.Id, FechaHora = DateTime.Today.AddDays(-1).AddHours(11), Estado = "Completada" };
                var c3 = new Cita { PacienteId = p3.Id, UsuarioId = vetUser.Id, EspecialidadId = espGeneral.Id, FechaHora = DateTime.Today.AddDays(2).AddHours(9), Estado = "Confirmada" };
                var c4 = new Cita { PacienteId = p4.Id, UsuarioId = vetUser.Id, EspecialidadId = espOdonto.Id, FechaHora = DateTime.Today.AddDays(2).AddHours(14), Estado = "Pendiente" };
                var c5 = new Cita { PacienteId = p5.Id, UsuarioId = vetUser.Id, EspecialidadId = espCirugia.Id, FechaHora = DateTime.Today.AddDays(3).AddHours(16), Estado = "Confirmada" };

                db.Citas.AddRange(c1, c2, c3, c4, c5);
                db.SaveChanges();

                // Consultas
                var con1 = new Consulta
                {
                    PacienteId = p2.Id,
                    CitaId = c2.Id,
                    Motivo = "Control de rutina y revisión de piel por rascado frecuente",
                    Diagnostico = "Dermatitis atópica leve. Se indica tratamiento con antiinflamatorio y loción calmante."
                };
                var con2 = new Consulta
                {
                    PacienteId = p1.Id,
                    CitaId = null,
                    Motivo = "Control post-vacunación anual y chequeo general",
                    Diagnostico = "Paciente en excelente condición corporal y signos vitales estables."
                };
                var con3 = new Consulta
                {
                    PacienteId = p3.Id,
                    CitaId = null,
                    Motivo = "Molestia en pata delantera izquierda tras paseo en parque",
                    Diagnostico = "Esguince leve en articulación metacarpiana. Reposo indicado por 5 días."
                };

                db.Consultas.AddRange(con1, con2, con3);
                db.SaveChanges();

                // Recetas
                var insumoMeloxicam = db.Insumos.FirstOrDefault(i => i.NombreProducto.Contains("Meloxicam")) ?? db.Insumos.First();
                var insumoAmoxicilina = db.Insumos.FirstOrDefault(i => i.NombreProducto.Contains("Amoxicilina")) ?? db.Insumos.First();
                var insumoNexgard = db.Insumos.FirstOrDefault(i => i.NombreProducto.Contains("NexGard")) ?? db.Insumos.First();

                var r1 = new Receta { ConsultaId = con1.Id, FechaEmision = DateOnly.FromDateTime(DateTime.Today.AddDays(-5)), ValidaHasta = DateOnly.FromDateTime(DateTime.Today.AddDays(25)) };
                var r2 = new Receta { ConsultaId = con3.Id, FechaEmision = DateOnly.FromDateTime(DateTime.Today.AddDays(-2)), ValidaHasta = DateOnly.FromDateTime(DateTime.Today.AddDays(28)) };
                db.Recetas.AddRange(r1, r2);
                db.SaveChanges();

                var dr1 = new DetallesRecetum { RecetaId = r1.Id, InsumoId = insumoMeloxicam.Id, Dosis = "3 gotas cada 24 horas por vía oral", DuracionDias = 7 };
                var dr2 = new DetallesRecetum { RecetaId = r1.Id, InsumoId = insumoAmoxicilina.Id, Dosis = "1/2 comprimido cada 12 horas", DuracionDias = 10 };
                var dr3 = new DetallesRecetum { RecetaId = r2.Id, InsumoId = insumoMeloxicam.Id, Dosis = "5 gotas cada 24 horas con alimento", DuracionDias = 5 };
                db.DetallesReceta.AddRange(dr1, dr2, dr3);
                db.SaveChanges();

                // Facturas
                var f1 = new Factura { ClienteId = cliente1.Id, FechaEmision = DateOnly.FromDateTime(DateTime.Today.AddDays(-5)), MontoImpuestos = 7600.00m, MontoTotal = 47600.00m };
                var f2 = new Factura { ClienteId = cliente2.Id, FechaEmision = DateOnly.FromDateTime(DateTime.Today.AddDays(-2)), MontoImpuestos = 7030.00m, MontoTotal = 44030.00m };
                var f3 = new Factura { ClienteId = cliente3.Id, FechaEmision = DateOnly.FromDateTime(DateTime.Today.AddDays(-1)), MontoImpuestos = 4750.00m, MontoTotal = 29750.00m };
                db.Facturas.AddRange(f1, f2, f3);
                db.SaveChanges();

                var df1 = new DetallesFactura { FacturaId = f1.Id, ConsultaId = con1.Id, InsumoId = null, Subtotal = 40000.00m };
                var df2 = new DetallesFactura { FacturaId = f1.Id, ConsultaId = null, InsumoId = insumoMeloxicam.Id, Subtotal = 12000.00m };
                var df3 = new DetallesFactura { FacturaId = f2.Id, ConsultaId = con3.Id, InsumoId = null, Subtotal = 25000.00m };
                var df4 = new DetallesFactura { FacturaId = f3.Id, ConsultaId = null, InsumoId = insumoNexgard.Id, Subtotal = 22000.00m };
                db.DetallesFacturas.AddRange(df1, df2, df3, df4);
                db.SaveChanges();
            }
        }
    }
    catch (Exception ex)
    {
        var logger = services.GetRequiredService<ILogger<Program>>();
        logger.LogWarning(ex, "Aviso: No se pudo verificar o sembrar la base de datos inicial.");
    }
}

app.Run();

public partial class Program { }