import React, { useState } from 'react';
import { it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchPicker } from '../components/SearchPicker';
const items = [
  { id: 1, label: 'Thor (Canino) — María González — 12.345.678-5', search: ['Thor', 'María González'], rut: '12.345.678-5' },
  { id: 2, label: 'Thorss (Canino) — Pedro — 9.876.543-2', search: ['Thorss', 'Pedro'], rut: '9.876.543-2' },
];
function Example({ initial = '' }) {
  const [value, setValue] = useState(initial);
  return <><label htmlFor="search">Paciente</label><SearchPicker id="search" value={value} onChange={setValue} items={items} /><output data-testid="selected">{value}</output></>;
}
it('ordena coincidencias exactas primero y permite seleccionarlas con teclado', async () => {
  const user = userEvent.setup(); render(<Example />);
  const input = screen.getByRole('searchbox');
  await user.click(input); expect(screen.queryByRole('group')).not.toBeInTheDocument();
  await user.type(input, 'thor');
  expect(screen.getAllByRole('button')[0]).toHaveTextContent('Thor (Canino)');
  await user.tab(); await user.keyboard('{Enter}');
  expect(screen.getByTestId('selected')).toHaveTextContent('1');
  expect(screen.queryByRole('group')).not.toBeInTheDocument();
  await user.click(input); expect(input).toHaveValue(''); expect(screen.queryByRole('group')).not.toBeInTheDocument();
});
it('busca dueño sin tildes y RUT sin separadores; editar exige volver a seleccionar', async () => {
  const user = userEvent.setup(); render(<Example initial="2" />);
  const input = screen.getByRole('searchbox');
  await user.click(input); await user.type(input, 'maria');
  expect(screen.getAllByRole('button')).toHaveLength(1);
  expect(screen.getByTestId('selected')).toBeEmptyDOMElement();
  await user.clear(input); await user.type(input, '123456785');
  await user.click(screen.getByRole('button', { name: /María/ }));
  expect(screen.getByTestId('selected')).toHaveTextContent('1');
  await user.click(input); await user.type(input, 'inexistente');
  expect(screen.getByText('No se encontraron coincidencias.')).toBeInTheDocument();
  await user.keyboard('{Escape}'); expect(screen.queryByRole('group')).not.toBeInTheDocument();
});
