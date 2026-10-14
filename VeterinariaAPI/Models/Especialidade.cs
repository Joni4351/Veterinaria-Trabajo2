using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace VeterinariaAPI.Models;

public partial class Especialidade
{
    public int Id { get; set; }

    public string Nombre { get; set; } = null!;

    public decimal CostoBase { get; set; }
    [JsonIgnore]
    public virtual ICollection<Cita> Cita { get; set; } = new List<Cita>();
}
