import React, { useState } from 'react';
import { expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { NumericInput } from '../components/NumericInput';
import { plainNumberInput } from '../schemas/numberValidation';
import { pacienteSchema } from '../schemas/pacienteSchema';
import { insumoSchema } from '../schemas/insumoSchema';
import { especialidadSchema } from '../schemas/adminSchema';
import { recetaMedicaSchema } from '../schemas/consultaSchema';
import { facturaSchema, detalleFacturaSchema } from '../schemas/facturaSchema';
import { todayInChile } from '../schemas/dateValidation';

function Example({ decimal = false }) {
  const [value, setValue] = useState('12');
  return <NumericInput aria-label="Número" allowDecimal={decimal} value={value} onChange={e => setValue(e.target.value)} />;
}

it('bloquea símbolos, letras y decimales en enteros sin afectar navegación ni atajos', () => {
  render(<Example />);
  const input = screen.getByRole('spinbutton', { name: 'Número' });
  for (const key of ['e', 'E', '+', '-', '*', '/', '^', '%', 'a', ' ', '.', ','])
    expect(fireEvent.keyDown(input, { key })).toBe(false);
  for (const key of ['1', '0', 'Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter'])
    expect(fireEvent.keyDown(input, { key })).toBe(true);
  expect(fireEvent.keyDown(input, { key: 'a', ctrlKey: true })).toBe(true);
  expect(fireEvent.keyDown(input, { key: 'v', metaKey: true })).toBe(true);
  expect(input).toHaveAttribute('inputmode', 'numeric');
  expect(fireEvent.paste(input, { clipboardData: { getData: () => '2.5' } })).toBe(false);
});

it('conserva decimales permitidos, rechaza pegado y arrastre inválidos y no interpreta exponentes', () => {
  render(<Example decimal />);
  const input = screen.getByRole('spinbutton', { name: 'Número' });
  expect(fireEvent.keyDown(input, { key: '.' })).toBe(true);
  expect(fireEvent.paste(input, { clipboardData: { getData: () => '12.5' } })).toBe(true);
  for (const text of ['1e3', '2E2', '-5', '+3', '3*4', '2/3', '1..2', 'Infinity', 'NaN', '12,5']) {
    expect(fireEvent.paste(input, { clipboardData: { getData: () => text } })).toBe(false);
    expect(fireEvent.drop(input, { dataTransfer: { getData: () => text } })).toBe(false);
  }
  fireEvent.change(input, { target: { value: '1e3' } });
  expect(input).toHaveValue(12);
  fireEvent.change(input, { target: { value: '12.5' } });
  expect(input).toHaveValue(12.5);
  fireEvent.change(input, { target: { value: '' } });
  expect(input).toHaveValue(null);
});

it('los esquemas rechazan expresiones y exponentes incluso si se omite el control visual', () => {
  const today = todayInChile();
  for (const value of ['1e2', '1E2', '+2', '-2', '3*4', '2/3', 'Infinity', '', null, true]) {
    expect(pacienteSchema.safeParse({ clienteId: 1, nombre: 'Thor', especie: 'Canino', peso: value }).success).toBe(false);
    expect(especialidadSchema.safeParse({ nombre: 'Medicina General', costoBase: value }).success).toBe(false);
    expect(insumoSchema.safeParse({ nombreProducto: 'Prueba', tipo: 'Medicamento', stockActual: value, precioUnitario: 10 }).success).toBe(false);
    expect(insumoSchema.safeParse({ nombreProducto: 'Prueba', tipo: 'Medicamento', stockActual: 1, precioUnitario: value }).success).toBe(false);
    expect(recetaMedicaSchema.safeParse({ fechaEmision: today, validaHasta: today, insumoId: 1, dosis: 'Una dosis', duracionDias: value }).success).toBe(false);
    expect(facturaSchema.safeParse({ clienteId: 1, fechaEmision: today, montoTotal: value, montoImpuestos: 0 }).success).toBe(false);
    expect(detalleFacturaSchema.safeParse({ tipo: 'insumo', insumoId: '1', subtotal: value }).success).toBe(false);
  }
  expect(plainNumberInput('12.5')).toBe(12.5);
  expect(plainNumberInput('0', false)).toBe(0);
  expect(plainNumberInput('2.5', false)).toBeNaN();
});
