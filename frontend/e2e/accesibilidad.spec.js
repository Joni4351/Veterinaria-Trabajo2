import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { writeFile } from 'node:fs/promises';
import { dashboardFixture } from '../src/test/dashboardFixture.js';

async function applyTheme(page, theme) {
  await page.evaluate(async value => {
    document.documentElement.dataset.theme = value;
    document.documentElement.style.colorScheme = value;
    await document.fonts.ready;
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  }, theme);
}

test('detalle de cita es de solo lectura, accesible y conserva el foco al cerrar', async ({ page }) => {
  await prepare(page); await page.emulateMedia({ reducedMotion: 'reduce' }); await page.goto('/citas');
  const open = page.getByRole('button', { name: 'Ver detalle de cita de Luna', exact: true });
  await open.click();
  const dialog = page.getByRole('dialog', { name: 'Detalle de cita' });
  for (const text of ['Luna', 'Cliente de prueba', 'Profesional', 'Medicina General', 'Confirmada']) await expect(dialog.getByText(text, { exact: true })).toBeVisible();
  await expect(dialog.locator('input, select, textarea')).toHaveCount(0);
  await expect(dialog.getByRole('button', { name: 'Cerrar detalle de cita' })).toBeFocused();
  for (const theme of ['light', 'dark']) {
    await applyTheme(page, theme);
    expect((await new AxeBuilder({ page }).include('[role="dialog"]').analyze()).violations).toEqual([]);
  }
  await page.setViewportSize({ width: 360, height: 800 });
  expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0); await expect(open).toBeFocused();
});

test('reportes filtran, paginan, exportan y conservan accesibilidad en ambos temas', async ({ page }, testInfo) => {
  await prepare(page);
  const requests = [];
  await page.route('**/api/v1/admin/reportes/**', route => {
    const url = new URL(route.request().url()); requests.push(url.search);
    if (url.pathname.includes('/exportar/')) return route.fulfill({ contentType: 'text/csv', headers: { 'content-disposition': 'attachment; filename=prueba.csv' }, body: 'Mes;Total\n2026-01;100' });
    const managerial = url.pathname.endsWith('gerencial');
    return route.fulfill({ json: { titulo: managerial ? 'Resumen gerencial' : 'Agenda operativa', emitido: '2026-11-12T12:00:00Z', filtros: 'Período de prueba', total: 30,
      columnas: [{ title: 'Mes', kind: 'text' }, { title: 'Total', kind: 'decimal' }], filas: [['2026-01', 100]], totales: { 1: 100 }, grafico: managerial ? [{ etiqueta: '2026-01', valor: 100 }] : [] } });
  });
  await page.goto('/admin'); await page.getByRole('button', { name: 'Reportes', exact: true }).click();
  const panel = page.locator('.reports-panel');
  await expect(panel.getByText('30 registros filtrados')).toBeVisible();
  await panel.getByRole('button', { name: 'Siguiente', exact: true }).click();
  await expect(panel).toContainText('Página 2 de 2');
  expect(requests.some(q => q.includes('pagina=2'))).toBe(true);
  const download = page.waitForEvent('download');
  await panel.getByRole('button', { name: 'Exportar CSV' }).click();
  expect((await download).suggestedFilename()).toMatch(/\.csv$/);
  await panel.getByRole('combobox', { name: 'Reporte', exact: true }).selectOption('gerencial');
  await expect(panel.locator('figure')).toContainText('Facturación mensual');
  await expect(panel.getByRole('button', { name: 'Analizar con IA' })).toHaveCount(0);
  await page.addStyleTag({ content: '*, *::before, *::after { transition: none !important; }' });
  for (const theme of ['light', 'dark']) {
    await applyTheme(page, theme);
    await page.setViewportSize({ width: 1440, height: 900 });
    expect(await panel.locator('.reports-filter-grid').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length)).toBe(3);
    await page.screenshot({ path: testInfo.outputPath(`reportes-${theme}-desktop.png`), fullPage: true });
    expect((await new AxeBuilder({ page }).include('.reports-panel').analyze()).violations).toEqual([]);
    await page.setViewportSize({ width: 360, height: 800 });
    expect(await panel.locator('.reports-filter-grid').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length)).toBe(1);
    await page.screenshot({ path: testInfo.outputPath(`reportes-${theme}-mobile.png`), fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.setViewportSize({ width: 1440, height: 900 });
  }
  await panel.getByLabel('Desde', { exact: true }).fill('2030-01-01');
  await expect(panel.getByRole('alert')).toContainText('Seleccione fechas válidas');
  await expect(panel.getByRole('button', { name: 'Exportar CSV' })).toBeDisabled();
});

test('dashboard calcula promedio y cero agotados con una respuesta anterior de la API', async ({ page }) => {
  await prepare(page);
  await page.route('**/api/v1/dashboard/analitica?**', route => route.fulfill({ json: {
    ...dashboardFixture,
    indicadores: { totalFacturado: 111265, facturas: 3, citas: 4, canceladas: 1, porcentajeCancelacion: 25, agotados: 0, insumos: 9, bajoStock: 0 },
    especialidades: [{ id: 1, nombre: 'Medicina General', cantidad: 4 }]
  } }));
  await page.goto('/admin');
  await page.getByRole('button', { name: 'Dashboard de gestión', exact: true }).click();
  await expect(page.locator('.dash-kpis')).toContainText('$37.088,33');
  await expect(page.locator('.dash-kpis')).toContainText('0 %');
  await page.getByRole('button', { name: '30 días', exact: true }).click();
  await expect(page.locator('.dash-kpis')).not.toContainText('No calculable');
  await page.getByText('Cómo se calculan los seis indicadores', { exact: true }).click();
  await expect(page.locator('.dash-indicator-guide')).toContainText('Medicina General: 100 %');
});

test('conflictos usan un diálogo personalizado y mantienen el registro y el foco', async ({ page }) => {
  await prepare(page);
  let nativeDialogs = 0, deletions = 0;
  page.on('dialog', async dialog => { nativeDialogs++; await dialog.dismiss(); });
  await page.route('**/api/v1/clientes/1', route => {
    deletions++;
    return route.fulfill({ status: 409, json: { message: 'No es posible eliminar el cliente porque tiene pacientes asociados. Elimine o transfiera las mascotas primero.' } });
  });
  await page.goto('/clientes');
  await page.getByRole('button', { name: 'Eliminar cliente Cliente de prueba', exact: true }).click();
  await page.getByRole('button', { name: 'Eliminar Cliente', exact: true }).click();
  const conflict = page.getByRole('dialog', { name: 'No se pudo completar la operación' });
  await expect(conflict).toContainText('Elimine o transfiera las mascotas primero.');
  await expect(conflict.getByRole('button', { name: 'Entendido' })).toBeFocused();
  await page.addStyleTag({ content: '*, *::before, *::after { transition: none !important; }' });
  for (const theme of ['light', 'dark']) {
    await applyTheme(page, theme);
    expect((await new AxeBuilder({ page }).include('.conflict-dialog').withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([]);
  }
  await page.keyboard.press('Escape');
  await expect(conflict).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Volver', exact: true })).toBeFocused();
  expect(deletions).toBe(1);
  expect(nativeDialogs).toBe(0);
});

test('eliminar receta pide confirmación personalizada y cancelar no envía la operación', async ({ page }) => {
  await prepare(page);
  let deleted = false, deletions = 0, nativeDialogs = 0;
  page.on('dialog', async dialog => { nativeDialogs++; await dialog.dismiss(); });
  await page.route('**/api/v1/recetas*', route => route.fulfill({ json: deleted ? [] : [{ id: 7, consultaId: 1, fechaEmision: '2026-11-11', validaHasta: '2026-11-12' }] }));
  await page.route('**/api/v1/recetas/7', route => { deletions++; deleted = true; return route.fulfill({ status: 204 }); });
  await page.goto('/consultas');
  await page.getByRole('button', { name: 'Actualizar o Eliminar Receta Médica', exact: true }).click();
  await page.getByRole('button', { name: 'Eliminar Receta', exact: true }).click();
  const confirmation = page.getByRole('dialog', { name: 'Eliminar receta médica', exact: true });
  await expect(confirmation.getByRole('button', { name: 'Cancelar' })).toBeFocused();
  await page.keyboard.press('Escape');
  expect(deletions).toBe(0);
  await page.getByRole('button', { name: 'Eliminar Receta', exact: true }).click();
  await confirmation.getByRole('button', { name: 'Eliminar', exact: true }).click();
  await expect(confirmation).toHaveCount(0);
  expect(deletions).toBe(1);
  expect(nativeDialogs).toBe(0);
});

test('veterinario puede abrir la edición de receta sin acciones de eliminación', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('vet_token', ['eyJhbGciOiJIUzI1NiJ9', btoa(JSON.stringify({ exp: Date.now() / 1000 + 3600 })), 'signature'].join('.'));
    localStorage.setItem('vet_user', JSON.stringify({ id: 2, name: 'Veterinario prueba', role: 'Veterinario' }));
  });
  const paciente = { id: 1, nombre: 'Luna', especie: 'Felino', clienteId: 1 };
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname;
    const data = { consultas: [{ id: 1, pacienteId: 1, paciente, motivo: 'Control', diagnostico: 'Sin hallazgos' }],
      pacientes: [paciente], recetas: [{ id: 7, consultaId: 1, fechaEmision: '2026-11-13', validaHasta: '2026-11-14' }] };
    return route.fulfill({ json: data[path.split('/').at(-1)] || [] });
  });
  await page.goto('/consultas');
  await expect(page.getByRole('button', { name: 'Nueva Consulta', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Eliminar consulta médica' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Actualizar Receta Médica', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Actualizar Receta', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Eliminar Receta', exact: true })).toHaveCount(0);
});

test('movimiento reducido, menú móvil con Escape y ampliación al 200 por ciento', async ({ page }) => {
  await prepare(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/dashboard');
  await expect(page.getByRole('button', { name: 'Movimiento reducido activado' })).toBeDisabled();
  await page.setViewportSize({ width: 390, height: 844 });
  const menuToggle = page.locator('button[aria-controls="main-sidebar"]');
  await expect(menuToggle).toHaveAttribute('aria-expanded', 'false');
  await menuToggle.focus(); await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Cerrar menú lateral' })).toBeFocused();
  await expect(page.locator('main')).toHaveAttribute('inert');
  await page.keyboard.press('Escape'); await expect(menuToggle).toBeFocused();
  await expect(page.locator('main')).not.toHaveAttribute('inert');
  await page.setViewportSize({ width: 1280, height: 900 });
  for (const path of ['/dashboard', '/clientes', '/pacientes', '/citas', '/consultas', '/insumos', '/facturas', '/admin']) {
    await page.goto(path);
    await expect(page.locator('main')).toBeVisible();
    await page.evaluate(() => { document.body.style.zoom = '2'; });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(page.locator('main h1')).toBeVisible();
  }
});

test('auditoría de regiones administrativas y alternativas de gráficos', async ({ page }, testInfo) => {
  page.setDefaultTimeout(10000);
  await prepare(page);
  await page.route('**/api/v1/registro-facial/usuarios?**', route => route.fulfill({ json: { usuarios: [], total: 0, pagina: 1 } }));
  await page.route('**/api/v1/admin/auditoria?**', route => route.fulfill({ json: { registros: [], total: 0, resumen: [] } }));
  await page.route('**/api/v1/admin/datos-prueba', route => route.fulfill({ json: { previstos: { pacientes: 3 }, clientesExistentes: 0, descripcion: 'Vista previa de prueba', dataset: 'demo-v1' } }));
  await page.route('**/api/v1/dashboard/analitica?**', route => route.fulfill({ json: dashboardFixture }));
  await page.goto('/admin');
  await page.addStyleTag({ content: '*, *::before, *::after { transition: none !important; }' });
  const report = [];
  for (const theme of ['light', 'dark']) {
    for (const path of ['/dashboard', '/clientes', '/pacientes', '/citas', '/consultas', '/insumos', '/facturas']) {
      await page.goto(path);
      await page.addStyleTag({ content: '*, *::before, *::after { transition: none !important; }' });
      await applyTheme(page, theme);
      await expect(page.locator('#main-content h1')).toBeVisible();
      report.push({ theme, section: path, violations: (await new AxeBuilder({ page }).analyze()).violations });
    }
    await page.goto('/admin');
    await page.addStyleTag({ content: '*, *::before, *::after { transition: none !important; }' });
    await applyTheme(page, theme);
    for (const name of ['Dashboard de gestión', 'Historial de cambios', 'Datos de prueba', 'Registro Facial', 'Especialidades Médicas', 'Roles de Seguridad (RBAC)', 'Cuentas de Usuarios']) {
      await page.getByRole('button', { name, exact: true }).click();
      if (name === 'Dashboard de gestión') {
        await expect(page.getByText('Luna', { exact: true })).toBeVisible();
        for (const summary of await page.locator('.dash-data summary').all()) { await summary.click(); }
        await expect(page.locator('.dash-data table')).toHaveCount(4);
        await expect(page.locator('.dash-data caption')).toHaveCount(4);
        await page.getByText('Cómo se calculan los seis indicadores', { exact: true }).click();
        await expect(page.locator('.dash-indicator-guide tbody tr')).toHaveCount(6);
        await expect(page.locator('.dash-kpis')).toContainText('$89.250');
        await expect(page.locator('.dash-kpis')).toContainText('25 %');
      }
      const result = await new AxeBuilder({ page }).analyze();
      report.push({ theme, section: name, violations: result.violations });
    }
  }
  await writeFile(testInfo.outputPath('auditoria-completa.json'), JSON.stringify(report, null, 2));
  expect(report.flatMap(r => r.violations.map(v => ({ section: r.section, theme: r.theme, id: v.id, nodes: v.nodes.map(n => n.target) })))).toEqual([]);
});

test('flujo de registro con teclado, errores asociados, Escape y restauración del foco', async ({ page }) => {
  await prepare(page);
  let created = false;
  await page.route('**/api/v1/clientes*', route => {
    if (route.request().method() === 'POST') { created = true; return route.fulfill({ status: 201, json: { id: 2, ...route.request().postDataJSON() } }); }
    return route.fulfill({ json: created ? [{ id: 2, nombreCompleto: 'Cliente Teclado', documentoIdentidad: '12.345.678-5', telefono: '+56912345678', email: 'teclado@example.com' }] : [] });
  });
  const tabTo = async locator => {
    for (let n = 0; n < 70; n++) {
      if (await locator.evaluate(el => el === document.activeElement)) return;
      await page.keyboard.press('Tab');
    }
    throw new Error('El control no se alcanza mediante Tab');
  };
  await page.goto('/clientes');
  await page.getByRole('link', { name: 'Saltar al contenido principal' }).waitFor({ state: 'attached' });
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Saltar al contenido principal' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();
  await expect(page).toHaveTitle('Clientes | VetClinic Pro');
  const open = page.getByRole('button', { name: 'Nuevo Cliente', exact: true });
  await tabTo(open); await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog');
  await expect(page.locator('main')).not.toHaveAttribute('inert');
  await tabTo(dialog.getByRole('button', { name: 'Registrar Cliente', exact: true }));
  await page.keyboard.press('Enter');
  const invalid = dialog.locator('[aria-invalid="true"]').first();
  await expect(invalid).toBeFocused();
  expect(await invalid.getAttribute('aria-describedby')).toBeTruthy();
  await page.keyboard.press('Escape'); await expect(open).toBeFocused();
  await page.keyboard.press('Enter');
  const inputs = dialog.locator('input');
  for (const [i, value] of ['12.345.678-5', 'Cliente Teclado', '+56912345678', 'teclado@example.com'].entries()) {
    await tabTo(inputs.nth(i)); await page.keyboard.type(value);
  }
  await tabTo(dialog.getByRole('button', { name: 'Registrar Cliente', exact: true }));
  await page.keyboard.press('Enter');
  await expect(dialog).toHaveCount(0);
  await expect(page.getByText('Cliente Teclado', { exact: true })).toBeVisible();
  await expect(open).toBeFocused();
  expect(created).toBe(true);
});

test('santuario presenta accesos y compañero en ambos temas y móvil', async ({ page }, testInfo) => {
  await prepare(page);
  await page.goto('/dashboard');
  await page.addStyleTag({ content: '*, *::before, *::after { transition: none !important; }' });
  await expect(page.getByRole('heading', { name: 'Bienvenido a VetClinic' })).toBeVisible();
  await expect(page.locator('.sanctuary-shortcut')).toHaveCount(3);
  await expect(page.locator('.sanctuary-companion canvas')).toBeVisible();
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const theme of ['light', 'dark']) {
      await applyTheme(page, theme);
      expect((await new AxeBuilder({ page }).include('.sanctuary-welcome').withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: testInfo.outputPath(`santuario-${width}-${theme}.png`), fullPage: true });
    }
  }
  await page.locator('.sanctuary-shortcut[href="/citas"]').click();
  await expect(page).toHaveURL(/\/citas$/);
});

test('dashboard presenta cuatro gráficos accesibles sin desbordar en escritorio y móvil', async ({ page }, testInfo) => {
  await prepare(page);
  let requests = 0;
  await page.route('**/api/v1/dashboard/analitica?**', route => {
    requests++;
    return route.fulfill({ json: dashboardFixture });
  });
  await page.goto('/admin');
  await page.getByRole('button', { name: 'Dashboard de gestión', exact: true }).click();
  await page.addStyleTag({ content: '*, *::before, *::after { transition: none !important; animation: none !important; }' });
  await expect(page.getByText('Luna', { exact: true })).toBeVisible();
  await expect(page.locator('.dash-chart-card')).toHaveCount(4);
  await page.getByRole('combobox', { name: 'Especialidad', exact: true }).selectOption('2');
  await expect.poll(() => requests).toBeGreaterThan(1);
  await expect(page.getByRole('button', { name: 'Actualizar', exact: true })).toBeEnabled();
  const prior = requests;
  await page.evaluate(() => window.dispatchEvent(new Event('vet:datachanged')));
  await expect.poll(() => requests).toBeGreaterThan(prior);
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const theme of ['light', 'dark']) {
      await applyTheme(page, theme);
      const result = await new AxeBuilder({ page }).include('.dashboard-analytics').withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
      expect(result.violations).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: testInfo.outputPath(`dashboard-${width}-${theme}.png`), fullPage: true });
    }
  }
});

test('los campos numéricos rechazan exponentes y símbolos al escribir o pegar y conservan los decimales permitidos', async ({ page }) => {
  page.setDefaultTimeout(10000);
  await prepare(page);
  await page.goto('/insumos');
  await page.getByRole('button', { name: 'Nuevo Insumo', exact: true }).click();
  const dialog = page.getByRole('dialog');
  const stock = dialog.locator('#insumo-stock');
  await stock.fill('12');
  await stock.press('End');
  await stock.pressSequentially('eE+-*/^.,');
  await expect(stock).toHaveValue('12');
  await stock.fill('1e3');
  await expect(stock).toHaveValue('12');
  const acceptedPaste = await stock.evaluate(input => {
    const data = new DataTransfer(); data.setData('text/plain', '1e3');
    return input.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }));
  });
  expect(acceptedPaste).toBe(false);
  await stock.press('Control+A'); await stock.press('Backspace');
  await expect(stock).toHaveValue('');
  const price = dialog.locator('#insumo-precio');
  await price.fill(''); await price.pressSequentially('12.50');
  expect(Number(await price.inputValue())).toBe(12.5);
  await price.press('End'); await price.pressSequentially('eE+-*/^');
  expect(Number(await price.inputValue())).toBe(12.5);
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  const priceFilter = page.locator('#insumos-field-3');
  await priceFilter.fill('15.5'); await priceFilter.press('End'); await priceFilter.press('e');
  await expect(priceFilter).toHaveValue('15.5');
});

test('el registro bloquea clics y envíos repetidos mientras espera y permite reintentar tras un error', async ({ page }) => {
  page.setDefaultTimeout(10000);
  await prepare(page);
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  let requests = 0;
  await page.route('**/api/v1/especialidades', async route => {
    if (route.request().method() !== 'POST') return route.fallback();
    requests++;
    if (requests === 1) {
      await gate;
      return route.fulfill({ status: 503, json: { message: 'No disponible' } });
    }
    return route.fulfill({ status: 201, json: { id: 9, nombre: 'Especialidad de prueba', costoBase: 1000 } });
  });
  await page.goto('/admin');
  await page.getByRole('button', { name: 'Especialidades Médicas', exact: true }).click();
  await page.getByRole('button', { name: 'Nueva Especialidad' }).click();
  const dialog = page.getByRole('dialog', { name: 'Especialidad veterinaria' });
  await dialog.getByLabel(/Nombre de la Especialidad/).fill('Especialidad de prueba');
  await dialog.getByLabel(/Costo Base/).fill('1000');
  await dialog.getByRole('button', { name: 'Guardar', exact: true }).click();
  await expect(dialog.getByRole('button', { name: 'Procesando…', exact: true })).toBeDisabled();
  await dialog.locator('form').evaluate(form => {
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  });
  await expect.poll(() => requests).toBe(1);
  release();
  await expect(dialog.getByRole('alert')).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Guardar', exact: true })).toBeEnabled();
  await dialog.getByRole('button', { name: 'Guardar', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  expect(requests).toBe(2);
});

test('facturación se ajusta al viewport y mantiene sus acciones visibles al 100 por ciento', async ({ page }, testInfo) => {
  await prepare(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const [width, height] of [[1366, 768], [1920, 1080], [390, 844]]) {
    await page.setViewportSize({ width, height });
    await page.goto('/facturas');
    await page.getByRole('button', { name: 'Emitir Factura', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Factura', exact: true });
    const panel = dialog.locator('.invoice-dialog');
    const button = dialog.getByRole('button', { name: 'Confirmar y Emitir Factura' });
    await expect(button).toBeInViewport();
    await expect(dialog.getByLabel(/Cliente Facturado/)).toBeInViewport();
    await expect(dialog.getByRole('button', { name: 'Cerrar modal', exact: true })).toBeInViewport();
    expect(await button.evaluate(el => {
      const r = el.getBoundingClientRect();
      return el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
    })).toBe(true);
    const bounds = await panel.boundingBox();
    expect(bounds.y).toBeGreaterThanOrEqual(0);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(height);
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
    expect(await dialog.locator('.invoice-body').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    if (width >= 1100) {
      expect(await dialog.locator('.invoice-body').evaluate(el => el.scrollHeight <= el.clientHeight + 1)).toBe(true);
    }
    await page.screenshot({ path: testInfo.outputPath(`factura-${width}.png`) });
    await dialog.locator('.invoice-body').evaluate(el => { el.scrollTop = el.scrollHeight; });
    await expect(button).toBeInViewport();
    await dialog.getByRole('button', { name: 'Cancelar', exact: true }).click();
  }
});

async function prepare(page) {
  await page.addInitScript(() => {
    localStorage.setItem('vet_token', ['eyJhbGciOiJIUzI1NiJ9', btoa(JSON.stringify({ exp: Date.now() / 1000 + 3600 })), 'signature'].join('.'));
    localStorage.setItem('vet_user', JSON.stringify({ id: 1, name: 'Administrador', role: 'Administrador' }));
  });
  const cliente = { id: 1, nombreCompleto: 'Cliente de prueba', documentoIdentidad: '12.345.678-5', telefono: '+56912345678', email: 'prueba@example.com' };
  const paciente = { id: 1, nombre: 'Luna', especie: 'Canino', raza: 'Mestizo', peso: 12, clienteId: 1, cliente };
  const data = { clientes: [cliente], pacientes: [paciente], roles: [{ id: 1, nombre: 'Administrador', permisosEscritura: true }],
    usuarios: [{ id: 1, nombreCompleto: 'Administrador', rol: 'Administrador', email: 'admin@example.com' }],
    profesionales: [{ id: 2, nombreCompleto: 'Profesional', rol: 'Veterinario' }],
    especialidades: [{ id: 1, nombre: 'Medicina General', costoBase: 25000 }],
    citas: [{ id: 1, pacienteId: 1, paciente, fechaHora: '2026-11-10T15:00:00', estado: 'Confirmada', usuario: { nombreCompleto: 'Profesional' }, especialidad: { nombre: 'Medicina General' } }],
    consultas: [{ id: 1, pacienteId: 1, paciente, motivo: 'Control general', diagnostico: 'Paciente saludable' }],
    insumos: [{ id: 1, nombreProducto: 'Insumo de prueba', tipo: 'Medicamento', stockActual: 10, precioUnitario: 1500 }],
    facturas: [{ id: 1, clienteId: 1, cliente, fechaEmision: '2026-11-09', montoTotal: 25000, montoImpuestos: 3992 }] };
  await page.route('**/api/**', route => route.fulfill({ json: data[new URL(route.request().url()).pathname.split('/').filter(Boolean).at(-1)] || [] }));
}

test('formularios y listados cumplen las comprobaciones automáticas seleccionadas en ambos temas', async ({ page }, testInfo) => {
  test.setTimeout(180000);
  page.setDefaultTimeout(10000);
  await prepare(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const failures = [], checked = [];
  async function check(name, selector) {
    const result = await new AxeBuilder({ page }).include(selector).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    checked.push(name);
    for (const item of result.violations) failures.push({ view: name, id: item.id, impact: item.impact,
      nodes: item.nodes.map(node => ({ target: node.target, failure: node.failureSummary })) });
    console.log(`[accesibilidad] ${name}: ${result.violations.length} incidencias`);
    await writeFile(testInfo.outputPath('accesibilidad.json'), JSON.stringify({ checked, failures }, null, 2));
  }
  for (const theme of ['light', 'dark']) {
    for (const [path, button] of [['/clientes', 'Nuevo Cliente'], ['/pacientes', 'Registrar un nuevo paciente'], ['/citas', 'Agendar Nueva Cita'], ['/consultas', 'Nueva Consulta'], ['/insumos', 'Nuevo Insumo'], ['/facturas', 'Emitir Factura']]) {
      await page.goto(path); await page.getByRole('button', { name: button, exact: true }).waitFor();
      await expect(page.locator('.custom-table tbody tr').first()).toBeVisible();
      await applyTheme(page, theme);
      await check(`${path} ${theme}`, '#main-content');
      await page.getByRole('button', { name: button, exact: true }).click();
      const dialog = page.getByRole('dialog'); await expect(dialog).toBeVisible();
      await check(`${path} formulario ${theme}`, '[role="dialog"]');
      const required = await dialog.locator('input[required], select[required], textarea[required]').evaluateAll(fields => fields.map(field => ({ id: field.id, marked: [...(field.labels || [])].some(label => label.querySelector('.required-indicator')) })));
      expect(required.length).toBeGreaterThan(0);
      expect(required.filter(field => !field.marked)).toEqual([]);
      await page.keyboard.press('Escape'); await expect(dialog).toHaveCount(0);
    }
    await page.goto('/admin');
    await page.getByRole('button', { name: 'Nueva Especialidad', exact: true }).waitFor();
    await applyTheme(page, theme);
    for (const [tab, open] of [['Especialidades Médicas', 'Nueva Especialidad'], ['Roles de Seguridad (RBAC)', 'Nuevo Rol'], ['Cuentas de Usuarios', 'Nuevo usuario']]) {
      await page.getByRole('button', { name: tab, exact: true }).click();
      await page.getByRole('button', { name: open, exact: true }).click();
      await check(`administración ${tab} ${theme}`, tab === 'Cuentas de Usuarios' ? 'form' : '[role="dialog"]');
      if (tab !== 'Cuentas de Usuarios') await page.keyboard.press('Escape');
    }
  }
  await writeFile(testInfo.outputPath('accesibilidad.json'), JSON.stringify({ checked, failures }, null, 2));
  expect(failures, JSON.stringify(failures, null, 2)).toEqual([]);
});

test('el diálogo conserva el foco, vuelve al control de apertura y señala el primer error', async ({ page }) => {
  await prepare(page); await page.goto('/clientes');
  const open = page.getByRole('button', { name: 'Nuevo Cliente', exact: true });
  await open.click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Registrar Cliente', exact: true }).focus();
  await page.keyboard.press('Tab');
  await expect(dialog.getByRole('button', { name: 'Cerrar modal' })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(dialog.getByRole('button', { name: 'Registrar Cliente', exact: true })).toBeFocused();
  await dialog.getByRole('button', { name: 'Registrar Cliente', exact: true }).click();
  await expect(dialog.locator('[aria-invalid="true"]').first()).toBeFocused();
  await page.keyboard.press('Escape'); await expect(open).toBeFocused();
});

test('un fallo del servidor en una consulta muestra una explicación segura y permite cerrar el aviso', async ({ page }) => {
  await prepare(page);
  await page.route('**/api/v1/clientes*', route => route.fulfill({ status: 503, json: { message: 'Internal database host secret', detalle: 'password=private' } }));
  await page.goto('/clientes');
  const alert = page.locator('.error-notification');
  await expect(alert).toContainText('El servicio no está disponible');
  await expect(alert).not.toContainText('secret');
  await expect(alert).not.toContainText('password');
  await page.getByRole('button', { name: 'Cerrar mensaje de error' }).click();
  await expect(alert).toHaveCount(0);
});

test('login conserva contraste y mensajes asociados en ambos temas', async ({ page }) => {
  for (const theme of ['light', 'dark']) {
    await page.goto('/login');
    await applyTheme(page, theme);
    await page.getByRole('button', { name: 'Iniciar Sesión', exact: true }).click();
    await expect(page.locator('input[type=email]')).toBeFocused();
    const results = await new AxeBuilder({ page }).include('main').withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    expect(results.violations.map(item => ({ id: item.id, nodes: item.nodes.map(node => node.target) }))).toEqual([]);
  }
});

test('se puede saltar la navegación y mantener el contenido accesible con texto ampliado', async ({ page }) => {
  await prepare(page); await page.goto('/clientes');
  await expect(page.locator('#main-content')).toBeVisible();
  await page.getByRole('link', { name: 'Saltar al contenido principal' }).waitFor({ state: 'attached' });
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Saltar al contenido principal' })).toBeFocused();
  await page.keyboard.press('Enter'); await expect(page.locator('#main-content')).toBeFocused();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
});
