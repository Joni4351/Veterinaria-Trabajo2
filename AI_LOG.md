# BITÁCORA DE USO DE INTELIGENCIA ARTIFICIAL GENERATIVA (AI_LOG.md)
## Trabajo 2: Frontend, Consumo de API y Seguridad de Extremo a Extremo
**Sistema:** VetClinic Pro — Plataforma Veterinaria  
**Estudiante:** Joaquín Ignacio / Proyecto Veterinario  
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

## 4. Resumen de Decisiones de Ingeniería (Aceptado vs Corregido vs Descartado)

| Componente / Módulo | Propuesta Inicial de IA | Decisión Final del Estudiante | Justificación Técnica |
| :--- | :--- | :--- | :--- |
| **Target Framework .NET** | Compilar en `net10.0` | **Corregido a `net8.0`** | El entorno local dispone de .NET SDK 8.0.403 (LTS estable). `net10.0` no está disponible en la máquina. |
| **Diálogos de Confirmación** | Usar `window.confirm()` | **Descartado; se creó `ConfirmModal`** | `window.confirm()` no es personalizable, bloquea el hilo principal y no cumple los estándares de accesibilidad WCAG 2.2 AA. |
| **Manejo de Errores Zod** | Parseo directo de `error.errors` | **Corregido a iteración de `error.issues`** | Garantiza compatibilidad con las versiones modernas de Zod y evita que errores secundarios sobreescriban mensajes prioritarios. |
| **Consultas de Selectores de Prueba** | Consultas globales con `screen` | **Corregido con `within(modal)`** | Evita falsos positivos y ambigüedad de nombres cuando coexisten campos de filtrado y campos de formulario. |
| **Almacenamiento del Token** | Sugerencia de token solo en memoria | **Modificado a `localStorage` + mitigaciones XSS** | El token en memoria destruye la experiencia de usuario al recargar la página (`F5`). Se optó por `localStorage` reforzado con estricta mitigación de XSS y caducidad corta. |

---

## 5. Reflexión sobre Productividad, Calidad y Aprendizaje

El uso de Inteligencia Artificial Generativa bajo el modelo **Gemini 3.8 Flash** dentro de **Antigravity** representó un cambio de paradigma en la productividad del desarrollo:
1. **Aceleración de Código Boilerplate:** La generación rápida de contratos Zod, estructuras iniciales de componentes y esqueletos de pruebas permitió dedicar la mayor parte del tiempo a la lógica de negocio, la arquitectura de seguridad y la accesibilidad.
2. **Importancia del Criterio Técnico Humano:** La IA propuso soluciones que inicialmente fallaban por contexto de versión (.NET 10 vs 8, hoisting de Vitest, colisión de selectores). Fue indispensable poseer un conocimiento sólido de React, ASP.NET Core y pruebas automatizadas para depurar y guiar al asistente hacia código robusto y conforme a la rúbrica.
3. **Calidad y Verificación Continua:** Cada bloque de código generado fue validado inmediatamente mediante linters, compilación estricta y pruebas automatizadas antes de darse por concluido.
