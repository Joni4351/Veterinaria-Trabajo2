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

app.Run();

public partial class Program { }