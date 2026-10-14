using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace VeterinariaAPI.Models;

public partial class Usuario
{
    public int Id { get; set; }

    public int RolId { get; set; }

    public string NombreCompleto { get; set; } = null!;

    public string Email { get; set; } = null!;

    public string PasswordHash { get; set; } = null!;
    [JsonIgnore]
    public virtual ICollection<Cita> Cita { get; set; } = new List<Cita>();
    [JsonIgnore]
    public virtual Role Rol { get; set; } = null!;
}
