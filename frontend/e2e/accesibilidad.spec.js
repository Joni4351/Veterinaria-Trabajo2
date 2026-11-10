import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { writeFile } from 'node:fs/promises';

async function prepare(page) {
  await page.addInitScript(() => {
    localStorage.setItem('vet_token', ['eyJhbGciOiJIUzI1NiJ9', btoa(JSON.stringify({ exp: Date.now() / 1000 + 3600 })), 'signature'].join('.'));
    localStorage.setItem('vet_user', JSON.stringify({ id: 1, name: 'Administrador', role: 'Administrador' }));
  });
  const cliente = { id: 1, nombreCompleto: 'Cliente de prueba', documentoIdentidad: '12.345.678-5', telefono: '+56912345678', email: 'prueba@example.com' };
  const paciente = { id: 1, nombre: 'Luna', especie: 'Canino', raza: 'Mestizo', peso: 12, clienteId: 1, cliente };
  const data = { clientes: [cliente], pacientes: [paciente], roles: [{ id: 1, nombre: 'Administrador', permisosEscritura: true }],
    usuarios: [{ id: 1, nombreCompleto: 'Administrador', rol: 'Administrador', email: 'admin@example.com' }],
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
      await page.evaluate(theme => { document.documentElement.dataset.theme = theme; }, theme);
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
    await page.evaluate(theme => { document.documentElement.dataset.theme = theme; }, theme);
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
    await page.evaluate(theme => { document.documentElement.dataset.theme = theme; }, theme);
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
