import { test, expect } from '@playwright/test';

test.describe('E2E Pacientes Flow - Clínica Veterinaria', () => {
  test('Flujo completo: Iniciar Sesión -> Crear Mascota Paciente -> Listar Paciente en Tabla', async ({ page }) => {
    // 1. Acceso a la página de login
    await page.goto('/login');
    await expect(page).toHaveTitle(/VetClinic Pro|Clínica/i);

    // 2. Formulario de autenticación
    await page.fill('input[type="email"]', 'admin@veterinaria.com');
    await page.fill('input[type="password"]', 'Admin123*');
    await page.click('button[type="submit"]');

    // 3. Verificar acceso al Dashboard
    await expect(page.locator('text=Panel Principal')).toBeVisible();
    await expect(page.locator('text=Administrador')).toBeVisible();

    // 4. Navegación a Pacientes
    await page.click('a[href="/pacientes"]');
    await expect(page.locator('text=Gestión de Pacientes (Mascotas)')).toBeVisible();

    // 5. Apertura de modal de creación
    await page.click('button:has-text("Nuevo Paciente")');
    await expect(page.locator('h3:has-text("Nuevo Paciente")')).toBeVisible();

    // 6. Completar formulario con validación
    const mascotaNombre = `Mascota_${Date.now()}`;
    await page.fill('#paciente-nombre', mascotaNombre);
    await page.fill('#paciente-especie', 'Canino');
    await page.fill('#paciente-raza', 'Labrador');
    await page.fill('#paciente-edad', '3');
    await page.selectOption('#paciente-sexo', 'Macho');
    await page.selectOption('#paciente-clienteId', { index: 1 });
    await page.fill('#paciente-historial', 'Paciente registrado en prueba E2E automatizada.');

    // 7. Guardar paciente
    await page.click('button:has-text("Guardar Paciente")');

    // 8. Verificar que el paciente figura en la tabla
    await expect(page.locator(`text=${mascotaNombre}`)).toBeVisible();
    await expect(page.locator('text=Labrador')).toBeVisible();
  });
});

