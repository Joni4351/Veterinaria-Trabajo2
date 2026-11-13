using System.Text.Json.Serialization;

namespace VeterinariaAPI.Models;

public class ReconocimientoFacial
{
    public int Id { get; set; }
    public int UsuarioId { get; set; }
    [JsonIgnore]
    public string DescriptorFacial { get; set; } = null!;
    public DateTimeOffset FechaRegistro { get; set; }
    public DateTimeOffset? FechaActualizacion { get; set; }
    public DateTimeOffset? UltimoAcceso { get; set; }
    public bool Activo { get; set; } = true;
    public DateTimeOffset? ConsentimientoFecha { get; set; }
    public int? ConsentimientoAdministradorId { get; set; }
    public string? ConsentimientoVersion { get; set; }
}
