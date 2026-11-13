namespace VeterinariaAPI.Models;

public class Auditoria
{
    public long Id { get; set; }
    public DateTimeOffset FechaHora { get; set; }
    public int? UsuarioId { get; set; }
    public string? UsuarioNombre { get; set; }
    public string Accion { get; set; } = null!;
    public string Entidad { get; set; } = null!;
    public int RegistroId { get; set; }
    public string? ValoresAnteriores { get; set; }
    public string? ValoresNuevos { get; set; }
    public string Origen { get; set; } = null!;
    public Guid OperacionId { get; set; }
}
