# Verificación del generador de datos de prueba

Fecha: 7 de noviembre de 2026.

## Resultados

| Verificación | Resultado |
| --- | --- |
| Suite completa del backend, xUnit | 53 pruebas aprobadas |
| Suite completa del frontend, Vitest | 48 pruebas aprobadas |
| Navegador Edge, Playwright | 5 pruebas aprobadas |
| Compilación frontend de producción | Correcta |

Las cifras incluyen las pruebas existentes del proyecto y las nuevas pruebas del generador, no únicamente casos de seeding.

## Escenarios del generador

- Primera carga y consistencia de relaciones, IVA, totales y descuento de existencias.
- Repetición del lote completo: cero duplicados y ningún nuevo descuento.
- Conservación de existencias modificadas y de clientes ajenos al lote.
- Consulta de vista previa sin inserciones y rechazo de solicitudes sin confirmación o con versión incorrecta.
- Rechazo de usuarios sin sesión, veterinarios, recepcionistas y claims de administrador de cuentas inexistentes o sin ese rol actual.
- Conflictos de correo y RUT: rechazo antes de vincular nuevos registros a otras cuentas.
- Facturas con una línea eliminada: rechazo sin nuevos cobros ni descuento de stock.
- Receta faltante: generación de la receta y su detalle sin duplicar la factura.
- Cita completada modificada a cancelada: rechazo de una nueva carga.
- Errores de conexión en la vista previa, reintento, cancelación, errores del servidor y doble pulsación de confirmación.
- Flujo de confirmación y ancho móvil en el navegador.

## Fallos encontrados y corregidos

Las pruebas añadidas reprodujeron tres fallos del backend: la ausencia de la línea de consulta de una factura podía generar otra factura; la ausencia de la línea de insumo no se advertía; y un correo reservado de otro cliente podía reutilizarse indebidamente. Se añadió una comprobación previa de identidades y consistencia de facturas. También se corrigió la falta de un botón de reintento cuando fallaba la consulta inicial y se añadió un bloqueo de solicitudes simultáneas en la interfaz.

## Entorno y límites de la evidencia

El backend se comprobó con EF Core InMemory. Las pruebas del navegador utilizaron respuestas simuladas de la API; la prueba de fotografías sí utilizó los modelos locales reales de face-api.js. No se generaron registros ni se cambió el esquema de Supabase durante esta verificación.

No hay un servidor PostgreSQL aislado ni Docker disponibles en este entorno. Por ello no se verificaron con PostgreSQL real la reversión transaccional, el bloqueo asesor ni dos cargas simultáneas. Estos mecanismos están implementados, pero su validación requiere un entorno PostgreSQL de pruebas. Los resultados no constituyen una garantía de ausencia absoluta de fallos.

La compilación conserva advertencias sobre tamaño de bundles y la externalización del módulo Node `fs` de face-api.js; no impidieron la compilación ni las pruebas de navegador.

## Comandos empleados

```powershell
dotnet test VeterinariaAPI.Tests/VeterinariaAPI.Tests.csproj --no-restore -c Release
cd frontend
npm test
npm run build
$env:PLAYWRIGHT_PORT = '5174'
npm run test:facial:e2e
```

Las pruebas originales del backend requieren la configuración JWT de prueba indicada en el README; las pruebas nuevas del generador utilizan la configuración aislada de su fábrica.
