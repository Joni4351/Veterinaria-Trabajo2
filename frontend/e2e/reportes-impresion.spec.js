import { test, expect } from '@playwright/test';

for (const width of [390, 1280]) {
for (const type of ['operativo', 'periodo', 'gerencial']) {
  test(`imprime todas las páginas de ${type} a ${width}px y restaura la vista paginada`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(() => {
      localStorage.setItem('vet_token', ['eyJhbGciOiJIUzI1NiJ9', btoa(JSON.stringify({ exp: Date.now() / 1000 + 3600 })), 'signature'].join('.'));
      localStorage.setItem('vet_user', JSON.stringify({ id: 1, name: 'Administrador', role: 'Administrador' }));
      window.print = () => { window.__printCalls = (window.__printCalls || 0) + 1; };
    });
    const finance = type === 'gerencial';
    const rows = finance ? Array.from({ length: 24 }, (_, i) => [`${2025 + Math.floor(i / 12)}-${String(i % 12 + 1).padStart(2, '0')}`, 10, 100000 + i, 19000])
      : Array.from({ length: 160 }, (_, i) => [i + 1, '2026-11-15T09:00:00', `Paciente ${String(i + 1).padStart(3, '0')} con nombre largo`, 'Cliente con nombres y apellidos extensos', 'Control general veterinario', 'Completada']);
    const full = { titulo: finance ? 'Resumen gerencial de facturación' : type === 'operativo' ? 'Agenda operativa de atenciones' : 'Historial de citas por período',
      emitido: '2026-11-15T12:00:00Z', filtros: 'Desde 2025-01-01; hasta 2026-12-31; cliente todos',
      columnas: (finance ? ['Mes', 'Facturas', 'Total facturado', 'Impuestos'] : ['ID', 'Fecha y hora', 'Paciente', 'Cliente', 'Especialidad', 'Estado']).map(title => ({ title })),
      filas: rows, totales: finance ? { 1: 240, 2: 2400276, 3: 456000 } : {},
      grafico: finance ? rows.map(r => ({ etiqueta: r[0], valor: r[2] })) : [] };
    let printRequests = 0;
    await page.route('**/api/**', route => {
      const u = new URL(route.request().url());
      if (u.pathname.includes('/admin/reportes/')) {
        if (u.pathname.endsWith('/exportar/impresion')) { printRequests++; return route.fulfill({ json: full }); }
        return route.fulfill({ json: { ...full, filas: rows.slice(0, 25), total: rows.length } });
      }
      return route.fulfill({ json: [] });
    });
    await page.goto('/admin'); await page.getByRole('button', { name: 'Reportes', exact: true }).click();
    await page.getByRole('combobox', { name: 'Reporte', exact: true }).selectOption(type);
    await expect(page.getByRole('button', { name: 'Imprimir reporte completo' })).toBeEnabled();
    await page.getByRole('button', { name: 'Imprimir reporte completo' }).click();
    await expect.poll(() => page.evaluate(() => window.__printCalls)).toBe(1);
    const printable = page.locator('.reports-print-root');
    await expect(printable.locator('tbody tr')).toHaveCount(rows.length);
    expect(printRequests).toBe(1);
    await page.emulateMedia({ media: 'print' });
    await expect(printable).toBeVisible();
    await expect(page.locator('#root')).toBeHidden();
    expect(await printable.locator('.reports-sheet').evaluate(el => getComputedStyle(el).position)).toBe('static');
    expect(await printable.locator('.table-responsive').evaluate(el => getComputedStyle(el).overflow)).toBe('visible');
    const layout = await printable.locator('table').evaluate(table => {
      const row = table.tBodies[0].rows[0];
      const cells = [...row.cells].map(cell => ({ x: cell.getBoundingClientRect().x, y: cell.getBoundingClientRect().y, display: getComputedStyle(cell).display }));
      return { body: getComputedStyle(table.tBodies[0]).display, row: getComputedStyle(row).display, shadow: getComputedStyle(row).boxShadow, cells };
    });
    expect(layout.body).toBe('table-row-group');
    expect(layout.row).toBe('table-row');
    expect(layout.shadow).toBe('none');
    expect(layout.cells.every(c => c.display === 'table-cell' && Math.abs(c.y - layout.cells[0].y) < 1)).toBe(true);
    expect(layout.cells.every((c, i) => i === 0 || c.x > layout.cells[i - 1].x)).toBe(true);
    const bytes = await page.pdf({ path: testInfo.outputPath(`${type}-impresion.pdf`), preferCSSPageSize: true, printBackground: true });
    expect((bytes.toString('latin1').match(/\/Type \/Page\b/g) || []).length).toBeGreaterThan(1);
    await page.emulateMedia({ media: 'screen' });
    await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
    await expect(printable).toHaveCount(0);
    await expect(page.locator('.reports-panel tbody tr')).toHaveCount(Math.min(25, rows.length));
  });
}

}

test('busca clientes por nombre o RUT sin desplegar el catálogo completo', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('vet_token', ['eyJhbGciOiJIUzI1NiJ9', btoa(JSON.stringify({ exp: Date.now() / 1000 + 3600 })), 'signature'].join('.'));
    localStorage.setItem('vet_user', JSON.stringify({ id: 1, name: 'Administrador', role: 'Administrador' }));
  });
  const requests = [];
  await page.route('**/api/**', route => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/clientes')) return route.fulfill({ json: [{ id: 1, nombreCompleto: 'María González', documentoIdentidad: '12.345.678-5' }, { id: 2, nombreCompleto: 'Pedro Pérez', documentoIdentidad: '9.876.543-2' }] });
    if (url.pathname.includes('/admin/reportes/')) {
      requests.push(url.searchParams.get('clienteId'));
      return route.fulfill({ json: { titulo: 'Agenda operativa', emitido: '2026-11-15T12:00:00Z', filtros: '', total: 0, columnas: [{ title: 'ID' }], filas: [], totales: {}, grafico: [] } });
    }
    return route.fulfill({ json: [] });
  });
  await page.goto('/admin'); await page.getByRole('button', { name: 'Reportes', exact: true }).click();
  const selected = page.getByRole('combobox', { name: 'Cliente', exact: true });
  const search = page.getByRole('searchbox', { name: 'Buscar cliente por nombre o RUT' });
  await expect(selected).toHaveValue(''); await expect(search).toHaveValue('');
  await search.click(); await expect(page.getByRole('group', { name: 'Resultados de clientes' })).toHaveCount(0);
  await search.fill('maria');
  await page.getByRole('button', { name: 'María González — RUT: 12.345.678-5', exact: true }).click();
  await expect(selected).toHaveValue('1'); await expect(search).toHaveValue('');
  await expect.poll(() => requests.at(-1)).toBe('1');
  await search.click(); await expect(page.getByRole('group', { name: 'Resultados de clientes' })).toHaveCount(0);
  await search.fill('98765432');
  await page.getByRole('button', { name: 'Pedro Pérez — RUT: 9.876.543-2', exact: true }).click();
  await expect(selected).toHaveValue('2'); await expect.poll(() => requests.at(-1)).toBe('2');
  await search.fill('inexistente'); await expect(page.getByText('No se encontraron clientes.')).toBeVisible();
  await search.press('Escape'); await expect(search).toHaveValue('');
  await selected.selectOption(''); await expect.poll(() => requests.at(-1)).toBe(null);
});
