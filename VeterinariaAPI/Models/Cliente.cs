using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace VeterinariaAPI.Models;

public partial class Cliente
{
    public int Id { get; set; }

    public string DocumentoIdentidad { get; set; } = null!;

    public string NombreCompleto { get; set; } = null!;

    public string? Telefono { get; set; }

    public string? Email { get; set; }
    [JsonIgnore]
    public virtual ICollection<Factura> Facturas { get; set; } = new List<Factura>();
    [JsonIgnore]
    public virtual ICollection<Paciente> Pacientes { get; set; } = new List<Paciente>();
}
