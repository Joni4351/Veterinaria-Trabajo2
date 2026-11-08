using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using VeterinariaAPI.Models;

namespace VeterinariaAPI.Tests;

public class BusinessValidationTests(FacialFactory factory) : IClassFixture<FacialFactory>
{
    private static int sequence = 20000;
    private async Task<(int patient, int other, int appointment, int supply, DateTime time)> Seed(string state = "Confirmada")
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<VeterinariodbContext>();
        var id = Interlocked.Add(ref sequence, 10);
        db.Clientes.Add(new Cliente { Id = id, DocumentoIdentidad = $"TEST-{id}", NombreCompleto = "Otro dueño" });
        db.Pacientes.AddRange(
            new Paciente { Id = id, ClienteId = 1, Nombre = "Luna", Especie = "Gato", Peso = 4 },
            new Paciente { Id = id + 1, ClienteId = id, Nombre = "Simba", Especie = "Gato", Peso = 5 });
        var time = new DateTime(2030, 5, 1, 10, 0, 0).AddMinutes(id);
        db.Citas.Add(new Cita { Id = id, PacienteId = id, UsuarioId = 2, EspecialidadId = 1, FechaHora = time, Estado = state });
        db.Insumos.Add(new Insumo { Id = id, NombreProducto = "Producto de prueba", Tipo = "Medicamento", StockActual = 3, PrecioUnitario = 1000 });
        await db.SaveChangesAsync();
        return (id, id + 1, id, id, time);
    }

    [Fact]
    public async Task RejectsPatientWithoutRegisteredOwner()
    {
        using var client = factory.Client();
        var response = await client.PostAsJsonAsync("/api/v1/pacientes", new {
            clienteId = 9999999, nombre = "Luna", especie = "Gato", peso = 3
        });
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Contains("dueño registrado", await response.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task RejectsDoubleBookingAndNonVeterinarian()
    {
        var data = await Seed(); using var client = factory.Client();
        var collision = await client.PostAsJsonAsync("/api/v1/citas", new {
            pacienteId = data.other, usuarioId = 2, especialidadId = 1, fechaHora = data.time, estado = "Confirmada"
        });
        Assert.Equal(HttpStatusCode.BadRequest, collision.StatusCode);
        Assert.Contains("mismo horario", await collision.Content.ReadAsStringAsync());
        var receptionist = await client.PostAsJsonAsync("/api/v1/citas", new {
            pacienteId = data.patient, usuarioId = 3, especialidadId = 1, fechaHora = data.time.AddHours(2), estado = "Pendiente"
        });
        Assert.Equal(HttpStatusCode.BadRequest, receptionist.StatusCode);
        Assert.Contains("rol Veterinario", await receptionist.Content.ReadAsStringAsync());
    }

    [Theory]
    [InlineData("En Curso")]
    [InlineData("Completada")]
    [InlineData("Atendida")]
    public async Task AcceptsSupportedStatesAndCancelledSlots(string state)
    {
        var data = await Seed("Cancelada"); using var client = factory.Client();
        var response = await client.PostAsJsonAsync("/api/v1/citas", new {
            pacienteId = data.patient, usuarioId = 2, especialidadId = 1, fechaHora = data.time, estado = state
        });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    [Fact]
    public async Task AppointmentStatesAndIdsAreActuallyValidatedOnProperties()
    {
        var data = await Seed(); using var client = factory.Client();
        var response = await client.PostAsJsonAsync("/api/v1/citas", new {
            pacienteId = 0, usuarioId = 2, especialidadId = 1, fechaHora = data.time, estado = "Inventado"
        });
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var stateResponse = await client.PostAsJsonAsync("/api/v1/citas", new {
            pacienteId = data.patient, usuarioId = 2, especialidadId = 1, fechaHora = data.time, estado = "Inventado"
        });
        Assert.Equal(HttpStatusCode.BadRequest, stateResponse.StatusCode);
    }

    [Fact]
    public async Task ConsultationMustMatchPatientAndCannotDuplicateAppointment()
    {
        var data = await Seed(); using var client = factory.Client();
        var wrong = await client.PostAsJsonAsync("/api/v1/consultas", new {
            pacienteId = data.other, citaId = data.appointment, motivo = "Revisión general", diagnostico = "Sin hallazgos"
        });
        Assert.Equal(HttpStatusCode.BadRequest, wrong.StatusCode);
        var correct = new { pacienteId = data.patient, citaId = data.appointment, motivo = "Revisión general", diagnostico = "Sin hallazgos" };
        Assert.Equal(HttpStatusCode.Created, (await client.PostAsJsonAsync("/api/v1/consultas", correct)).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsJsonAsync("/api/v1/consultas", correct)).StatusCode);
        var cancellation = await client.PutAsJsonAsync($"/api/v1/citas/{data.appointment}", new {
            pacienteId = data.patient, usuarioId = 2, especialidadId = 1, fechaHora = data.time, estado = "Cancelada"
        });
        Assert.Equal(HttpStatusCode.BadRequest, cancellation.StatusCode);
    }

    [Fact]
    public async Task RejectsConsultationForCancelledAppointmentAndInvalidPrescriptionDates()
    {
        var data = await Seed("Cancelada"); using var client = factory.Client();
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsJsonAsync("/api/v1/consultas", new {
            pacienteId = data.patient, citaId = data.appointment, motivo = "Revisión", diagnostico = "Sin hallazgos"
        })).StatusCode);
        var consultationResponse = await client.PostAsJsonAsync("/api/v1/consultas", new {
            pacienteId = data.patient, motivo = "Control histórico", diagnostico = "Sin hallazgos"
        });
        Assert.Equal(HttpStatusCode.Created, consultationResponse.StatusCode);
        var consultation = await consultationResponse.Content.ReadFromJsonAsync<Consulta>();
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsJsonAsync("/api/v1/recetas", new {
            consultaId = consultation!.Id, fechaEmision = "2026-05-20", validaHasta = "2026-05-19"
        })).StatusCode);
        Assert.Equal(HttpStatusCode.Created, (await client.PostAsJsonAsync("/api/v1/recetas", new {
            consultaId = consultation!.Id, fechaEmision = "2026-05-20", validaHasta = "2026-05-20"
        })).StatusCode);
    }

    [Fact]
    public async Task InvalidInvoiceLinesDoNotChangeStockOrCreateInvoices()
    {
        var data = await Seed(); using var client = factory.Client();
        var supply = new { tipo = "insumo", insumoId = data.supply, cantidad = 2 };
        var response = await client.PostAsJsonAsync("/api/v1/facturas", new {
            clienteId = 1, fechaEmision = "2026-05-20", montoTotal = 0, montoImpuestos = 0, items = new[] { supply, supply }
        });
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        using var scope = factory.Services.CreateScope();
        Assert.Equal(3, (await scope.ServiceProvider.GetRequiredService<VeterinariodbContext>().Insumos.FindAsync(data.supply))!.StockActual);
        var mismatch = await client.PostAsJsonAsync("/api/v1/facturas", new {
            clienteId = data.patient, fechaEmision = "2026-05-20", montoTotal = 0, montoImpuestos = 0,
            items = new[] { new { tipo = "cita", citaId = data.appointment, especialidadId = 1, cantidad = 1 } }
        });
        Assert.Equal(HttpStatusCode.BadRequest, mismatch.StatusCode);
        Assert.Contains("mascota del cliente", await mismatch.Content.ReadAsStringAsync());
    }

    [Theory]
    [InlineData("abcdefgh")]
    [InlineData("--------")]
    [InlineData("++56912345678")]
    public async Task ClientPhoneMustContainRealDigits(string phone)
    {
        using var client = factory.Client();
        var response = await client.PostAsJsonAsync("/api/v1/clientes", new {
            documentoIdentidad = "12.345.678-5", nombreCompleto = "Persona de prueba", telefono = phone, email = "phone-test@example.com"
        });
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
}
