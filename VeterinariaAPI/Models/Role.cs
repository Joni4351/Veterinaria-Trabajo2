using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace VeterinariaAPI.Models;

public partial class Role
{
    public int Id { get; set; }

    public string Nombre { get; set; } = null!;

    public bool PermisosEscritura { get; set; }
    [JsonIgnore]
    public virtual ICollection<Usuario> Usuarios { get; set; } = new List<Usuario>();
}
