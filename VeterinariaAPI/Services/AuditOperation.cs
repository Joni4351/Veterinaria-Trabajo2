using System.Security.Claims;

namespace VeterinariaAPI.Services;

public class AuditOperation(IHttpContextAccessor? accessor = null)
{
    public Guid Id { get; } = Guid.NewGuid();
    public int? UserId => accessor?.HttpContext?.User.Identity?.IsAuthenticated == true &&
        int.TryParse(accessor.HttpContext.User.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;
    public string? UserName => accessor?.HttpContext?.User.FindFirstValue(ClaimTypes.Name);
    public string Origin => accessor?.HttpContext == null || accessor.HttpContext.Request.Path.StartsWithSegments("/api/v1/admin/datos-prueba")
        ? "SISTEMA" : "API";
}
