using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using VeterinariaAPI.Models;
using VeterinariaAPI.Services;

namespace VeterinariaAPI.Endpoints;

public static class LoginFacialApi
{
    public static IResult Session(Usuario usuario, IConfiguration config)
    {
        var claims = new[] { new Claim(ClaimTypes.NameIdentifier, usuario.Id.ToString()),
            new Claim(ClaimTypes.Name, usuario.NombreCompleto), new Claim(ClaimTypes.Email, usuario.Email),
            new Claim(ClaimTypes.Role, usuario.Rol?.Nombre ?? "Cliente") };
        var token = new JwtSecurityToken(config["Jwt:Issuer"], config["Jwt:Audience"], claims,
            expires: DateTime.UtcNow.AddMinutes(int.Parse(config["Jwt:ExpireMinutes"] ?? "60")),
            signingCredentials: new SigningCredentials(new SymmetricSecurityKey(Encoding.UTF8.GetBytes(config["Jwt:Key"]!)), SecurityAlgorithms.HmacSha256));
        return Results.Ok(new { token = new JwtSecurityTokenHandler().WriteToken(token) });
    }

    public static void MapLoginFacialApi(this WebApplication app)
    {
        app.MapPost("/api/v1/usuarios/login/facial", async (VerifyRequest request, VeterinariodbContext db,
            FacialLoginChallenges challenges, FacialEncryptionService encryption, IConfiguration config, HttpContext http) =>
        {
            http.Response.Headers.CacheControl = "no-store";
            if (request.Descriptor is not { Length: 128 } || request.Descriptor.Any(x => !double.IsFinite(x) || Math.Abs(x) > 10))
                return Results.BadRequest(new { message = "El descriptor debe contener 128 números válidos." });
            var challenge = challenges.Take(request.Challenge);
            if (challenge == null) return Results.Unauthorized();
            var user = await db.Usuarios.Include(x => x.Rol).SingleOrDefaultAsync(x => x.Id == challenge.UserId);
            var face = await db.ReconocimientosFaciales.SingleOrDefaultAsync(x => x.UsuarioId == challenge.UserId);
            // Revocation, replacement and credential changes invalidate an outstanding challenge.
            if (user == null || user.PasswordHash != challenge.PasswordHash || face == null || !face.Activo ||
                face.DescriptorFacial != challenge.EncryptedDescriptor || face.ConsentimientoFecha == null)
                return Results.Unauthorized();
            double[] stored;
            try { stored = encryption.Decrypt(face.DescriptorFacial, user.Id); }
            catch (Exception ex) when (ex is CryptographicException or FormatException or JsonException or InvalidOperationException or ArgumentException or KeyNotFoundException)
            { return Results.Problem(statusCode: 503, detail: "No se pudo verificar el registro facial. Contacte al administrador."); }
            var distance = Math.Sqrt(stored.Zip(request.Descriptor, (a, b) => (a - b) * (a - b)).Sum());
            if (distance > 0.5) return Results.Unauthorized();
            http.User = new ClaimsPrincipal(new ClaimsIdentity(new[] {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Name, user.NombreCompleto)
            }, "FacialLogin"));
            face.UltimoAcceso = DateTimeOffset.UtcNow;
            await db.SaveChangesAsync();
            return Session(user, config);
        }).WithTags("Autenticación facial").AllowAnonymous().RequireRateLimiting("AuthPolicy");
    }
    public record VerifyRequest(string? Challenge, double[]? Descriptor);
}
