using System.ComponentModel.DataAnnotations;
using Microsoft.EntityFrameworkCore;
using VeterinariaAPI.Extensions;
using VeterinariaAPI.Models;
using VeterinariaAPI.Repositories;

namespace VeterinariaAPI.Endpoints
{
    public static class PacientesApi
    {
        public static void MapPacientesApi(this WebApplication app)
        {
            var pacientes = app.MapGroup("/api/v1/pacientes").WithTags("Pacientes (v1)");

            // API para listar pacientes con filtros
            pacientes.MapGet("/", async (
                int? clienteId,
                string? dueno,
                string? nombre,
                string? especie,
                string? raza,
                IRepository<Paciente> repo) =>
            {
                var query = repo.Query().Include(p => p.Cliente).AsQueryable();

                if (clienteId.HasValue)
                {
                    query = query.Where(p => p.ClienteId == clienteId.Value);
                }

                if (!string.IsNullOrWhiteSpace(dueno))
                {
                    query = query.Where(p => p.Cliente != null && 
                        (p.Cliente.NombreCompleto.Contains(dueno) || p.Cliente.DocumentoIdentidad.Contains(dueno)));
                }

                if (!string.IsNullOrWhiteSpace(nombre))
                {
                    query = query.Where(p => p.Nombre.Contains(nombre));
                }

                if (!string.IsNullOrWhiteSpace(especie))
                {
                    query = query.Where(p => p.Especie.Contains(especie));
                }

                if (!string.IsNullOrWhiteSpace(raza))
                {
                    query = query.Where(p => p.Raza != null && p.Raza.Contains(raza));
                }

                var listaPacientes = await query.ToListAsync();
                return Results.Ok(listaPacientes);
            }).RequireAuthorization(policy => policy.RequireRole("Administrador", "Veterinario", "Recepcionista"));

            // API para crear un paciente
            pacientes.MapPost("/", async (PacienteCreateDto dto, IRepository<Paciente> repo) =>
            {
                var errores = dto.Validar();
                if (errores.Count > 0)
                {
                    return Results.ValidationProblem(errores);
                }

                var nuevoPaciente = new Paciente
                {
                    ClienteId = dto.ClienteId,
                    Nombre = dto.Nombre,
                    Especie = dto.Especie,
                    Raza = dto.Raza,
                    Peso = dto.Peso,
                    Alergias = dto.Alergias
                };

                await repo.CrearAsync(nuevoPaciente);
                await repo.GuardarCambiosAsync();

                return Results.Created($"/api/v1/pacientes/{nuevoPaciente.Id}", nuevoPaciente);
            }).RequireAuthorization(policy => policy.RequireRole("Administrador", "Veterinario"));

            // API para editar paciente por ID
            pacientes.MapPut("/{id:int}", async (int id, PacienteCreateDto dto, IRepository<Paciente> repo) =>
            {
                var errores = dto.Validar();
                if (errores.Count > 0)
                {
                    return Results.ValidationProblem(errores);
                }

                var pacienteExistente = await repo.ObtenerPorIdAsync(id);
                if (pacienteExistente is null) return Results.NotFound();

                pacienteExistente.ClienteId = dto.ClienteId;
                pacienteExistente.Nombre = dto.Nombre;
                pacienteExistente.Especie = dto.Especie;
                pacienteExistente.Raza = dto.Raza;
                pacienteExistente.Peso = dto.Peso;
                pacienteExistente.Alergias = dto.Alergias;

                await repo.GuardarCambiosAsync();
                return Results.Ok(pacienteExistente);
            }).RequireAuthorization(policy => policy.RequireRole("Administrador", "Veterinario"));

            // API para eliminar pacientes
            pacientes.MapDelete("/{id:int}", async (int id, IRepository<Paciente> repo, VeterinariodbContext db) =>
            {
                var pacienteExistente = await repo.ObtenerPorIdAsync(id);
                if (pacienteExistente is null) return Results.NotFound();

                // Validación preventiva de dependencias (no permitir borrado en cascada ni error 500)
                var tieneCitas = await db.Citas.AnyAsync(c => c.PacienteId == id);
                if (tieneCitas)
                {
                    return Results.BadRequest(new { message = "No es posible eliminar el paciente porque registra citas médicas asociadas en el historial." });
                }

                var tieneConsultas = await db.Consultas.AnyAsync(c => c.PacienteId == id);
                if (tieneConsultas)
                {
                    return Results.BadRequest(new { message = "No es posible eliminar el paciente porque tiene consultas médicas y diagnósticos registrados." });
                }

                await repo.EliminarAsync(pacienteExistente);
                await repo.GuardarCambiosAsync();
                return Results.NoContent();
            }).RequireAuthorization(policy => policy.RequireRole("Administrador", "Veterinario"));
        }

        // DTO estructurado con el prefijo 'property:' para la correcta validación por reflexión
        public record PacienteCreateDto(
            [property: Required(ErrorMessage = "El ID del cliente es obligatorio.")]
            [property: Range(1, int.MaxValue, ErrorMessage = "El ID del cliente debe ser un número entero positivo.")]
            int ClienteId,

            [property: Required(ErrorMessage = "El nombre del paciente es obligatorio.")]
            [property: StringLength(50, MinimumLength = 2, ErrorMessage = "El nombre debe tener entre 2 y 50 caracteres.")]
            string Nombre,

            [property: Required(ErrorMessage = "La especie es obligatoria.")]
            [property: StringLength(50, ErrorMessage = "La especie no puede superar los 50 caracteres.")]
            string Especie,

            [property: StringLength(50, ErrorMessage = "La raza no puede superar los 50 caracteres.")]
            string? Raza,

            [property: Range(0.01, 1000.0, ErrorMessage = "El peso debe ser mayor a 0.")]
            decimal Peso,

            [property: StringLength(250, ErrorMessage = "Las alergias no pueden superar los 250 caracteres.")]
            string? Alergias
        );
    }
}