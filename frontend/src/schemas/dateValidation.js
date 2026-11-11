import { z } from 'zod';

export function isCalendarDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export const calendarDateSchema = label => z.string().min(1, `${label} es obligatoria`)
  .refine(isCalendarDate, `${label} debe ser una fecha válida`);

export function todayInChile() {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const part = type => parts.find(p => p.type === type).value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export const emissionDateSchema = () => calendarDateSchema('La fecha de emisión')
  .refine(value => value === todayInChile(), 'La fecha de emisión debe corresponder al día de hoy (hora de Chile)');

export function dateTimeInputValue(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  const pad = number => String(number).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
