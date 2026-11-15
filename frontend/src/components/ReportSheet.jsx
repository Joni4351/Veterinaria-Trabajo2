import React from 'react';

export function ReportSheet({ report }) {
  return <div className="reports-sheet"><h3>{report.titulo}</h3><p>Emisión: {new Date(report.emitido).toLocaleString('es-CL')}</p><p>{report.filtros}</p>
    {report.grafico?.length > 0 && <figure className="reports-chart"><figcaption>Facturación mensual con impuestos</figcaption>{report.grafico.map(b => <div key={b.etiqueta}><span>{b.etiqueta}: ${Number(b.valor).toLocaleString('es-CL')}</span><div style={{ width: `${Math.max(1, Number(b.valor) / Math.max(1, ...report.grafico.map(x => Number(x.valor))) * 100)}%` }} /></div>)}</figure>}
    <div className="table-responsive" tabIndex={0} role="region" aria-label="Resultados del reporte"><table className="custom-table"><caption>{report.total ?? report.filas.length} registros filtrados</caption><thead><tr>{report.columnas.map(c => <th key={c.title} scope="col">{c.title}</th>)}</tr></thead>
      <tbody>{report.filas.map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j} data-label={report.columnas[j].title}>{report.columnas[j].kind === 'date' ? new Date(cell).toLocaleString('es-CL') : typeof cell === 'number' ? cell.toLocaleString('es-CL') : cell}</td>)}</tr>)}</tbody>
      {Object.keys(report.totales || {}).length > 0 && <tfoot><tr>{report.columnas.map((c, i) => <td key={i}>{i === 0 ? 'TOTAL' : report.totales[i] == null ? '' : Number(report.totales[i]).toLocaleString('es-CL')}</td>)}</tr></tfoot>}
    </table></div>
    {!report.filas.length && <p>No hay registros para los filtros seleccionados.</p>}
  </div>;
}
