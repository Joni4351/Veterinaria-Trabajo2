using Microsoft.OpenApi.Models;

internal class OpenApiReference
{
    public ReferenceType Type { get; set; }
    public string Id { get; set; } = string.Empty;
}