import React, { useId } from 'react';

export const pageRows = (rows, page, order = 'asc') => {
  const current = Math.min(Math.max(1, page), Math.max(1, Math.ceil(rows.length / 10)));
  return [...rows].sort((a, b) => order === 'desc' ? b.id - a.id : a.id - b.id).slice((current - 1) * 10, current * 10);
};
export function TablePagination({ total, page, order, onPage, onOrder }) {
  const id = useId(), pages = Math.max(1, Math.ceil(total / 10)), current = Math.min(page, pages);
  return <nav aria-label="Paginación de registros" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', padding: 14 }}>
    <label htmlFor={id}>Orden de registro</label><select id={id} className="form-select" style={{ width: 'auto' }} value={order} onChange={e => { onOrder(e.target.value); onPage(1); }}><option value="asc">Primeros registros</option><option value="desc">Últimos registros</option></select>
    <span>{total} registros · Página {current} de {pages}</span>
    <button type="button" className="btn btn-secondary" disabled={current <= 1} onClick={() => onPage(current - 1)}>Anterior</button>
    <button type="button" className="btn btn-secondary" disabled={current >= pages} onClick={() => onPage(current + 1)}>Siguiente</button>
  </nav>;
}
