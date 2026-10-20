using System.ComponentModel.DataAnnotations;
using Microsoft.EntityFrameworkCore;
using VeterinariaAPI.Extensions;
using VeterinariaAPI.Models;
using VeterinariaAPI.Repositories;

namespace VeterinariaAPI.Endpoints
{
    public static class ConsultasApi
    {
        public static void MapConsultasApi(this WebApplication app)
        {
            var consultas = app.MapGroup("/api/v1/consultas").WithTags("Consultas (v1)");

            // API para listar consultas con filtros
            consultas.MapGet("/", async (
                int? pacienteId,
                string? motivo,
                string? diagnostico,
                IRepository<Consulta> repo) =>
            {
                var query = repo.Query()
                    .Include(c => c.Paciente)
                        .ThenInclude(p => p.Cliente)
                    .AsQueryable();

                if (pacienteId.HasValue)
                {
                    query = query.Where(c => c.PacienteId == pacienteId.Value);
                }

                if (!string.IsNullOrWhiteSpace(motivo))
                {
                    query = query.Where(c => c.Motivo.Contains(motivo));
                }

                if (!string.IsNullOrWhiteSpace(diagnostico))
                {
                    query = query.Where(c => c.Diagnostico != null && c.Diagnostico.Contains(diagnostico));
                }

                var listaConsultas = await query.ToListAsync();
                return Results.Ok(listaConsultas);
            }).RequireAuthorization(policy => policy.RequireRole("Administrador", "Veterinario", "Recepcionista"));

            // API para crear una consulta
            consultas.MapPost("/", async (ConsultaCreateDto dto, IRepository<Consulta> repo) =>
            {
                var errores = dto.Validar();
                if (errores.Count > 0)
                {
                    return Results.ValidationProblem(errores);
                }

                var nuevaConsulta = new Consulta
                {
                    PacienteId = dto.PacienteId,
                    CitaId = dto.CitaId,
                    Motivo = dto.Motivo,
                    Diagnostico = dto.Diagnostico
                };

                await repo.CrearAsync(nuevaConsulta);
                await repo.GuardarCambiosAsync();

                return Results.Created($"/api/v1/consultas/{nuevaConsulta.Id}", nuevaConsulta);
            }).RequireAuthorization(policy => policy.RequireRole("Administrador", "Veterinario"));

            // API para editar consulta por ID
            consultas.MapPut("/{id:int}", async (int id, ConsultaCreateDto dto, IRepository<Consulta> repo) =>
            {
                var errores = dto.Validar();
                if (errores.Count > 0)
                {
                    return Results.ValidationProblem(errores);
                }

                var consultaExistente = await repo.ObtenerPorIdAsync(id);
                if (consultaExistente is null) return Results.NotFound();

                consultaExistente.PacienteId = dto.PacienteId;
                consultaExistente.CitaId = dto.CitaId;
                consultaExistente.Motivo = dto.Motivo;
                consultaExistente.Diagnostico = dto.Diagnostico;

                await repo.GuardarCambiosAsync();
                return Results.Ok(consultaExistente);
            }).RequireAuthorization(policy => policy.RequireRole("Administrador", "Veterinario"));

            // API para eliminar consultas
            consultas.MapDelete("/{id:int}", async (int id, IRepository<Consulta> repo, VeterinariodbContext db) =>
            {
                var consultaExistente = await repo.ObtenerPorIdAsync(id);
                if (consultaExistente is null) return Results.NotFound();

                // Validación preventiva de dependencias (no permitir borrado si tiene receta o está facturada)
                var tieneReceta = await db.Recetas.AnyAsync(r => r.ConsultaId == id);
                if (tieneReceta)
                {
                    return Results.BadRequest(new { message = "No es posible eliminar la consulta médica porque tiene una receta médica emitida vinculada." });
                }

                var enFactura = await db.DetallesFacturas.AnyAsync(d => d.ConsultaId == id);
                if (enFactura)
                {
                    return Results.BadRequest(new { message = "No es posible eliminar la consulta médica porque está incluida en el detalle de una factura contable." });
                }

                await repo.EliminarAsync(consultaExistente);
                await repo.GuardarCambiosAsync();
                return Results.NoContent();
            }).RequireAuthorization(policy => policy.RequireRole("Administrador", "Veterinario"));
        }

        // DTO estructurado con el prefijo 'property:' para la correcta validación por reflexión
        public record ConsultaCreateDto(
            [property: Required(ErrorMessage = "El ID del paciente es obligatorio.")]
            [property: Range(1, int.MaxValue, ErrorMessage = "El ID del paciente debe ser un número entero positivo.")]
            int PacienteId,

            int? CitaId,

            [property: Required(ErrorMessage = "El motivo de la consulta es obligatorio.")]
            [property: StringLength(250, MinimumLength = 3, ErrorMessage = "El motivo debe tener entre 3 y 250 caracteres.")]
            string Motivo,

            [property: Required(ErrorMessage = "El diagnóstico es obligatorio.")]
            [property: StringLength(1000, MinimumLength = 3, ErrorMessage = "El diagnóstico debe tener entre 3 y 1000 caracteres.")]
            string Diagnostico
        );
    }
}