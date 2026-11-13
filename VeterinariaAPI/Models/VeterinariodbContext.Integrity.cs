using Microsoft.EntityFrameworkCore;

namespace VeterinariaAPI.Models;

public partial class VeterinariodbContext
{
    partial void OnModelCreatingPartial(ModelBuilder modelBuilder)
    {
        var model = modelBuilder;
        model.Entity<Insumo>().Property(x => x.StockActual).IsConcurrencyToken();
        model.Entity<Factura>().Property(x => x.MontoTotal).IsConcurrencyToken();
        model.Entity<DetallesFactura>().Property(x => x.PrecioUnitario).HasColumnType("decimal(10, 2)");
        model.Entity<DetallesFactura>().ToTable(t => {
            t.HasCheckConstraint("CK_DetallesFacturas_Cantidad", "\"Cantidad\" IS NULL OR \"Cantidad\" > 0");
            t.HasCheckConstraint("CK_DetallesFacturas_Precio", "\"PrecioUnitario\" IS NULL OR \"PrecioUnitario\" >= 0");
        });
        model.Entity<Cita>().ToTable(t => t.HasCheckConstraint("CK_Citas_Estado", "\"Estado\" IN ('Pendiente','Confirmada','En Curso','Completada','Atendida','Cancelada')"));
        model.Entity<Cita>().HasIndex(x => new { x.UsuarioId, x.FechaHora }).IsUnique().HasFilter("\"Estado\" <> 'Cancelada'");
        model.Entity<Cita>().HasIndex(x => new { x.PacienteId, x.FechaHora }).IsUnique().HasFilter("\"Estado\" <> 'Cancelada'");
        model.Entity<Insumo>().ToTable(t => { t.HasCheckConstraint("CK_Insumos_Stock", "\"StockActual\" >= 0"); t.HasCheckConstraint("CK_Insumos_Precio", "\"PrecioUnitario\" >= 0"); });
        model.Entity<Paciente>().ToTable(t => t.HasCheckConstraint("CK_Pacientes_Peso", "\"Peso\" > 0"));
        model.Entity<Especialidade>().ToTable(t => t.HasCheckConstraint("CK_Especialidades_Costo", "\"CostoBase\" >= 0"));
        model.Entity<Factura>().ToTable(t => t.HasCheckConstraint("CK_Facturas_Montos", "\"MontoTotal\" >= 0 AND \"MontoImpuestos\" >= 0 AND \"MontoImpuestos\" <= \"MontoTotal\""));
        model.Entity<Factura>().HasIndex(x => x.FechaEmision);
        model.Entity<Receta>().ToTable(t => t.HasCheckConstraint("CK_Recetas_Fechas", "\"ValidaHasta\" >= \"FechaEmision\""));
        model.Entity<DetallesFactura>().ToTable(t => t.HasCheckConstraint("CK_DetallesFacturas_Subtotal", "\"Subtotal\" >= 0"));
        model.Entity<DetallesRecetum>().ToTable(t => t.HasCheckConstraint("CK_DetallesReceta_Duracion", "\"DuracionDias\" > 0"));
    }
}
