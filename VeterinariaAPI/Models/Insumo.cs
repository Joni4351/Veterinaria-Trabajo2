using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace VeterinariaAPI.Models;

public partial class Insumo
{
    public int Id { get; set; }

    public string NombreProducto { get; set; } = null!;

    public string Tipo { get; set; } = null!;

    public int StockActual { get; set; }

    public decimal PrecioUnitario { get; set; }
    [JsonIgnore]
    public virtual ICollection<DetallesFactura> DetallesFacturas { get; set; } = new List<DetallesFactura>();
    [JsonIgnore]
    public virtual ICollection<DetallesRecetum> DetallesReceta { get; set; } = new List<DetallesRecetum>();
}
