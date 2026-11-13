using System.Xml.Linq;

namespace VeterinariaAPI.Services;

internal static class XlsxChartParts
{
    public static string ContentTypes(bool chart)
    {
        XNamespace ns = "http://schemas.openxmlformats.org/package/2006/content-types";
        var root = new XElement(ns + "Types", new XElement(ns + "Default", new XAttribute("Extension", "rels"), new XAttribute("ContentType", "application/vnd.openxmlformats-package.relationships+xml")), new XElement(ns + "Default", new XAttribute("Extension", "xml"), new XAttribute("ContentType", "application/xml")));
        var parts = new Dictionary<string, string> { ["/xl/workbook.xml"] = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml", ["/xl/worksheets/sheet1.xml"] = "application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml", ["/xl/styles.xml"] = "application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml" };
        if (chart) { parts["/xl/charts/chart1.xml"] = "application/vnd.openxmlformats-officedocument.drawingml.chart+xml"; parts["/xl/drawings/drawing1.xml"] = "application/vnd.openxmlformats-officedocument.drawing+xml"; }
        foreach (var pair in parts) root.Add(new XElement(ns + "Override", new XAttribute("PartName", pair.Key), new XAttribute("ContentType", pair.Value)));
        return root.ToString();
    }
    public static void Add(ReportDocument r, XElement sheet, Action<string, string> put)
    {
        if (r.Grafico.Count == 0) return;
        XNamespace ns = "http://schemas.openxmlformats.org/spreadsheetml/2006/main", rel = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
        sheet.Add(new XElement(ns + "drawing", new XAttribute(rel + "id", "drawing")));
        put("xl/worksheets/_rels/sheet1.xml.rels", "<Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\"><Relationship Id=\"drawing\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing\" Target=\"../drawings/drawing1.xml\"/></Relationships>");
        var firstRow = r.Filas.Count + 8;
        put("xl/drawings/drawing1.xml", $"""
            <xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
            <xdr:twoCellAnchor><xdr:from><xdr:col>0</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>{firstRow}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from><xdr:to><xdr:col>8</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>{firstRow + 18}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to>
            <xdr:graphicFrame macro=""><xdr:nvGraphicFramePr><xdr:cNvPr id="2" name="Facturación mensual"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr><xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart"><c:chart xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:id="chart"/></a:graphicData></a:graphic></xdr:graphicFrame><xdr:clientData/></xdr:twoCellAnchor></xdr:wsDr>
            """);
        put("xl/drawings/_rels/drawing1.xml.rels", "<Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\"><Relationship Id=\"chart\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart\" Target=\"../charts/chart1.xml\"/></Relationships>");
        put("xl/charts/chart1.xml", $"""
            <c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart"><c:chart><c:plotArea><c:layout/><c:barChart><c:barDir val="col"/><c:grouping val="clustered"/><c:ser><c:idx val="0"/><c:order val="0"/><c:tx><c:v>Total facturado</c:v></c:tx><c:cat><c:strRef><c:f>Reporte!$A$5:$A${r.Filas.Count + 4}</c:f></c:strRef></c:cat><c:val><c:numRef><c:f>Reporte!$C$5:$C${r.Filas.Count + 4}</c:f></c:numRef></c:val></c:ser><c:axId val="10"/><c:axId val="20"/></c:barChart><c:catAx><c:axId val="10"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:axPos val="b"/><c:crossAx val="20"/></c:catAx><c:valAx><c:axId val="20"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:axPos val="l"/><c:crossAx val="10"/></c:valAx></c:plotArea><c:plotVisOnly val="1"/></c:chart></c:chartSpace>
            """);
    }
}
