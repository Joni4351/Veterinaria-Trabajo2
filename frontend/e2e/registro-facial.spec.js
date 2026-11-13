import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { dashboardFixture } from '../src/test/dashboardFixture.js';

test('dashboard usa el resumen y no descarga los seis listados completos', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('vet_token', ['eyJhbGciOiJIUzI1NiJ9', btoa(JSON.stringify({ exp: Date.now() / 1000 + 3600 })), 'signature'].join('.'));
    localStorage.setItem('vet_user', JSON.stringify({ id: 1, name: 'Administrador', role: 'Administrador' }));
  });
  const paths = [];
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname; paths.push(path);
    return route.fulfill({ json: path === '/api/v1/dashboard/analitica' ? dashboardFixture : [] });
  });
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: 'Bienvenido a VetClinic' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Santuario', exact: true })).toBeVisible();
  await expect(page.locator('canvas[aria-label="Modelo 3D interactivo de mascota canina de la clínica veterinaria"]')).toBeVisible();
  await page.getByRole('button', { name: 'Acariciar', exact: true }).click();
  await expect(page.getByText('¡Mueve la colita alegremente! ❤️')).toBeVisible();
  expect(paths).toHaveLength(0);
  await page.goto('/admin');
  await page.getByRole('button', { name: 'Dashboard de gestión', exact: true }).waitFor();
  paths.length = 0;
  await page.getByRole('button', { name: 'Dashboard de gestión', exact: true }).click();
  await expect(page.getByText('Luna', { exact: true })).toBeVisible();
  await expect(page.getByText('Insumo limitado', { exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Evolución de facturación' })).toBeVisible();
  expect(paths.length).toBeGreaterThan(0);
  expect(paths.every(path => path === '/api/v1/dashboard/analitica')).toBeTruthy();
});

test('clientes confirma registro, modificación y eliminación sin anunciar éxito ante errores', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('vet_token', ['eyJhbGciOiJIUzI1NiJ9', btoa(JSON.stringify({ exp: Date.now() / 1000 + 3600 })), 'signature'].join('.'));
    localStorage.setItem('vet_user', JSON.stringify({ id: 1, name: 'Administrador', role: 'Administrador' }));
  });
  let clients = [], reject = false;
  await page.route('**/api/**', route => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path.includes('/clientes')) {
      if (request.method() === 'POST') {
        if (reject) return route.fulfill({ status: 400, json: { message: 'No se pudo registrar el cliente de prueba.' } });
        clients = [{ id: 1, ...request.postDataJSON() }];
        return route.fulfill({ status: 201, json: clients[0] });
      }
      if (request.method() === 'PUT') { clients = [{ id: 1, ...request.postDataJSON() }]; return route.fulfill({ json: clients[0] }); }
      if (request.method() === 'DELETE') { clients = []; return route.fulfill({ status: 204 }); }
      return route.fulfill({ json: clients });
    }
    return route.fulfill({ json: [] });
  });
  await page.goto('/clientes');
  const fillClient = async () => {
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel(/RUT Chileno/).fill('12.345.678-5');
    await dialog.getByLabel(/Nombre Completo/).fill('Cliente de prueba');
    await dialog.getByLabel(/Teléfono de Contacto/).fill('+56912345678');
    await dialog.getByLabel(/Correo Electrónico/).fill('prueba@example.com');
  };
  await page.getByRole('button', { name: 'Nuevo Cliente' }).click();
  await fillClient();
  await page.getByRole('button', { name: /Registrar Cliente|Guardar Cliente/ }).click();
  await expect(page.getByRole('status')).toContainText('Cliente registrado correctamente.');
  await page.getByRole('button', { name: 'Cerrar confirmación' }).click();
  await page.getByRole('button', { name: 'Editar cliente Cliente de prueba' }).click();
  await page.getByRole('button', { name: 'Guardar Cambios' }).click();
  await expect(page.getByRole('status')).toContainText('Cliente actualizado correctamente.');
  await page.getByRole('button', { name: 'Cerrar confirmación' }).click();
  await page.getByRole('button', { name: 'Eliminar cliente Cliente de prueba' }).click();
  await page.getByRole('button', { name: 'Eliminar Cliente', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Cliente eliminado correctamente.');
  await page.getByRole('button', { name: 'Cerrar confirmación' }).click();
  reject = true;
  await page.getByRole('button', { name: 'Nuevo Cliente' }).click();
  await fillClient();
  await page.getByRole('button', { name: /Registrar Cliente|Guardar Cliente/ }).click();
  await expect(page.getByRole('alert')).toContainText('No se pudo registrar el cliente de prueba.');
  await expect(page.getByRole('status')).toHaveCount(0);
});

test('el botón lateral alterna el espacio del contenido y el menú móvil se cierra al navegar', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('vet_token', ['eyJhbGciOiJIUzI1NiJ9', btoa(JSON.stringify({ exp: Date.now() / 1000 + 3600 })), 'signature'].join('.'));
    localStorage.setItem('vet_user', JSON.stringify({ id: 1, name: 'Administrador', role: 'Administrador' }));
  });
  await page.route('**/api/**', route => route.fulfill({ json: [] }));
  await page.goto('/clientes');
  const sidebar = page.locator('#main-sidebar');
  const content = page.locator('.main-wrapper');
  await expect(content).toHaveCSS('margin-left', '275px');
  await page.getByRole('button', { name: 'Ocultar menú de navegación' }).click();
  await expect(page.getByRole('button', { name: 'Mostrar menú de navegación' })).toHaveAttribute('aria-expanded', 'false');
  await expect(content).toHaveCSS('margin-left', '0px');
  await expect(sidebar).toHaveAttribute('inert', '');
  await expect.poll(() => sidebar.evaluate(element => element.getBoundingClientRect().right)).toBeLessThanOrEqual(0);
  await page.getByRole('button', { name: 'Mostrar menú de navegación' }).click();
  await expect(content).toHaveCSS('margin-left', '275px');
  await expect(sidebar).not.toHaveAttribute('inert');
  await page.keyboard.press('Escape');
  await expect(content).toHaveCSS('margin-left', '0px');
  await expect(page.getByRole('button', { name: 'Mostrar menú de navegación' })).toBeFocused();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Mostrar menú de navegación' }).click();
  await expect(sidebar).toHaveAttribute('aria-hidden', 'false');
  await sidebar.getByRole('link', { name: 'Pacientes (Mascotas)' }).click();
  await expect(sidebar).toHaveAttribute('aria-hidden', 'true');
  await expect.poll(() => sidebar.evaluate(element => element.getBoundingClientRect().right)).toBeLessThanOrEqual(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
});

test('los listados comparten el estilo compacto en claro, oscuro y móvil', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('vet_token', ['eyJhbGciOiJIUzI1NiJ9', btoa(JSON.stringify({ exp: Date.now() / 1000 + 3600 })), 'signature'].join('.'));
    localStorage.setItem('vet_user', JSON.stringify({ id: 1, name: 'Administrador', role: 'Administrador' }));
  });
  const cliente = { id: 1, nombreCompleto: 'Cliente de prueba', documentoIdentidad: '12.345.678-5', telefono: '+56912345678', email: 'prueba@example.com' };
  const paciente = { id: 1, nombre: 'Luna', especie: 'Canino', raza: 'Mestizo', peso: 12, clienteId: 1, cliente };
  const data = {
    clientes: [cliente], pacientes: [paciente],
    usuarios: [{ id: 1, nombreCompleto: 'Administrador', email: 'admin@example.com', rol: 'Administrador' }],
    roles: [{ id: 1, nombre: 'Administrador', permisosEscritura: true }],
    especialidades: [{ id: 1, nombre: 'Medicina General', costoBase: 25000 }],
    citas: [{ id: 1, pacienteId: 1, paciente, usuario: { nombreCompleto: 'Profesional de prueba' }, especialidad: { nombre: 'Medicina General' }, fechaHora: '2026-11-09T15:00:00', estado: 'Confirmada' }],
    consultas: [{ id: 1, pacienteId: 1, paciente, motivo: 'Control general', diagnostico: 'Paciente saludable' }],
    insumos: [{ id: 1, nombreProducto: 'Insumo limitado', tipo: 'Medicamento', stockActual: 10, precioUnitario: 1500 }],
    facturas: [{ id: 1, clienteId: 1, cliente, fechaEmision: '2026-11-08', montoTotal: 25000, montoImpuestos: 3992 }]
  };
  await page.route('**/api/**', route => route.fulfill({ json: data[new URL(route.request().url()).pathname.split('/').filter(Boolean).at(-1)] || [] }));
  for (const path of ['/clientes', '/pacientes', '/citas', '/consultas', '/insumos', '/facturas', '/admin']) {
    await page.goto(path);
    const table = page.locator('.custom-table').first();
    await expect(table.locator('tbody tr').first()).toBeVisible();
    await expect(table.locator('th').first()).toHaveCSS('font-size', '10px');
    await expect(table.locator('td').first()).toHaveCSS('font-size', '12px');
    await page.evaluate(() => { document.documentElement.dataset.theme = 'dark'; });
    await expect(table.locator('th').first()).toHaveCSS('color', 'rgb(94, 234, 212)');
    if (path === '/clientes') await table.screenshot({ path: 'test-results/clientes-table-dark.png' });
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    await page.setViewportSize({ width: 1280, height: 720 });
  }
  for (const name of ['Roles de Seguridad (RBAC)', 'Cuentas de Usuarios']) {
    await page.getByRole('button', { name, exact: true }).click();
    await expect(page.locator('.custom-table tbody tr').first()).toBeVisible();
    await expect(page.locator('.custom-table th').first()).toHaveCSS('font-size', '10px');
  }
});

test('login facial pendiente no entrega sesión y una cuenta sin rostro entra directamente', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: async () => { throw new DOMException('Denied', 'NotAllowedError'); } } });
  });
  let facialRequired = true;
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/usuarios/login')) {
      if (facialRequired) return route.fulfill({ json: { requiresFacial: true, challenge: 'A'.repeat(64), expiresIn: 120 } });
      const token = ['eyJhbGciOiJIUzI1NiJ9', Buffer.from(JSON.stringify({ exp: Date.now() / 1000 + 3600, sub: '1', name: 'Administrador', role: 'Administrador' })).toString('base64url'), 'signature'].join('.');
      return route.fulfill({ json: { token } });
    }
    return route.fulfill({ json: [] });
  });
  await page.goto('/');
  await page.getByLabel(/Correo Electrónico/).fill('admin@example.com');
  await page.getByLabel(/Contraseña/).fill('Password123!');
  await page.getByRole('button', { name: 'Iniciar Sesión', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Verificación facial' })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('vet_token'))).toBeNull();
  await page.getByRole('button', { name: 'Activar cámara' }).click();
  await expect(page.getByRole('alert')).toContainText('Permita el acceso a la cámara');
  expect(await page.evaluate(() => localStorage.getItem('vet_token'))).toBeNull();
  await page.getByRole('button', { name: 'Volver al inicio de sesión' }).click();
  facialRequired = false;
  await page.getByLabel(/Contraseña/).fill('Password123!');
  await page.getByRole('button', { name: 'Iniciar Sesión', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Administración', exact: true })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('vet_token'))).toBeTruthy();
});

test('administrador consulta el historial y sus valores antes y después', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('vet_token', ['eyJhbGciOiJIUzI1NiJ9', btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })), 'test-signature'].join('.'));
    localStorage.setItem('vet_user', JSON.stringify({ id: 1, name: 'Administrador', role: 'Administrador' }));
  });
  const row = { id: 8, fechaHora: '2026-11-08T15:00:00Z', usuarioId: 1, usuarioNombre: 'Administrador', accion: 'MODIFICAR', entidad: 'Insumos', registroId: 2, origen: 'API', operacionId: '85e603c9-e2ed-4652-9b0a-97fe437472cb' };
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/auditoria/entidades')) return route.fulfill({ json: ['Insumos'] });
    if (path.endsWith('/auditoria/8')) return route.fulfill({ json: { ...row, valoresAnteriores: { StockActual: 10 }, valoresNuevos: { StockActual: 8 } } });
    if (path.endsWith('/auditoria')) return route.fulfill({ json: { registros: [row], total: 1, resumen: [{ accion: 'MODIFICAR', cantidad: 1 }] } });
    return route.fulfill({ json: [] });
  });
  await page.goto('/admin');
  await page.getByRole('button', { name: 'Historial de cambios', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Ver detalle', exact: true })).toBeVisible();
  await page.locator('.audit-panel').screenshot({ path: 'test-results/audit-light.png' });
  await page.evaluate(() => { document.documentElement.dataset.theme = 'dark'; });
  await page.locator('.audit-panel').screenshot({ path: 'test-results/audit-dark.png' });
  await page.evaluate(() => { document.documentElement.dataset.theme = 'light'; });
  await page.getByRole('button', { name: 'Exportar (CSV / PDF)' }).click();
  await expect(page.getByRole('button', { name: 'Descargar CSV' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Exportar (CSV / PDF)' })).toBeFocused();
  await page.keyboard.press('Enter');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Descargar CSV' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('registro-auditoria.csv');
  expect(await readFile(await download.path(), 'utf8')).toContain('MODIFICAR');
  await page.getByRole('button', { name: 'Exportar (CSV / PDF)' }).click();
  await page.getByRole('button', { name: 'Preparar PDF', exact: true }).click();
  const pdfDialog = page.getByRole('dialog', { name: 'Exportar registro de auditoría a PDF' });
  const countInput = pdfDialog.getByLabel('Cantidad de registros');
  await countInput.fill('101');
  await pdfDialog.getByRole('button', { name: 'Preparar PDF', exact: true }).click();
  expect(await countInput.evaluate(input => input.validity.rangeOverflow)).toBeTruthy();
  await expect(pdfDialog.getByRole('button', { name: 'Imprimir / Guardar PDF' })).toHaveCount(0);
  await countInput.fill('10');
  const pdfRequest = page.waitForRequest(request => new URL(request.url()).searchParams.get('tamano') === '10');
  await pdfDialog.getByRole('button', { name: 'Preparar PDF', exact: true }).click();
  expect(new URL((await pdfRequest).url()).searchParams.get('pagina')).toBe('1');
  await expect(pdfDialog.getByText('1 registros incluidos de 10 solicitados.')).toBeVisible();
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('.audit-stats')).toBeHidden();
  await expect(pdfDialog.getByRole('cell', { name: 'MODIFICAR', exact: true })).toBeVisible();
  await page.emulateMedia({ media: 'screen' });
  await pdfDialog.getByRole('button', { name: 'Cerrar exportación PDF' }).click();
  await page.getByRole('button', { name: 'Ver detalle', exact: true }).click();
  const detail = page.getByRole('region', { name: 'Detalle del cambio' });
  await expect(detail.getByRole('cell', { name: '10', exact: true })).toBeVisible();
  await expect(detail.getByRole('cell', { name: '8', exact: true })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
});

test('una sesión vencida no se restaura aunque el usuario siga en caché', async ({ page }) => {
  await page.addInitScript(() => {
    const token = ['eyJhbGciOiJIUzI1NiJ9', btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) - 60 })), 'test-signature'].join('.');
    localStorage.setItem('vet_token', token);
    localStorage.setItem('vet_user', JSON.stringify({ id: 1, name: 'Administrador de prueba', role: 'Administrador' }));
  });
  await page.goto('/admin');
  await expect(page.getByRole('button', { name: 'Iniciar Sesión', exact: true })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('vet_token'))).toBeNull();
  expect(await page.evaluate(() => localStorage.getItem('vet_user'))).toBeNull();
});

test('datos de prueba requieren doble confirmación y muestran el resumen', async ({ page }) => {
  let calls = 0;
  await page.addInitScript(() => {
    localStorage.setItem('vet_token', ['eyJhbGciOiJIUzI1NiJ9', btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })), 'test-signature'].join('.'));
    localStorage.setItem('vet_user', JSON.stringify({ id: 1, name: 'Administrador de prueba', role: 'Administrador' }));
  });
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/admin/datos-prueba')) {
      if (route.request().method() === 'POST') {
        calls++;
        expect(route.request().postDataJSON()).toEqual({ dataset: 'vetclinic-demo-v1', confirmado: true });
        return route.fulfill({ json: { creados: { clientes: 3, pacientes: 4 } } });
      }
      return route.fulfill({ json: { dataset: 'vetclinic-demo-v1', descripcion: 'Lote académico', clientesExistentes: calls ? 3 : 0, previstos: { clientes: 3, pacientes: 4 } } });
    }
    return route.fulfill({ json: [] });
  });
  await page.goto('/admin');
  await page.getByRole('button', { name: 'Datos de prueba', exact: true }).click();
  const generate = page.getByRole('button', { name: 'Generar datos de prueba', exact: true });
  await expect(generate).toBeDisabled();
  await page.getByRole('checkbox', { name: /Confirmo que deseo agregar registros ficticios/ }).check();
  await generate.click();
  expect(calls).toBe(0);
  await page.getByRole('button', { name: 'Sí, generar datos' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Carga completada:' })).toContainText('Carga completada: 7 registros nuevos.');
  expect(calls).toBe(1);
  await expect(generate).toBeDisabled();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
});

for (const role of ['Veterinario', 'Recepcionista']) {
  test(`Administración no aparece para ${role} y la ruta está bloqueada`, async ({ page }) => {
    await page.addInitScript(role => {
      localStorage.setItem('vet_token', ['eyJhbGciOiJIUzI1NiJ9', btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })), 'test-signature'].join('.'));
      localStorage.setItem('vet_user', JSON.stringify({ id: 2, name: 'Usuario de prueba', role }));
    }, role);
    await page.route('**/api/**', route => route.fulfill({ json: [] }));
    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: 'Bienvenido a VetClinic' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Acariciar', exact: true })).toBeVisible();
    await expect(page.locator('.dash-chart-card')).toHaveCount(0);
    await page.goto('/admin');
    await expect(page.locator('a[href="/admin"]')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Nuevo usuario' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Dashboard de gestión', exact: true })).toHaveCount(0);
    await expect(page.getByText(/Acceso (Denegado|Restringido)/i).first()).toBeVisible();
  });
}

test('administrador crea cuentas desde Administración sin cambiar su sesión', async ({ page }) => {
  let payload;
  await page.addInitScript(() => {
    localStorage.setItem('vet_token', ['eyJhbGciOiJIUzI1NiJ9', btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })), 'test-signature'].join('.'));
    localStorage.setItem('vet_user', JSON.stringify({ id: 1, name: 'Administrador de prueba', role: 'Administrador' }));
  });
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/usuarios/register')) {
      payload = route.request().postDataJSON();
      return route.fulfill({ status: 201, json: { id: 9 } });
    }
    return route.fulfill({ json: path.endsWith('/roles') ? [{ id: 7, nombre: 'Veterinario' }] : [] });
  });
  await page.goto('/admin');
  await page.getByRole('button', { name: 'Cuentas de Usuarios' }).click();
  await page.getByRole('button', { name: 'Nuevo usuario' }).click();
  await page.getByRole('textbox', { name: 'Nombre completo', exact: true }).fill('Nuevo Veterinario');
  await page.getByRole('textbox', { name: 'Correo electrónico', exact: true }).fill('nuevo@example.com');
  await page.getByLabel('Contraseña inicial').fill('Password123!');
  await page.getByLabel('Rol del usuario').selectOption('7');
  await page.getByRole('button', { name: 'Crear usuario', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Usuario creado correctamente');
  expect(payload.rolId).toBe(7);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('vet_user')).role)).toBe('Administrador');
});

test('modelos locales y registro real desde foto, sin subir imagen', async ({ page }, testInfo) => {
  let saved = null;
  let registration = null;
  const user = { id: 2, nombreCompleto: 'Usuario de prueba', email: 'usuario@example.com', rol: 'Veterinario' };
  await page.addInitScript(() => {
    localStorage.setItem('vet_token', ['eyJhbGciOiJIUzI1NiJ9', btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })), 'test-signature'].join('.'));
    localStorage.setItem('vet_user', JSON.stringify({ id: 1, name: 'Admin de prueba', role: 'Administrador' }));
  });
  await page.route('**/api/**', async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path.includes('/registro-facial')) {
      if (request.method() === 'POST') {
        saved = request.postDataJSON();
        registration = { id: 1, activo: true, fechaRegistro: new Date().toISOString(), fechaActualizacion: null };
        return route.fulfill({ status: 201, json: { registroFacial: registration } });
      }
      return route.fulfill({ json: path.endsWith('/usuarios')
        ? { usuarios: [{ ...user, registroFacial: registration }], total: 1, pagina: 1 }
        : { registroFacial: registration } });
    }
    return route.fulfill({ json: [] });
  });
  const fixture = await readFile(new URL('./fixtures/bbt1.jpg', import.meta.url));
  await page.route('**/facial-test-fixture.jpg', route => route.fulfill({ body: fixture, contentType: 'image/jpeg' }));
  await page.goto('/admin');
  await page.getByRole('button', { name: 'Registro Facial', exact: true }).click();
  await page.getByRole('button', { name: /Usuario de prueba/ }).click();
  await expect(page.getByLabel('Fotografía del usuario')).toBeDisabled();
  await page.getByRole('checkbox', { name: /ha sido informado/ }).check();

  const blank = await page.evaluate(() => {
    const canvas = document.createElement('canvas'); canvas.width = 400; canvas.height = 400;
    const context = canvas.getContext('2d'); context.fillStyle = '#ffffff'; context.fillRect(0, 0, 400, 400);
    return canvas.toDataURL('image/png').split(',')[1];
  });
  await page.getByLabel('Fotografía del usuario').setInputFiles({ name: 'sin-rostros.png', mimeType: 'image/png', buffer: Buffer.from(blank, 'base64') });
  await page.getByRole('button', { name: 'Analizar fotografía' }).click();
  await expect(page.getByRole('alert')).toContainText('No se detectó ningún rostro', { timeout: 90000 });

  // Full fixture has multiple faces: use the actual models to verify rejection.
  await page.getByLabel('Fotografía del usuario').setInputFiles({ name: 'grupo.jpg', mimeType: 'image/jpeg', buffer: fixture });
  await page.getByRole('button', { name: 'Analizar fotografía' }).click();
  await expect(page.getByRole('alert')).toContainText('exactamente un rostro', { timeout: 90000 });

  // Obtain a single-face crop from the same official fixture, without identifying anyone.
  const photo = await page.evaluate(async () => {
    const faceapi = await import('/node_modules/.vite/deps/face-api__js.js');
    await faceapi.nets.ssdMobilenetv1.loadFromUri('/models/face-api');
    const image = new Image(); image.src = '/facial-test-fixture.jpg'; await image.decode();
    const detections = await faceapi.detectAllFaces(image, new faceapi.SsdMobilenetv1Options());
    const box = detections[0].box;
    const pad = Math.min(box.width, box.height) * 0.25;
    const x = Math.max(0, box.x - pad), y = Math.max(0, box.y - pad);
    const width = Math.min(image.width - x, box.width + 2 * pad), height = Math.min(image.height - y, box.height + 2 * pad);
    const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
    canvas.getContext('2d').drawImage(image, x, y, width, height, 0, 0, width, height);
    return canvas.toDataURL('image/png').split(',')[1];
  });
  await page.getByLabel('Fotografía del usuario').setInputFiles({ name: 'rostro.png', mimeType: 'image/png', buffer: Buffer.from(photo, 'base64') });
  await page.getByRole('button', { name: 'Analizar fotografía' }).click();
  await expect(page.getByRole('status')).toContainText('Rostro detectado correctamente', { timeout: 60000 });
  await page.getByRole('button', { name: 'Confirmar registro facial' }).click();
  expect(saved).toBeNull();
  await page.getByRole('button', { name: 'Confirmar', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Registro facial guardado correctamente');
  expect(saved.descriptor).toHaveLength(128);
  expect(saved.descriptor.every(Number.isFinite)).toBeTruthy();
  expect(Object.keys(saved).sort()).toEqual(['consentimiento', 'consentimientoVersion', 'descriptor', 'fechaActualizacion']);
  await expect(page.getByRole('button', { name: /Usuario de prueba/ })).toContainText('Rostro registrado');
  await page.screenshot({ path: testInfo.outputPath('facial-desktop.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => page.locator('.sidebar').evaluate(element => element.getBoundingClientRect().right)).toBeLessThanOrEqual(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  await page.screenshot({ path: testInfo.outputPath('facial-mobile.png'), fullPage: true });
});
