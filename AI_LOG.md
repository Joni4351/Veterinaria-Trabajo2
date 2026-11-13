# BITÁCORA DE USO DE INTELIGENCIA ARTIFICIAL GENERATIVA (AI_LOG.md)
## Trabajo 2: Frontend, Consumo de API y Seguridad de Extremo a Extremo
**Sistema:** VetClinic Pro — Plataforma Veterinaria  
**Estudiante:** Jonathan Garrido / Proyecto Veterinario  
**Fecha:** Octubre 2026  
**Actualización de intervenciones con Codex:** 9 de noviembre de 2026.

> Los apartados históricos siguientes conservan la atribución, declaraciones y resultados registrados previamente. No constituyen una nueva verificación de la herramienta, el plan comercial, la revisión personal del estudiante o las métricas de aquel periodo. La sección 6 distingue las intervenciones observadas en esta conversación y el estado actual del código.

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

---

## 6. Intervenciones solicitadas y realizadas con Codex

### 6.1. Identificación y alcance del registro

- **Herramienta:** Codex, aplicación de escritorio de OpenAI, con acceso al repositorio local y herramientas de desarrollo.
- **Modelo:** asistente basado en GPT-6, según la identificación del entorno de esta sesión. No se verificó un identificador comercial más específico ni el plan de suscripción; no se atribuye una modalidad de pago al estudiante.
- **Periodo de referencia:** solicitudes de esta conversación entre el 2 y el 7 de noviembre de 2026; fecha de corte de esta actualización: 7 de noviembre de 2026, America/Santiago.
- **Proyecto y rama de trabajo:** VetClinic Pro, `feature/FaceAPI`.
- **Alcance de la asistencia:** revisión del código, implementación bajo instrucciones del usuario, corrección de errores, elaboración y ejecución de pruebas, documentación y operaciones Git expresamente solicitadas.
- **Criterio de evidencia:** las pruebas automatizadas demuestran los casos ejecutados. No certifican ausencia absoluta de fallos, cumplimiento integral de WCAG/OWASP ni validación de mecanismos PostgreSQL que no se ensayaron con ese motor.

Las solicitudes de la tabla siguiente se resumen; no se presentan como una transcripción literal íntegra de los mensajes. Las fechas exactas de cada ejecución deben contrastarse con el historial de la conversación si se necesita una trazabilidad temporal más detallada.

### 6.2. Requerimientos que autorizaron modificaciones del código

| Solicitud del usuario | Intervención realizada | Decisión y límites |
| --- | --- | --- |
| Revisar el proyecto y hacer consistente la instalación del README. | Se corrigieron PostgreSQL/Supabase, `ConnectionStrings:miconexion`, puertos, Node, configuración JWT y carga de variables. | Se documentó que falta un esquema/migración PostgreSQL inicial; no se afirmó que el script SQL Server fuera compatible. |
| Actualizar la rama principal, crear `feature/FaceAPI` y publicarla. | Se actualizó `main` y se creó/publicó la rama solicitada. | Las operaciones Git se realizaron por solicitud expresa. Una publicación anterior de implementación quedó en el commit `8f031d3`; las modificaciones posteriores deben revisarse con `git status` antes de afirmar que están publicadas. |
| Implementar registro facial por fotografía, exclusivamente dentro de Administración. | Se añadieron entidad, mapeo, servicio de cifrado, endpoints administrativos, vista, servicios frontend, modelos locales y pruebas. | Se implementaron registro, metadatos, reemplazo y eliminación. No se implementaron login facial, comparación para autenticación ni acceso a cámara. |
| Proteger los descriptores, registrar consentimiento y utilizar la tabla facial existente. | Descriptor de 128 números validado y cifrado con AES-256-GCM; constancia de consentimiento con fecha, administrador y versión. Se preparó el script de adaptación de `ReconocimientoFacial`. | Se conserva JSONB como sobre cifrado y se modifica su restricción anterior; la foto no se envía al backend. La clave es privada y distinta de JWT. No se publica en documentación. |
| Resolver los errores de guardado facial. | El diagnóstico de metadatos confirmó columnas de consentimiento faltantes y una restricción de arreglo sin cifrar. Tras la aplicación del script por el usuario, se verificó una inserción sintética cifrada y se revirtió la transacción de prueba. | No se conservaron registros de esa prueba. El usuario configuró posteriormente la clave de cifrado y confirmó el guardado desde la web. Esto no equivale a haber verificado toda la concurrencia del generador en PostgreSQL. |
| Mover la creación de usuarios a Administración y ocultar esa sección a otros roles. | Se retiró el registro público del login, se incorporó `UserCreateForm` y se exigió Administrador en `/api/v1/usuarios/register`. Se ocultó el enlace y se mantuvo la protección de la ruta. | La cuenta del administrador no cambia al crear otro usuario. La API valida que el rol asignado exista. |
| Corregir alineación de campos y hacer que la barra izquierda ocupe la pantalla al desplazarse. | Se alineó la cuadrícula del formulario y se dejó fija la barra en escritorio, con margen reservado al contenido. | Comprobación en navegador al inicio, mitad y final de una página larga; se conservó el comportamiento móvil. |
| Incorporar modo oscuro con luna/sol y la paleta del proyecto. | Se añadieron contexto de tema, selector, persistencia de preferencia, inicialización del tema y colores mediante variables en vistas y componentes. | Se adaptaron formularios, tablas, modales, login y navegación. No se utilizaron filtros que invirtieran fotografías o descriptores. |
| Revisar y ampliar validaciones según el negocio veterinario. | Se añadieron comprobaciones de relaciones y consistencia clínica/contable, estados de cita, fechas, contactos, cantidades y manejo de errores de Zod 4. Se alineó el timestamp de citas y la edición de hora local. | No se asumieron duración de citas u horarios de apertura. Los controles previos no sustituyen restricciones de concurrencia en PostgreSQL. |
| Crear seeders completos desde la página web. | Se añadieron `DemoSeederService`, endpoints y pestaña Datos de prueba con vista previa, aceptación, confirmación y resumen. | El lote `vetclinic-demo-v1` contiene 28 registros y un rol adicional solo si falta. Se persiste en la base conectada; no se implementó activación/desactivación o borrado masivo del lote. |
| Ejecutar pruebas y corregir posibles fallos del generador. | Se reprodujeron conflictos de identidad y de facturas incompletas; se añadieron verificaciones previas. Se corrigieron reintentos y dobles confirmaciones de la interfaz. | El lote intacto es repetible sin duplicación ni otro descuento. No es una restauración de cualquier dato alterado; los conflictos requieren revisión. |
| Crear automáticamente los roles obligatorios, incluso con una tabla parcialmente poblada. | `DefaultRoleService` asegura Administrador/true, Veterinario/true y Recepcionista/false al iniciar la API. El sembrado usa IDs encontrados/generados en lugar de asumir 1, 2 y 3. | Conserva usuarios y roles personalizados; corrige nombres y banderas de los roles coincidentes. La reposición se ejecuta al iniciar, no como vigilancia continua. |
| Activar la validación de audiencia del JWT y comprobar su funcionamiento. | Se estableció `ValidateAudience = true` y se incorporaron nueve pruebas de audiencia, firma, emisor, vencimiento, roles y login. | La emisión y aceptación comparten `Jwt:Audience`; un token autenticado no concede por sí solo privilegios de administrador. |
| Aplicar solamente la primera solución de sesión: comprobar el JWT antes de restaurar el usuario. | `AuthContext` valida estructura básica y expiración antes de reutilizar `vet_user`. Limpia token/usuario si están vencidos o son inválidos y conserva la restauración con un token vigente. | Se añadió prueba de navegador de retorno al login. La verificación criptográfica continúa en el servidor. No se añadieron cookies, refresh tokens, revocación ni temporizador automático. |

### 6.3. Pruebas observadas y correcciones derivadas

Las cifras siguientes son resultados de las últimas ejecuciones correspondientes, realizadas en momentos distintos; no deben sumarse ni presentarse como pruebas exclusivas de un solo módulo.

| Área | Resultado y alcance |
| --- | --- |
| Backend, después de activar audiencia JWT | **67 pruebas locales aprobadas**, incluidas 9 nuevas de JWT. Se excluyó `Test_Supabase_Connection` para no ejecutar la prueba externa en esa verificación. |
| Frontend, después de corregir la restauración de sesión | **59 pruebas aprobadas**, incluidas restauración con caché, token vencido/malformado, expiración ausente o inválida y usuario guardado sin token. |
| Playwright en Edge, después de corregir la restauración | **6 pruebas aprobadas**: sesión vencida, confirmación del generador, restricciones de dos roles, creación administrativa y flujo facial. Las respuestas de la API se simulan; la inferencia facial usa modelos reales. |
| Compilación frontend de producción | Correcta. Persisten advertencias sobre tamaño de bundles y externalización de `fs` en face-api.js. |
| Auditoría npm durante la incorporación facial | La ejecución realizada tras corregir dependencias informó cero vulnerabilidades. Es una evidencia de ese momento, no una garantía actual permanente. |

Se corrigieron los siguientes problemas durante la implementación y el testeo:

- El registro público permitía enviar un rol: se restringió a Administrador y se movió su interfaz.
- El formato de almacenamiento facial no coincidía con la restricción anterior de Supabase: se preparó y verificó la adaptación descrita.
- El formulario de citas ofrecía estados que el esquema Zod rechazaba: se alinearon estados admitidos y se mantuvo compatibilidad con Atendida.
- Varias vistas accedían a `error.errors`: se cambió a `error.issues`, compatible con Zod 4.
- La carga repetida podía crear otra factura cuando faltaba una línea clínica, omitir una línea de insumo ausente o vincular un correo reservado ajeno: se añadieron verificaciones previas y regresiones específicas.
- La vista previa fallida carecía de reintento y se reforzó el bloqueo de doble confirmación.
- La sesión restauraba `vet_user` antes de comprobar la expiración: se invirtió ese orden.
- Una aserción del test facial comprobaba la liberación de la URL antes de completarse el efecto de React: se esperó mediante `waitFor`, sin modificar por ello la lógica productiva facial.
- Los fixtures de navegador utilizaban tokens ficticios sin expiración: se actualizaron para representar sesiones vigentes al endurecer la restauración. No son tokens criptográficamente válidos para una API real.

Las pruebas locales utilizan InMemory o API simulada según su nivel. La reversión y el bloqueo de cargas simultáneas del generador no se comprobaron en un PostgreSQL aislado. La prueba facial sintética revertida y las consultas de diagnóstico no permiten afirmar esa cobertura.

### 6.4. Requerimientos documentales y decisiones de alcance

El usuario solicitó explicaciones académicas de datos de prueba, API con validaciones, JWT, roles y migraciones. Se distinguió entre API propia, biblioteca face-api.js y OpenAPI/Swagger. No se implementaron migraciones por el hecho de explicar sus pasos.

Posteriormente indicó que la documentación para el informe debía entregarse directamente en el chat, sin generar archivos salvo solicitud expresa. La presente modificación de README y AI_LOG responde a una solicitud posterior explícita de actualizar esos archivos; no autoriza cambios adicionales en otras piezas del informe.

Ante una propuesta con varias mejoras de sesión, el usuario pidió literalmente **"Haz la primera solución solamente"**. Se respetó ese límite: se corrigió la restauración de sesión y se probaron sus resultados. Las demás propuestas no deben figurar como implementadas.

### 6.5. Aspectos pendientes que no se presentan como completados

- Baseline y migraciones EF Core para la base existente; alineación restante del modelo con PostgreSQL, incluido el valor predeterminado SQL Server de la fecha de factura.
- Cookies HttpOnly y protección CSRF asociada, renovación y revocación de tokens, eliminación del fallback heredado de contraseñas en texto plano y cierre temporizado de sesión.
- Login o identificación mediante rostro y protección de prueba de vida.
- Cantidad y precio histórico separados en el detalle de factura, necesarios para reconstruir correctamente stock cuando cambian precios.
- Ensayos transaccionales y concurrentes del generador sobre PostgreSQL aislado.
- Auditoría completa de accesibilidad y seguridad. Las validaciones implementadas no equivalen a una certificación.

### 6.6. Revisión y responsabilidad académica

Esta bitácora registra asistencia, cambios y evidencia técnica observada. No afirma que el estudiante haya revisado personalmente cada línea, comprendido toda la implementación o realizado una defensa: esas actividades deben ser verificadas por su autor. Antes de la entrega, corresponde contrastar el código con la rúbrica, revisar los resultados reproducibles y declarar las herramientas efectivamente utilizadas.

Las configuraciones privadas, claves de cifrado, contraseñas de conexión y tokens reales no deben copiarse al informe ni a esta bitácora. La subida de cambios posteriores al commit referido requiere una operación Git adicional solicitada por el usuario.

## 7. Política de trazabilidad de las intervenciones asistidas

### 7.1. Formalización del registro técnico y académico

**Fecha:** 9 de noviembre de 2026.

**Requerimiento reformulado:** Establecer un procedimiento obligatorio de
trazabilidad documental para las modificaciones del proyecto, mediante la
actualización de la bitácora de asistencia con inteligencia artificial. El
registro debe expresar los requerimientos como objetivos técnicos y describir
las acciones ejecutadas con una redacción académica, sin reproducir
literalmente las instrucciones conversacionales del solicitante.

**Intervención realizada:** Se creó `AGENTS.md` en la raíz del repositorio para
incorporar la actualización de `AI_LOG.md` al flujo de trabajo de futuras
intervenciones. Se definió una estructura de registro basada en fecha,
requerimiento reformulado, implementación, componentes afectados y evidencia
de validación. Asimismo, se estableció la conservación del historial, la
exclusión de información confidencial y la distinción entre resultados
comprobados y actividades pendientes. La incorporación de esta política se
documentó en la presente entrada y se actualizó la fecha de la bitácora.

**Archivos afectados:** `AGENTS.md` y `AI_LOG.md`.

**Validación:** Se revisó la coherencia de las instrucciones y del registro
documental, y se comprobó el formato de los cambios con `git diff --check`.
No se ejecutaron pruebas de software, ya que esta intervención modifica
únicamente documentación e instrucciones de trabajo.

**Alcance:** La regla se aplica a las siguientes modificaciones del proyecto.
Esta entrada no representa una actualización retrospectiva ni una nueva
verificación de las funcionalidades descritas en apartados anteriores.

### 7.2. Actualización coordinada de las bitácoras

**Fecha:** 9 de noviembre de 2026.

**Requerimiento reformulado:** Extender el procedimiento de trazabilidad para
que las modificaciones del proyecto se documenten de manera coordinada en el
registro de asistencia con inteligencia artificial y en la bitácora de
desarrollo, dentro de una misma entrega.

**Intervención realizada:** Se actualizó `AGENTS.md` para exigir la modificación
conjunta de `AI_LOG.md` y `BITACORA.md`. Se distinguió la finalidad de cada
registro: el primero documenta el requerimiento reformulado y la intervención
asistida; el segundo describe el avance técnico, los componentes modificados y
su validación. Se mantuvieron las reglas de redacción técnica y académica,
preservación del historial, exclusión de información confidencial y registro
exclusivo de resultados comprobados. Esta política se registró en ambos
documentos.

**Archivos afectados:** `AGENTS.md`, `AI_LOG.md` y `BITACORA.md`.

**Validación:** Revisión de coherencia de las instrucciones y comprobación de
formato mediante `git diff --check`. No se ejecutaron pruebas de software,
puesto que los cambios son exclusivamente documentales.

**Alcance:** La actualización coordinada se exige desde esta intervención;
no se reconstruyen ni se revalidan retrospectivamente sesiones anteriores.

## 8. Consolidación de las últimas modificaciones del programa

**Fecha de registro:** 9 de noviembre de 2026. Esta sección consolida las
intervenciones recientes observadas en la conversación y contrastadas con los
archivos del proyecto. Los apartados anteriores conservan su carácter histórico;
en particular, el login facial mencionado como pendiente en 6.5 se implementó
posteriormente con las limitaciones descritas a continuación.

### 8.1. Auditoría de operaciones y consulta administrativa

**Requerimiento reformulado:** Implementar trazabilidad de las modificaciones
persistidas por la aplicación y proporcionar una consulta administrativa de
eventos, con identificación del responsable y comparación de valores.

**Intervención realizada:** Se incorporaron el modelo `Auditoria`, su mapeo a
la tabla existente, la captura de altas, modificaciones y eliminaciones desde
`SaveChanges` y una identificación de operación compartida por solicitud. La
captura emplea una lista explícita de campos y excluye contraseñas, tokens y
descriptores faciales. En PostgreSQL, la escritura de auditoría se vincula a la
conexión y transacción de la operación de negocio. Se corrigió el error
`Connection already open` evitando copiar la cadena de conexión al contexto
auxiliar cuando se reutiliza una conexión abierta.

Se añadieron endpoints de lectura restringidos a administradores, con
comprobación del rol vigente en la base de datos, filtros, paginación, búsqueda,
resúmenes por acción y detalle de valores anteriores y nuevos. La interfaz
incorpora tarjetas de resumen, etiquetas por acción, avatares, navegación entre
páginas y consulta de eventos asociados. Se retiraron los identificadores con
almohadilla de los textos visibles del listado.

**Componentes principales:** `VeterinariodbContext.Audit.cs`, `Auditoria.cs`
(modelo y endpoints), `AuditOperation.cs`, `AuditoriaView.jsx`,
`AuditoriaView.css` y `AuditoriaTests.cs`.

**Alcance:** Se registran cambios de entidades rastreadas mediante Entity
Framework Core desde la habilitación de la funcionalidad. No se reconstruye
historial anterior ni se auditan modificaciones directas por SQL. No se ofrecen
endpoints de edición o eliminación del historial. La atomicidad y concurrencia
no se verificaron sobre una instancia PostgreSQL aislada.

### 8.2. Exportación controlada del historial

**Requerimiento reformulado:** Permitir la obtención de informes del historial
con selección explícita del volumen de registros y consultas acotadas.

**Intervención realizada:** Se añadió exportación CSV de la página visible y
un diálogo de preparación de PDF con selección de 1 a 100 registros, sujeto a
los filtros activos y al orden de eventos más recientes. La preparación realiza
una solicitud paginada desde la primera página y permite revisar los resultados
antes de abrir la impresión del navegador para guardar el PDF. Se incorporaron
validación del límite, bloqueo durante la preparación, cancelación de la
solicitud y estilos específicos de impresión.

**Validación y límites:** Se comprobó en navegador el rechazo de cantidades
superiores a 100, los parámetros de consulta, la vista de impresión y la
descarga CSV. La función no escribe en la base de datos. El límite acota los
registros transferidos, pero no constituye una garantía general de capacidad o
rendimiento de la base de datos; la consulta también calcula totales filtrados.

### 8.3. Orden estable y homogeneización de la interfaz

**Requerimiento reformulado:** Garantizar estabilidad en la presentación de
los registros tras su edición y uniformar el lenguaje visual de los módulos.

**Intervención realizada:** Los repositorios general y de usuarios aplican
orden ascendente por identificador, evitando depender del orden físico de las
filas. Se verificó que la actualización de un cliente conserve su posición.
El estilo de las tablas del historial se extendió a los listados de clientes,
pacientes, citas, consultas, inventario, facturas y Administración. Se ajustaron
encabezados, separación de filas, bordes, etiquetas y botones, conservando las
tarjetas y objetivos táctiles amplios en pantallas pequeñas.

Se rediseñó la navegación de Administración con iconos e indicador de sección
activa, y se retiraron los subtítulos descriptivos de los módulos, incluidos
textos sobre rutas internas de la API. Se mantuvieron las etiquetas de campos,
las validaciones y las instrucciones operativas de formularios.

La barra lateral dispone de un botón de visibilidad que libera su espacio en
escritorio. El comportamiento móvil conserva el panel superpuesto y el cierre
al navegar. Se añadieron cierre con Escape, retorno del foco al control,
atributos de accesibilidad, exclusión de interacción del panel oculto mediante
`inert` y adaptación a preferencias de movimiento reducido.

**Componentes principales:** `Repository.cs`, `UsuarioRepository.cs`,
`ListOrderingTests.cs`, `AdminConfigView.jsx`, `AdminConfigView.css`, las vistas
de los módulos, `App.jsx` e `index.css`.

### 8.4. Verificación facial durante el inicio de sesión

**Requerimiento reformulado:** Incorporar una comprobación facial posterior a
la validación de credenciales para las cuentas con registro facial activo,
manteniendo el acceso convencional para las cuentas sin registro activo.

**Intervención realizada:** La validación correcta de correo y contraseña
entrega un desafío temporal a las cuentas que requieren reconocimiento facial,
sin emitir todavía un JWT de acceso. El desafío es aleatorio, de un solo uso,
tiene vigencia de dos minutos y se almacena temporalmente en memoria del
servidor. La verificación comprueba su vigencia, la continuidad de las
credenciales y del registro facial, y la coincidencia del descriptor mediante
distancia euclídea con umbral de 0,5. El descriptor almacenado se descifra en
el servidor mediante AES-256-GCM con vinculación al identificador del usuario.

El frontend solicita la cámara tras una acción explícita, procesa el rostro
localmente con face-api.js y transmite el descriptor para su comparación. La
sesión solo se guarda al recibir el JWT definitivo. La cámara se detiene al
completar, cancelar, vencer o abandonar el paso. El acceso facial correcto
actualiza `UltimoAcceso` y se audita a nombre del usuario verificado. Las
cuentas sin registro facial activo omiten este paso después de validar su
contraseña.

**Componentes principales:** `LoginFacial.cs`, `Usuarios.cs`,
`FacialLoginChallenges.cs`, `FacialEncryptionService.cs`, `FacialLoginStep.jsx`,
`LoginView.jsx`, `AuthContext.jsx`, los servicios de autenticación y detección,
`FacialLoginTests.cs` y `FacialLogin.test.jsx`.

**Limitaciones:** No se implementó detección de vida ni protección integral
contra presentación de fotografías. La comparación recibe un descriptor
calculado en el cliente y no acredita por sí misma presencia física. La cámara
requiere un contexto seguro, como HTTPS o localhost. Los desafíos no se
comparten entre procesos y se invalidan al reiniciar el servidor; una operación
con varias instancias requeriría un mecanismo compartido. Las pruebas de
interfaz utilizan cámara simulada o mocks y no certifican precisión biométrica
con cámaras y personas reales.

### 8.5. Plantillas de configuración y alcance documental

Se crearon `VeterinariaAPI/appsettings.json.example` y
`VeterinariaAPI/appsettings.Development.json.example`, con campos para completar
y sin credenciales reales. Se actualizó `VeterinariaAPI/.env.example` para
PostgreSQL/Supabase y las opciones de JWT y cifrado facial, dejando vacíos los
secretos. Se validó la sintaxis de ambas plantillas JSON. El archivo `.env` no
se carga automáticamente por el backend; sus variables deben proporcionarse al
proceso. Los archivos reales de configuración permanecen excluidos por las
reglas existentes de Git.

Se precisó la regla de `AGENTS.md`: la actualización conjunta de `AI_LOG.md` y
`BITACORA.md` acompaña las modificaciones efectivas del código y los ajustes
asociados. Las consultas y explicaciones no generan entradas. Los cambios
exclusivamente documentales se registran cuando existe una solicitud expresa,
como en esta consolidación.

### 8.6. Evidencia de validación y estado de entrega

| Verificación observada | Resultado y alcance |
| --- | --- |
| Backend tras incorporar login facial | 86 pruebas locales aprobadas; se excluyó `Test_Supabase_Connection`. |
| Regresiones específicas de login facial, tras atribuir el evento al usuario | 6 casos aprobados, incluidos omisión sin rostro activo, contraseña incorrecta, coincidencia, rechazo, reutilización y expiración. |
| Frontend tras incorporar la barra desplegable | 65 pruebas aprobadas en 14 archivos. |
| Suite de navegador previa a la barra desplegable | 9 pruebas aprobadas, con API simulada y comprobaciones de listados, login, auditoría, datos de prueba, roles y registro facial. |
| Barra desplegable, comprobación adicional | 1 prueba dirigida aprobada: alternancia en escritorio, ampliación del contenido, Escape y cierre móvil al navegar. No se presenta como una ejecución completa de 10 pruebas. |
| Compilación del frontend | Correcta en las intervenciones verificadas; persisten avisos de tamaño de paquetes y compatibilidad de `fs` procedentes de face-api.js. |

Estos resultados corresponden a las ejecuciones observadas durante la
implementación, no a nuevas ejecuciones realizadas al redactar esta entrada.
Las pruebas de API utilizan InMemory; las pruebas de navegador emplean una API
simulada y, para el registro desde fotografía, modelos locales reales con una
imagen de prueba. No se alteró Supabase para estas verificaciones ni se
efectuaron despliegues o subidas a GitHub de los cambios aquí consolidados.

**Validación de esta actualización documental:** Revisión de correspondencia
con el código y los resultados observados, y comprobación de formato mediante
`git diff --check`. No se ejecutaron nuevamente las suites de software.

## 9. Confirmación uniforme de operaciones de escritura RF-51

**Fecha:** 9 de noviembre de 2026.

**Requerimiento reformulado:** Completar la retroalimentación posterior a las
operaciones de registro, modificación y eliminación para que el usuario reciba
una confirmación explícita del resultado satisfactorio, independiente del cierre
del formulario o de la actualización del listado.

**Intervención realizada:** Se incorporó el servicio `notifications.js` y el
componente compartido `SuccessNotification`, montado en el contenedor principal
autenticado. Los formularios que carecían de confirmación explícita emiten el
aviso únicamente después de que la solicitud de escritura finaliza con éxito.
Se cubrieron clientes, pacientes, citas, consultas, insumos, facturas, detalles
de factura, especialidades, roles y eliminación de usuarios. Se conservaron
los mensajes existentes en creación de usuarios, recetas, registro facial y
generación de datos de prueba, sin duplicar sus avisos.

La notificación identifica la entidad y la acción, permanece visible al cerrar
el formulario o cambiar de módulo y puede cerrarse manualmente. Incluye una
región de anuncio accesible, estilos compatibles con ambos temas y adaptación
móvil. Su retirada automática se programa a los ocho segundos y se suspende
mientras el usuario mantiene el puntero o el foco en ella. No se emiten avisos
de éxito por consultas de lectura, cancelaciones, validaciones rechazadas o
errores de escritura. La emisión se ubica en los manejadores de operaciones,
en lugar de un interceptor HTTP general, para evitar confirmaciones prematuras
de solicitudes intermedias o de autenticación.

**Archivos afectados:** `App.jsx`, `services/notifications.js`,
`components/SuccessNotification.jsx`, `components/SuccessNotification.css`,
las vistas de clientes, pacientes, citas, consultas, insumos, facturas y
Administración, `SuccessNotification.test.jsx`,
`e2e/registro-facial.spec.js` y ambas bitácoras.

**Validación:** Se aprobaron 69 pruebas de frontend distribuidas en 15 archivos,
incluidas cuatro nuevas comprobaciones de visualización, cierre, temporización,
interacción y eventos no válidos. La suite de navegador aprobó 11 pruebas con
API simulada; el nuevo caso verifica creación, edición y eliminación de un
cliente y ausencia de confirmación ante un error del servidor. Una ejecución
inicial del nuevo caso falló por un selector que no consideraba el indicador
obligatorio de la etiqueta; se corrigieron los selectores para usar las
etiquetas y botones reales y la ejecución posterior fue satisfactoria. La
compilación de producción fue correcta y se comprobó el formato con
`git diff --check`.

**Alcance y limitaciones:** El aviso confirma la respuesta satisfactoria de la
operación de escritura; no certifica la actualización posterior del listado ni
añade garantías transaccionales al backend. Las confirmaciones ya existentes
conservan su presentación contextual. No se modificó el backend, no se
ejecutaron sus pruebas ni se alteró Supabase. Persisten los avisos de compilación
preexistentes relativos al tamaño de paquetes y la compatibilidad de `fs`.

## 10. Prueba inicial de concurrencia con pacientes

**Fecha:** 9 de noviembre de 2026.

**Requerimiento reformulado:** Evaluar el comportamiento concurrente de las
operaciones de pacientes mediante veinte sesiones autenticadas y obtener
evidencia cuantitativa inicial para los objetivos de rendimiento, sin modificar
la base de datos operativa.

**Intervención realizada:** Se incorporó `ConcurrentPatientsTests.cs` con una
prueba de integración que utiliza ASP.NET Core TestServer y Entity Framework
Core InMemory. Se preparan veinte cuentas veterinarias distintas y un cliente
de prueba en el almacén aislado. Las sesiones reciben JWT firmados por la
configuración de pruebas; la emisión mediante login no forma parte de la carga.
Una barrera de inicio libera simultáneamente las veinte solicitudes de cada
fase: creación, consulta, modificación, comprobación de modificaciones y
eliminación. Los veinte pacientes creados se identifican por sus claves
generadas y se eliminan mediante la API.

Se comprueba el estado HTTP de cada operación, la unicidad de los identificadores,
la persistencia de los nuevos valores, la recuperación del número inicial de
pacientes y sesenta eventos de auditoría atribuidos a sus respectivos usuarios.
La limpieza incluye las cuentas y el cliente artificiales; el almacén completo
es temporal. Se genera un informe JSON con media, percentil 95, máximo,
solicitudes pendientes simultáneas y errores por fase.

**Validación:** La prueba dirigida fue aprobada. En la ejecución final se
alcanzaron veinte solicitudes en vuelo en cada fase, con cien solicitudes
concurrentes distribuidas en cinco ráfagas y cero errores. Además se realizaron
una consulta de calentamiento y veinte consultas secuenciales de referencia.

| Fase | Solicitudes | Errores | Máximo observado |
| --- | --- | --- | --- |
| Crear pacientes | 20 | 0 | 59,99 ms |
| Consultar pacientes | 20 | 0 | 17,22 ms |
| Actualizar pacientes | 20 | 0 | 19,38 ms |
| Comprobar actualizaciones | 20 | 0 | 21,68 ms |
| Eliminar pacientes | 20 | 0 | 18,35 ms |

Se crearon y eliminaron veinte pacientes de prueba; permanecieron los seis
pacientes iniciales del fixture y ningún paciente del lote. Los máximos de
esta ejecución quedaron por debajo de tres segundos para lectura y cinco
segundos para escritura. El informe reproducible se guarda en
`VeterinariaAPI.Tests/TestResults/concurrencia-pacientes-20.json`, directorio
excluido del control de versiones. Se revisó el formato con `git diff --check`.

**Alcance y limitaciones:** Es una prueba inicial de concurrencia de API con
datos en memoria, no un ensayo de producción ni una prueba sostenida. Las
solicitudes en vuelo no representan veinte conexiones físicas a PostgreSQL.
No incluye la carga de vistas, veinte logins simultáneos, la red real, Supabase,
contenedores ni mediciones de infraestructura. Los resultados no acreditan por
sí solos RNF-01, RNF-02, RNF-03 o RNF-05 en el entorno final. No se optimizaron
consultas, alteraron límites de autenticación ni modificaron datos de Supabase.

**Archivos afectados:** `ConcurrentPatientsTests.cs`, `AI_LOG.md` y
`BITACORA.md`. El JSON es un resultado generado de la prueba, no una
configuración ni un archivo con credenciales.

## 11. Optimización de consultas y lecturas RNF-04

**Fecha:** 9 de noviembre de 2026.

**Requerimiento reformulado:** Reducir la materialización de registros, el
seguimiento innecesario de entidades y las consultas repetidas en los flujos
de consulta, manteniendo los datos visibles, el orden estable y las reglas de
escritura y autorización del sistema.

**Intervención realizada:**

- Se aplicó `AsNoTracking` exclusivamente a las consultas de listado de doce
  endpoints. Los flujos de edición conservan sus entidades rastreadas para que
  las actualizaciones y la auditoría sigan funcionando.
- Las comprobaciones de duplicados de RUT y correo en clientes utilizan
  `AnyAsync`, traducible a comprobaciones de existencia en la base de datos,
  en lugar de descargar todos los clientes y evaluarlos en memoria. Se mantiene
  la comparación normalizada y la exclusión del propio registro al editar.
- Los listados de usuarios y citas proyectan sus campos antes de ejecutar la
  consulta. Se evita recuperar entidades completas de usuario y sus hashes de
  contraseña para construir las respuestas visibles.
- Se añadió `GET /api/v1/dashboard`, protegido para los tres roles. En
  PostgreSQL, un comando SQL agrupa seis conteos escalares y otras dos consultas
  proyectadas limitan a cinco citas y cinco insumos con stock bajo. El frontend
  sustituyó seis solicitudes de listados completos por una solicitud de resumen.
  Los conteos conservan el total real, no el tamaño de las vistas previas.
- En el historial de auditoría se obtiene el total a partir de la agrupación
  por acción ya utilizada en las tarjetas; se elimina el `CountAsync` adicional.
- La vista de consultas deja de recargar todas las recetas cada vez que se
  consultan o filtran atenciones. Se mantiene su carga inicial y su actualización
  después de las operaciones que modifican las recetas.

**Componentes afectados:** endpoints de listados, auditoría y dashboard,
`Program.cs`, `DashboardView.jsx`, `ConsultasView.jsx`,
`QueryOptimizationTests.cs`, `DashboardQueries.test.jsx`, pruebas de navegador
y ambas bitácoras. No se modificaron índices ni el esquema de Supabase.

**Validación ejecutada:** Se aprobaron 93 pruebas locales de backend,
excluyendo la conexión externa y separando el escenario de concurrencia. Se
aprobaron además la prueba dirigida de veinte usuarios, 71 pruebas de frontend
en 16 archivos y 12 pruebas de navegador con API simulada. Las siete nuevas
comprobaciones de backend cubren los totales, límites de vistas previas,
autorización, construcción de SQL PostgreSQL, proyecciones sin hashes y
normalización de duplicados. Las pruebas nuevas de frontend comprueban la
solicitud única al dashboard y su cancelación al abandonar la vista. Las
compilaciones de backend y frontend fueron correctas; persisten los avisos
preexistentes de paquetes del frontend. Se revisó el formato con
`git diff --check`.

**Evidencia y limitaciones:** Las mejoras estructurales se verificaron mediante
pruebas funcionales y revisión de consultas. La generación del SQL PostgreSQL
se comprobó sin abrir una conexión; los datos de integración utilizan InMemory.
No se ejecutaron las consultas nuevas contra Supabase ni se midieron planes
`EXPLAIN ANALYZE`, índices utilizados o una mejora porcentual de latencia. Los
listados generales conservan su contrato de respuesta y todavía no tienen
paginación obligatoria en todos los módulos. RNF-04 recibe optimizaciones
concretas, pero su evaluación de rendimiento en el entorno final continúa
pendiente. No se modificaron los permisos ni las operaciones de escritura.

## 12. Usabilidad y accesibilidad RNF-15, RNF-17 y RNF-18

**Fecha:** 9 de noviembre de 2026.

**Requerimiento reformulado:** Mejorar la comprensión de los errores de
operación, uniformar la identificación de campos obligatorios y reforzar la
interacción accesible de formularios, diálogos y controles, tomando como
referencia WCAG 2.2 de nivel AA.

**Intervención realizada:**

- **RNF-15:** Se incorporó un formateador común de errores HTTP, conexión y
  tiempo de espera. Se distinguen sesión inválida, falta de permisos, registros
  inexistentes, conflictos, archivos excesivos, límite de solicitudes y fallos
  del servicio. Se ofrecen acciones de recuperación sin mostrar detalles
  internos de errores de servidor. Las consultas fallidas por conexión o error
  del servidor generan un aviso global accesible; las cancelaciones intencionales
  no se anuncian como fallos. Se normalizan los nombres de campos de errores del
  backend para asociarlos a las validaciones de los formularios.
- **RNF-17:** Se incorporaron componentes compartidos de formulario e indicador
  obligatorio, atributos nativos `required`, leyendas explicativas y asociaciones
  entre etiquetas y controles. Se completaron referencias a mensajes mediante
  `aria-describedby` en los campos revisados y se mejoró la validación por campo
  en creación de usuarios. Después de una validación fallida, el foco se dirige
  al primer control inválido o al mensaje general. El costo base y el stock
  distinguen una entrada vacía de un cero explícito, conservando la admisión de
  cero cuando corresponde.
- **RNF-18:** Se incorporó un diálogo compartido con navegación de foco
  contenida, cierre mediante Escape cuando se permite y retorno al control de
  apertura. Los diálogos bloqueados no propagan Escape al menú del fondo.
  Se añadió un enlace para saltar al contenido principal y activación mediante
  Espacio de las tarjetas interactivas del dashboard. Se ajustaron contrastes de
  texto, estados, botones y errores en ambos temas; límites visuales de campos,
  foco visible, tamaños de controles y tratamiento del movimiento reducido.
  Se corrigió el nombre accesible del selector de citas de facturación y se
  flexibilizaron las columnas del dashboard para facilitar su adaptación.

Se añadió `@axe-core/playwright` como dependencia de desarrollo para realizar
comprobaciones automáticas. La referencia empleada fue la documentación oficial
de [WCAG 2.2](https://www.w3.org/TR/WCAG22/) y su explicación de
[contraste mínimo](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).

**Validación ejecutada:** Se aprobaron 88 pruebas de frontend en 19 archivos y
17 pruebas de navegador con API simulada. Las comprobaciones axe no reportaron
infracciones de las reglas seleccionadas en 30 estados de listados y formularios
de clientes, pacientes, citas, consultas, insumos, facturas y Administración,
repartidos entre modo claro y oscuro. Se comprobó además el login con errores
en ambos temas, la contención y restauración del foco, el primer error de
formulario, el aviso seguro ante HTTP 503, el salto de navegación y una vista
móvil con texto ampliado al 200 %.

Las ejecuciones iniciales detectaron contrastes insuficientes en estados de
citas, stock, importes y una leyenda de formulario sobre fondo translúcido,
además de un selector sin nombre accesible. Se corrigieron esas incidencias.
También se ajustaron selectores de pruebas para distinguir filtros y formularios
ahora etiquetados, y se esperó la carga de la interfaz antes de comprobar el
primer foco. La suite posterior finalizó correctamente. La compilación de
producción fue satisfactoria y se revisó el formato con `git diff --check`.

**Componentes afectados:** nuevos componentes `AccessibleForm`,
`AccessibleDialog` y `ErrorNotification`; `apiErrors.js`, el interceptor API,
`accessibility.css`, `App.jsx`, `main.jsx`, formularios de los módulos,
`ConfirmModal`, `UserCreateForm`, esquemas de costo y stock, pruebas unitarias,
`accesibilidad.spec.js`, configuración de Playwright y dependencias de desarrollo.
Los ajustes de color se extendieron a componentes que utilizaban esos tonos.

**Alcance y limitaciones:** La comprobación automática utiliza reglas
seleccionadas de WCAG A/AA y estados concretos de interfaz en Edge. No equivale
a una certificación completa de conformidad WCAG 2.2 AA ni a una evaluación de
todos los estados, navegadores, tecnologías de asistencia o usuarios con
discapacidad. La ampliación de texto se verificó en la vista de clientes y no
constituye una evaluación de reflujo de toda la aplicación. Se conservan los
avisos de compilación preexistentes de paquetes del frontend. No se modificó el
backend ni Supabase en esta intervención; sus pruebas no se volvieron a ejecutar.

## 13. Simplificación de la información auxiliar de formularios

**Fecha:** 09/11/2026.

**Requerimiento reformulado:** Suprimir la leyenda general sobre obligatoriedad de campos en los formularios de la aplicación, conservando sus indicadores y mecanismos de validación.

**Intervención y decisiones técnicas:** Se retiró el párrafo compartido de `frontend/src/components/AccessibleForm.jsx` y la regla de estilo asociada en `frontend/src/accessibility.css`. La modificación se aplica a todos los formularios que utilizan este componente. Se mantienen los asteriscos, los atributos de obligatoriedad, los mensajes de error y la gestión del foco.

**Validación:** Las tres pruebas de `AccessibleControls.test.jsx` finalizaron correctamente. La búsqueda en `frontend/src` no encontró referencias a la leyenda ni a su clase de estilo. No se realizó una nueva revisión visual ni se ejecutó la suite completa para este ajuste.

## 14. Uniformidad visual de la navegación administrativa

**Fecha:** 09/11/2026.

**Requerimiento reformulado:** Homogeneizar el contorno redondeado de las seis opciones de navegación del módulo de administración.

**Intervención y decisiones técnicas:** En `frontend/src/views/AdminConfigView.css` se incorporó el borde temático a la regla general `.admin-section` y se eliminó la restricción que lo aplicaba únicamente a las tres primeras opciones. Especialidades, roles y cuentas de usuario comparten ahora el mismo contorno; se conservan los estilos del estado activo y de los temas claro y oscuro. Se actualizaron ambos registros de desarrollo.

**Validación:** La compilación de producción del frontend finalizó correctamente. Persisten los avisos previos relativos a `fs` en face-api.js y al tamaño de los paquetes. No se realizó una comprobación visual en navegador para este ajuste de estilos.

## 15. Generación local de la migración inicial PostgreSQL

**Fecha:** 11/11/2026.

**Requerimiento reformulado:** Incorporar una migración reproducible del modelo actual sin ejecutar operaciones sobre Supabase.

**Intervención y decisiones técnicas:** Se generó `InicialPostgreSQL` con sus metadatos y snapshot en `VeterinariaAPI/Migrations`, y el script `database/migraciones/InicialPostgreSQL.sql`. Se añadió `.config/dotnet-tools.json` con dotnet-ef 8.0.11 y `VeterinariaAPI/Data/VeterinariodbContextFactory.cs`, que usa una conexión local inoperante sin credenciales y evita iniciar la API o leer configuración de producción. Se sustituyó el valor predeterminado de SQL Server de FechaEmision por CURRENT_DATE en el contexto. Se actualizó README y ambos registros.

**Validación:** Herramienta restaurada; generación de migración y compilación Release satisfactorias. SQL generado sin ejecución. La comprobación `has-pending-model-changes` confirmó ausencia de diferencias. El SQL incluye 14 tablas del modelo y la tabla de historial. La primera comprobación con --no-build usó un ensamblado anterior a la migración; tras recompilar, la generación SQL y la comprobación fueron satisfactorias. `git diff --check` sin errores.

**Limitaciones:** No se ejecutó database update, ni SQL, ni se inició la API. No se conectó a Supabase. No se comprobó la equivalencia con su esquema ni se probó la creación en un servidor PostgreSQL. Esta migración crea el esquema completo; no es una línea base vacía para una base existente y no debe aplicarse directamente a ella. No se ejecutó la suite de pruebas.

## 16. Coherencia del paciente en consultas vinculadas a citas

**Fecha:** 11/11/2026.

**Requerimiento reformulado:** Garantizar que la selección de una cita en el formulario de consulta determine de forma unívoca el paciente atendido.

**Intervención:** En ConsultasView.jsx se asigna automáticamente el paciente al seleccionar una cita, se deshabilita su selector y se limita su listado al paciente asignado. Al retirar la cita, se permite nuevamente elegir cualquier paciente. La regla se comparte entre creación y edición. El backend ya verifica esta relación en BusinessValidationFilter para POST y PUT, por lo que se conservó sin cambios. Se añadió ConsultaPaciente.test.jsx y se actualizaron ambas bitácoras.

**Validación:** Una prueba de interfaz aprobada para asignación de Thor, bloqueo, exclusión de Luna y recuperación de selección libre. Doce pruebas de BusinessValidationTests aprobadas con almacenamiento de pruebas en memoria, incluida la comprobación de discrepancia de paciente. Compilación frontend correcta con avisos preexistentes de face-api.js y tamaño de paquetes. La ejecución inicial de backend en entorno restringido no finalizó y fue interrumpida; la ejecución con permisos ampliados terminó correctamente. No se realizó revisión visual en navegador ni cambios en Supabase.

## 17. Búsqueda de pacientes y selección contextual de citas

**Fecha:** 11/11/2026.

**Requerimiento reformulado:** Facilitar la localización del paciente y restringir las citas disponibles a las de ese animal que no estén completadas.

**Intervención:** En frontend/src/views/ConsultasView.jsx se sustituyó el selector de paciente por búsqueda textual con resultados seleccionables mediante botones, conservando nombre, especie, dueño y RUT. La búsqueda ignora mayúsculas y tildes. Escribir invalida la selección anterior y retira la cita; seleccionar otro animal evita conservar una cita incompatible. El listado de citas filtra por paciente y excluye Completada. En edición se conserva una asociación histórica completada mediante una opción oculta que no se ofrece como alternativa nueva. Se actualizó ConsultaPaciente.test.jsx y ambos registros.

**Validación:** Prueba de interfaz aprobada para búsqueda por dueño, detalles de resultados, exclusión de citas ajenas y completadas, limpieza de asociación y ausencia de resultados. Compilación frontend correcta con avisos preexistentes. No se ejecutaron pruebas nuevas del backend ni inspección visual en navegador. No se modificó Supabase. El filtrado de estado es de interfaz; se mantiene la validación de pertenencia existente en el servidor.

## 18. Activación explícita de resultados de búsqueda de pacientes

**Fecha:** 11/11/2026.

**Requerimiento reformulado:** Evitar selecciones automáticas y listados generales al abrir o enfocar la búsqueda de pacientes en consultas.

**Intervención:** En frontend/src/views/ConsultasView.jsx se eliminó la preselección del primer paciente al crear una consulta y la apertura de resultados por foco. Los resultados requieren texto no vacío tras eliminar espacios exteriores. El paciente existente se conserva en edición y enfocar una selección no despliega el catálogo. Se amplió ConsultaPaciente.test.jsx y se actualizaron ambos registros.

**Validación:** Una prueba de interfaz aprobada con verificaciones de campo inicial vacío, foco y clic sin resultados, espacios en blanco, búsqueda filtrada, nueva interacción con selección previa y limpieza del texto. Se conservan comprobaciones de filtrado de citas. No se realizó revisión visual ni nueva compilación para este ajuste; no se modificaron backend ni Supabase.

## 19. Formularios de recetas vacíos y control de fechas de emisión

**Fecha:** 11/11/2026.

**Requerimiento reformulado:** Exigir ingreso explícito de los datos de nuevas recetas y restringir las fechas de emisión de recetas y facturas al día actual, manteniendo una vigencia no anterior a la emisión.

**Implementación y decisiones:** ConsultasView.jsx inicializa las nuevas recetas con fechas, insumo, dosis y duración vacíos; los datos existentes se conservan al editar. Se eliminaron también las preselecciones de insumo y duración cuando una receta no tiene detalle. dateValidation.js incorpora la fecha de America/Santiago y un esquema compartido de emisión del día actual, utilizado por consultaSchema.js y facturaSchema.js. Los controles de emisión tienen límites mínimo y máximo iguales a hoy; Válida hasta tiene mínimo igual a emisión. FacturasView.jsx utiliza la fecha chilena para sus valores iniciales. BusinessValidationFilter aplica la regla en POST y PUT de recetas y facturas y conserva la comparación de vigencia. No se modifican fechas de citas, filtros históricos ni otras fechas que no representan emisión.

**Componentes y pruebas:** Se actualizaron BusinessValidationTests.cs, AuditoriaTests.cs y businessSchemas.test.js para usar fechas actuales en escenarios válidos; se añadieron casos de creación y edición con ayer y mañana, conservación de valores ante rechazos, vigencia anterior y pruebas de límite UTC/Chile en EmissionDates.test.js. ConsultaPaciente.test.jsx comprueba todos los campos vacíos de una nueva receta y los atributos de fecha. Se actualizaron simultáneamente ambas bitácoras.

**Validación:** Suite frontend: 90 pruebas aprobadas antes de incorporar el último caso visual de formulario; después, las dos pruebas del archivo ConsultaPaciente.test.jsx aprobaron. Backend: 95 pruebas aprobadas con almacenamiento de pruebas, excluyendo conexión externa a Supabase y la prueba separada de concurrencia. Compilación frontend correcta con avisos preexistentes de face-api.js y paquetes grandes. No se ejecutaron pruebas de navegador en esta intervención.

**Alcance y límites:** La regla solicitada se aplica también al editar: una emisión histórica no permite guardar hasta cumplir la fecha actual; no se cambian registros existentes automáticamente. Se usa la fecha de Chile en ambas capas, aunque el navegador depende del reloj del dispositivo y el servidor valida con su propio reloj. No se modificó Supabase ni se aplicaron migraciones.

## 20. Ingreso explícito de datos para nuevos insumos

**Fecha:** 11/11/2026.

**Requerimiento reformulado:** Evitar valores predefinidos en el formulario de creación de insumos.

**Intervención:** En frontend/src/views/InsumosView.jsx se dejaron vacíos tipo, stock y precio en el estado inicial y al abrir una nueva alta; el nombre ya estaba vacío. Se incorporó una opción sin valor para solicitar la selección de categoría. La edición conserva los datos del registro. Se actualizaron AI_LOG.md y BITACORA.md.

**Validación:** Las cuatro pruebas existentes de RequiredNumbers.test.js aprobaron, incluida la exigencia de stock explícito y la aceptación de cero ingresado. No se realizó nueva compilación ni revisión visual para este ajuste. No se modificaron backend ni Supabase.

## 21. Búsqueda textual de clientes en facturación

**Fecha:** 11/11/2026.

**Requerimiento reformulado:** Homogeneizar la selección de clientes del formulario de facturación con la búsqueda interactiva utilizada en consultas médicas.

**Intervención:** En frontend/src/views/FacturasView.jsx se sustituyó el selector por un campo de búsqueda de nombre o RUT, con resultados seleccionables que muestran ambos datos. El formulario nuevo comienza sin cliente; no se muestran resultados con texto vacío, espacios o al enfocar una selección. La comparación de nombres ignora tildes y mayúsculas, y la de RUT omite puntos, guion y espacios. Escribir invalida el cliente anterior y la selección explícita asigna su identificador. Se conserva el cliente al editar y se sincroniza el texto cuando una cita asigna automáticamente su propietario. Se incorporó FacturaCliente.test.jsx y se actualizaron ambas bitácoras.

**Validación:** Una prueba de interfaz aprobada que cubre inicio vacío, foco sin catálogo, búsqueda por nombre sin tilde, RUT sin formato, selección y ausencia de coincidencias. Compilación frontend correcta con avisos preexistentes de face-api.js y tamaño de paquetes. No se realizó revisión visual ni nuevas pruebas de backend. No se modificó Supabase.

## 22. Citas de facturación restringidas al propietario seleccionado

**Fecha:** 11/11/2026.

**Requerimiento reformulado:** Limitar las citas disponibles para incorporar a una factura a las pertenecientes al cliente seleccionado, manteniendo disponibles las completadas.

**Intervención:** Se corrigió citasDisponibles en FacturasView.jsx: no devuelve citas sin cliente ni recurre al catálogo completo cuando no hay coincidencias. La pertenencia se comprueba mediante clienteId del paciente o id de su propietario anidado. Se limpia la selección de cita al escribir otro cliente; la incorporación solo busca entre citas disponibles y ya no reasigna el cliente automáticamente. Se ajustaron los mensajes de ausencia de cliente o citas. Se amplió FacturaCliente.test.jsx y se actualizaron ambos registros.

**Validación:** Una prueba de interfaz aprobada cubre citas propias, exclusión de ajenas, conservación de completadas, propietario anidado, cambio de cliente y cliente sin citas. No se realizó nueva compilación, inspección visual ni pruebas de backend para este ajuste. Sin cambios en Supabase.

## 23. Retroalimentación de datos incompletos al emitir facturas

**Fecha:** 11/11/2026.

**Requerimiento reformulado:** Proporcionar mensajes visibles y accesibles que identifiquen datos faltantes al intentar emitir una factura.

**Intervención:** En frontend/src/views/FacturasView.jsx se habilitó el intento de envío sin detalles para permitir mostrar explicaciones, manteniendo el bloqueo mediante validación antes de cualquier solicitud. Se evalúan conjuntamente campos y ausencia de conceptos, se presenta un aviso general, errores asociados a cliente y fecha, y una explicación de cómo agregar una cita o un insumo. Se conserva el foco automático en el primer campo inválido mediante AccessibleForm. Se amplió FacturaCliente.test.jsx y se actualizaron ambas bitácoras.

**Validación:** Dos pruebas del archivo FacturaCliente.test.jsx aprobaron. El nuevo caso comprueba mensajes simultáneos, descripciones accesibles, foco del cliente y ausencia de envío de la factura incompleta. Compilación frontend correcta con avisos preexistentes de face-api.js y tamaño de paquetes. No se realizó inspección visual ni nuevas pruebas de backend. No se modificó Supabase.

## 24. Adaptación del formulario de facturación al área visible

**Fecha:** 11/11/2026.

**Requerimiento reformulado:** Optimizar la distribución del formulario de facturación para utilizarse al 100 % de zoom, sin que sus acciones queden fuera de la pantalla.

**Intervención:** FacturasView.jsx organiza las tarjetas de selección y resumen en dos columnas para escritorio y una para pantallas menores. Se añadió FacturasView.css con ancho adaptable, altura limitada al viewport dinámico, encabezado y acciones fuera del área desplazable y un único cuerpo principal con desplazamiento interno cuando el contenido lo requiere. El diálogo se monta mediante portal en document.body y se sitúa sobre la navegación para evitar recortes por contenedores o capas de la aplicación. Se actualizó la indicación de ubicación de las secciones y ambas bitácoras.

**Validación:** Dos pruebas unitarias de FacturaCliente.test.jsx y compilación frontend correctas, con avisos preexistentes. Una prueba Playwright con datos simulados aprobó en 1366x768, 1920x1080 y 390x844: límites del diálogo dentro del viewport, ausencia de desbordamiento horizontal del cuerpo, controles de cierre y emisión visibles y botón alcanzable por puntero. En los dos tamaños de escritorio el formulario inicial no requirió desplazamiento vertical. Se inspeccionaron capturas de escritorio y móvil. La revisión inicial detectó interferencias de capas, corregidas mediante portal y verificadas en la ejecución final.

**Limitaciones:** En móvil, alturas reducidas o listados extensos se mantiene desplazamiento interno, con acciones siempre visibles. Se comprobó el estado inicial con datos simulados en Edge; no se verificaron todos los estados de factura ni otras plataformas. Backend y Supabase sin cambios.

## 25. Dockerización de frontend y API con entorno PostgreSQL aislado

**Fecha:** 11/11/2026.

**Requerimiento reformulado:** Proporcionar una ejecución reproducible del sistema mediante Docker Compose, con configuración privada externa y comprobación funcional sin intervenir la base Supabase.

**Intervención y decisiones técnicas:** Se añadieron Dockerfiles multietapa para ASP.NET Core 8 y React/Vite; el frontend compilado se sirve con Nginx, que reenvía /api al servicio interno api y resuelve rutas de React. Las imágenes finales utilizan usuarios sin privilegios. Los .dockerignore de ambos componentes excluyen configuraciones privadas, dependencias y artefactos locales. compose.yaml define API y frontend con variables obligatorias, publicación solo en loopback y comprobaciones de salud; compose.sandbox.yaml incorpora PostgreSQL 16 local y fuerza la conexión a ese servicio. El esquema inicial se carga desde el SQL versionado únicamente al crear un volumen vacío. Se añadieron /health/live y /health/ready, este último limitado a comprobar conectividad de persistencia, sin exponer detalles de configuración.

**Configuración y componentes:** Se incorporaron .env.docker.example, scripts/Start-DockerSandbox.ps1 y la excepción correspondiente de .gitignore. El script crea .env.sandbox con claves locales aleatorias, conserva sus valores al repetir la ejecución y arranca el proyecto vetclinic-sandbox. El archivo privado está excluido de Git y no utiliza las credenciales de Supabase. Se añadieron ContainerHealthTests.cs, frontend/e2e/docker.smoke.spec.js, playwright.docker.config.js y el comando test:docker:e2e. README.md y ambas bitácoras documentan instalación, ejecución, detención, persistencia y alcance. La configuración local de Vite no se modificó: el proxy de los contenedores corresponde a Nginx.

**Validación:** Docker Compose validó la configuración sin imprimir secretos. Las dos imágenes se construyeron correctamente en el motor Linux de Docker Desktop; persistieron avisos previos de compilación de frontend y un método async sin await del backend. Los tres contenedores alcanzaron estado saludable. Se ejecutó el SQL inicial en PostgreSQL local y se verificaron autenticación, lectura y dashboard, creación y edición de un cliente temporal y su posterior eliminación. La comprobación inicial de un manifiesto facial utilizó un nombre no incluido; se corrigió al manifiesto SSD MobileNet presente y su descarga se verificó en la prueba final. Una prueba Playwright aprobó contra frontend, API y PostgreSQL reales: disponibilidad, rechazo 401 sin sesión, manifiesto facial, login y conservación de sesión al recargar una ruta. La suite backend aprobó 97 pruebas, excluyendo Test_Supabase_Connection y ConcurrentPatientsTests. Se comprobó configuración Nginx válida, usuarios no root y ausencia de archivos privados appsettings/.env en sus ubicaciones de ejecución. Al detener PostgreSQL local, readiness devolvió 503; tras iniciarlo volvió a 200. La segunda ejecución del script conservó las claves y el volumen, y dejó los servicios saludables.

**Resultado y límites:** Entorno de demostración activo en localhost:15173, con una base independiente de Supabase. No se aplicaron migraciones ni se ejecutaron operaciones sobre Supabase. La verificación del SQL inicial permite acreditar creación y operaciones básicas en PostgreSQL, pero no la equivalencia con el esquema remoto, todos los módulos ni migraciones posteriores mediante EF CLI. No se implementaron publicación pública, TLS, pipeline o prueba facial completa contra PostgreSQL. La modalidad conectada a Supabase requiere completar un archivo privado; conserva el sembrado y la reconciliación de roles existentes, que pueden escribir al arrancar. No se realizaron commits ni publicación de imágenes.

## 26. Conservación de la consulta médica en los detalles de facturación

**Fecha:** 11/11/2026.

**Requerimiento reformulado:** Asegurar la persistencia de la referencia a la consulta clínica cuando se incorpora una atención a una factura, evitando omisiones de selección y líneas clínicas sin vínculo.

**Diagnóstico e intervención:** FacturasView.jsx consultaba una colección Cita.Consulta que el modelo excluye del JSON, en lugar del catálogo de consultas cargado. Se cambió la resolución a Consulta.CitaId y se envía su identificador real. Se detectó además que seleccionar una cita sin incorporarla podía emitir solo los insumos ya agregados: ahora se bloquea la emisión ante selecciones pendientes y se explica el paso requerido. Las citas sin consulta registrada se identifican en el selector y no pueden agregarse como atención. BusinessValidationFilter resuelve y normaliza ConsultaId desde CitaId antes de persistir, tanto en POST como en PUT, y rechaza líneas clínicas sin consulta. Se mantiene la validación de pertenencia y se conservan líneas independientes: ConsultaId para atención e InsumoId para producto, sin asignar artificialmente ambos campos.

**Componentes y pruebas:** Se modificaron FacturasView.jsx, FacturaCliente.test.jsx, BusinessValidationFilter.cs y BusinessValidationTests.cs; dos escenarios antiguos de ApiIntegrationTests.cs incorporan consultas reales en su preparación para respetar la regla. Se actualizaron README y ambas bitácoras. No se cambió el esquema de base de datos.

**Validación:** Suite frontend completa: 95 pruebas aprobadas; cuatro casos del formulario de facturación aprobaron, incluidos factura mixta, envío del identificador de consulta, selección pendiente y cita sin consulta. Suite backend: 99 aprobadas, excluyendo conexión externa a Supabase y concurrencia separada. La ejecución inicial detectó dos escenarios heredados que facturaban atenciones sin consulta; se adaptó su preparación manteniendo sus comprobaciones de IVA y stock. Compilación frontend y reconstrucción del sandbox Docker correctas, con avisos preexistentes. En PostgreSQL local se verificaron rechazo de cita sin consulta, creación de factura mixta, ConsultaId correcto al crear y editar y referencia nula de consulta solo en la línea de insumo. La primera preparación HTTP local recibió 400 por identificadores enviados como colecciones; la repetición con identificadores escalares completó la comprobación. Los registros temporales se retiraron al terminar.

**Límites:** La captura de una línea con InsumoId no demuestra por sí sola un error: ConsultaId nulo es correcto para esa línea. No se modificaron facturas previas ni Supabase; no se inventaron consultas para citas sin atención registrada. El servidor fuera de Docker debe recargarse para utilizar el nuevo código. El sandbox local quedó actualizado.

## 27. Bloqueo de envíos repetidos durante operaciones de ingreso

**Fecha:** 11/11/2026.

**Requerimiento reformulado:** Evitar solicitudes repetidas de registro o actualización originadas por activaciones consecutivas de los controles de envío mientras una operación está pendiente.

**Intervención y decisiones técnicas:** Se incorporó useAsyncActionLock.js con bloqueo inmediato mediante referencia, estado visual y liberación en finally, evitando actualizaciones de estado tras desmontaje. AccessibleForm ejecuta su manejador bajo ese bloqueo y expone aria-busy; SubmitButton conserva los motivos previos de deshabilitación, se bloquea durante la operación y muestra Procesando. Se sustituyeron los trece botones de envío de los diez componentes de formularios: login, clientes, pacientes, citas, consultas, recetas, insumos, facturación y sus detalles, especialidades, roles, cuentas y preparación de PDF. ConfirmModal reutiliza el bloqueo para registro facial, datos de prueba y otras confirmaciones; también bloquea la cancelación durante su acción. Se conservan validaciones, datos y manejo de foco existentes.

**Archivos y componentes:** Nuevo frontend/src/hooks/useAsyncActionLock.js, AccessibleForm.jsx, ConfirmModal.jsx, UserCreateForm.jsx y nueve vistas que utilizan formularios compartidos. Se añadió SubmissionLock.test.jsx, se amplió e2e/accesibilidad.spec.js y se adaptó FacturaCliente.test.jsx para esperar la finalización de la validación antes del reintento. Se actualizaron README.md y ambas bitácoras.

**Validación:** Suite frontend completa: 98 pruebas aprobadas. Los casos nuevos comprueban envíos directos simultáneos del formulario, botón deshabilitado, preservación de restricciones previas, recuperación tras rechazo y bloqueo de confirmación/cancelación. La primera ejecución de un caso existente requirió esperar la liberación asíncrona antes de intentar otro envío. Suite de navegador: 19 pruebas aprobadas, incluida una solicitud demorada que recibe varios eventos de envío y solo genera un POST, seguida de error y reintento satisfactorio; también aprobaron los controles seleccionados de accesibilidad existentes. La preparación inicial de ese caso utilizó un nombre de diálogo distinto del real y se corrigió antes de la ejecución final. Compilación frontend e imagen Docker reconstruidas correctamente, con avisos preexistentes. No se ejecutaron pruebas nuevas del backend porque no se modificó su código en esta intervención.

**Resultado y limitaciones:** El bloqueo protege cada instancia de formulario o confirmación mientras su promesa está pendiente; no implementa idempotencia de servidor entre sesiones, pestañas o clientes diferentes. No se modificó Supabase ni se repararon duplicados históricos. Al comprobar Docker se encontraron API y PostgreSQL detenidos; el frontend actualizado se detuvo también para no dejarlo reiniciándose sin dependencias. La imagen queda preparada para el próximo arranque del sandbox. No se realizaron commits ni push.

## 28. Restricción de notación y símbolos en campos numéricos

**Fecha:** 11/11/2026.

**Requerimiento reformulado:** Restringir la entrada de magnitudes numéricas a su notación decimal ordinaria, excluyendo letras, exponentes, signos y expresiones matemáticas, sin impedir los decimales válidos de cada campo.

**Intervención y decisiones técnicas:** Se incorporó NumericInput.jsx y se aplicó a diecisiete controles de seis vistas: pacientes, administración, insumos, consultas, facturas y auditoría, incluidos filtros y controles calculados. El componente mantiene el tipo number, límites, navegación y atajos; bloquea caracteres no permitidos al escribir y rechaza texto completo inválido al pegar o arrastrar, sin convertir una expresión en otro número. Stock, cantidades, duración y cantidad de registros solo admiten enteros; peso, precios, costos e importes admiten punto decimal según la configuración. Se añadió numberValidation.js y se integró en los esquemas de pacientes, insumos, especialidades, recetas y facturación, evitando que la coerción de JavaScript acepte cadenas como 1e3 o valores no numéricos. La modificación de cantidades de factura verifica además que el valor sea entero. Se conservaron las validaciones de rango existentes y los formatos específicos de teléfono y RUT.

**Componentes y pruebas:** Nuevos NumericInput.jsx, numberValidation.js y NumericInput.test.jsx; cambios en seis vistas y cinco esquemas, ampliación de e2e/accesibilidad.spec.js y actualización de README.md y ambas bitácoras.

**Validación:** La suite frontend registró 101 pruebas aprobadas. Tras el ajuste final de edición decimal se aprobaron las siete pruebas focalizadas de entrada numérica y obligatoriedad. Veinte pruebas de navegador aprobaron, incluida escritura de e/E, signos, decimales, borrado, rechazo de un pegado científico y preservación de filtros numéricos. Se corrigió el selector accesible del nuevo caso de navegador. La primera comprobación detectó que rechazar badInput interfería con el punto decimal transitorio; se retiró ese rechazo manteniendo las barreras de caracteres y notación, y se verificó que escribir 12.50 conserva 12.5. Compilación frontend y reconstrucción de imagen Docker correctas, con avisos preexistentes. Las comprobaciones automáticas de accesibilidad seleccionadas de ambos temas no detectaron incidencias.

**Alcance y límites:** Se validó la entrada en Edge y los esquemas del frontend; no se implementó una restricción léxica del JSON numérico en el backend, cuyas validaciones de tipos y rangos se mantienen. No se ejecutaron nuevas pruebas de backend ni operaciones en Supabase. Los contenedores previamente detenidos no se iniciaron; la imagen actualizada queda disponible para el próximo arranque. No se realizaron commits o push.

## 29. Exclusión de credenciales incrustadas en la prueba de conexión externa

**Fecha:** 11/11/2026.

**Requerimiento reformulado:** Preparar la publicación del avance evitando incorporar una conexión sensible incrustada en un archivo de pruebas modificado.

**Intervención:** La revisión automática rechazó inicialmente el push por el riesgo de credenciales en ApiIntegrationTests.cs. Se retiraron de Test_Supabase_Connection la URI y la selección de host y usuario incrustados. La prueba utiliza ahora exclusivamente VETCLINIC_TEST_POSTGRES_CONNECTION y una consulta SELECT 1. ExternalDatabaseFactAttribute omite su ejecución cuando esa variable no está configurada, evitando conexiones externas implícitas. Se actualizaron ambas bitácoras y la documentación de pruebas. La corrección se incorpora al commit local aún no publicado.

**Validación:** Suite backend con concurrencia separada excluida: 99 aprobadas y una prueba externa omitida, sin conexiones a Supabase. La comprobación de patrones de conexión con credenciales literales en el archivo resultó negativa. La revisión de espacios no detectó errores. La eliminación de la conexión del estado actual no retira valores presentes en commits históricos ni constituye rotación de credenciales.


## 30. Panel analítico de gestión clínica con agregación y actualización periódica

**Fecha:** 11/11/2026.

**Requerimiento reformulado:** Incorporar en la pantalla principal un tablero de gestión con cuatro visualizaciones pertinentes al negocio, filtros interactivos y actualización de información mediante un servicio autenticado de agregación.

**Intervención y decisiones técnicas:** Se implementó GET /api/v1/dashboard/analitica para los tres roles autorizados. El servicio agrega facturas por fecha, citas por fecha y estado, citas por especialidad y existencias de insumos, utilizando consultas sin seguimiento, proyecciones y vistas previas acotadas. El intervalo admite hasta 366 días y agrupación diaria, semanal o mensual. Las fechas corresponden al contexto horario de Chile. Los filtros de agenda no alteran la facturación; el inventario refleja existencias actuales. Se conservaron el endpoint anterior y sus contratos. La interfaz incorpora línea de facturación, barras apiladas de citas, anillo de especialidades, barras horizontales de inventario, indicadores, próximas citas y tablas alternativas. Se sustituyó la presentación anterior del dashboard y se aplicó la paleta y los temas existentes con distribución responsiva. La actualización se produce al abrir la vista, modificar filtros, recuperar visibilidad y cada 30 segundos mientras está visible; el cliente API emite notificaciones tras escrituras exitosas. Se cancelan solicitudes obsoletas y se informa de errores conservando la última lectura.

**Componentes afectados:** Dashboard.cs, nuevo DashboardAnalytics.cs, DashboardView.jsx, DashboardView.css, DashboardCharts.jsx, services/api.js, pruebas DashboardAnalyticsTests.cs y DashboardQueries.test.jsx, fixture de interfaz, pruebas de navegador, README.md y ambas bitácoras.

**Validación:** 110 pruebas backend aprobadas y una prueba externa omitida, con concurrencia separada excluida. Suite frontend final: 104 aprobadas, incluidos cinco casos focalizados del dashboard y la prueba de temporización. Compilación de producción correcta, con advertencias existentes de face-api.js y tamaño de paquetes. La suite final de navegador registró 21 casos aprobados. El caso nuevo del dashboard aprobó tras corregir un selector de la prueba y desactivar transiciones durante la medición del tema: cuatro gráficos, cambio de filtro, notificación de actualización, resoluciones de 1440 y 390 píxeles y temas claro/oscuro, sin desbordamiento ni incidencias en las reglas automáticas de accesibilidad seleccionadas. Se inspeccionaron capturas de escritorio oscuro y móvil claro.

**Alcance y limitaciones:** Las pruebas backend usan almacenamiento aislado en memoria; no se verificó esta intervención contra PostgreSQL real porque Docker estaba detenido. No se modificó Supabase ni el esquema de datos. El refresco es periódico, no transmisión en tiempo real. Los totales representan facturación emitida, no recaudación ni utilidad. Las comprobaciones automáticas no equivalen a certificación de accesibilidad. No se efectuaron commits ni push.

## 31. Restricción del tablero analítico al ámbito administrativo

**Fecha:** 11/11/2026.

**Requerimiento reformulado:** Reubicar las visualizaciones de gestión en Administración y asegurar que únicamente el rol Administrador pueda visualizar y consultar sus datos.

**Intervención y decisiones técnicas:** Se incorporó la pestaña Dashboard de gestión en AdminConfigView, dentro de la ruta administrativa previamente protegida. La ruta inicial conserva su dirección y presenta HomeView, con accesos a agenda y pacientes y un acceso administrativo condicionado al rol. El menú identifica esa pantalla como Inicio. Los endpoints de resumen y analítica del dashboard exigen ahora exclusivamente el rol Administrador, evitando el acceso directo a los datos desde otros roles. Se conservan los gráficos, filtros, estilos y actualización automática del tablero; al abandonar su pestaña se desmonta el componente y se limpian sus consultas y temporizador.

**Componentes afectados:** App.jsx, AdminConfigView.jsx, nuevo HomeView.jsx, Dashboard.cs, DashboardAnalytics.cs, DashboardAnalyticsTests.cs, QueryOptimizationTests.cs, pruebas de navegador, README.md y ambas bitácoras.

**Validación:** 111 pruebas backend aprobadas y una externa omitida, excluyendo concurrencia separada. Se verificaron respuestas 200 para Administrador, 403 para Veterinario y Recepcionista y 401 sin autenticación en ambos endpoints. Suite frontend: 104 aprobadas. Compilación correcta con advertencias preexistentes. El caso visual del tablero dentro de Administración aprobó en escritorio y móvil, temas claro y oscuro, sin desbordamiento ni incidencias en las reglas automáticas de accesibilidad seleccionadas. La prueba administrativa verifica que Inicio no consulta indicadores y que los roles no administrativos no acceden al tablero.

**Alcance:** Sin cambios del esquema ni operaciones en Supabase. Las pruebas backend utilizan almacenamiento aislado en memoria. No se realizaron commits ni push.

**Resultado de navegador:** Veinte casos aprobaron en la ejecución completa. Un caso de login detectó ambigüedad en su selector por los dos accesos administrativos; se precisó el nombre accesible del enlace lateral y la repetición focalizada aprobó. Los 21 casos quedaron comprobados entre ambas ejecuciones, incluidos los bloqueos para roles no administrativos.

## 32. Restitución del santuario canino interactivo

**Fecha:** 11/11/2026.

**Requerimiento reformulado:** Restituir el compañero canino tridimensional en la pantalla inicial y recuperar la identificación del santuario en la navegación, conservando el tablero de gestión exclusivamente en Administración.

**Intervención:** HomeView integra nuevamente el componente existente VeterinaryPet3D en una presentación responsiva de dos columnas con la paleta de la aplicación. Se mantienen las interacciones originales del perro y los accesos de inicio; el menú lateral se denomina Santuario. No se restablecen indicadores administrativos en la pantalla inicial. Componentes afectados: HomeView.jsx, App.jsx, registro-facial.spec.js y ambas bitácoras.

**Validación:** Compilación de producción correcta, con avisos existentes de face-api.js y tamaño del paquete, incrementado al reincorporar Three.js. Tres pruebas focalizadas de navegador aprobaron: lienzo 3D visible, interacción Acariciar y cambio del estado de ánimo, acceso al santuario para los tres roles, ausencia de consultas administrativas desde Inicio y bloqueo de Administración para Veterinario y Recepcionista. Se corrigió el selector de prueba del lienzo porque el modelo decorativo está excluido del árbol accesible. Se conserva el aviso previo de obsolescencia THREE.Clock. No se ejecutaron pruebas backend ni se modificó Supabase; sin commits ni push.

## 33. Rediseño de la bienvenida y accesos del santuario

**Fecha:** 11/11/2026.

**Requerimiento reformulado:** Mejorar la jerarquía visual y distribución de la pantalla de bienvenida, reduciendo espacios vacíos y facilitando el acceso a los módulos mediante una composición coherente con los temas del proyecto.

**Intervención:** HomeView.jsx organiza la bienvenida y el compañero 3D en paneles independientes. La sección inicial incorpora saludo, título, texto breve y tarjetas de navegación con iconos, descripción y señal de enlace. El acceso administrativo conserva su condición por rol. HomeView.css centraliza el estilo, colores mediante variables de tema, distribución de dos columnas en escritorio y una en pantallas menores, foco heredado y reducción de movimiento en las transiciones. El perro y sus controles existentes se conservan. Se amplió accesibilidad.spec.js y se actualizaron ambas bitácoras.

**Validación y límites:** Compilación correcta con advertencias existentes de face-api.js y tamaño del paquete. Cuatro pruebas focalizadas de navegador aprobadas: temas claro/oscuro a 1440 y 390 píxeles, tres accesos para Administrador, lienzo 3D visible, navegación hacia citas, ausencia de desbordamiento horizontal y de incidencias en las reglas automáticas seleccionadas para el panel de bienvenida. También se verificaron la interacción Acariciar y las restricciones administrativas de otros roles. Se inspeccionó la captura de escritorio oscuro. Persisten avisos previos de THREE.Clock. Sin cambios de backend, Supabase, commits ni push; no se ejecutó una auditoría integral de accesibilidad.

## 34. Refuerzo transversal de accesibilidad y evidencia verificable

**Fecha:** 11/11/2026.

**Requerimiento reformulado:** Fortalecer la accesibilidad de la interfaz mediante semántica coherente, navegación por teclado, gestión del foco, alternativas textuales, contraste y preferencias de movimiento, acompañando la implementación de una auditoría reproducible y distinguiendo la aceptación manual pendiente.

**Intervención y decisiones técnicas:** Se normalizaron encabezados de módulos, subsecciones y formularios, se retiró una región main anidada y se explicitaron encabezados de columna. PageAccessibility actualiza el título de cada ruta y dirige el foco al contenido tras navegar. AccessibleDialog aísla el fondo mediante inert, conserva el estado previo, bloquea el desplazamiento exterior, filtra controles ocultos y mantiene Escape y retorno del foco. El menú móvil gestiona foco inicial, recorrido y cierre con Escape. Exportación de auditoría gestiona entrada, salida y retorno del foco; la ayuda y el error de cantidad del PDF se asocian al campo. Los buscadores pueden descartar sugerencias desde su campo sin cerrar el diálogo. Se corrigieron contrastes del enlace activo, botón superior, marcas y límites de controles, y nombres accesibles inconsistentes con el texto visible. Se conservaron las etiquetas, errores textuales anunciados y el enlace de salto existentes.

**Gráficos y movimiento:** Las secciones del dashboard enlazan título y descripción; las visualizaciones incluyen resúmenes y tablas con caption, encabezados y desplazamiento accesible, también ante datos vacíos. Los estados incorporan tramas y las especialidades números y porcentajes además de color. useReducedMotion responde a cambios de preferencia y detiene las animaciones continuas de partículas y perro; se añadió pausa explícita del compañero y anuncio de su estado. Se mantienen sus controles operativos sin animación.

**Componentes afectados:** App.jsx, PageAccessibility.jsx, AccessibleDialog.jsx, DashboardCharts.jsx, UserCreateForm.jsx, AuraParticleBackground.jsx, VeterinaryPet3D.jsx, useReducedMotion.js, vistas de módulos y sus estilos afectados, accessibility.css, pruebas de navegador y selector de FlowIntegration.test.jsx, README.md, docs/ACCESIBILIDAD.md, evidencia JSON y ambas bitácoras.

**Validación:** 104 pruebas frontend y 25 pruebas de navegador aprobadas; compilación correcta con advertencias previas. Una auditoría axe con todas sus reglas en 28 escenarios completos de ambos temas registró cero incidencias, incluidas críticas. Se conservaron los controles automatizados de formularios y login. El recorrido automatizado de registro por teclado verificó salto, validación, asociación de errores, Escape, retorno del foco, ingreso y persistencia simulada. Se probaron menú móvil, preferencia de movimiento y ampliación CSS al 200 % en ocho rutas. Tras ajustes finales aprobaron cuatro comprobaciones focalizadas, una de exportación con Escape y la nueva auditoría. Durante el desarrollo se corrigieron respuestas simuladas incompletas y selectores de pruebas, además de incidencias reales de contraste, nombres accesibles, regiones y encabezados.

**Límites y pendientes:** No se ejecutó una prueba humana con teclado y NVDA o VoiceOver ni una revisión manual del zoom nativo. No se encontró NVDA en las ubicaciones habituales examinadas; no se instaló software. Se documentó la pauta y se mantiene pendiente la aceptación completa del requerimiento. La ampliación CSS y el recorrido automatizado no se presentan como sustitutos de esas pruebas. El informe no constituye certificación WCAG ni medición exhaustiva del contraste no textual. No se modificó el backend ni Supabase; no se ejecutaron sus pruebas en esta intervención. Sin commits ni push.

## 35. Sustitución de alertas nativas por diálogos de conflicto del proyecto

**Fecha:** 11/11/2026.

**Requerimiento reformulado:** Uniformar la presentación de conflictos y confirmaciones destructivas mediante componentes visuales propios, conservando los motivos de rechazo y la interacción accesible.

**Intervención:** Se creó ConflictDialog y su hoja de estilos, con cola de mensajes, iconografía, colores de tema, título y descripción asociados y controles Entendido y cierre. notifyConflict publica los avisos desde los ocho puntos que utilizaban alert en clientes, pacientes, citas, consultas, insumos, facturas y administración. El componente se integra una sola vez al final de App. Se sustituyó window.confirm en la eliminación de recetas por ConfirmModal, con cancelación sin solicitud y bloqueo de envíos repetidos. ConfirmModal utiliza identificadores únicos y encabezado de nivel dos. AccessibleDialog incorpora retorno al diálogo subyacente cuando el control previamente activo desaparece o está deshabilitado. Los avisos conservan el mensaje normalizado de la API; el fallo al eliminar una línea de factura deja de ocultar su motivo tras un texto genérico.

**Componentes afectados:** ConflictDialog.jsx y ConflictDialog.css, App.jsx, notifications.js, AccessibleDialog.jsx, ConfirmModal.jsx, siete vistas de módulos, accesibilidad.spec.js, README.md, docs/ACCESIBILIDAD.md y ambas bitácoras.

**Validación:** 104 pruebas frontend aprobadas y compilación de producción correcta con advertencias existentes. Las pruebas nuevas verifican respuesta 409 al eliminar un cliente relacionado, mensaje de negocio, contraste en ambos temas, ausencia de ventanas nativas, Escape y retorno del foco. Se verifican cancelación de eliminación de receta sin solicitud y confirmación con una única eliminación. La búsqueda en frontend/src no encontró llamadas a alert ni window.confirm o window.prompt. En una ejecución inicial se detectó pérdida de foco al abrir el aviso desde un botón deshabilitado; se añadió el retorno alternativo y se corrigió el selector de la prueba para el botón Volver existente.

**Registro comunicado y límites:** El usuario informó que superó las pruebas manuales de teclado explicadas en el chat; se incorporó esa comunicación al documento sin atribuirla al asistente ni inferir una revisión con lector de pantalla. Sin modificaciones de backend, base de datos, commits ni push; las solicitudes de navegador utilizan respuestas simuladas.

**Cierre de verificación:** Suite completa de navegador: 27 pruebas aprobadas, incluidos los dos nuevos casos y la auditoría general sin incidencias en sus 28 escenarios.

## 36. Disponibilidad de seis indicadores de negocio en el dashboard

**Fecha:** 11/11/2026.

**Requerimiento reformulado:** Facilitar la consulta directa de seis indicadores de gestión, incluyendo los cálculos faltantes y sus definiciones, preguntas de negocio y resultados en la interfaz administrativa.

**Intervención:** DashboardAnalytics.cs calcula promedioPorFactura con dos decimales, porcentajeInsumosAgotados con un decimal y participación por especialidad sobre las citas filtradas, reutilizando agregados existentes sin consultas adicionales. Los promedios y porcentajes con denominador vacío se devuelven como null, incluida la tasa de cancelación. DashboardView muestra el promedio y la proporción de agotados en nuevas tarjetas, mantiene los indicadores y gráficos anteriores y reorganiza las tarjetas en tres columnas con adaptación responsiva. DashboardIndicatorGuide incorpora un desplegable con seis preguntas, fórmulas y resultados. El promedio conserva hasta dos decimales al presentar CLP. Se explicita que inventario es actual y que su denominador corresponde a la categoría completa, no a las doce barras ni al filtro de existencias. El tablero conserva el acceso exclusivo de Administrador.

**Componentes afectados:** DashboardAnalytics.cs, DashboardAnalyticsTests.cs, DashboardView.jsx y CSS, DashboardCharts.jsx, nuevo DashboardIndicatorGuide.jsx, fixtures y pruebas frontend y de navegador, README y ambas bitácoras.

**Validación:** 112 pruebas backend aprobadas y una externa omitida, excluyendo concurrencia separada; se comprobaron promedio, porcentajes, filtros, participación y casos sin denominador. Suite frontend: 105 aprobadas, tras precisar selectores que encontraban el mismo indicador en la tarjeta y en la tabla. Compilación correcta con avisos existentes de face-api.js y tamaño del paquete. Dos pruebas focalizadas de navegador aprobadas, incluida la auditoría de 28 escenarios completos en ambos temas, las seis filas de la guía, valores calculados, presentación móvil y ausencia de desbordamiento. Se inspeccionó la captura de escritorio oscuro.

**Alcance:** Sin migraciones ni cambios de Supabase. Las pruebas backend utilizan almacenamiento aislado en memoria y las de navegador datos simulados; no se probaron los nuevos campos contra PostgreSQL real. Los porcentajes se redondean a un decimal. Sin commits ni push.

## 37. Recuperación de indicadores derivados ante respuestas parciales

**Fecha:** 11/11/2026.

**Requerimiento reformulado:** Corregir la presentación de indicadores no calculables cuando existen agregados suficientes de facturación e inventario en el período consultado.

**Intervención:** Se incorporó dashboardData.js como normalizador de la respuesta analítica antes de actualizar el estado de DashboardView. Si los campos derivados no llegan o son nulos pero existen agregados válidos, calcula promedio, proporción de agotados, cancelaciones y participación por especialidad a partir de la misma respuesta. Conserva valores numéricos válidos y distingue numerador cero de denominador vacío. No usa listas de vistas previas ni realiza consultas adicionales. Se aplica a tarjetas y guía de fórmulas. La captura es compatible con una respuesta que no incluye los nuevos campos, pero no se inspeccionó directamente la respuesta de la instancia del usuario para confirmar su versión.

**Componentes y validación:** dashboardData.js, DashboardView.jsx, DashboardQueries.test.jsx, accesibilidad.spec.js, README y ambas bitácoras. Suite frontend: 106 aprobadas; compilación correcta con advertencias preexistentes. Una prueba de navegador reproduce 111265 facturados en tres facturas y cero agotados entre nueve insumos: presenta $37.088,33 y 0 %, y verifica la participación en la guía. El caso sin denominador existente continúa aprobado. Se comprobó la selección de 30 días con respuesta simulada.

**Límites:** Pruebas de navegador con datos interceptados. No se conectó a la base de datos ni se reinició el backend del usuario. Sin cambios de backend, Supabase, commits o push.

## 38. Revisión técnica y refuerzo de cumplimiento de la evaluación

**Fecha:** 12/11/2026.

**Requerimiento reformulado:** Contrastar la implementación de VetClinic con los criterios técnicos de Evaluacion3_LPWII, corregir brechas verificables y comprobar el comportamiento mediante pruebas automatizadas y un entorno PostgreSQL aislado, sin elaborar entregables académicos ni intervenir la base de datos en la nube.

**Intervención asistida y decisiones técnicas:** Se incorporaron tres reportes administrativos —agenda operativa, resumen gerencial e historial por período— con filtros, páginas, formatos CSV UTF-8, XLSX tipado con totales y gráfico gerencial, PDF con texto seleccionable y páginas numeradas, preparación de impresión y auditoría de exportaciones. ReportService separa las consultas; IReportFormat implementa Strategy y complementa Repository y la inyección de dependencias existentes. Se añadió un servicio HTTP de IA configurable que transmite exclusivamente agregados financieros, valida entradas y respuestas, limita tamaño y tiempo de espera y evita exponer errores del proveedor. Su funcionamiento externo no se presume: se probaron respuestas simuladas, ausencia de configuración y timeout.

Se definió una máquina de estados para citas en frontend y backend, se añadieron restricciones e índices mediante RefuerzoIntegridad y disparadores mediante FlujoCitasSql, y se armonizaron errores relacionales con respuestas HTTP seguras. Se eliminó la aceptación de contraseñas importadas en texto plano; estas cuentas requieren restablecer su contraseña si no disponen de hash válido. Los datos y cuentas de demostración quedaron condicionados al entorno de desarrollo, pruebas o habilitación explícita; se añadió inicialización administrativa configurable para producción. Se sustituyeron identificadores personales de la nueva carga inicial por datos sintéticos y se corrigieron los montos e IVA de sus facturas para que correspondan a sus detalles, sin reescribir registros existentes.

Se implementó una carga histórica explícita e idempotente de 500 pacientes, citas, consultas y facturas, distribuida en doce meses y vinculada con clientes sintéticos. Se añadieron orden y paginación visual a los listados principales, página 404 y la pestaña administrativa Reportes. Se amplió Compose con PostgreSQL local opcional, redes y volumen; se fijaron las imágenes por digest y se agregó .env.example sin secretos. Se configuró CI para compilación, pruebas, contenedores y publicación de imágenes condicionada al éxito. Se añadieron scripts de validación local y respaldo/restauración. Los cambios previos de interfaz, accesibilidad, dashboard, README y otros documentos presentes al iniciar la revisión se conservaron; esta intervención no elaboró informes o presentaciones.

**Componentes afectados:** Program.cs; endpoints Reportes, Insights, Auditoria y DatosPrueba; servicios ReportService, ReportFormats, XlsxChartParts, InsightsService, HistoricalSeederService, AppointmentStates, AuthService y SwaggerAuthorizationFilter; BusinessValidationFilter; GlobalExceptionMiddleware; modelo de integridad, dos migraciones y snapshot; ReportesView, HistoricalSeedPanel, TablePagination, vistas de listados, navegación y configuración de pruebas; Dockerfiles, Compose, .env.example, flujo CI, scripts técnicos y pruebas ReviewComplianceTests, BusinessValidationTests, QueryOptimizationTests y navegador. Se actualizan AI_LOG y BITACORA dentro de la misma intervención.

**Validación ejecutada:** Backend Release: 135 aprobadas y una integración externa omitida por falta de VETCLINIC_TEST_POSTGRES_CONNECTION; incluye el escenario de veinte usuarios concurrentes sobre InMemory, que no constituye una prueba de carga de PostgreSQL o producción. Frontend: 106 pruebas aprobadas y compilación correcta, con advertencias de tamaño de paquetes y compatibilidad de face-api.js. Navegador: 28 escenarios generales aprobados y el nuevo escenario de reportes aprobado tras corregir su selector de prueba; se comprobaron filtros, páginas, descarga, error de IA, adaptación a 360/1440 y axe en ambos temas. Una prueba adicional conectada a Docker comprobó inicio de sesión, restauración de sesión, tres reportes y descarga PDF. Las comprobaciones axe seleccionadas no detectaron incidencias; esto no equivale a certificar WCAG íntegramente. npm audit de dependencias de producción: cero vulnerabilidades conocidas reportadas.

En el proyecto Docker aislado vetclinic-review se construyeron e iniciaron frontend, API y PostgreSQL con estado saludable, aplicando las migraciones exclusivamente allí. La carga histórica y su repetición verificaron doce meses y ausencia de duplicados; los conteos finales incluyeron 506 pacientes, 505 citas y 503 facturas. Se descargaron las nueve exportaciones; pypdf verificó texto extraíble y 1/28/28 páginas, y openpyxl abrió los tres XLSX y reconoció el gráfico gerencial. PostgreSQL rechazó stock negativo y el retroceso de una cita completada. pg_dump y pg_restore conservaron los conteos al restaurar en una base temporal, eliminada al finalizar. OpenAPI incluye reportes y seguridad Bearer según prueba automatizada.

**Limitaciones y pendientes:** No se modificó Supabase ni se aplicaron allí las migraciones nuevas; requieren revisar previamente la compatibilidad de los datos existentes. No se ejecutó una llamada real al proveedor de IA, CI/publicación remota, lector de pantalla humano o inspección completa de la impresión física. La paginación de varios listados sigue siendo del cliente; no se implementó paginación SQL general. No se acreditan tiempos de respuesta de producción, auditoría integral OWASP ni revocación general de JWT. Se detectaron cadenas de conexión con credenciales en diferencias históricas de Git; no se comprobó su vigencia ni se modificó el historial y queda pendiente su rotación y saneamiento autorizado. No se realizaron commits ni push.

## 39. Compatibilidad de exportaciones con restricciones de auditoría existentes

**Fecha:** 12/11/2026.

**Requerimiento reformulado:** Restablecer la exportación de reportes en instalaciones cuya tabla Auditoria restringe Accion a CREAR, MODIFICAR y ELIMINAR, conservando trazabilidad sin requerir cambios del esquema en Supabase.

**Diagnóstico e intervención:** El esquema SQL compartido por el usuario contiene una restricción CHECK que excluye EXPORTAR, mientras el endpoint nuevo intentaba persistir dicho valor antes de responder con el archivo. Se cambió la persistencia a CREAR para la entidad Reportes, con Operacion=EXPORTAR y metadatos explícitos en ValoresNuevos. La API de auditoría normaliza estos eventos a EXPORTAR antes de buscar, filtrar, agrupar y presentar resultados, manteniendo compatibilidad con exportaciones anteriores. Se habilitó una lista explícita de campos de reporte para consultar su detalle sin exponer otros valores.

**Componentes:** Endpoints/Reportes.cs, Endpoints/Auditoria.cs, Models/VeterinariodbContext.Audit.cs, ReviewComplianceTests.cs y ambas bitácoras.

**Validación:** Suite backend Release: 135 aprobadas y una integración externa omitida. Las pruebas de los tres reportes verifican exportaciones, acción CRUD persistida, metadatos de exportación, filtro EXPORTAR y detalle de auditoría. La restricción de Supabase se identificó en el esquema previamente proporcionado; no se consultó ni modificó la instancia del usuario.

**Comprobación relacional adicional:** En PostgreSQL Docker aislado se impuso temporalmente un CHECK equivalente para nuevos eventos, conservando los anteriores. Las nueve exportaciones se completaron; también pasó la consulta filtrada y agregada como EXPORTAR. La restricción temporal fue retirada al finalizar. No se modificó Supabase.


## 40. Rediseño visual de los controles de reportes

**Fecha:** 12/11/2026.

**Requerimiento reformulado:** Mejorar la jerarquía visual y el aprovechamiento del espacio del panel de reportes, manteniendo coherencia con la paleta, accesibilidad y comportamiento existentes.

**Intervención:** Se reorganizaron los filtros en una tarjeta con encabezado e iconografía, tres columnas en escritorio, dos en pantallas intermedias y una en móvil. Se separó la barra de descarga e impresión, se incorporaron iconos decorativos accesibles y una nota breve de trazabilidad, y se ajustaron encabezados, superficies, espaciado y paginación mediante variables de los temas existentes. Los estilos nuevos se limitan a pantalla para preservar la impresión.

**Componentes y validación:** ReportesView.jsx, ReportesView.css y el escenario de reportes de accesibilidad.spec.js; AI_LOG y BITACORA. Compilación correcta con advertencias preexistentes de dependencias y tamaño de paquetes. Prueba de navegador aprobada: filtros, páginas, descarga CSV, error controlado de IA, tres columnas a 1440 px, una a 360 px, ausencia de desbordamiento y axe sin incidencias en ambos temas. Se generaron capturas de escritorio y móvil y se inspeccionó visualmente la captura de escritorio oscuro. El servidor del usuario en 5173 se conservó y la verificación utilizó 5187. Sin cambios de backend, base de datos, commits o push.

## 41. Retiro de integración de análisis mediante IA externa

**Fecha:** 12/11/2026.

**Requerimiento reformulado:** Eliminar la dependencia de un proveedor externo de IA para el análisis de reportes, conservando las funcionalidades de gestión y reconocimiento facial.

**Intervención:** Se retiraron InsightsService, el endpoint de análisis, su registro de dependencias y limitador exclusivo, las variables AI de Compose y .env.example y los controles/estado asociados en ReportesView. Se eliminaron las cuatro pruebas específicas de la funcionalidad retirada y se ajustó la prueba de reportes para verificar la ausencia del botón de IA. Los reportes, gráficos, exportaciones y face-api.js se conservan. No se altera el historial de intervenciones previas.

**Validación y componentes:** Program.cs, servicios/endpoints retirados, ReportesView.jsx, compose.yaml, .env.example, ReviewComplianceTests.cs, accesibilidad.spec.js y ambas bitácoras. Backend: 131 aprobadas, una integración externa omitida. Frontend: build correcto con avisos preexistentes y prueba de reportes aprobada con filtros, páginas, descarga, accesibilidad y adaptación en ambos temas. Búsqueda de referencias activas al endpoint, servicio y variables retiradas sin coincidencias. No se modificó Supabase ni se reiniciaron o reconstruyeron los contenedores del usuario. Sin commits o push.

## 42. Validación remota y estabilización de pruebas en GitHub Actions

**Fecha:** 12/11/2026.

**Requerimiento reformulado:** Publicar los avances en feature/FaceAPI y comprobar el pipeline real, corrigiendo diferencias entre la ejecución local y el entorno automatizado.

**Intervención:** Se publicó f86e979 y se consultó la ejecución 43334918483. La etapa de contenedores aprobó, mientras backend y navegador detectaron dependencias de configuración y sincronización en pruebas. ApiIntegrationTests ahora firma los tokens con la clave, emisor y audiencia efectivos del servidor de pruebas, eliminando la clave fija incompatible con los secretos efímeros de CI. La auditoría visual espera fuentes y dos ciclos de renderizado después del cambio de tema antes de medir contraste, sin deshabilitar reglas axe. La confirmación facial utiliza su aviso específico, evitando ambigüedad con el estado de carga de usuarios.

**Componentes y validación:** ApiIntegrationTests.cs, accesibilidad.spec.js, registro-facial.spec.js y ambas bitácoras. Backend local con clave JWT aleatoria: 131 aprobadas y una integración externa omitida. Navegador local: 29 aprobadas. La primera ejecución remota bloqueó la publicación al fallar las pruebas, conforme a las dependencias definidas. Se prepara una segunda ejecución con los ajustes; su resultado aún no se presume en esta entrada. No se modificó Supabase ni la autenticación de producción. El archivo gráfico personal no relacionado permanece fuera del commit.

**Seguimiento de zona horaria:** La ejecución remota 43335829104 confirmó la corrección de autenticación y volvió a aprobar contenedores; tres pruebas antiguas de facturación fallaron porque DateTime.Today toma UTC en el runner, mientras la validación exige la fecha de Chile. Los seis usos de la fecha de emisión en ApiIntegrationTests se ajustaron a America/Santiago. Suite local repetida con clave aleatoria: 131 aprobadas y una integración externa omitida. Se conserva la validación de fechas del producto; no se flexibiliza para aprobar CI. El resultado remoto del ajuste sigue pendiente al guardar esta actualización.

**Seguimiento de concurrencia:** El frontend y contenedores de 43335829104 aprobaron en GitHub. La siguiente ejecución resolvió las fechas de facturación y detectó una aserción no portable en ConcurrentPatientsTests: las cien solicitudes de las cinco fases finalizaron sin errores, pero una fase midió quince solicitudes solapadas y la prueba exigía exactamente veinte. Se conservan las veinte sesiones, validaciones de datos, auditoría, errores y tiempos; el pico observado se verifica dentro del rango posible de 1 a 20, sin fabricar un solapamiento exacto dependiente del planificador. El informe conserva el valor medido y sus limitaciones InMemory. Suite local: 131 aprobadas, una integración externa omitida. Se prepara una nueva ejecución remota para comprobar el resultado completo.

**Cierre comprobado en GitHub:** La ejecución 43336537895 del commit 9ed753f terminó completed/success. Backend: 131 aprobadas, una integración externa omitida y cero fallos. Frontend: 106 pruebas unitarias y 29 de navegador aprobadas. Contenedores, salud de API, respaldo/restauración y los dos trabajos publish (api/frontend) concluyeron success. Las imágenes se publicaron en GHCR con etiqueta del SHA completo probado. En las ejecuciones anteriores fallidas la publicación permaneció omitida. Este cierre actualiza exclusivamente ambas bitácoras y se publica con [skip ci] para no repetir la misma validación por un cambio sin código.

## 43. Creación modal y edición administrativa de cuentas

**Fecha:** 13/11/2026.

**Requerimiento reformulado:** Homogeneizar la gestión de cuentas con los demás módulos mediante un botón de alta, formulario modal y edición por fila, con actualización segura de datos desde la API.

**Intervención:** Nuevo usuario se ubica junto al encabezado del listado y abre un AccessibleDialog, reutilizado para editar cuentas con nombre, correo y rol precargados. La contraseña permanece vacía durante la edición y se conserva salvo que se introduzca una nueva válida. Se añadieron cierre, cancelación, mensajes, asociación de errores y conservación del bloqueo de envíos mediante AccessibleForm. Se agregó Editar usuario a cada fila y se recarga el listado al completar la operación. La carga de roles de la gestión de cuentas ya no hereda los filtros del catálogo de roles.

El nuevo PUT /api/v1/usuarios/{id} exige JWT y rol administrador, además de comprobar el rol vigente del actor en la base. Valida datos y rol existente, normaliza correo, rechaza duplicados excluyendo la propia cuenta e impide cambiar el rol propio desde esta pantalla. Las contraseñas opcionales se almacenan mediante hash y no se devuelven. El listado agrega RolId para precargar correctamente la selección. Se conserva la auditoría existente, sin registrar contraseñas.

**Componentes:** Usuarios.cs, UserCreateForm.jsx, AdminConfigView.jsx, UserEditingTests.cs, UserCreateForm.test.jsx, registro-facial.spec.js y ambas bitácoras.

**Validación:** Suite backend Release: 136 aprobadas y una integración externa omitida. Suite frontend previa a añadir el nuevo caso: 106 aprobadas; los tres casos de UserCreateForm, incluido el nuevo de edición, aprobaron posteriormente. Build correcto con avisos preexistentes de dependencias y tamaño de paquetes. Pruebas de navegador: creación y accesibilidad de formularios/listados en claro y oscuro aprobadas; escenario ampliado de creación-edición, contraseña vacía omitida, actualización de fila, Escape, foco restaurado y sesión administrativa conservada aprobado tras precisar el selector accesible del campo. Los datos de navegador fueron interceptados y el backend utilizó InMemory. No se modificó Supabase, no se aplicaron migraciones y no se ejecutó CI remoto ni se hicieron commits/push. Los JWT ya emitidos no incorporan automáticamente cambios de rol o datos; no se añadió revocación general de sesiones.

## 44. Permisos operativos de recepción para gestión de clientes

**Fecha:** 13/11/2026.

**Requerimiento reformulado:** Habilitar el registro y la actualización de propietarios para el rol Recepcionista, conservando las restricciones de eliminación y las validaciones de integridad.

**Intervención:** POST clientes incorpora Recepcionista a los roles autorizados; PUT permite Administrador y Recepcionista. En ClientesView se separaron los permisos de creación, edición y eliminación para mostrar Nuevo Cliente y Editar a recepción, manteniendo Eliminar exclusivamente para Administrador. No se modifican PermisosEscritura globales ni los permisos de otros módulos; Veterinario conserva creación y consulta, sin habilitar edición.

**Componentes y validación:** Clientes.cs, ClientesView.jsx, ReceptionistClientPermissionsTests.cs, ReceptionistClients.test.jsx y ambas bitácoras. Backend: 139 pruebas aprobadas, una integración externa omitida. Las pruebas nuevas verifican creación, lectura y edición por recepción, rechazo de RUT duplicado, eliminación denegada, persistencia y auditoría del actor, además del rechazo de edición anónima y por veterinario. Prueba frontend aprobada para botones, guardado y ausencia de eliminación; se precisó el selector al formulario modal. Build correcto con advertencias preexistentes de face-api.js y tamaño de paquetes. Pruebas con InMemory y API simulada, sin escrituras en Supabase, migraciones, reconstrucción Docker, CI remoto, commits o push.

## 45. Edición de pacientes por el rol Recepcionista

**Fecha:** 13/11/2026.

**Requerimiento reformulado:** Permitir que recepción actualice pacientes existentes sin ampliar sus permisos de alta o eliminación.

**Intervención:** Se agregó Recepcionista a la autorización de PUT pacientes y se separó la condición visual de edición respecto de la creación. Se mantienen las validaciones de propietario, datos clínicos generales y peso, así como la auditoría del actor. POST y DELETE conservan sus roles previos y recepción no recibe acceso a estas operaciones.

**Componentes y validación:** Pacientes.cs, PacientesView.jsx, ReceptionistPatientPermissionsTests.cs, PacientesView.test.jsx y ambas bitácoras. Backend: 140 aprobadas y una integración externa omitida. El caso nuevo comprueba actualización persistida, auditoría de recepción, rechazo de propietario inexistente/peso inválido y respuestas 403 al crear o eliminar. Frontend: ocho pruebas del módulo aprobadas, incluida apertura del formulario de edición sin controles de alta/eliminación para recepción. Build correcto con advertencias preexistentes. Pruebas InMemory y servicios simulados; sin intervención en Supabase, migraciones, reconstrucción Docker, CI remoto, commits o push.

## 46. Restricción administrativa del borrado de pacientes

**Fecha:** 13/11/2026.

**Requerimiento reformulado:** Alinear la autorización del endpoint de eliminación de pacientes con la interfaz administrativa y la historia de usuario de eliminación controlada.

**Intervención:** DELETE /api/v1/pacientes/{id} exige exclusivamente Administrador. Se mantienen las comprobaciones de citas y consultas asociadas. Se incorporaron pruebas de autorización y persistencia para acceso anónimo, Veterinario, Recepcionista y Administrador, además del bloqueo administrativo por relaciones existentes. La prueba de concurrencia anterior intentaba borrar como veterinario: se adaptó para ejecutar esa fase como administrador y comprobar el actor correspondiente en auditoría, manteniendo el resto de operaciones con veinte sesiones veterinarias. Su descripción y límites reflejan esta distinción.

**Componentes y validación:** Pacientes.cs, PatientDeletionPermissionsTests.cs, ConcurrentPatientsTests.cs y ambas bitácoras. Primera ejecución detectó la expectativa anterior de borrado veterinario; tras adecuarla, suite completa: 145 aprobadas y una integración externa omitida. Datos InMemory, sin escrituras en Supabase, migraciones, cambios de interfaz, despliegue, CI remoto, commits o push.

## 47. Restricción de la agenda al veterinario autenticado

**Fecha:** 13/11/2026.

**Requerimiento reformulado:** Garantizar que la consulta de citas del rol Veterinario devuelva exclusivamente las asignadas a la identidad autenticada, evitando eludir el alcance mediante parámetros de solicitud.

**Intervención:** GET /api/v1/citas aplica UsuarioId desde NameIdentifier del JWT cuando el rol es Veterinario, con rechazo de identificadores inválidos. El parámetro usuarioId no reemplaza ese alcance; los restantes filtros se combinan con él. Administrador y Recepcionista conservan consulta general y selección de profesional. CitasView oculta al veterinario el filtro de otros profesionales y evita enviar ese parámetro. No se cambian permisos de creación, edición o eliminación ni se incorpora una vista de detalle.

**Componentes y validación:** Citas.cs, CitasView.jsx, AppointmentVisibilityTests.cs, CitasScope.test.jsx y ambas bitácoras. Suite backend: 150 aprobadas, una integración externa omitida. Casos nuevos comprueban separación entre profesionales, manipulación de usuarioId, composición con estado, agenda general para administración/recepción y rechazo anónimo o identidad inválida. Tres pruebas de interfaz por rol aprobadas y build correcto con avisos preexistentes. InMemory y API simulada; sin cambios en Supabase, migraciones, reconstrucción Docker, CI remoto, commits o push. El alcance verificado corresponde al endpoint de consulta de agenda; no representa una revisión de todos los endpoints que puedan incluir referencias a citas.

## 48. Detalle de cita y comunicación de agenda vacía

**Fecha:** 13/11/2026.

**Requerimiento reformulado:** Completar la consulta de información de citas mediante una vista de solo lectura y una comunicación específica de ausencia de asignaciones para el veterinario autenticado.

**Intervención:** Cada fila incorpora Ver detalle y abre CitaDetailDialog con paciente, propietario, contacto, profesional, especialidad, fecha/hora, estado y antecedentes disponibles. Se reutiliza AccessibleDialog para aislamiento modal, foco, Escape y retorno al control de apertura; no se realizan escrituras ni se agregan endpoints. Los datos proceden de las filas ya autorizadas por la consulta de agenda. Los valores ausentes se identifican como No informado. La disposición es adaptable y utiliza las variables de tema existentes.

Para Veterinario se presenta No tienes citas asignadas para los filtros seleccionados; los otros roles conservan el mensaje general. La prueba de fallo de carga reveló que el error de consulta compartía estado con el formulario y solo se mostraba dentro de este: se separó loadError y se presenta como alerta del listado, evitando informar ausencia de citas cuando la consulta falla.

**Componentes y validación:** CitaDetailDialog.jsx, CitasView.jsx, CitasScope.test.jsx, accesibilidad.spec.js y ambas bitácoras. Suite frontend completa: 114 aprobadas; build correcto con avisos preexistentes de dependencias/tamaño. Los cinco casos de alcance/detalle comprueban mensajes por rol, datos de solo lectura, Escape/foco y distinción de fallo frente a vacío. Caso de navegador aprobado: contenido, ausencia de campos editables, foco inicial, cierre y retorno, ajuste a 360 px y axe sin incidencias en claro/oscuro con movimiento reducido. La primera auditoría midió un botón durante la transición de tema; se verificó de nuevo con la preferencia de movimiento reducido, sin omitir reglas. Datos de prueba simulados; sin nuevas pruebas backend, cambios en Supabase, migraciones, reconstrucción Docker, CI remoto, commits o push.

## 49. Eliminación administrativa de registros clínicos

**Fecha:** 13/11/2026.

**Requerimiento reformulado:** Reservar al Administrador la eliminación de consultas, recetas y detalles de prescripción, manteniendo el registro y actualización clínica por Veterinario.

**Intervención:** Se retiró Veterinario de las autorizaciones DELETE de consultas, recetas y detalles de receta. Se conserva la protección de consultas con recetas o facturación asociadas y la eliminación conjunta de una receta con sus detalles. ConsultasView oculta el borrado de receta y su confirmación para usuarios no administradores, diferencia la etiqueta de actualización según permisos y ajusta las indicaciones del formulario. Los endpoints de creación y modificación no cambian.

**Componentes y validación:** Consultas.cs, Recetas.cs, DetallesReceta.cs, ConsultasView.jsx, ClinicalDeletionPermissionsTests.cs, accesibilidad.spec.js y ambas bitácoras. Suite backend: 155 aprobadas y una integración externa omitida. Casos nuevos verifican 401/403 por rol, borrado administrativo, conservación de registros al denegar, eliminación de detalles y bloqueo de consulta con receta. Frontend: 114 pruebas aprobadas y build correcto con avisos previos. Dos recorridos de navegador aprobados: confirmación/cancelación administrativa y actualización de receta por Veterinario sin acciones de borrado. La prueba nueva detectó inicialmente que la condición visual se había aplicado a un aviso informativo; se corrigió sobre el botón y se repitió el recorrido satisfactoriamente. Pruebas InMemory y API simulada; sin cambios en Supabase, migraciones, Docker, CI remoto, commits o push.

## 50. Administración exclusiva del catálogo de insumos

**Fecha:** 13/11/2026.

**Requerimiento reformulado:** Reservar las modificaciones directas del catálogo de insumos al Administrador, manteniendo acceso de consulta para Veterinario y Recepcionista.

**Intervención:** POST, PUT y DELETE de insumos exigen Administrador. GET conserva los tres roles. InsumosView utiliza isAdmin para mostrar alta, edición y eliminación; los demás usuarios ven el catálogo en modo Solo Lectura. No se modificaron las operaciones automáticas de existencias asociadas a facturación ni los permisos globales de otros módulos.

**Componentes y validación:** Insumos.cs, InsumosView.jsx, SupplyPermissionsTests.cs, InsumosPermissions.test.jsx y ambas bitácoras. Backend completo: 159 aprobadas y una integración externa omitida. Los casos nuevos verifican rechazo 401/403 de las tres escrituras, consulta permitida según rol, datos sin modificaciones tras rechazos y creación/edición/eliminación por administrador de un insumo sin dependencias. Tres casos frontend por rol aprobados y build correcto con advertencias preexistentes. Pruebas InMemory y API simulada; sin cambios en Supabase, migraciones, Docker, CI remoto, commits o push.

## 51. Emisión de facturas por administración y recepción

**Fecha:** 13/11/2026.

**Requerimiento reformulado:** Autorizar la emisión de facturas al Administrador y Recepcionista, retirando las facultades de escritura de facturación al Veterinario y manteniendo controles separados para registros ya emitidos.

**Intervención:** POST facturas permite Administrador/Recepcionista; PUT y DELETE de facturas y escrituras directas de detallefac quedan reservadas al Administrador. GET conserva los tres roles. FacturasView separa permisos de emitir, editar y eliminar: recepción puede generar facturas completas con conceptos en la operación de emisión, mientras los registros existentes y sus detalles son de solo lectura para recepción y veterinario. Se ocultan formularios y botones de modificación de líneas a roles no administradores. No se modifica el cálculo de IVA, transacciones ni descuento de existencias.

**Componentes y validación:** Facturas.cs, DetalleFacturas.cs, FacturasView.jsx, InvoicePermissionsTests.cs, InvoicePermissions.test.jsx y ambas bitácoras. Backend: 165 aprobadas y una externa omitida. Los nuevos casos comprueban emisión permitida/denegada por rol, factura y detalle persistidos, descuento exacto de stock, actor de auditoría, consulta de roles operativos y rechazo de modificaciones directas a facturas/detalles. Tres pruebas frontend por rol aprobadas y build correcto con avisos preexistentes. Datos InMemory y API simulada; sin escritura en Supabase, migraciones, reconstrucción Docker, CI remoto, commits o push.

## 52. Coherencia entre interfaz y autorización de eliminación de citas

**Fecha:** 13/11/2026.

**Requerimiento reformulado:** Corregir la discrepancia entre la acción administrativa de borrado de citas y la autorización del endpoint, preservando la navegación y los permisos operativos existentes.

**Intervención:** DELETE /api/v1/citas/{id} exige exclusivamente Administrador. Se conserva el bloqueo por consultas asociadas, que también protege las citas con consultas facturadas. No se modifican menú, consulta, creación o edición de citas. Se añaden casos de autorización y preservación de registros, borrado administrativo sin dependencias, auditoría y respuesta a identificadores inexistentes.

**Componentes y validación:** Citas.cs, AppointmentDeletionPermissionsTests.cs y ambas bitácoras. Suite backend: 171 aprobadas y una integración externa omitida. Los casos nuevos verifican 401 anónimo, 403 Veterinario/Recepcionista, 204 Administrador sin dependencias, 400 con consulta facturada y 404 inexistente. Cuatro recorridos de navegador existentes aprobaron navegación lateral/móvil, descarte de sesión vencida y bloqueo de rutas administrativas para Veterinario/Recepcionista. Entornos InMemory y API interceptada; sin cambios en Supabase, esquema, contenedores, CI remoto, commits o push.

## 53. Cierre de inconsistencias de facturación, inventario y permisos

**Fecha:** 13/11/2026.

**Requerimiento reformulado:** Resolver los pendientes técnicos identificados en las historias de usuario, priorizando precisión histórica, atomicidad y concurrencia de inventario, coherencia de permisos e información de consulta, y preparar su validación remota.

**Intervención:** DetallesFactura incorpora Cantidad y PrecioUnitario mediante la migración 20261113155901_HistoricoInventarioFactura. Las nuevas líneas conservan cantidad/precio; la edición de una factura conserva el precio registrado de conceptos existentes y repone la cantidad real. Se sustituyó la reposición fija de una unidad y la deducción de cantidades a partir del catálogo. Las líneas antiguas de insumos sin cantidad permanecen NULL y generan un conflicto explícito si se pretende reponerlas; no se inventa su historial. Las líneas de atención antiguas pueden identificarse como una unidad y su subtotal. La interfaz muestra identificador de factura y metadatos históricos, permite cantidad al añadir un insumo y calcula su subtotal de solo lectura. Se bloquea la edición de líneas históricas ambiguas.

Las operaciones de detalle incorporan una transacción que incluye detalle, stock, recálculo de totales y auditoría. Las transacciones de factura se disponen también al salir por validaciones. StockActual y MontoTotal son tokens de concurrencia optimista: escrituras obsoletas provocan 409 y rollback, sin reintentos automáticos de emisión. Se mantienen IVA y límites monetarios. BillingConsistency concentra lectura histórica y recálculo; se impide modificar directamente los importes de una factura con conceptos omitiendo sus líneas.

Recepcionista puede registrar pacientes conforme a la historia 5, conservando la eliminación administrativa. El listado completo de cuentas exige Administrador; la agenda usa un endpoint limitado de profesionales que devuelve solo ID, nombre y rol veterinario. Se conserva el resto de permisos ajustados en las intervenciones anteriores. README actualiza alcance de autenticación, importes facturados frente a pagos, migración, historial y prueba operativa; no se crean entregables académicos.

**Componentes:** Modelos/contexto/auditoría, migración y snapshot; BillingConsistency; middleware, validación de negocio y endpoints Facturas/DetalleFacturas/Usuarios/Pacientes; vistas Facturas/Citas/Pacientes y esquema del detalle; pruebas BillingHistoryTests/UserDirectoryPermissionsTests y casos de interfaz; Test-BillingIntegrity.ps1, CI, README y ambas bitácoras. La prueba operativa valida proyecto/puerto local y conexión de la API al PostgreSQL del contenedor, sin imprimir la conexión.

**Validación local:** Backend 176 aprobadas y una integración externa omitida. Frontend 123 aprobadas; build correcto con avisos preexistentes. Navegador completo: 31 aprobadas; prueba Docker conectada: una aprobada. En PostgreSQL real aislado, dos emisiones paralelas sobre una unidad devolvieron 201 y 409, conservando una sola venta y stock cero. Se verificó precio histórico tras cambiar el catálogo, reposición exacta de tres unidades y bloqueo de cantidad desconocida. Disparadores SQL de prueba provocaron fallos después de crear la cabecera y al recalcular tras borrar una línea: se conservaron los conteos/valores de cabecera, detalles, stock, importes y auditoría. Se retiraron disparadores y datos propios. Las comprobaciones se integraron en CI antes de publicar imágenes. Se reconstruyó vetclinic-review conservando su volumen y se aplicó la migración únicamente allí; backup/restauración y reportes del script general también aprobaron.

**Límites:** Sin conexión ni cambios en Supabase: requiere revisar/aplicar la migración antes de ejecutar esta versión contra esa base. No se pueden reconstruir cantidades históricas desconocidas sin revisar documentos originales. Las pruebas de concurrencia son casos acotados, no un benchmark productivo ni garantía de idempotencia general. No se implementan pagos, anulación tributaria o presencia real facial. Se prepara commit/push de los avances y ejecución remota; su resultado no se presume al guardar esta entrada. Se conserva fuera del commit el gráfico personal no relacionado.

Validación remota complementaria (13/11/2026): el run 43461207441 aprobó backend y contenedores, pero detectó contraste transitorio durante la animación de opacidad del aviso de conflicto. Se elimina dicha animación en ConflictDialog.css para presentar el aviso con contraste íntegro desde su apertura; se repite la comprobación automatizada sin excluir reglas de accesibilidad.
Resultado local complementario: Playwright aprobó la prueba del diálogo de conflictos (1/1), incluyendo axe en ambos temas y recuperación de foco.
La repetición remota 43462304628 confirmó que suprimir la animación no bastaba en Chromium Linux. Se retira además el desenfoque de fondo del aviso y se añade diagnóstico de estilos cuando axe detecte incidencias, conservando todas las reglas. Chromium local también aprobó la prueba aislada antes de este ajuste.
Validación ampliada: Chromium local completó 30/31 pruebas; detectó contraste heredado en el título del detalle de cita al alternar tema. Se declara el color semántico explícitamente en CitaDetailDialog.jsx y el auxiliar de cambio de tema espera las animaciones finitas. Ambas pruebas afectadas aprobaron después (2/2); las reglas axe se mantienen activas.
