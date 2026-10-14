using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace VeterinariaAPI.Models;

public partial class Consulta
{
    public int Id { get; set; }

    public int PacienteId { get; set; }

    public int? CitaId { get; set; }

    public string Motivo { get; set; } = null!;

    public string? Diagnostico { get; set; }
    [JsonIgnore]
    public virtual Cita? Cita { get; set; }
    [JsonIgnore]
    public virtual ICollection<DetallesFactura> DetallesFacturas { get; set; } = new List<DetallesFactura>();
    [JsonIgnore]
    public virtual Paciente Paciente { get; set; } = null!;
    [JsonIgnore]
    public virtual Receta? Receta { get; set; }
}
