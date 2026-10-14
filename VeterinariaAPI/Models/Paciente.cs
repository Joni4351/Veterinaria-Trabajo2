using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace VeterinariaAPI.Models;

public partial class Paciente
{
    public int Id { get; set; }

    public int ClienteId { get; set; }

    public string Nombre { get; set; } = null!;

    public string Especie { get; set; } = null!;

    public string? Raza { get; set; }

    public decimal? Peso { get; set; }

    public string? Alergias { get; set; }
    [JsonIgnore]
    public virtual ICollection<Cita> Cita { get; set; } = new List<Cita>();
    [JsonIgnore]
    public virtual Cliente Cliente { get; set; } = null!;
    [JsonIgnore]
    public virtual ICollection<Consulta> Consulta { get; set; } = new List<Consulta>();
}
