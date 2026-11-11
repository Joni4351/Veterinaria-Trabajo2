using Microsoft.EntityFrameworkCore;
using VeterinariaAPI.Endpoints;
using VeterinariaAPI.Models;

namespace VeterinariaAPI.Extensions;

// Cross-record rules belong on the server, including requests made outside the UI.
public class BusinessValidationFilter(VeterinariodbContext db) : IEndpointFilter
{
    public async ValueTask<object?> InvokeAsync(EndpointFilterInvocationContext context, EndpointFilterDelegate next)
    {
        if (context.HttpContext.Request.Method is not ("POST" or "PUT")) return await next(context);
        var errors = new Dictionary<string, string[]>();
        var today = DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow,
            TimeZoneInfo.FindSystemTimeZoneById("America/Santiago")));
        void Error(string field, string message) => errors[field] = [message];
        var id = int.TryParse(context.HttpContext.Request.RouteValues["id"]?.ToString(), out var routeId) ? routeId : 0;

        for (var argumentIndex = 0; argumentIndex < context.Arguments.Count; argumentIndex++)
        {
            var argument = context.Arguments[argumentIndex];
            if (argument is CitasApi.CitaCreateDto appointmentDto)
            {
                var date = appointmentDto.FechaHora;
                if (date.Kind == DateTimeKind.Utc)
                    date = TimeZoneInfo.ConvertTimeFromUtc(date, TimeZoneInfo.FindSystemTimeZoneById("America/Santiago"));
                argument = appointmentDto with { FechaHora = DateTime.SpecifyKind(date, DateTimeKind.Unspecified), Estado = appointmentDto.Estado?.Trim()! };
                context.Arguments[argumentIndex] = argument;
            }
            if (argument?.GetType().Name.EndsWith("Dto") == true)
            {
                var structuralErrors = argument.Validar();
                if (structuralErrors.Count > 0)
                    return Results.ValidationProblem(structuralErrors.ToDictionary(
                        x => string.IsNullOrEmpty(x.Key) ? "datos" : char.ToLowerInvariant(x.Key[0]) + x.Key[1..], x => x.Value));
            }
            switch (argument)
            {
                case PacientesApi.PacienteCreateDto dto:
                    if (!await db.Clientes.AnyAsync(x => x.Id == dto.ClienteId))
                        Error("clienteId", "Seleccione un dueño registrado antes de guardar el paciente.");
                    break;

                case CitasApi.CitaCreateDto dto:
                    if (!await db.Pacientes.AnyAsync(x => x.Id == dto.PacienteId)) Error("pacienteId", "El paciente seleccionado no existe.");
                    if (!await db.Usuarios.AnyAsync(x => x.Id == dto.UsuarioId && x.Rol.Nombre == "Veterinario"))
                        Error("usuarioId", "La atención debe asignarse a un usuario con rol Veterinario.");
                    if (!await db.Especialidades.AnyAsync(x => x.Id == dto.EspecialidadId)) Error("especialidadId", "La especialidad seleccionada no existe.");
                    if (dto.FechaHora == default) Error("fechaHora", "Indique una fecha y hora válidas.");
                    var state = dto.Estado?.Trim();
                    if (state is not ("Pendiente" or "Confirmada" or "En Curso" or "Completada" or "Atendida" or "Cancelada"))
                        Error("estado", "Seleccione un estado de cita válido.");
                    if (state != "Cancelada" && dto.FechaHora != default)
                    {
                        if (await db.Citas.AnyAsync(x => x.Id != id && x.Estado != "Cancelada" && x.FechaHora == dto.FechaHora && x.UsuarioId == dto.UsuarioId))
                            Error("fechaHora", "El veterinario ya tiene otra cita en ese mismo horario.");
                        if (await db.Citas.AnyAsync(x => x.Id != id && x.Estado != "Cancelada" && x.FechaHora == dto.FechaHora && x.PacienteId == dto.PacienteId))
                            Error("pacienteId", "El paciente ya tiene otra cita en ese mismo horario.");
                    }
                    if (id > 0 && await db.Consultas.AnyAsync(x => x.CitaId == id))
                    {
                        var previous = await db.Citas.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
                        if (previous != null && previous.PacienteId != dto.PacienteId)
                            Error("pacienteId", "No puede cambiar el paciente de una cita con atención clínica registrada.");
                        if (state == "Cancelada") Error("estado", "No puede cancelar una cita que ya tiene una consulta clínica.");
                    }
                    break;

                case ConsultasApi.ConsultaCreateDto dto:
                    if (!await db.Pacientes.AnyAsync(x => x.Id == dto.PacienteId)) Error("pacienteId", "El paciente seleccionado no existe.");
                    if (dto.CitaId.HasValue)
                    {
                        var appointment = await db.Citas.AsNoTracking().FirstOrDefaultAsync(x => x.Id == dto.CitaId);
                        if (appointment == null) Error("citaId", "La cita seleccionada no existe.");
                        else if (appointment.PacienteId != dto.PacienteId) Error("citaId", "La cita debe pertenecer al mismo paciente de la consulta.");
                        else if (appointment.Estado == "Cancelada") Error("citaId", "No puede registrar una consulta sobre una cita cancelada.");
                        if (await db.Consultas.AnyAsync(x => x.Id != id && x.CitaId == dto.CitaId))
                            Error("citaId", "Esta cita ya tiene una consulta. Edite la atención existente.");
                    }
                    if (id > 0)
                    {
                        var previous = await db.Consultas.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
                        if (previous != null && (previous.PacienteId != dto.PacienteId || previous.CitaId != dto.CitaId) &&
                            (await db.Recetas.AnyAsync(x => x.ConsultaId == id) || await db.DetallesFacturas.AnyAsync(x => x.ConsultaId == id)))
                            Error("pacienteId", "No puede reasignar una consulta que ya tiene receta o facturación asociada.");
                    }
                    break;

                case RecetasApi.RecetaCreateDto dto:
                    if (!await db.Consultas.AnyAsync(x => x.Id == dto.ConsultaId)) Error("consultaId", "La consulta seleccionada no existe.");
                    if (dto.FechaEmision != today) Error("fechaEmision", "La fecha de emisión debe corresponder al día de hoy (hora de Chile).");
                    if (dto.ValidaHasta == default || dto.ValidaHasta < dto.FechaEmision)
                        Error("validaHasta", "La vigencia de la receta no puede terminar antes de su emisión.");
                    break;

                case DetallesRecetaApi.DetalleRecetaCreateDto dto:
                    if (!await db.Recetas.AnyAsync(x => x.Id == dto.RecetaId)) Error("recetaId", "La receta seleccionada no existe.");
                    if (!await db.Insumos.AnyAsync(x => x.Id == dto.InsumoId)) Error("insumoId", "El medicamento o insumo seleccionado no existe.");
                    break;

                case FacturasApi.FacturaCreateDto dto:
                    if (!await db.Clientes.AnyAsync(x => x.Id == dto.ClienteId)) Error("clienteId", "El cliente de la factura no existe.");
                    if (dto.FechaEmision != today) Error("fechaEmision", "La fecha de emisión debe corresponder al día de hoy (hora de Chile).");
                    if (dto.Items is not { Count: > 0 })
                    {
                        if (dto.MontoTotal <= 0) Error("montoTotal", "El monto total debe ser mayor a cero.");
                        if (dto.MontoImpuestos > dto.MontoTotal) Error("montoImpuestos", "Los impuestos no pueden superar el total de la factura.");
                        break;
                    }
                    if (dto.Items.Count > 100) { Error("items", "La factura admite como máximo 100 líneas."); break; }
                    if (dto.Items.Where(x => x != null && x.Tipo == "insumo").GroupBy(x => x.InsumoId).Any(x => x.Count() > 1))
                        Error("items", "Agrupe cada insumo en una sola línea e indique la cantidad total.");
                    decimal net = 0;
                    var resolvedItems = new List<FacturasApi.FacturaItemDto>();
                    foreach (var item in dto.Items)
                    {
                        if (item == null) { Error("items", "La factura contiene una línea vacía."); continue; }
                        resolvedItems.Add(item);
                        if (item.Tipo == "insumo")
                        {
                            if (item.Cantidad <= 0 || item.Cantidad > 1000000) Error("items", "La cantidad debe ser un entero entre 1 y 1.000.000.");
                            if (item.CitaId.HasValue || item.ConsultaId.HasValue || item.EspecialidadId.HasValue) Error("items", "Una línea de insumo no puede contener una atención clínica.");
                            var supply = await db.Insumos.AsNoTracking().FirstOrDefaultAsync(x => x.Id == item.InsumoId);
                            if (supply == null) Error("items", "Seleccione un insumo existente para cada línea.");
                            else net += supply.PrecioUnitario * item.Cantidad;
                        }
                        else if (item.Tipo == "cita")
                        {
                            if (item.InsumoId.HasValue || item.Cantidad != 1 || (!item.CitaId.HasValue && !item.EspecialidadId.HasValue))
                                Error("items", "La atención debe indicar una cita o una especialidad, cantidad 1 y ningún insumo.");
                            if (!item.CitaId.HasValue && !item.ConsultaId.HasValue)
                                Error("items", "La atención facturada debe estar vinculada a una consulta médica registrada.");
                            if (item.CitaId.HasValue)
                            {
                                var appointment = await db.Citas.AsNoTracking().Include(x => x.Paciente).Include(x => x.Especialidad).FirstOrDefaultAsync(x => x.Id == item.CitaId);
                                if (appointment == null) Error("items", "La cita facturada no existe.");
                                else
                                {
                                    var consultationId = await db.Consultas.AsNoTracking()
                                        .Where(x => x.CitaId == item.CitaId).Select(x => (int?)x.Id).FirstOrDefaultAsync();
                                    if (!consultationId.HasValue)
                                        Error("items", "La cita no tiene una consulta médica registrada. Registre la consulta antes de facturar la atención.");
                                    else
                                        resolvedItems[^1] = item with { ConsultaId = consultationId.Value };
                                    if (appointment.Paciente.ClienteId != dto.ClienteId) Error("items", "La cita facturada debe corresponder a una mascota del cliente.");
                                    if (appointment.Estado == "Cancelada") Error("items", "No puede facturar una cita cancelada.");
                                    if (item.EspecialidadId.HasValue && item.EspecialidadId != appointment.EspecialidadId)
                                        Error("items", "La especialidad indicada no corresponde a la cita.");
                                    net += appointment.Especialidad.CostoBase;
                                }
                            }
                            else
                            {
                                var specialty = await db.Especialidades.AsNoTracking().FirstOrDefaultAsync(x => x.Id == item.EspecialidadId);
                                if (specialty == null) Error("items", "Seleccione una especialidad existente para la atención.");
                                else net += specialty.CostoBase;
                            }
                            if (item.ConsultaId.HasValue)
                            {
                                var consultation = await db.Consultas.AsNoTracking().Include(x => x.Paciente).FirstOrDefaultAsync(x => x.Id == item.ConsultaId);
                                if (consultation == null || consultation.Paciente.ClienteId != dto.ClienteId ||
                                    (item.CitaId.HasValue && consultation.CitaId != item.CitaId))
                                    Error("items", "La consulta facturada no corresponde al cliente o a la cita seleccionada.");
                            }
                        }
                        else Error("items", "Tipo de línea inválido. Solo se admiten cita e insumo.");
                    }
                    if (net <= 0 || net + Math.Round(net * 0.19m, 0, MidpointRounding.AwayFromZero) > 10000000m)
                        Error("montoTotal", "El total calculado debe ser mayor a cero y no superar 10.000.000.");
                    context.Arguments[argumentIndex] = dto with { Items = resolvedItems };
                    break;

                case DetalleFacturasAPI.DetalleFacturaCreateDto dto:
                    var invoice = await db.Facturas.AsNoTracking().FirstOrDefaultAsync(x => x.Id == dto.FacturaId);
                    if (invoice == null) Error("facturaId", "La factura seleccionada no existe.");
                    else
                    {
                        var existingNet = await db.DetallesFacturas.Where(x => x.FacturaId == dto.FacturaId && x.Id != id).SumAsync(x => x.Subtotal);
                        var projectedNet = existingNet + dto.Subtotal;
                        if (projectedNet + Math.Round(projectedNet * 0.19m, 0, MidpointRounding.AwayFromZero) > 10000000m)
                            Error("subtotal", "Esta línea haría que el total de la factura superase 10.000.000.");
                    }
                    if (dto.InsumoId.HasValue == dto.ConsultaId.HasValue)
                        Error("consultaId", "La línea debe contener una consulta o un insumo, pero no ambos.");
                    if (dto.InsumoId.HasValue && !await db.Insumos.AnyAsync(x => x.Id == dto.InsumoId))
                        Error("insumoId", "El insumo seleccionado no existe.");
                    if (dto.ConsultaId.HasValue)
                    {
                        var consultation = await db.Consultas.AsNoTracking().Include(x => x.Paciente).FirstOrDefaultAsync(x => x.Id == dto.ConsultaId);
                        if (consultation == null) Error("consultaId", "La consulta seleccionada no existe.");
                        else if (invoice != null && consultation.Paciente.ClienteId != invoice.ClienteId)
                            Error("consultaId", "La consulta debe corresponder a una mascota del cliente facturado.");
                    }
                    if (id > 0)
                    {
                        var previous = await db.DetallesFacturas.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
                        if (previous != null && (previous.FacturaId != dto.FacturaId || previous.InsumoId != dto.InsumoId))
                            Error("facturaId", "No puede mover una línea a otra factura ni cambiar su insumo. Elimine la línea y agréguela correctamente.");
                    }
                    break;
            }
        }
        return errors.Count > 0 ? Results.ValidationProblem(errors) : await next(context);
    }
}
