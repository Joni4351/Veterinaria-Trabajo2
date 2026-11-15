import React, { useRef, useState } from 'react';

const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const compact = value => normalize(value).replace(/[.\-\s]/g, '');

// Native search field and keyboard-reachable result buttons; selection is always explicit.
export function SearchPicker({ items, value, onChange, placeholder, ...inputProps }) {
  const [query, setQuery] = useState(null);
  const input = useRef(null);
  const term = normalize(query);
  const selected = items.find(item => String(item.id) === String(value));
  const results = term ? items.map(item => {
    const fields = item.search.map(normalize);
    const rut = compact(item.rut);
    const score = fields.some(field => field === term) || (rut && rut === compact(term)) ? 0
      : fields.some(field => field.startsWith(term)) || (rut && rut.startsWith(compact(term))) ? 1
      : fields.some(field => field.includes(term)) || (compact(term) && rut.includes(compact(term))) ? 2 : 3;
    return { item, score };
  }).filter(result => result.score < 3).sort((a, b) => a.score - b.score || a.item.label.localeCompare(b.item.label, 'es')) : [];
  return <>
    <input {...inputProps} ref={input} type="search" autoComplete="off" placeholder={placeholder} className={`form-input ${inputProps['aria-invalid'] ? 'border-danger' : ''}`}
      value={query ?? selected?.label ?? ''} onFocus={() => setQuery('')} onClick={() => { if (query === null) setQuery(''); }} onChange={e => { setQuery(e.target.value); onChange(''); }}
      onBlur={e => { if (!e.currentTarget.parentElement.contains(e.relatedTarget)) setQuery(null); }}
      onKeyDown={e => { if (e.key === 'Escape' && query) { e.stopPropagation(); setQuery(null); } }} />
    {term && <div role="group" aria-label="Resultados de búsqueda" style={{ maxHeight: 240, overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: 8, padding: 6 }}>
      <p role="status">{results.length ? `${results.length} coincidencias` : 'No se encontraron coincidencias.'}</p>
      {results.map(({ item }) => <button key={item.id} type="button" className="btn btn-secondary" style={{ display: 'block', width: '100%', textAlign: 'left', whiteSpace: 'normal', marginBottom: 6 }} onClick={() => { onChange(String(item.id)); input.current?.focus(); setQuery(null); }}>{item.label}</button>)}
    </div>}
  </>;
}
