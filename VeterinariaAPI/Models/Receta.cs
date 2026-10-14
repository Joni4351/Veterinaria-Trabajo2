using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace VeterinariaAPI.Models;

public partial class Receta
{
    public int Id { get; set; }

    public int ConsultaId { get; set; }

    public DateOnly FechaEmision { get; set; }

    public DateOnly ValidaHasta { get; set; }
    [JsonIgnore]
    public virtual Consulta Consulta { get; set; } = null!;
    [JsonIgnore]
    public virtual ICollection<DetallesRecetum> DetallesReceta { get; set; } = new List<DetallesRecetum>();
}
