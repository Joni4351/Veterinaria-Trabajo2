using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VeterinariaAPI.Migrations
{
    /// <inheritdoc />
    public partial class RefuerzoIntegridad : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Citas_PacienteId",
                table: "Citas");

            migrationBuilder.DropIndex(
                name: "IX_Citas_UsuarioId",
                table: "Citas");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Recetas_Fechas",
                table: "Recetas",
                sql: "\"ValidaHasta\" >= \"FechaEmision\"");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Pacientes_Peso",
                table: "Pacientes",
                sql: "\"Peso\" > 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Insumos_Precio",
                table: "Insumos",
                sql: "\"PrecioUnitario\" >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Insumos_Stock",
                table: "Insumos",
                sql: "\"StockActual\" >= 0");

            migrationBuilder.CreateIndex(
                name: "IX_Facturas_FechaEmision",
                table: "Facturas",
                column: "FechaEmision");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Facturas_Montos",
                table: "Facturas",
                sql: "\"MontoTotal\" >= 0 AND \"MontoImpuestos\" >= 0 AND \"MontoImpuestos\" <= \"MontoTotal\"");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Especialidades_Costo",
                table: "Especialidades",
                sql: "\"CostoBase\" >= 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_DetallesReceta_Duracion",
                table: "DetallesReceta",
                sql: "\"DuracionDias\" > 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_DetallesFacturas_Subtotal",
                table: "DetallesFactura",
                sql: "\"Subtotal\" >= 0");

            migrationBuilder.CreateIndex(
                name: "IX_Citas_PacienteId_FechaHora",
                table: "Citas",
                columns: new[] { "PacienteId", "FechaHora" },
                unique: true,
                filter: "\"Estado\" <> 'Cancelada'");

            migrationBuilder.CreateIndex(
                name: "IX_Citas_UsuarioId_FechaHora",
                table: "Citas",
                columns: new[] { "UsuarioId", "FechaHora" },
                unique: true,
                filter: "\"Estado\" <> 'Cancelada'");

            migrationBuilder.AddCheckConstraint(
                name: "CK_Citas_Estado",
                table: "Citas",
                sql: "\"Estado\" IN ('Pendiente','Confirmada','En Curso','Completada','Atendida','Cancelada')");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_Recetas_Fechas",
                table: "Recetas");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Pacientes_Peso",
                table: "Pacientes");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Insumos_Precio",
                table: "Insumos");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Insumos_Stock",
                table: "Insumos");

            migrationBuilder.DropIndex(
                name: "IX_Facturas_FechaEmision",
                table: "Facturas");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Facturas_Montos",
                table: "Facturas");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Especialidades_Costo",
                table: "Especialidades");

            migrationBuilder.DropCheckConstraint(
                name: "CK_DetallesReceta_Duracion",
                table: "DetallesReceta");

            migrationBuilder.DropCheckConstraint(
                name: "CK_DetallesFacturas_Subtotal",
                table: "DetallesFactura");

            migrationBuilder.DropIndex(
                name: "IX_Citas_PacienteId_FechaHora",
                table: "Citas");

            migrationBuilder.DropIndex(
                name: "IX_Citas_UsuarioId_FechaHora",
                table: "Citas");

            migrationBuilder.DropCheckConstraint(
                name: "CK_Citas_Estado",
                table: "Citas");

            migrationBuilder.CreateIndex(
                name: "IX_Citas_PacienteId",
                table: "Citas",
                column: "PacienteId");

            migrationBuilder.CreateIndex(
                name: "IX_Citas_UsuarioId",
                table: "Citas",
                column: "UsuarioId");
        }
    }
}
