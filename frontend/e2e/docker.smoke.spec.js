import { test, expect } from '@playwright/test';

// Run only against the isolated stack created by Start-DockerSandbox.ps1.
test('Docker sirve la SPA, conecta con la API real y conserva la sesión al recargar una ruta', async ({ page, request }) => {
  const email = process.env.DOCKER_TEST_EMAIL;
  const password = process.env.DOCKER_TEST_PASSWORD;
  if (!email || !password) throw new Error('Configure DOCKER_TEST_EMAIL y DOCKER_TEST_PASSWORD con la cuenta local de pruebas.');
  expect((await request.get('/health/api')).status()).toBe(200);
  expect((await request.get('/api/v1/clientes')).status()).toBe(401);
  const model = await request.get('/models/face-api/ssd_mobilenetv1_model-weights_manifest.json');
  expect(model.status()).toBe(200);
  expect(Array.isArray(await model.json())).toBe(true);
  await page.goto('/login');
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  const login = page.waitForResponse(r => r.url().endsWith('/api/v1/usuarios/login') && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Iniciar Sesión' }).click();
  expect((await login).status()).toBe(200);
  await expect(page).not.toHaveURL(/\/login/);
  await page.goto('/clientes');
  await expect(page.getByRole('button', { name: 'Nuevo Cliente' })).toBeVisible();
  const clients = page.waitForResponse(r => /\/api\/v1\/clientes(?:\?|$)/.test(r.url()));
  await page.reload();
  expect((await clients).status()).toBe(200);
  await expect(page.getByRole('button', { name: 'Nuevo Cliente' })).toBeVisible();
  await expect(page.locator('.custom-table tbody tr').first()).toBeVisible();
});
