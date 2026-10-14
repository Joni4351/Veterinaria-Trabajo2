using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace VeterinariaAPI.Models;

public partial class DetallesRecetum
{
    public int Id { get; set; }

    public int RecetaId { get; set; }

    public int InsumoId { get; set; }

    public string Dosis { get; set; } = null!;

    public int DuracionDias { get; set; }
    [JsonIgnore]
    public virtual Insumo Insumo { get; set; } = null!;
    [JsonIgnore]
    public virtual Receta Receta { get; set; } = null!;
}
