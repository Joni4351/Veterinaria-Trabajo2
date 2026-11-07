import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

for (const role of ['Veterinario', 'Recepcionista']) {
  test(`Administración no aparece para ${role} y la ruta está bloqueada`, async ({ page }) => {
    await page.addInitScript(role => {
      localStorage.setItem('vet_token', 'test.session.token');
      localStorage.setItem('vet_user', JSON.stringify({ id: 2, name: 'Usuario de prueba', role }));
    }, role);
    await page.route('**/api/**', route => route.fulfill({ json: [] }));
    await page.goto('/admin');
    await expect(page.locator('a[href="/admin"]')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Nuevo usuario' })).toHaveCount(0);
    await expect(page.getByText(/Acceso (Denegado|Restringido)/i).first()).toBeVisible();
  });
}

test('administrador crea cuentas desde Administración sin cambiar su sesión', async ({ page }) => {
  let payload;
  await page.addInitScript(() => {
    localStorage.setItem('vet_token', 'test.session.token');
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
  await page.getByLabel('Nombre completo', { exact: true }).fill('Nuevo Veterinario');
  await page.getByLabel('Correo electrónico', { exact: true }).fill('nuevo@example.com');
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
    localStorage.setItem('vet_token', 'test.session.token');
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
  await page.getByRole('checkbox').check();

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
