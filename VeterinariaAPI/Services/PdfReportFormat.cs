using System.Globalization;
using System.Text;

namespace VeterinariaAPI.Services;

public class PdfReportFormat : IReportFormat
{
    public string Extension => "pdf";
    public string ContentType => "application/pdf";
    private const float PageWidth = 842, PageHeight = 595, Margin = 30, FontSize = 8, Leading = 11;
    // Courier has a fixed advance of 600 font units. This makes wrapping match the PDF font exactly.
    private static List<string> Wrap(string text, float width, float size = FontSize)
    {
        int capacity = Math.Max(1, (int)Math.Floor(width / (size * .6f)));
        var result = new List<string>();
        foreach (var paragraph in text.Replace("\r", "").Split('\n')) {
            var remaining = paragraph;
            while (remaining.Length > capacity) {
                var cut = remaining.LastIndexOf(' ', capacity, capacity + 1);
                if (cut <= 0) cut = capacity;
                result.Add(remaining[..cut]); remaining = remaining[cut..].TrimStart();
            }
            result.Add(remaining);
        }
        return result;
    }
    private static string Escape(string s) => s.Replace("\\", "\\\\").Replace("(", "\\(").Replace(")", "\\)");
    private static void Text(StringBuilder b, float x, float y, float size, string value, string font = "F2") =>
        b.Append(CultureInfo.InvariantCulture, $"BT /{font} {size} Tf 1 0 0 1 {x:0.###} {y:0.###} Tm ({Escape(value)}) Tj ET\n");
    private static void Line(StringBuilder b, float x1, float y1, float x2, float y2) =>
        b.Append(CultureInfo.InvariantCulture, $"0.65 G 0.4 w {x1:0.###} {y1:0.###} m {x2:0.###} {y2:0.###} l S 0 G\n");
    public byte[] Encode(ReportDocument report)
    {
        var available = PageWidth - 2 * Margin;
        var shares = report.Columnas.Length == 6 ? new[] { .05f, .15f, .22f, .25f, .19f, .14f }
            : Enumerable.Repeat(1f / report.Columnas.Length, report.Columnas.Length).ToArray();
        var widths = shares.Select(x => x * available).ToArray();
        var pages = new List<StringBuilder>(); StringBuilder content = null!; float y = 0;
        float Header(bool table) {
            content = new StringBuilder(); pages.Add(content);
            float top = PageHeight - Margin;
            foreach (var line in Wrap(report.Titulo, available, 13)) { Text(content, Margin, top, 13, line); top -= 17; }
            Text(content, Margin, top - 2, 8, $"Emisión UTC: {report.Emitido:yyyy-MM-dd HH:mm} | Registros: {report.Filas.Count}"); top -= 18;
            foreach (var line in Wrap(report.Filtros, available)) { Text(content, Margin, top, 8, line); top -= Leading; }
            top -= 10;
            if (table) {
                var labels = report.Columnas.Select((c, i) => Wrap(c.Title, widths[i] - 10)).ToArray();
                float height = labels.Max(x => x.Count) * Leading + 10;
                DrawCells(labels, top, height); top -= height;
            }
            return top;
        }
        void DrawCells(List<string>[] cells, float top, float height) {
            float x = Margin;
            Line(content, x, top, PageWidth - Margin, top);
            for (var c = 0; c < cells.Length; c++) {
                Line(content, x, top, x, top - height);
                for (var j = 0; j < cells[c].Count; j++) Text(content, x + 5, top - 13 - j * Leading, FontSize, cells[c][j]);
                x += widths[c];
            }
            Line(content, x, top, x, top - height); Line(content, Margin, top - height, x, top - height);
        }
        void Row(IEnumerable<object?> values) {
            var cells = values.Select((v, i) => Wrap(ReportText.Value(v), widths[i] - 10)).ToArray();
            int count = cells.Max(c => c.Count), offset = 0;
            // Keep ordinary rows together; split only a row taller than an entire page, preserving all text.
            if (y - (count * Leading + 10) < 40) y = Header(true);
            while (offset < count) {
                int take = Math.Min(count - offset, Math.Max(1, (int)((y - 50) / Leading)));
                float height = take * Leading + 10;
                DrawCells(cells.Select(c => c.Skip(offset).Take(take).ToList()).ToArray(), y, height);
                y -= height; offset += take;
                if (offset < count) y = Header(true);
            }
        }
        y = Header(true);
        foreach (var row in report.Filas) Row(row);
        if (report.Filas.Count == 0) Row(report.Columnas.Select((_, i) => i == 0 ? (object?)"Sin registros" : null));
        if (report.Totales.Count > 0) Row(report.Columnas.Select((_, i) => i == 0 ? (object?)"TOTAL" : report.Totales.TryGetValue(i, out var n) ? n : null));
        // A separate chart page prevents overlap with the table or totals.
        if (report.Grafico.Count > 0) {
            y = Header(false); Text(content, Margin, y, 12, "Facturación mensual con impuestos", "F1");
            var maximum = Math.Max(1, report.Grafico.Max(b => b.Valor)); float baseline = 115, top = y - 40;
            float slot = available / report.Grafico.Count;
            foreach (var (bar, i) in report.Grafico.Select((b, i) => (b, i))) {
                float x = Margin + i * slot + 6, width = Math.Max(1, slot - 12), height = (float)(bar.Valor / maximum) * Math.Max(30, top - baseline);
                content.Append(CultureInfo.InvariantCulture, $"0.05 0.46 0.43 rg {x:0.###} {baseline} {width:0.###} {height:0.###} re f 0 0 0 rg\n");
                Text(content, x, baseline - 15, 7, bar.Etiqueta);
                int line = 0; foreach (var label in Wrap(bar.Valor.ToString("0.00", CultureInfo.InvariantCulture), slot - 6, 7)) Text(content, x, baseline - 29 - line++ * 9, 7, label);
            }
            Text(content, Margin, 55, 8, "Montos facturados; no representan cobros ni ganancias.");
        }
        for (int p = 0; p < pages.Count; p++) Text(pages[p], Margin, 18, 8, $"VetClinic | Página {p + 1} de {pages.Count}");
        var objects = new List<string> { "", "", "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>", "<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>" };
        var pageIds = new List<int>();
        foreach (var page in pages) {
            var body = page.ToString(); int contentId = objects.Count + 1;
            objects.Add($"<< /Length {Encoding.Latin1.GetByteCount(body)} >>\nstream\n{body}endstream");
            pageIds.Add(objects.Count + 1);
            objects.Add($"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents {contentId} 0 R >>");
        }
        objects[0] = "<< /Type /Catalog /Pages 2 0 R >>";
        objects[1] = $"<< /Type /Pages /Count {pageIds.Count} /Kids [{string.Join(' ', pageIds.Select(i => $"{i} 0 R"))}] >>";
        using var output = new MemoryStream();
        void Write(string value) => output.Write(Encoding.Latin1.GetBytes(value));
        Write("%PDF-1.4\n"); var offsets = new List<long> { 0 };
        for (int i = 0; i < objects.Count; i++) { offsets.Add(output.Position); Write($"{i + 1} 0 obj\n{objects[i]}\nendobj\n"); }
        var xref = output.Position; Write($"xref\n0 {objects.Count + 1}\n0000000000 65535 f \n");
        foreach (var offset in offsets.Skip(1)) Write($"{offset:D10} 00000 n \n");
        Write($"trailer\n<< /Size {objects.Count + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF");
        return output.ToArray();
    }
}
