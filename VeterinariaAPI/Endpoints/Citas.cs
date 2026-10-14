using System.ComponentModel.DataAnnotations;
using Microsoft.EntityFrameworkCore;
using VeterinariaAPI.Extensions;
using VeterinariaAPI.Models;
using VeterinariaAPI.Repositories;

namespace VeterinariaAPI.Endpoints
{
    public static class CitasApi
    {
        public static void MapCitasApi(this WebApplication app)
        {
            var citas = app.MapGroup("/api/v1/citas").WithTags("Citas (v1)");

            // API para listar citas con filtros
            citas.MapGet("/", async (
                int? usuarioId,
                int? especialidadId,
                string? estado,
                DateTime? fechaDesde,
                DateTime? fechaHasta,
                IRepository<Cita> repo) =>
            {
                var query = repo.Query();

                if (usuarioId.HasValue)
                {
                    query = query.Where(c => c.UsuarioId == usuarioId.Value);
                }

                if (especialidadId.HasValue)
                {
                    query = query.Where(c => c.EspecialidadId == especialidadId.Value);
                }

                if (!string.IsNullOrWhiteSpace(estado))
                {
                    query = query.Where(c => c.Estado == estado);
                }

                if (fechaDesde.HasValue)
                {
                    query = query.Where(c => c.FechaHora >= fechaDesde.Value);
                }

                if (fechaHasta.HasValue)
                {
                    query = query.Where(c => c.FechaHora <= fechaHasta.Value);
                }

                var listarCitas = await query.ToListAsync();
                return Results.Ok(listarCitas);
            }).RequireAuthorization(policy => policy.RequireRole("Administrador", "Veterinario", "Recepcionista"));

            // API para crear una cita
            citas.MapPost("/", async (CitaCreateDto dto, IRepository<Cita> repo) =>
            {
                // Validación estructurada del DTO
                var errores = dto.Validar();
                if (errores.Count > 0)
                {
                    return Results.ValidationProblem(errores);
                }

                var nuevaCita = new Cita
                {
                    PacienteId = dto.PacienteId,
                    UsuarioId = dto.UsuarioId,
                    EspecialidadId = dto.EspecialidadId,
                    FechaHora = dto.FechaHora,
                    Estado = dto.Estado
                };

                await repo.CrearAsync(nuevaCita);
                await repo.GuardarCambiosAsync();

                return Results.Created($"/api/v1/citas/{nuevaCita.Id}", nuevaCita);
            }).RequireAuthorization(policy => policy.RequireRole("Administrador", "Veterinario", "Recepcionista"));

            // API para editar una cita por ID
            citas.MapPut("/{id:int}", async (int id, CitaCreateDto dto, IRepository<Cita> repo) =>
            {
                // Validación estructurada del DTO
                var errores = dto.Validar();
                if (errores.Count > 0)
                {
                    return Results.ValidationProblem(errores);
                }

                var citaExistente = await repo.ObtenerPorIdAsync(id);
                if (citaExistente is null) return Results.NotFound();

                citaExistente.PacienteId = dto.PacienteId;
                citaExistente.UsuarioId = dto.UsuarioId;
                citaExistente.EspecialidadId = dto.EspecialidadId;
                citaExistente.FechaHora = dto.FechaHora;
                citaExistente.Estado = dto.Estado;

                await repo.GuardarCambiosAsync();
                return Results.Ok(citaExistente);
            }).RequireAuthorization(policy => policy.RequireRole("Administrador", "Veterinario", "Recepcionista"));

            // API para eliminar citas
            citas.MapDelete("/{id:int}", async (int id, IRepository<Cita> repo) =>
            {
                var citaExistente = await repo.ObtenerPorIdAsync(id);
                if (citaExistente is null) return Results.NotFound();

                await repo.EliminarAsync(citaExistente);
                await repo.GuardarCambiosAsync();
                return Results.NoContent();
            }).RequireAuthorization(policy => policy.RequireRole("Administrador", "Veterinario"));
        }

        // DTO de entrada estructurado con reglas de validación
        public record CitaCreateDto(
            [Required(ErrorMessage = "El ID del paciente es obligatorio.")]
            [Range(1, int.MaxValue, ErrorMessage = "El ID del paciente debe ser un número entero positivo.")]
            int PacienteId,

            [Required(ErrorMessage = "El ID del usuario/veterinario es obligatorio.")]
            [Range(1, int.MaxValue, ErrorMessage = "El ID del usuario debe ser un número entero positivo.")]
            int UsuarioId,

            [Required(ErrorMessage = "El ID de la especialidad es obligatorio.")]
            [Range(1, int.MaxValue, ErrorMessage = "El ID de la especialidad debe ser un número entero positivo.")]
            int EspecialidadId,

            [Required(ErrorMessage = "La fecha y hora de la cita son obligatorias.")]
            DateTime FechaHora,

            [Required(ErrorMessage = "El estado de la cita es obligatorio.")]
            [StringLength(50, ErrorMessage = "El estado no puede superar los 50 caracteres.")]
            string Estado
        );
    }
}