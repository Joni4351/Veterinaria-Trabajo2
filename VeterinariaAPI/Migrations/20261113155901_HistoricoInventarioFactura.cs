using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace VeterinariaAPI.Migrations
{
    /// <inheritdoc />
    public partial class HistoricoInventarioFactura : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "Cantidad",
                table: "DetallesFactura",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "PrecioUnitario",
                table: "DetallesFactura",
                type: "numeric(10,2)",
                nullable: true);

            // Service lines represent one attention. Historical stock quantities cannot
            // be reconstructed from today's catalog price and intentionally remain NULL.
            migrationBuilder.Sql("UPDATE public.\"DetallesFactura\" SET \"Cantidad\" = 1, \"PrecioUnitario\" = \"Subtotal\" WHERE \"InsumoId\" IS NULL;");

            migrationBuilder.AddCheckConstraint(
                name: "CK_DetallesFacturas_Cantidad",
                table: "DetallesFactura",
                sql: "\"Cantidad\" IS NULL OR \"Cantidad\" > 0");

            migrationBuilder.AddCheckConstraint(
                name: "CK_DetallesFacturas_Precio",
                table: "DetallesFactura",
                sql: "\"PrecioUnitario\" IS NULL OR \"PrecioUnitario\" >= 0");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_DetallesFacturas_Cantidad",
                table: "DetallesFactura");

            migrationBuilder.DropCheckConstraint(
                name: "CK_DetallesFacturas_Precio",
                table: "DetallesFactura");

            migrationBuilder.DropColumn(
                name: "Cantidad",
                table: "DetallesFactura");

            migrationBuilder.DropColumn(
                name: "PrecioUnitario",
                table: "DetallesFactura");
        }
    }
}
