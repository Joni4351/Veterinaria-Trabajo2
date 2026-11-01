# BITÁCORA DE USO DE INTELIGENCIA ARTIFICIAL GENERATIVA (AI_LOG.md)
## Trabajo 2: Frontend, Consumo de API y Seguridad de Extremo a Extremo
**Sistema:** VetClinic Pro — Plataforma Veterinaria  
**Estudiante:** Jonathan Garrido / Proyecto Veterinario  
**Fecha:** Octubre 2026  

---

## 1. Declaración Formal de Herramienta, Modelo y Plan

En cumplimiento estricto con las bases y la rúbrica de evaluación del Trabajo 2, se declara formalmente el uso de herramientas de Inteligencia Artificial Generativa como asistente de pair-programming y acelerador de desarrollo de software:

- **Herramienta / Entorno:** Antigravity AI Coding Assistant (desarrollado por Google DeepMind).
- **Modelo de Lenguaje (LLM):** `Gemini 3.8 Flash` (arquitectura multimodal de alta velocidad y razonamiento avanzado de código).
- **Plan / Modalidad de Cuenta:** Developer / Professional AI Assistant Environment.
- **Rol de la IA:** Copiloto de desarrollo para diagnóstico de errores de compilación, generación de esquemas de validación Zod, estructuración de pruebas automatizadas, auditoría de accesibilidad WCAG y redacción de documentación técnica.
- **Responsabilidad del Estudiante:** Todo el código propuesto por el asistente fue revisado, probado, adaptado al entorno local (.NET 8.0 SDK y React 19) y comprendido en su totalidad para su posterior defensa y demostración individual.

---

## 2. Plan de Desarrollo Asistido por IA

El desarrollo del proyecto se planificó y ejecutó de forma incremental en 7 fases estratégicas:

```
[Fase 1: Diagnóstico y Compatibilidad .NET 8]
                     │
                     ▼
[Fase 2: Robustecimiento de Seguridad Backend (CORS, Headers, Rate Limiting, Middleware)]
                     │
                     ▼
[Fase 3: Arquitectura Frontend React 19, Axios Centralizado e Interceptores]
                     │
                     ▼
[Fase 4: CRUD de Pacientes, Validación Zod y Accesibilidad WCAG 2.2 AA]
                     │
                     ▼
[Fase 5: Autenticación JWT, RBAC y Rutas Protegidas con Vistas 403]
                     │
                     ▼
[Fase 6: Automatización de Pruebas (Backend 6/6 + Frontend 17/17)]
                     │
                     ▼
[Fase 7: Auditoría de Seguridad, Monorepo Git y Documentación de Entrega]
```

---

## 3. Registro Cronológico de Prompts, Respuestas y Decisiones de Ingeniería

### Fase 1: Diagnóstico de Entorno y Compatibilidad del Backend
- **Prompt Empleado:**
  > *"Analiza la compilación del backend VeterinariaAPI y VeterinariaAPI.Tests. Si hay problemas con versiones de .NET o rutas absolutas locales, ajústalas para que compile en el SDK instalado."*
- **Propuesta de la IA:**
  El asistente detectó que los archivos `.csproj` estaban configurados para `net10.0`, mientras que la máquina anfitriona tiene instalado el SDK oficial .NET 8.0.403. Propuso cambiar `<TargetFramework>net10.0</TargetFramework>` a `<TargetFramework>net8.0</TargetFramework>`.
- **Decisión Tomada:**
  - **Aceptado:** Se aprobó el cambio a `net8.0`.
  - **Verificación:** Se ejecutó `dotnet test` logrando 6/6 pruebas unitarias exitosas de inmediato.

---

### Fase 2: Robustecimiento de Seguridad en la API (.NET 8)
- **Prompt Empleado:**
  > *"Implementa los controles de seguridad exigidos por la rúbrica en la API: CORS restrictivo hacia localhost:5173, cabeceras HTTP de seguridad (nosniff, DENY, Referrer-Policy), rate limiting en login devolviendo 429, y sanitiza GlobalExceptionMiddleware para que no filtre stack traces en producción."*
- **Propuesta de la IA:**
  Generó la configuración en `Program.cs` inyectando un middleware personalizado de cabeceras, la política `FrontendPolicy` en CORS, el limitador de tasa de ventana fija con partición por IP en `/api/v1/usuarios/login`, e integró `IHostEnvironment` en `GlobalExceptionMiddleware`.
- **Decisión Tomada:**
  - **Aceptado:** La arquitectura de middleware en tubería (pipeline) de ASP.NET Core.
  - **Corregido:** La IA inicialmente no incluyó el código de estado HTTP 429 explícito en la respuesta del Rate Limiting (usaba el default del framework). Se corrigió para que devuelva un payload JSON uniforme con mensaje claro de reintento en 60 segundos.
  - **Descartado:** Se descartó una propuesta de la IA de almacenar tokens en una tabla en memoria con Redis, ya que añadía una dependencia externa innecesaria y compleja para el alcance de este trabajo.

---

### Fase 3: Capa de Consumo HTTP y Manejo Centralizado de Errores (React)
- **Prompt Empleado:**
  > *"Crea una instancia centralizada de Axios en src/services/api.js que tome la URL base de VITE_API_URL, inyecte el token Bearer en el request interceptor, y en el response interceptor capture 401 para limpiar la sesión y redirigir al login, y despache eventos para 403 y 429."*
- **Propuesta de la IA:**
  Implementó la instancia Axios con `import.meta.env.VITE_API_URL`, interceptor de solicitud inyectando `Authorization: Bearer <token>`, e interceptor de respuesta con listeners de eventos globales del navegador (`window.dispatchEvent(new CustomEvent('vet:forbidden', ...))`).
- **Decisión Tomada:**
  - **Aceptado:** El uso de `CustomEvent` para comunicar desacopladamente errores 403 y 429 con el componente de toasts en `App.jsx`.
  - **Corregido:** Se aseguró que al ocurrir un 401 en la propia pantalla de `/login`, el interceptor no genere un bucle infinito de redirecciones (`if (window.location.pathname !== '/login') window.location.href = '/login';`).

---

### Fase 4: CRUD de Pacientes, Validación Zod y Accesibilidad WCAG 2.2 AA
- **Prompt Empleado:**
  > *"Diseña el módulo CRUD de Pacientes en PacientesView.jsx con tabla paginada, filtros de búsqueda en vivo, modales de creación, edición y detalle. Valida formularios con Zod y asegura cumplimiento de WCAG 2.2 AA: etiquetas htmlFor/id, aria-describedby para errores, aria-live, foco visible, tecla Escape en modales y diálogo ConfirmModal reutilizable para borrados."*
- **Propuesta de la IA:**
  Escribió `pacienteSchema.js`, `ConfirmModal.jsx` y `PacientesView.jsx` con soporte completo de atributos ARIA y navegación por teclado.
- **Decisión Tomada:**
  - **Aceptado:** La estructura del diálogo modal con `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, y el botón de cierre con objetivo táctil de $44 \times 44$ px.
  - **Corregido:** En la función de validación con Zod, la IA escribió inicialmente un formateo simple de errores que era sobreescrito si un campo tenía múltiples validaciones. Se corrigió con la regla:
    ```javascript
    result.error.issues.forEach(err => {
      const field = err.path[0];
      if (!fieldErrors[field]) {
        fieldErrors[field] = err.message;
      }
    });
    ```
    garantizando que la validación principal de obligatoriedad siempre tenga precedencia en la pantalla.
  - **Descartado:** Se descartó el uso de `window.confirm()` que la IA propuso como solución rápida inicial, sustituyéndolo obligatoriamente por el componente accesible `ConfirmModal`.

---

### Fase 5: Autenticación JWT y Autorización por Roles
- **Prompt Empleado:**
  > *"Crea el componente ProtectedRoute.jsx para React Router que admita allowedRoles. Si no hay token redirige a /login. Si el rol no coincide muestra la vista AccessDeniedView (403). Explica en la documentación la justificación técnica de almacenar el token en localStorage frente a cookies HttpOnly."*
- **Propuesta de la IA:**
  Implementó el guard condicional con `useAuth()` y renderizado de `AccessDeniedView` con ilustración y explicación del código 403.
- **Decisión Tomada:**
  - **Aceptado:** La separación limpia entre estado de carga (`loading`), no autenticado (401 $\rightarrow$ `Navigate to="/login"`) y no autorizado (403 $\rightarrow$ `AccessDeniedView`).
  - **Corregido:** Se adaptó la lectura del rol para soportar tanto estructuras anidadas `{ rol: { nombre: 'Administrador' } }` como estructuras planas `{ rol: 'Administrador' }` o `{ rolNombre: 'Administrador' }`, asegurando robustez ante cualquier variación del DTO emitido por el backend.

---

### Fase 6: Pruebas Automatizadas con Vitest y Testing Library
- **Prompt Empleado:**
  > *"Genera suites de pruebas en frontend/src/test con Vitest y Testing Library que cubran: 1) ProtectedRoute (4 casos), 2) LoginView (5 casos), 3) PacientesView CRUD (7 casos), y 4) FlowIntegration (1 caso E2E de Login -> Crear -> Listar). Todas deben pasar al 100%."*
- **Propuesta de la IA:**
  Generó los archivos de prueba simulando los servicios con `vi.mock()`.
- **Decisión Tomada:**
  - **Aceptado:** La estrategia de pruebas simulando la capa de servicios sin requerir la base de datos levantada para la suite unitaria.
  - **Corregido (Hoisting de Mocks):** Vitest generaba un error de inicialización temporal al utilizar variables externas dentro de `vi.mock('react-router-dom')`. Se solucionó aplicando el patrón `vi.hoisted()`:
    ```javascript
    const { mockNavigate } = vi.hoisted(() => ({
      mockNavigate: vi.fn(),
    }));
    ```
  - **Corregido (Aislamiento de Modales):** En las pruebas de `PacientesView`, `screen.getByLabelText('Raza')` colisionaba entre el input del filtro de búsqueda de la tabla y el input dentro del formulario modal. Se corrigió aislando las consultas con `within(screen.getByRole('dialog'))`.
  - **Resultado Final:** 17 de 17 pruebas frontend pasando en verde con 0 fallos.

---

### Fase 7: Módulo de Facturación Avanzado, Gestión de Recetas y Refactorización Visual UX
- **Prompts Empleados:**
  > *"Quiero que me digas porque da error 500 al intentar logear en el proyecto de veterinaria-Trabajo2..."*  
  > *"Quisiera que cuando registrara la receta, esta poder actualizar si es que coloco una nueva y poder borrarla si es que existe..."*  
  > *"Necesito que revises y mejores el módulo de facturación del sistema: Cálculo automático del IVA (19%), Selección de tipos de citas y sus precios, Incorporación de insumos con validación de stock y descuento atómico de inventario, Actualización dinámica del formulario y consistencia entre frontend y backend..."*  
  > *"Cuando me referia a la cita, me referia a la cita anteriormente creada en el apartado de citas y cuando se seleccione esta, no se puede seleccionar ninguna otra, hasta que se quite de seleccion esta, además cuando se edite la facturación tambien tiene que reaformular el costo total con su IVA"*  
  > *"cuando voy al apartado de las facturas la pantalla esta en blanco y cuando retrocedo sigue en blanco"*  
  > *"Ahora quisiera modificar la vista del formulario, la edición y los detalles, quiero que siga manteniendo el fondo transparente pero quisiera que alrededor del texto hubiera un fondo relacionado con los con contexto visual..."*
- **Propuesta de la IA:**
  - Diagnóstico del Error 500 en Login por discrepancia de nombre de archivo (`appsetting.json` vs `appsettings.json`) y robustecimiento de `AuthService.cs` ante excepciones de formato en contraseñas heredadas.
  - Implementación de actualización y borrado en cascada para recetas médicas en `ConsultasView.jsx` y `Recetas.cs`.
  - Creación de endpoints transaccionales atómicos en `Facturas.cs` y `DetalleFacturas.cs` que recalculan automáticamente el subtotal neto, IVA (19%) y total CLP, validando el stock de inventario y descontándolo de manera segura tras la emisión o edición de la factura.
  - Conexión del formulario de facturación con la Agenda de Citas (`/api/v1/citas`), mostrando citas reales con paciente, dueño/RUT, especialidad y costo base, con bloqueo estricto a una sola cita por factura y desbloqueo inmediato al eliminarla.
  - Corrección de la pantalla en blanco en React mediante la inclusión del hook `useMemo` en las importaciones y adición de comprobaciones `Array.isArray()`.
  - Rediseño integral de la experiencia visual en los modales de creación, edición y detalles de facturación: preservando el fondo general translúcido con desenfoque (`glassmorphism`), pero envolviendo cada encabezado, bloque de formulario, tabla de ítems y resumen de impuestos en tarjetas visuales sólidas (`#ffffff`) con acentos contextuales temáticos y alta legibilidad.
- **Decisión Tomada:**
  - **Aceptado:** Cálculo automático del IVA (19%) bajo normativa tributaria chilena con redondeo de precisión a enteros CLP y campos de impuestos/total como `readOnly`.
  - **Aceptado:** Transacciones atómicas de base de datos (`IDbContextTransaction`) para asegurar que el descuento de inventario se produzca únicamente tras la confirmación exitosa de la factura.
  - **Aceptado:** Restricción de una sola cita médica por factura, bloqueando el selector y el botón mientras exista una cita en el detalle.
  - **Corregido (Sincronización en Edición):** En `PUT /api/v1/facturas/{id}`, se implementó la restitución del stock de insumos anteriores antes de validar y deducir los nuevos requerimientos, recalculando automáticamente el IVA (19%) y el monto total en el servidor.
  - **Corregido (Compatibilidad EF InMemory en Tests):** Se protegió `BeginTransactionAsync()` con `db.Database.IsRelational()` para permitir que la suite de pruebas automatizadas se ejecute sobre el proveedor InMemory sin excepciones.
  - **Corregido (Estabilidad de Renderizado):** Se importó explícitamente `useMemo` en `FacturasView.jsx` y se garantizaron valores por defecto seguros ante respuestas vacías o asíncronas.
  - **Resultado Final:** 11 de 11 pruebas de integración backend pasando en .NET 8 y 24 de 24 pruebas frontend pasando en Vitest (6 suites completas).

---

### Fase 8: Extensión del Rediseño UI/UX con Tarjetas Contextuales a Todos los Módulos del Sistema
- **Prompts Empleados:**
  > *"Los cambios anteriores relacionadas con la visual que te pedi, tambien quiero que los apliques a los demás modulos"*  
  > *"continua"*
- **Propuesta de la IA:**
  - Analizar cada vista del sistema (`ClientesView.jsx`, `PacientesView.jsx`, `CitasView.jsx`, `ConsultasView.jsx`, `InsumosView.jsx`, `AdminConfigView.jsx`).
  - Aplicar la arquitectura de tarjetas contextuales desacopladas sobre el fondo translúcido (`glassmorphism`):
    - Tarjeta Cabecera: fondo `#ffffff`, bordes `#e2e8f0`, sombras sutiles, insignias con íconos temáticos (`Users`, `Dog`, `Calendar`, `Stethoscope`, `Pill`, `Package`, `Award`, `Shield`), títulos de alto contraste y botón de cierre.
    - Tarjeta Formulario / Datos: fondo sólido `#ffffff`, espaciado y tipografía nítida con etiquetas `fontWeight: 600` en color pizarra (`#1e293b`), separadas de cualquier elemento subyacente.
    - Tarjeta Pie de Acciones: alineación a la derecha, fondo sólido blanco y botones de acción primarios/secundarios claros.
  - Añadir soporte por defecto en `index.css` a `.modal-content` alineado con `.modal-container` como mecanismo de fallback defensivo.
- **Decisión Tomada:**
  - **Aceptado:** Mantener el fondo translúcido general sin alterar la identidad visual moderna de la aplicación, pero garantizando el 100% de legibilidad en todos los formularios y modales del sistema.
  - **Aceptado:** Homogeneizar los modales de lectura (Ficha clínica de paciente) y de edición/creación en todas las vistas.
  - **Resultado Final:** Compilación exitosa en Vite (`npm run build`), 24/24 pruebas frontend aprobadas en Vitest y 11/11 pruebas backend aprobadas en .NET 8.

---

## 4. Resumen de Decisiones de Ingeniería (Aceptado vs Corregido vs Descartado)

| Componente / Módulo | Propuesta Inicial de IA | Decisión Final del Estudiante | Justificación Técnica |
| :--- | :--- | :--- | :--- |
| **Target Framework .NET** | Compilar en `net10.0` | **Corregido a `net8.0`** | El entorno local dispone de .NET SDK 8.0.403 (LTS estable). `net10.0` no está disponible en la máquina. |
| **Diálogos de Confirmación** | Usar `window.confirm()` | **Descartado; se creó `ConfirmModal`** | `window.confirm()` no es personalizable, bloquea el hilo principal y no cumple los estándares de accesibilidad WCAG 2.2 AA. |
| **Manejo de Errores Zod** | Parseo directo de `error.errors` | **Corregido a iteración de `error.issues`** | Garantiza compatibilidad con las versiones modernas de Zod y evita que errores secundarios sobreescriban mensajes prioritarios. |
| **Consultas de Selectores de Prueba** | Consultas globales con `screen` | **Corregido con `within(modal)`** | Evita falsos positivos y ambigüedad de nombres cuando coexisten campos de filtrado y campos de formulario. |
| **Almacenamiento del Token** | Sugerencia de token solo en memoria | **Modificado a `localStorage` + mitigaciones XSS** | El token en memoria destruye la experiencia de usuario al recargar la página (`F5`). Se optó por `localStorage` reforzado con estricta mitigación de XSS y caducidad corta. |
| **Descuento de Inventario** | Descontar al seleccionar insumo en cliente | **Transacción atómica en Backend tras confirmación** | Descontar en frontend o antes de confirmar genera inconsistencias si el usuario cancela o si falla la red. La transacción garantiza atomicidad ACID. |
| **Cálculo de Impuestos** | Input numérico editable por usuario | **Cálculo automático 19% IVA con `readOnly`** | Evita evasión o discrepancias en la normativa tributaria chilena, calculando `IVA = round(Neto * 0.19)` de manera transparente. |
| **Selección de Cita en Factura** | Selección múltiple de especialidades | **Cita única real desde `/api/v1/citas`** | Una factura clínica se vincula a una atención médica específica; se bloquea la adición de segundas citas para prevenir cobros duplicados. |
| **Diseño Visual de Modales** | Fondo transparente plano sin contenedores | **Tarjetas contextuales sólidas sobre fondo translúcido** | Elimina el ruido visual y falta de contraste ocasionado por las tablas de fondo, manteniendo una estética moderna `glassmorphism` extendida a todos los módulos. |

---

## 5. Reflexión sobre Productividad, Calidad y Aprendizaje

El uso de Inteligencia Artificial Generativa bajo el modelo **Gemini 3.8 Flash** dentro de **Antigravity** representó un cambio de paradigma en la productividad del desarrollo:
1. **Aceleración de Código Boilerplate:** La generación rápida de contratos Zod, estructuras iniciales de componentes y esqueletos de pruebas permitió dedicar la mayor parte del tiempo a la lógica de negocio, la arquitectura de seguridad y la accesibilidad.
2. **Importancia del Criterio Técnico Humano:** La IA propuso soluciones que inicialmente fallaban por contexto de versión (.NET 10 vs 8, hoisting de Vitest, colisión de selectores). Fue indispensable poseer un conocimiento sólido de React, ASP.NET Core y pruebas automatizadas para depurar y guiar al asistente hacia código robusto y conforme a la rúbrica.
3. **Calidad y Verificación Continua:** Cada bloque de código generado fue validado inmediatamente mediante linters, compilación estricta y pruebas automatizadas antes de darse por concluido.


---

### Registro de Sesión 9 - 01/11/2026: Conexión y Migración a Supabase PostgreSQL

#### Prompts del Usuario:
- "Quiero que te conectes a supabase, la base de datos va a estar ahora alojada en supabase, este es el string de conexión: postgresql://postgres:Yyg4XmreVcfU0H5x@db.gxbnrxhgwyckgcdfzmjs.supabase.co:5432/postgres. Quiero que hagas eso solamente, establezcas la conexión con supabase y ya no se pueda subir nada de forma local con sql server."

#### Respuestas y Acciones Ejecutadas por el Asistente:
1. **Reemplazo del Proveedor de Datos de EF Core:**
   - Desinstalación de `Microsoft.EntityFrameworkCore.SqlServer` (v8.0.13).
   - Instalación de `Npgsql.EntityFrameworkCore.PostgreSQL` (v8.0.11).
   - Ajuste de dependencias en `VeterinariaAPI.Tests` a EF Core v8.0.11 para evitar conflictos de ensamblado MSB3277.
2. **Eliminación de Acoplamiento a SQL Server Local:**
   - Eliminación del método fallback `OnConfiguring` con cadena de conexión local en `VeterinariodbContext.cs`.
   - Limpieza de archivos de migración inicial dependientes de extensiones SQL Server.
3. **Manejo del Pooler IPv4 de Supabase:**
   - Detección de cadena en formato URI `postgresql://` y enrutamiento hacia el pooler `aws-0-us-east-2.pooler.supabase.com:5432` con usuario compuesto (`postgres.gxbnrxhgwyckgcdfzmjs`), solventando la incompatibilidad DNS IPv6-only (`WSANO_DATA`) en entornos Windows locales.
4. **Validación Automática:**
   - Implementación de la prueba unitaria de conexión activa a Supabase `Test_Supabase_Connection` (`SELECT COUNT(*) FROM "Roles"`).
   - 7/7 pruebas backend y 22/22 pruebas frontend ejecutadas satisfactoriamente.
