import React, { useId, useState } from 'react';

export const chartColors = ['#0d9488', '#0284c7', '#6366f1', '#d97706', '#e11d48', '#64748b'];
export const stateColors = { Pendiente: '#d97706', Confirmada: '#0284c7', 'En Curso': '#6366f1', Completada: '#0d9488', Atendida: '#64748b', Cancelada: '#e11d48' };
export const money = (value, maximumFractionDigits = 0) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits }).format(Number(value) || 0);
const shortMoney = value => new Intl.NumberFormat('es-CL', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
export const shortDate = value => new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' });

function DataTable({ headers, rows, caption = `Datos: ${headers.join(', ')}` }) {
  const [open, setOpen] = useState(false);
  return <details className="dash-data" onToggle={e => setOpen(e.currentTarget.open)}><summary>Ver datos de la visualización</summary>
    {open && <div className="dash-data-scroll" tabIndex={0} role="region" aria-label={caption}><table><caption>{caption}</caption><thead><tr>{headers.map(h => <th key={h} scope="col">{h}</th>)}</tr></thead>
      <tbody>{rows.map((r, i) => <tr key={i}>{r.map((v, j) => <td key={j}>{v}</td>)}</tr>)}</tbody></table></div>}
  </details>;
}
const Empty = ({ children }) => <><div className="dash-chart-empty">{children}</div><DataTable caption={children} headers={['Resultado']} rows={[[children]]} /></>;

export function RevenueChart({ data = [] }) {
  const gradient = useId().replaceAll(':', '');
  if (!data.some(d => d.facturas > 0)) return <Empty>No hay facturas emitidas en este período.</Empty>;
  const max = Math.max(...data.map(d => d.total), 1);
  const x = i => 58 + i * 510 / Math.max(data.length - 1, 1);
  const y = v => 188 - v / max * 150;
  const points = data.map((d, i) => `${x(i)},${y(d.total)}`).join(' ');
  return <>
    <p className="dash-chart-description">{data.reduce((sum, d) => sum + d.facturas, 0)} facturas; total del período: {money(data.reduce((sum, d) => sum + d.total, 0))}. La línea muestra su evolución.</p>
    <svg className="dash-svg" viewBox="0 0 600 230" role="img" aria-label="Evolución de los montos facturados por período en pesos chilenos">
      <defs><linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#0d9488" stopOpacity=".25" /><stop offset="1" stopColor="#0d9488" stopOpacity="0" /></linearGradient></defs>
      {[0, .5, 1].map(p => <g key={p}><line x1="58" x2="568" y1={y(max * p)} y2={y(max * p)} className="dash-grid-line" /><text x="50" y={y(max * p) + 4} textAnchor="end">{shortMoney(max * p)}</text></g>)}
      <polygon points={`58,188 ${points} ${x(data.length - 1)},188`} fill={`url(#${gradient})`} />
      <polyline points={points} fill="none" stroke="#0d9488" strokeWidth="3" strokeLinejoin="round" />
      {data.map((d, i) => <g key={d.periodo}><circle cx={x(i)} cy={y(d.total)} r={data.length > 60 ? 2 : 4} fill="#0d9488"><title>{`${d.periodo}: ${money(d.total)} · ${d.facturas} facturas`}</title></circle>
        {(i % Math.max(1, Math.ceil(data.length / 6)) === 0 || i === data.length - 1) && <text x={x(i)} y="215" textAnchor="middle">{shortDate(d.periodo)}</text>}</g>)}
    </svg>
    <DataTable headers={['Período', 'Facturado', 'Facturas']} rows={data.map(d => [d.periodo, money(d.total), d.facturas])} />
  </>;
}

export function AppointmentChart({ data = [] }) {
  const patternId = useId();
  const totals = data.map(d => d.estados.reduce((sum, s) => sum + s.cantidad, 0));
  if (!totals.some(Boolean)) return <Empty>No hay citas para los filtros seleccionados.</Empty>;
  const max = Math.max(...totals, 1);
  const cell = 510 / data.length;
  return <>
    <p className="dash-chart-description">{totals.reduce((sum, n) => sum + n, 0)} citas. Cada barra representa un período; los estados se distinguen por color y trama. Los valores se detallan en la tabla.</p>
    <div className="dash-chart-legend">{Object.entries(stateColors).map(([name, color], i) => <span key={name}><i style={{ backgroundColor: color, backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 2px, #fff9 2px, #fff9 3px)', backgroundSize: `${i + 4}px ${i + 4}px` }} />{name}</span>)}</div>
    <svg className="dash-svg" viewBox="0 0 600 230" role="img" aria-label="Cantidad de citas por período, separadas por estado">
      <defs>{Object.entries(stateColors).map(([state, color], i) => <pattern key={state} id={`${patternId}-${i}`} width={i + 4} height={i + 4} patternUnits="userSpaceOnUse"><rect width="100%" height="100%" fill={color} /><path d={`M0 0L${i + 4} ${i + 4}`} stroke="#ffffff99" strokeWidth="1" /></pattern>)}</defs>
      {[0, .5, 1].map(p => <g key={p}><line x1="45" x2="565" y1={185 - 145 * p} y2={185 - 145 * p} className="dash-grid-line" /><text x="35" y={189 - 145 * p} textAnchor="end">{Math.ceil(max * p)}</text></g>)}
      {data.map((d, i) => {
        let offset = 0;
        return <g key={d.periodo}>{d.estados.map(s => {
          const height = s.cantidad / max * 145;
          offset += height;
          return <rect key={s.estado} x={45 + cell * i + cell * .12} y={185 - offset} width={Math.max(.5, cell * .76)} height={height} fill={`url(#${patternId}-${Object.keys(stateColors).indexOf(s.estado)})`} stroke="var(--bg-surface)" strokeWidth=".8">
            <title>{`${d.periodo} · ${s.estado}: ${s.cantidad}`}</title></rect>;
        })}{i % Math.max(1, Math.ceil(data.length / 6)) === 0 && <text x={45 + cell * (i + .5)} y="215" textAnchor="middle">{shortDate(d.periodo)}</text>}</g>;
      })}
    </svg>
    <DataTable headers={['Período', 'Estado', 'Citas']} rows={data.flatMap(d => d.estados.filter(s => s.cantidad).map(s => [d.periodo, s.estado, s.cantidad]))} />
  </>;
}

export function SpecialtyChart({ data = [] }) {
  const total = data.reduce((s, d) => s + d.cantidad, 0);
  if (!total) return <Empty>No hay citas por especialidad en este período.</Empty>;
  const shown = data.length > 6 ? [...data.slice(0, 5), { id: 'otras', nombre: 'Otras especialidades', cantidad: data.slice(5).reduce((s, d) => s + d.cantidad, 0) }] : data;
  let offset = 0;
  return <>
    <p className="dash-chart-description">{total} citas distribuidas entre {data.length} especialidades. Los números del anillo corresponden a la lista de especialidades y sus porcentajes.</p>
    <div className="dash-donut-layout"><svg viewBox="0 0 220 220" role="img" aria-label="Distribución de citas según la especialidad veterinaria">
      {shown.map((d, i) => {
        const percent = d.cantidad / total * 100;
        const start = offset; offset += percent;
        const angle = (start + percent / 2) / 100 * Math.PI * 2 - Math.PI / 2;
        const labelX = 110 + Math.cos(angle) * 78, labelY = 110 + Math.sin(angle) * 78;
        return <g key={d.id}><circle cx="110" cy="110" r="78" pathLength="100" fill="none" strokeWidth="28" stroke={chartColors[i % chartColors.length]}
          strokeDasharray={`${percent} ${100 - percent}`} strokeDashoffset={-start} transform="rotate(-90 110 110)"><title>{`${d.nombre}: ${d.cantidad} (${percent.toFixed(1)} %)`}</title></circle>
          <circle cx={labelX} cy={labelY} r="10" fill="var(--bg-surface)" /><text x={labelX} y={labelY + 4} textAnchor="middle">{i + 1}</text></g>;
      })}
      <text className="dash-donut-total" x="110" y="110" textAnchor="middle">{total}</text><text x="110" y="134" textAnchor="middle">citas</text>
    </svg><ul className="dash-specialties">{shown.map((d, i) => <li key={d.id}><i style={{ background: chartColors[i % chartColors.length] }} /><span>{i + 1}. {d.nombre}</span><strong>{(d.cantidad / total * 100).toFixed(1)} %</strong></li>)}</ul></div>
    <DataTable headers={['Especialidad', 'Citas', 'Proporción']} rows={data.map(d => [d.nombre, d.cantidad, `${(d.cantidad / total * 100).toFixed(1)} %`])} />
  </>;
}

export function InventoryChart({ data = [] }) {
  if (!data.length) return <Empty>No hay insumos para esta categoría o condición de stock.</Empty>;
  const max = Math.max(...data.map(d => d.stockActual), 10);
  return <><div className="dash-inventory-bars">{data.map(d => <div key={d.id} className="dash-inventory-row">
    <div><span>{d.nombreProducto}</span><strong className={d.stockActual === 0 ? 'dash-stock-out' : d.stockActual <= 10 ? 'dash-stock-low' : ''}>{d.stockActual} u.{d.stockActual === 0 ? ' · Agotado' : d.stockActual <= 10 ? ' · Bajo' : ''}</strong></div>
    <div className="dash-stock-track" role="img" aria-label={`${d.nombreProducto}: ${d.stockActual} unidades`}><span style={{ width: `${Math.max(1, d.stockActual / max * 100)}%`, background: d.stockActual === 0 ? '#e11d48' : d.stockActual <= 10 ? '#d97706' : '#0d9488' }} /></div>
  </div>)}</div><DataTable headers={['Insumo', 'Categoría', 'Existencias actuales']} rows={data.map(d => [d.nombreProducto, d.tipo, d.stockActual])} /></>;
}
