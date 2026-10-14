using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace VeterinariaAPI.Models;

public partial class DetallesFactura
{
    public int Id { get; set; }

    public int FacturaId { get; set; }

    public int? ConsultaId { get; set; }

    public int? InsumoId { get; set; }

    public decimal Subtotal { get; set; }
    [JsonIgnore]
    public virtual Consulta? Consulta { get; set; }
    [JsonIgnore]
    public virtual Factura Factura { get; set; } = null!;
    [JsonIgnore]
    public virtual Insumo? Insumo { get; set; }
}
