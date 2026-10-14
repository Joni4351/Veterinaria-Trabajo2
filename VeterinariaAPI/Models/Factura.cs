using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace VeterinariaAPI.Models;

public partial class Factura
{
    public int Id { get; set; }

    public int ClienteId { get; set; }

    public DateOnly FechaEmision { get; set; }

    public decimal MontoImpuestos { get; set; }

    public decimal MontoTotal { get; set; }
    [JsonIgnore]
    public virtual Cliente Cliente { get; set; } = null!;
    [JsonIgnore]
    public virtual ICollection<DetallesFactura> DetallesFacturas { get; set; } = new List<DetallesFactura>();
}
