using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace VeterinariaAPI.Models;

public partial class Cita
{
    public int Id { get; set; }

    public int PacienteId { get; set; }

    public int UsuarioId { get; set; }

    public int EspecialidadId { get; set; }

    public DateTime FechaHora { get; set; }

    public string Estado { get; set; } = null!;
    [JsonIgnore]
    public virtual ICollection<Consulta> Consulta { get; set; } = new List<Consulta>();
    [JsonIgnore]
    public virtual Especialidade Especialidad { get; set; } = null!;
    [JsonIgnore]
    public virtual Paciente Paciente { get; set; } = null!;
    [JsonIgnore]
    public virtual Usuario Usuario { get; set; } = null!;
}
