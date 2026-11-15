using System.IO.Compression;
using System.Text;
using System.Text.RegularExpressions;
using System.Xml.Linq;
using VeterinariaAPI.Services;

namespace VeterinariaAPI.Tests;

public class ReportLayoutTests
{
    public static ReportDocument Example(string type)
    {
        bool finance = type == "gerencial";
        var columns = finance ? new[] { new ReportColumn("Mes"), new ReportColumn("Facturas", "integer"), new ReportColumn("Total facturado", "decimal"), new ReportColumn("Impuestos", "decimal") }
            : new[] { new ReportColumn("ID", "integer"), new ReportColumn("Fecha y hora", "date"), new ReportColumn("Paciente"), new ReportColumn("Cliente"), new ReportColumn("Especialidad"), new ReportColumn("Estado") };
        var rows = finance ? Enumerable.Range(1, 12).Select(i => new object?[] { $"2026-{i:D2}", i, i * 15000m, i * 2395m }).ToList()
            : Enumerable.Range(1, 160).Select(i => new object?[] { i, new DateTime(2026, 1, 1).AddHours(i), $"Paciente {i:D3} con nombre suficientemente extenso para verificar el ajuste de texto", "Cliente con nombre completo y apellidos extensos", "Control general veterinario", "Completada" }).ToList();
        return new(type, finance ? "Resumen gerencial de facturación" : type == "operativo" ? "Agenda operativa de atenciones" : "Historial de citas por período", DateTimeOffset.Parse("2026-11-15T12:00:00Z"),
            "Desde 2026-01-01; hasta 2026-12-31; estado todos; especialidad todas; cliente todos", columns, rows,
            finance ? new() { [1] = 78, [2] = 1170000, [3] = 186810 } : new(),
            finance ? Enumerable.Range(1, 12).Select(i => new ReportBar($"2026-{i:D2}", i * 15000m)).ToList() : []);
    }
    [Theory]
    [InlineData("operativo")]
    [InlineData("periodo")]
    [InlineData("gerencial")]
    public void PdfPaginatesWithTableHeadersCompleteRowsAndBoundedCoordinates(string type)
    {
        var report = Example(type); var bytes = new PdfReportFormat().Encode(report); var pdf = Encoding.Latin1.GetString(bytes);
        var pages = Regex.Matches(pdf, @"/Type /Page\b").Count;
        Assert.True(pages > 1);
        Assert.Contains($"Página {pages} de {pages}", pdf);
        if (type != "gerencial") {
            Assert.Equal(report.Filas.Count, Regex.Matches(pdf, @"\(Completada\)").Count);
            Assert.Contains("Paciente 160", pdf);
            Assert.Equal(pages, Regex.Matches(pdf, @"\(Fecha y hora\)").Count);
        } else { Assert.Contains("2026-12", pdf); Assert.Contains("TOTAL", pdf); Assert.Contains("Facturación mensual", pdf); }
        foreach (Match m in Regex.Matches(pdf, @"1 0 0 1 ([\d.]+) ([\d.]+) Tm")) {
            Assert.InRange(float.Parse(m.Groups[1].Value, System.Globalization.CultureInfo.InvariantCulture), 0, 842);
            Assert.InRange(float.Parse(m.Groups[2].Value, System.Globalization.CultureInfo.InvariantCulture), 0, 595);
        }
        Save(type + ".pdf", bytes);
    }
    [Fact]
    public void XlsxChartIncludesMonthLabelsValuesAndVisibleAxesWithoutTotalRow()
    {
        var report = Example("gerencial"); var bytes = new XlsxReportFormat().Encode(report);
        using var zip = new ZipArchive(new MemoryStream(bytes));
        using var reader = new StreamReader(zip.GetEntry("xl/charts/chart1.xml")!.Open());
        var chart = XDocument.Parse(reader.ReadToEnd()); XNamespace c = "http://schemas.openxmlformats.org/drawingml/2006/chart";
        var labels = chart.Descendants(c + "strCache").Single().Descendants(c + "v").Select(x => x.Value).ToArray();
        Assert.Equal(report.Grafico.Select(b => b.Etiqueta), labels);
        Assert.Equal(12, chart.Descendants(c + "numCache").Single().Elements(c + "pt").Count());
        Assert.Contains("Reporte!$A$5:$A$16", chart.Descendants(c + "f").Select(x => x.Value));
        Assert.Equal("nextTo", chart.Descendants(c + "catAx").Single().Element(c + "tickLblPos")!.Attribute("val")!.Value);
        Assert.Equal("1", chart.Descendants(c + "showVal").Single().Attribute("val")!.Value);
        Assert.Contains("Total facturado por mes", chart.ToString());
        Save("gerencial.xlsx", bytes);
    }
    [Fact]
    public void PdfWithoutRecordsStillContainsHeadersAndMessage()
    {
        var report = Example("operativo") with { Filas = [] };
        var pdf = Encoding.Latin1.GetString(new PdfReportFormat().Encode(report));
        Assert.Contains("Sin", pdf); Assert.Contains("Estado", pdf); Assert.Contains("Página 1 de 1", pdf);
    }
    private static void Save(string name, byte[] bytes) {
        var folder = Environment.GetEnvironmentVariable("VETCLINIC_REPORT_ARTIFACTS_DIR");
        if (string.IsNullOrWhiteSpace(folder)) return;
        Directory.CreateDirectory(folder); File.WriteAllBytes(Path.Combine(folder, name), bytes);
    }
}
