using System.Globalization;
using System.IO.Compression;
using System.Text;
using System.Xml.Linq;

namespace VeterinariaAPI.Services;

// Strategy: one encoder per representation, selected through dependency injection.
public interface IReportFormat
{
    string Extension { get; }
    string ContentType { get; }
    byte[] Encode(ReportDocument report);
}
public class PrintReportFormat : IReportFormat
{
    public string Extension => "impresion";
    public string ContentType => "application/json";
    public byte[] Encode(ReportDocument report) => System.Text.Json.JsonSerializer.SerializeToUtf8Bytes(report, new System.Text.Json.JsonSerializerOptions(System.Text.Json.JsonSerializerDefaults.Web));
}
public static class ReportText
{
    public static string Value(object? value) => value switch {
        DateTime d => d.ToString("yyyy-MM-dd HH:mm", CultureInfo.InvariantCulture),
        decimal d => d.ToString("0.00", CultureInfo.InvariantCulture),
        _ => Convert.ToString(value, CultureInfo.InvariantCulture) ?? ""
    };
}
public class CsvReportFormat : IReportFormat
{
    public string Extension => "csv";
    public string ContentType => "text/csv; charset=utf-8";
    public byte[] Encode(ReportDocument report)
    {
        string Cell(object? value) {
            var s = ReportText.Value(value);
            if (value is string && s.TrimStart().StartsWithAny('=', '+', '-', '@')) s = "'" + s;
            return "\"" + s.Replace("\"", "\"\"") + "\"";
        }
        var lines = new List<string> { string.Join(';', report.Columnas.Select(c => Cell(c.Title))) };
        lines.AddRange(report.Filas.Select(r => string.Join(';', r.Select(Cell))));
        if (report.Totales.Count > 0) lines.Add(string.Join(';', Enumerable.Range(0, report.Columnas.Length).Select(i => Cell(i == 0 ? "TOTAL" : report.Totales.TryGetValue(i, out var n) ? n : null))));
        return Encoding.UTF8.GetPreamble().Concat(Encoding.UTF8.GetBytes(string.Join("\r\n", lines))).ToArray();
    }
}
internal static class CsvSafety { public static bool StartsWithAny(this string s, params char[] chars) => s.Length > 0 && chars.Contains(s[0]); }

public class XlsxReportFormat : IReportFormat
{
    public string Extension => "xlsx";
    public string ContentType => "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    public byte[] Encode(ReportDocument r)
    {
        using var stream = new MemoryStream();
        using (var zip = new ZipArchive(stream, ZipArchiveMode.Create, true))
        {
            void Put(string path, string xml) { using var writer = new StreamWriter(zip.CreateEntry(path).Open(), new UTF8Encoding(false)); writer.Write(xml); }
            XNamespace ns = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
            var sheet = new XElement(ns + "sheetData");
            var rowNumber = 0;
            void Row(IEnumerable<object?> values, bool header = false, bool types = false) {
                rowNumber++; var row = new XElement(ns + "row", new XAttribute("r", rowNumber)); int i = 0;
                foreach (var v in values) {
                    var cell = new XElement(ns + "c", new XAttribute("r", $"{(char)('A' + i)}{rowNumber}"));
                    if (v is DateTime date) cell.Add(new XAttribute("s", 1), new XElement(ns + "v", date.ToOADate().ToString(CultureInfo.InvariantCulture)));
                    else if (v is decimal or int or long) cell.Add(new XAttribute("s", types && r.Columnas[i].Kind == "integer" ? 2 : 3), new XElement(ns + "v", ReportText.Value(v)));
                    else cell.Add(new XAttribute("t", "inlineStr"), new XAttribute("s", header ? 4 : 0), new XElement(ns + "is", new XElement(ns + "t", ReportText.Value(v))));
                    row.Add(cell); i++;
                }
                sheet.Add(row);
            }
            Row([r.Titulo], true); Row([$"Emisión UTC: {r.Emitido:yyyy-MM-dd HH:mm}"]); Row([r.Filtros]); Row(r.Columnas.Select(c => (object?)c.Title), true);
            foreach (var row in r.Filas) Row(row, types: true);
            if (r.Totales.Count > 0) Row(Enumerable.Range(0, r.Columnas.Length).Select(i => i == 0 ? (object?)"TOTAL" : r.Totales.TryGetValue(i, out var n) ? n : null), true, true);
            Row([$"Registros: {r.Filas.Count}"]);
            Put("[Content_Types].xml", XlsxChartParts.ContentTypes(r.Grafico.Count > 0));
            Put("_rels/.rels", "<Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\"><Relationship Id=\"rId1\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument\" Target=\"xl/workbook.xml\"/></Relationships>");
            Put("xl/workbook.xml", "<workbook xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\" xmlns:r=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships\"><sheets><sheet name=\"Reporte\" sheetId=\"1\" r:id=\"rId1\"/></sheets></workbook>");
            Put("xl/_rels/workbook.xml.rels", "<Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\"><Relationship Id=\"rId1\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet\" Target=\"worksheets/sheet1.xml\"/><Relationship Id=\"rId2\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles\" Target=\"styles.xml\"/></Relationships>");
            Put("xl/styles.xml", "<styleSheet xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\"><fonts count=\"2\"><font><sz val=\"11\"/><name val=\"Calibri\"/></font><font><b/><sz val=\"11\"/><name val=\"Calibri\"/></font></fonts><fills count=\"2\"><fill><patternFill patternType=\"none\"/></fill><fill><patternFill patternType=\"gray125\"/></fill></fills><borders count=\"1\"><border/></borders><cellStyleXfs count=\"1\"><xf numFmtId=\"0\" fontId=\"0\" fillId=\"0\" borderId=\"0\"/></cellStyleXfs><cellXfs count=\"5\"><xf numFmtId=\"0\" fontId=\"0\" fillId=\"0\" borderId=\"0\"/><xf numFmtId=\"22\" fontId=\"0\" fillId=\"0\" borderId=\"0\" applyNumberFormat=\"1\"/><xf numFmtId=\"1\" fontId=\"0\" fillId=\"0\" borderId=\"0\"/><xf numFmtId=\"4\" fontId=\"0\" fillId=\"0\" borderId=\"0\"/><xf numFmtId=\"0\" fontId=\"1\" fillId=\"0\" borderId=\"0\"/></cellXfs><cellStyles count=\"1\"><cellStyle name=\"Normal\" xfId=\"0\" builtinId=\"0\"/></cellStyles></styleSheet>");
            var worksheet = new XElement(ns + "worksheet", new XElement(ns + "sheetViews", new XElement(ns + "sheetView", new XAttribute("workbookViewId", 0), new XElement(ns + "pane", new XAttribute("ySplit", 4), new XAttribute("topLeftCell", "A5"), new XAttribute("state", "frozen")))), new XElement(ns + "cols", new XElement(ns + "col", new XAttribute("min", 1), new XAttribute("max", r.Columnas.Length), new XAttribute("width", 26), new XAttribute("customWidth", 1))), sheet);
            XlsxChartParts.Add(r, worksheet, Put);
            Put("xl/worksheets/sheet1.xml", worksheet.ToString());
        }
        return stream.ToArray();
    }
}

public class PdfReportFormat : IReportFormat
{
    public string Extension => "pdf";
    public string ContentType => "application/pdf";
    public byte[] Encode(ReportDocument r)
    {
        static string Escape(string s) => s.Replace("\\", "\\\\").Replace("(", "\\(").Replace(")", "\\)").Replace("\r", " ").Replace("\n", " ");
        static IEnumerable<string> Wrap(string s) { for (var i = 0; i < s.Length; i += 125) yield return s.Substring(i, Math.Min(125, s.Length - i)); }
        var lines = new List<string>();
        lines.AddRange(r.Filas.SelectMany(row => Wrap(string.Join(" | ", row.Select(ReportText.Value)))));
        lines.Add($"Registros: {r.Filas.Count}");
        if (r.Totales.Count > 0) lines.Add("TOTALES: " + string.Join("; ", r.Totales.Select(t => $"{r.Columnas[t.Key].Title}: {t.Value:0.00}")));
        var pages = lines.Chunk(36).ToArray();
        var objects = new List<string> { "", "", "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>" };
        var pageIds = new List<int>();
        for (var p = 0; p < pages.Length; p++) {
            var content = new StringBuilder();
            void Text(float x, float y, int size, string s) => content.Append(CultureInfo.InvariantCulture, $"BT /F1 {size} Tf {x} {y} Td ({Escape(s)}) Tj ET\n");
            Text(30, 565, 15, r.Titulo); Text(30, 546, 9, $"Emisión UTC: {r.Emitido:yyyy-MM-dd HH:mm}");
            var filterLines = Wrap(r.Filtros).ToArray();
            for (var i = 0; i < filterLines.Length; i++) Text(30, 532 - i * 10, 8, filterLines[i]);
            Text(30, 512, 8, string.Join(" | ", r.Columnas.Select(c => c.Title)));
            for (var i = 0; i < pages[p].Length; i++) Text(30, 490 - i * 10, 8, pages[p][i]);
            Text(30, 15, 9, $"VetClinic | Página {p + 1} de {pages.Length}");
            if (p == 0 && r.Grafico.Count > 0) {
                var max = Math.Max(1, r.Grafico.Max(b => b.Valor)); var width = 740m / r.Grafico.Count;
                foreach (var (bar, i) in r.Grafico.Select((b, i) => (b, i))) {
                    var h = (float)(bar.Valor / max * 65); var x = 35 + (float)(i * width);
                    content.Append(CultureInfo.InvariantCulture, $"0.05 0.46 0.43 rg {x} 45 {(float)width - 5} {h} re f 0 0 0 rg\n");
                    Text(x, 30, 7, bar.Etiqueta);
                }
            }
            var contentId = objects.Count + 1; var body = content.ToString();
            objects.Add($"<< /Length {Encoding.Latin1.GetByteCount(body)} >>\nstream\n{body}endstream");
            pageIds.Add(objects.Count + 1);
            objects.Add($"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Resources << /Font << /F1 3 0 R >> >> /Contents {contentId} 0 R >>");
        }
        objects[0] = "<< /Type /Catalog /Pages 2 0 R >>";
        objects[1] = $"<< /Type /Pages /Count {pageIds.Count} /Kids [{string.Join(' ', pageIds.Select(i => $"{i} 0 R"))}] >>";
        using var output = new MemoryStream();
        void Write(string s) => output.Write(Encoding.Latin1.GetBytes(s));
        Write("%PDF-1.4\n"); var offsets = new List<long> { 0 };
        for (var i = 0; i < objects.Count; i++) { offsets.Add(output.Position); Write($"{i + 1} 0 obj\n{objects[i]}\nendobj\n"); }
        var xref = output.Position; Write($"xref\n0 {objects.Count + 1}\n0000000000 65535 f \n");
        foreach (var offset in offsets.Skip(1)) Write($"{offset:D10} 00000 n \n");
        Write($"trailer\n<< /Size {objects.Count + 1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF");
        return output.ToArray();
    }
}
