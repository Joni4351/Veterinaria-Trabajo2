import React from 'react';
import { money } from './DashboardCharts';

const percent = value => value == null ? 'No calculable: sin registros' : `${new Intl.NumberFormat('es-CL', { maximumFractionDigits: 1 }).format(value)} %`;
export function DashboardIndicatorGuide({ data }) {
  const s = data.indicadores;
  const rows = [
    ['Total facturado', '¿Cuánto se facturó en el período?', 'Suma de los montos totales de las facturas.', money(s.totalFacturado)],
    ['Promedio por factura', '¿Cuál es el importe promedio de una factura?', 'Total facturado ÷ cantidad de facturas.', s.promedioPorFactura == null ? 'No calculable: sin registros' : money(s.promedioPorFactura, 2)],
    ['Cantidad de citas', '¿Cuántas citas están programadas para el período?', 'Conteo de citas cuya fecha pertenece al período.', s.citas],
    ['Porcentaje de cancelaciones', '¿Qué proporción de las citas fue cancelada?', '(Citas canceladas ÷ total de citas) × 100.', percent(s.porcentajeCancelacion)],
    ['Participación por especialidad', '¿Qué especialidades concentran las citas?', '(Citas de la especialidad ÷ total de citas) × 100.', (data.especialidades || []).length ? data.especialidades.map(e => `${e.nombre}: ${percent(e.porcentaje)}`).join(' · ') : 'No calculable: sin registros'],
    ['Porcentaje de insumos agotados', '¿Qué proporción de insumos no tiene existencias?', '(Insumos con stock cero ÷ total de insumos de la categoría) × 100.', percent(s.porcentajeInsumosAgotados)]
  ];
  return <details className="dash-filters dash-indicator-guide"><summary>Cómo se calculan los seis indicadores</summary>
    <p>Resultados del período y filtros mostrados. El inventario corresponde al stock actual de la categoría seleccionada; el filtro de existencias solo limita las barras. Los montos son facturados, no cobros ni ganancias. Sin registros para el denominador, el indicador no es calculable.</p>
    <div className="dash-data-scroll" tabIndex={0} role="region" aria-label="Definición y resultados de los indicadores"><table>
      <caption>Seis indicadores de gestión: pregunta de negocio, fórmula y resultado</caption>
      <thead><tr>{['Indicador', 'Pregunta de negocio', 'Fórmula', 'Resultado actual'].map(h => <th key={h} scope="col">{h}</th>)}</tr></thead>
      <tbody>{rows.map(([name, question, formula, value]) => <tr key={name}><th scope="row">{name}</th><td>{question}</td><td>{formula}</td><td>{value}</td></tr>)}</tbody>
    </table></div>
  </details>;
}
