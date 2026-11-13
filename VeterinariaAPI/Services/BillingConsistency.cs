using Microsoft.EntityFrameworkCore;
using VeterinariaAPI.Models;

namespace VeterinariaAPI.Services;

public class BillingDataException(string message) : Exception(message);

public static class BillingConsistency
{
    public static int Quantity(DetallesFactura line)
    {
        if (line.Cantidad is > 0) return line.Cantidad.Value;
        if (!line.InsumoId.HasValue) return 1;
        throw new BillingDataException("La línea histórica no tiene una cantidad registrada. Revise el documento original y complete sus datos antes de modificar o reponer existencias.");
    }
    public static decimal Price(DetallesFactura line) => line.PrecioUnitario ?? line.Subtotal / Quantity(line);

    public static async Task Recalculate(VeterinariodbContext db, int invoiceId)
    {
        var invoice = await db.Facturas.FindAsync(invoiceId);
        if (invoice == null) throw new BillingDataException("La factura ya no está disponible. Actualice el listado.");
        var values = await db.DetallesFacturas.Where(x => x.FacturaId == invoiceId).Select(x => x.Subtotal).ToListAsync();
        var net = values.Sum();
        if (net + Math.Round(net * .19m, 0, MidpointRounding.AwayFromZero) > 10000000m)
            throw new BillingDataException("El total de la factura no puede superar 10.000.000.");
        invoice.MontoImpuestos = Math.Round(net * .19m, 0, MidpointRounding.AwayFromZero);
        invoice.MontoTotal = net + invoice.MontoImpuestos;
        await db.SaveChangesAsync();
    }
}
