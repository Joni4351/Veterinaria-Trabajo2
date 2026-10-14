# Bitácora de Desarrollo - Sistema Veterinario (VetClinic Pro)

**Proyecto:** VeterinariaAPI & Frontend  
**Ubicación Frontend:** `C:\Users\joni5.DESKTOP-AF57599\Downloads\VeterinariaAPI-master\frontend`  
**Ubicación Backend (.NET):** `C:\Users\joni5.DESKTOP-AF57599\Downloads\VeterinariaAPI-master\VeterinariaAPI`  
**Base de Datos:** SQL Server (`veterinariodb`)  

---

## 📅 Registro de Sesiones

### [Sesión 1] - 12 de Octubre de 2026 (Inicial)

#### 1. Análisis y Diagnóstico Inicial
- **Inspección de la Base de Datos:**
  - Se analizó el script DDL de SQL Server con las tablas: `Usuarios`, `Roles`, `Clientes`, `Pacientes`, `Especialidades`, `Citas`, `Consultas`, `Recetas`, `DetallesReceta`, `Insumos`, `Facturas` y `DetallesFactura`.
- **Inspección de la API (.NET 9 / Minimal APIs):**
  - Se revisaron los endpoints configurados bajo el prefijo `/api/v1/`:
    - `/api/v1/usuarios` (Registro, Login con JWT, roles y rate limiting).
    - `/api/v1/pacientes`
    - `/api/v1/clientes`
    - `/api/v1/citas`
    - `/api/v1/consultas`
    - `/api/v1/recetas` y `/api/v1/detallesRe`
    - `/api/v1/insumos`
    - `/api/v1/facturas` y `/api/v1/detallefac`
    - `/api/v1/roles` y `/api/v1/especialidades`
  - Se verificaron las políticas de CORS (`FrontendPolicy` orientada a `http://localhost:5173`) y la autenticación Bearer JWT.

#### 2. Creación y Configuración del Frontend
- **Inicialización del Proyecto:**
  - Se creó la aplicación React utilizando Vite en `C:\Users\joni5.DESKTOP-AF57599\Downloads\VeterinariaAPI-master\frontend`.
  - Instalación de librerías esenciales: `axios` (cliente HTTP) y `lucide-react` (iconografía clínica).
- **Proxy de Desarrollo:**
  - Configuración de `vite.config.js` con proxy reverso hacia `http://localhost:5021`.

#### 3. Arquitectura y Módulos Desarrollados
1. Cliente HTTP & Autenticación (`api.js` y `AuthContext.jsx`).
2. Sistema de Diseño y Estilos (`index.css`).
3. Vistas Implementadas (`LoginView`, `DashboardView`, `PacientesView`, `ClientesView`, `CitasView`, `ConsultasView`, `InsumosView`, `FacturasView`, `AdminConfigView`).
4. Integración Global en `App.jsx` y `main.jsx`.

---

### [Sesión 2] - 12 de Octubre de 2026 (Filtros en Endpoints Backend y Frontend)

#### 1. Soporte de Consultas Dinámicas en el Repositorio (.NET)
- Se extendió la interfaz `IRepository<T>` y `IUsuarioRepository` añadiendo los métodos:
  - `Query()`: Retorna un `IQueryable<T>` para permitir encadenar condiciones `.Where(...)` de Entity Framework Core de forma diferida y eficiente en la base de datos.
  - `ObtenerFiltradosAsync(...)`: Búsqueda directa por expresión lambda.

#### 2. Implementación de Parámetros de Filtro en Endpoints (.NET)
Se actualizaron todos los endpoints `GET` de la API para soportar query parameters opcionales:
- **`/api/v1/pacientes`**: Filtros por `clienteId` (int), `nombre` (string), `especie` (string) y `raza` (string).
- **`/api/v1/clientes`**: Filtros por `documento` (string), `nombre` (string), `email` (string) y `telefono` (string).
- **`/api/v1/citas`**: Filtros por `pacienteId` (int), `usuarioId` (int), `especialidadId` (int), `estado` (string), `fechaDesde` (DateTime) y `fechaHasta` (DateTime).
- **`/api/v1/consultas`**: Filtros por `pacienteId` (int), `citaId` (int), `motivo` (string) y `diagnostico` (string).
- **`/api/v1/insumos`**: Filtros por `nombre` (string), `tipo` (string), `stockMinimo` (int), `stockMaximo` (int), `precioMin` (decimal) y `precioMax` (decimal).
- **`/api/v1/facturas`**: Filtros por `clienteId` (int), `fechaDesde` (DateOnly), `fechaHasta` (DateOnly), `montoMin` (decimal) y `montoMax` (decimal).
- **`/api/v1/recetas`**: Filtros por `consultaId` (int), `fechaDesde` (DateOnly), `fechaHasta` (DateOnly) y `vigentes` (bool).
- **`/api/v1/detallesRe`**: Filtros por `recetaId` (int) e `insumoId` (int).
- **`/api/v1/detallefac`**: Filtros por `facturaId` (int), `consultaId` (int) e `insumoId` (int).
- **`/api/v1/especialidades`**: Filtros por `nombre` (string), `costoMin` (decimal) y `costoMax` (decimal).
- **`/api/v1/roles`**: Filtros por `nombre` (string) y `permisosEscritura` (bool).
- **`/api/v1/usuarios`**: Filtros por `nombre` (string), `email` (string) y `rolId` (int).

#### 3. Integración de Barras y Paneles de Filtro en el Frontend (React)
- **`PacientesView.jsx`**: Panel con selectores para filtrar por nombre, especie, raza y dueño responsable, más botón de limpieza.
- **`ClientesView.jsx`**: Filtros por DNI/RUT, nombre completo, teléfono y correo electrónico.
- **`CitasView.jsx`**: Filtros interactivos por estado (Pendiente, Confirmada, etc.), paciente, especialidad, médico asignado y rango de fechas (Desde / Hasta).
- **`InsumosView.jsx`**: Filtros por nombre de fármaco, tipo/categoría, stock máximo (detección rápida de inventario crítico) y rango de precios.
- **`FacturasView.jsx`**: Filtros por cliente, rango de fechas de emisión y rango de montos totales.
- **`ConsultasView.jsx`**: Filtros por paciente, cita asociada, texto en motivo y hallazgo diagnóstico.
- **`AdminConfigView.jsx`**: Filtros individuales para cada pestaña (Especialidades por costo/nombre, Roles por permisos, Usuarios por rol/email/nombre).

#### 4. Verificación Técnica
- **Backend .NET:** Compilado exitosamente con `dotnet build` (0 Advertencias, 0 Errores).
- **Frontend React:** Compilado exitosamente con `npm run build` en **781 ms** sin fallos.

---

### [Sesión 3] - 12 de Octubre de 2026 (Ajustes Específicos de Filtros en Backend y Frontend)

#### 1. Ajustes en Backend (.NET)
- **`Endpoints/Pacientes.cs`:**
  - Se reemplazó el filtro numérico rígido `clienteId` (int?) por un filtro de texto `dueno` (string?).
  - Se incorporó `.Include(p => p.Cliente)` para buscar coincidencias parciales (`Contains`) tanto en el **Nombre Completo** como en el **Documento de Identidad** del dueño.
- **`Endpoints/Citas.cs`:**
  - Se removió completamente el parámetro de filtro `pacienteId` y su cláusula `Where` correspondiente para simplificar la búsqueda de citas según lo solicitado.
- **`Endpoints/Consultas.cs`:**
  - Se eliminó el parámetro de filtro `citaId` y su condición `Where` para centrar las consultas clínicas en el paciente, diagnóstico y motivo.
- **Compilación Backend:**
  - Verificada con `dotnet build` obteniendo 0 errores y 0 advertencias.

#### 2. Ajustes en Frontend (React)
- **`PacientesView.jsx`:**
  - Se actualizó el estado `filters` y la función `fetchPacientes` reemplazando `clienteId` por `dueno`.
  - En la interfaz gráfica, se reemplazó la lista desplegable (`<select>`) de dueños por un campo de texto libre (`<input type="text" placeholder="Buscar por nombre o DNI...">`), permitiendo una búsqueda rápida y flexible.
- **`CitasView.jsx`:**
  - Se eliminó el campo de filtro `pacienteId` del estado `filters`, de los parámetros enviados a la API en `fetchCitas`, y del reseteo de filtros.
  - Se retiró el selector desplegable de "Paciente" del panel visual de filtros.
- **`ConsultasView.jsx`:**
  - Se eliminó el filtro `citaId` del estado `filters`, de los parámetros enviados a la API en `fetchConsultas`, y del botón de limpieza.
  - Se retiró el selector desplegable de "Cita Asociada" del panel visual de filtros.
- **Compilación Frontend:**
  - Verificada con `npm run build` obteniendo compilación limpia en **511 ms**.

---

### [Sesión 4] - 13 de Octubre de 2026 (Diseño Mobile-First, Responsividad y Accesibilidad Táctil)

#### 1. Cumplimiento de Especificaciones de Diseño Mobile-First
- **Viewport y Base HTML (`index.html`):**
  - Configurado `<meta name="viewport" content="width=device-width, initial-scale=1.0, minimum-scale=1.0" />` asegurando escala inicial consistente en todos los dispositivos móviles desde 320 px de ancho.
  - Agregado idioma `lang="es"`, color de tema móvil `<meta name="theme-color">` y metadatos accesibles.
- **Prevención de Scroll Horizontal:**
  - Normalizado el modelo de caja `*, *::before, *::after { box-sizing: border-box; }`.
  - Aplicado `overflow-x: hidden; width: 100%;` en `html`, `body` y contenedores raíz para garantizar navegación vertical fluida sin desbordamientos laterales indeseados.
- **Zoom hasta 200% y Reorganización de Contenido:**
  - Dimensiones, tipografías y espaciados basados en unidades relativas (`rem`, `clamp()`, porcentajes).
  - Eliminadas restricciones de altura fija que pudieran truncar texto al aumentar el tamaño de fuente o hacer zoom del 200%.

#### 2. Navegación Móvil Adaptativa (Off-Canvas Drawer y Botón Hamburguesa)
- **Componente Principal (`src/App.jsx`):**
  - Implementado drawer lateral colapsable para la barra de navegación en tabletas y dispositivos móviles (< 1024 px).
  - Incorporado botón táctil de menú hamburguesa (`Menu` y `X` de Lucide) en la barra superior (`topbar`).
  - Fondo backdrop con desenfoque (`sidebar-overlay`) que permite cerrar el menú mediante un toque en pantalla.
  - Cierre automático del menú lateral al interactuar con cualquier enlace de navegación o al cerrar sesión.

#### 3. Transformación de Tablas a Tarjetas en Pantallas Móviles
- **Hoja de Estilos (`src/index.css`):**
  - Reglas `@media (max-width: 768px)` que transforman automáticamente las tablas HTML tradicionales (`.custom-table`) en tarjetas independientes por cada registro (`tr`).
  - Ocultación accesible del encabezado (`thead`) y conversión de celdas (`td`) a bloques Flexbox que muestran la etiqueta descriptiva a la izquierda mediante el pseudo-elemento `::before { content: attr(data-label); }` y el valor a la derecha.
  - Alineación destacada y botones distribuidos para la fila de acciones (`[data-label="Acciones"]`).
- **Actualización de Vistas con `data-label`:**
  - `PacientesView.jsx`: Celdas identificadas por ID, Nombre, Especie, Raza, Peso, Dueño, Alergias y Acciones.
  - `ClientesView.jsx`: Celdas identificadas por ID, Documento, Nombre Completo, Teléfono, Correo y Acciones.
  - `CitasView.jsx`: Celdas identificadas por ID, Paciente, Especialidad, Veterinario, Fecha & Hora, Estado y Acciones.
  - `ConsultasView.jsx`: Celdas identificadas por ID, Paciente, Cita Vinculada, Motivo, Diagnóstico y Acciones.
  - `InsumosView.jsx`: Celdas identificadas por ID, Nombre del Producto, Categoría, Stock Actual, Precio Unitario y Acciones.
  - `FacturasView.jsx`: Celdas de la tabla principal y del modal de líneas de detalle adaptadas con `data-label`.
  - `AdminConfigView.jsx`: Las tres tablas (Especialidades, Roles y Usuarios) adaptadas a tarjetas en pantallas móviles.
  - `DashboardView.jsx`: Tablas de últimas citas agendadas y alertas de stock bajo convertidas a tarjetas.

#### 4. Controles Táctiles y Accesibilidad (WCAG Target Size ≥ 44 × 44 px)
- Definida variable global CSS `--min-touch-target: 44px;`.
- Todos los botones interactivos (`.btn`, `.btn-sm`, `.btn-icon`), campos de formulario (`.form-input`, `.form-select`, `.form-textarea`), ítems de navegación (`.nav-item`) y botones de cierre modal cuentan con tamaño o área táctil mínima de **44 × 44 px**.
- Inputs y selects configurados con `font-size: 1rem` (16px), eliminando el zoom automático molesto en navegadores móviles (iOS Safari).
- Incorporados atributos `aria-label` en botones de iconos para garantizar accesibilidad por lectores de pantalla.

#### 5. Verificación Técnica
- **Frontend React (Vite):** Compilación de producción ejecutada con `npm run build` exitosa en **1.23s** (0 errores).
- **Backend .NET 10:** Compilado con `dotnet build` obteniendo 0 errores y 0 advertencias.

---

### [Sesión 5] - 13 de Octubre de 2026
**Objetivo:** Implementar rutas protegidas (`ProtectedRoute`), vistas y acciones condicionadas por roles (`Administrador`, `Veterinario`, `Recepcionista`), manejo centralizado de respuestas HTTP 403 (Forbidden) con vista de acceso denegado, y verificación estricta de que la API en el backend (.NET) valide la autorización en cada endpoint protegido.

#### 1. Verificación y Fortalecimiento de la Autorización en el Backend (.NET 10 Minimal APIs)
- **Principio de Seguridad:** La interfaz de usuario no reemplaza la seguridad del servidor; toda operación sensible debe ser rechazada por el backend si el usuario carece del rol exigido.
- **Auditoría de Endpoints:**
  - `Endpoints/Usuarios.cs`:
    - Endpoint `GET /api/v1/usuarios` protegido con `.RequireAuthorization(policy => policy.RequireRole("Administrador"))`.
    - Endpoint `DELETE /api/v1/usuarios/{id:int}` restringido exclusivamente a `"Administrador"`.
    - Generación de claims en JWT verificada: claim de rol emitido como `ClaimTypes.Role`.
  - `Endpoints/Roles.cs`: Configuración de roles protegida para `"Administrador"`.
  - `Endpoints/Especialidades.cs`: Mutaciones (POST, PUT, DELETE) limitadas a `"Administrador"`.
  - `Endpoints/Pacientes.cs`: Operaciones clínicas permitidas para `"Administrador"` y `"Veterinario"`; eliminación exclusiva para `"Administrador"`.
  - `Endpoints/Citas.cs`, `Consultas.cs`, `Recetas.cs`: Mutaciones clínicas reservadas para `"Administrador"` y `"Veterinario"`.
  - `Endpoints/Facturas.cs`: Emisión restringida a roles autorizados; cancelación/eliminación limitada a `"Administrador"`.
- **Compilación:** `dotnet build` ejecutado exitosamente con 0 errores y 0 advertencias.

#### 2. Componente de Protección de Rutas (`ProtectedRoute.jsx`) y Vista 403 (`AccessDeniedView.jsx`)
- **Guard de Navegación (`src/components/ProtectedRoute.jsx`):**
  - Evalúa si el usuario está autenticado (`isAuthenticated`). Si no hay sesión activa, redirige a la vista de Login.
  - Verifica si el rol del usuario pertenece al arreglo `allowedRoles` permitido para la ruta.
  - Si el rol no está autorizado, renderiza la vista especializada `AccessDeniedView` preservando la barra de navegación para que el usuario pueda regresar a sus secciones permitidas.
- **Vista de Acceso Denegado (`src/views/AccessDeniedView.jsx`):**
  - Presenta código HTTP 403 (Acceso Denegado), badge con el rol actual del usuario, lista de roles autorizados para la vista solicitada y explicación de seguridad ("La interfaz y el backend impiden el acceso a esta sección según tu nivel de privilegios").
  - Botón táctil accesible (≥ 44 × 44 px) con retorno directo al Panel Principal (`Dashboard`).

#### 3. Interceptores Globales y Contexto de Autenticación
- **Interceptor Axios (`src/services/api.js`):**
  - Intercepta respuestas de error con código HTTP `403`.
  - Dispara un evento del navegador `window.dispatchEvent(new CustomEvent('vet:forbidden', ...))` que transporta la URL y el método del endpoint bloqueado por el servidor.
- **Manejo Visual en `src/App.jsx`:**
  - Escucha globalmente el evento `vet:forbidden` y despliega un banner flotante de advertencia con animación y botón táctil de descarte, informando al usuario que la API rechazó la solicitud por falta de permisos.
- **Helpers de Rol en `AuthContext.jsx`:**
  - Incorporadas funciones de verificación: `hasRole(roles)`, `isAdmin`, `isVeterinario`, `isRecepcionista`.

#### 4. Condicionamiento de Vistas y Acciones en el Frontend
- **Navegación y Menú Lateral (`src/App.jsx`):**
  - Etiqueta visible con el rol actual en el perfil de usuario.
  - Candado visual y estilo diferenciado en rutas restringidas según el rol del usuario.
  - Ruta de administración (`/admin` - Gestión de Usuarios, Especialidades y Roles) protegida estrictamente para `['Administrador']`.
- **Acciones Condicionadas en Vistas CRUD:**
  - `ConsultasView.jsx`: Botón "Nueva Consulta" y formulario de "Receta Médica" visibles únicamente para `Administrador` y `Veterinario`. Botón "Eliminar" disponible únicamente para `Administrador`. Usuarios con rol `Recepcionista` visualizan el historial en modo "Solo Lectura".
  - `PacientesView.jsx`: Registro y edición condicionados a `Administrador` y `Veterinario`; eliminación exclusiva de `Administrador`.
  - `ClientesView.jsx`: Creación disponible para `Administrador` y `Veterinario`; edición y eliminación restringidas a `Administrador`.
  - `CitasView.jsx`: Agendamiento y edición condicionados a `Administrador` y `Veterinario`; eliminación reservada a `Administrador`.
  - `InsumosView.jsx`: Creación y edición habilitadas para `Administrador` y `Veterinario`; eliminación restringida a `Administrador`.
  - `FacturasView.jsx`: Generación y edición para personal clínico/administrativo; anulación restringida a `Administrador`.

#### 5. Verificación Técnica
- **Frontend React (Vite):** `npm run build` ejecutado exitosamente con 0 errores (tiempo: 578ms).
- **Backend .NET 10:** Endpoints asegurados con directivas de autorización y build verificado.

---

### [Sesión 6] - 13 de Octubre de 2026
**Objetivo:** Solucionar la desaparición de elementos en las listas al interactuar continuamente con filtros (aumentando la cuota de Rate Limiting y agregando debouncing), y permitir al rol de `Recepcionista` visualizar al Veterinario/Médico en la Agenda de Citas modificando los permisos de rol correspondientes en Backend y Frontend.

#### 1. Incremento de Rate Limiting en Backend (`VeterinariaAPI/Program.cs`)
- **Diagnóstico:** Al tipear rápidamente en los campos de filtro o actualizar las vistas, se disparaban múltiples llamadas concurrentes al backend superando el límite restrictivo previo (`PermitLimit = 100`, `QueueLimit = 2`), lo que provocaba respuestas HTTP `429 Too Many Requests` y dejaba las listas vacías.
- **Solución implementada:**
  - Límite global aumentado a **1000 peticiones por ventana** de 1 minuto (`PermitLimit = 1000`) con cola de espera ampliada (`QueueLimit = 50`).
  - Límite de autenticación (`AuthPolicy`) incrementado de 5 a **30 intentos por minuto** (`PermitLimit = 30`, `QueueLimit = 5`).

#### 2. Debouncing en el Frontend para Protección de Consultas
- Implementado retardo controlado de 300ms (`setTimeout` / `clearTimeout`) en los `useEffect` de filtros en las vistas:
  - `ClientesView.jsx` (DNI, Nombre, Correo, Teléfono).
  - `PacientesView.jsx` (Nombre, Especie, Raza, Dueño).
  - `CitasView.jsx` (Estado, Especialidad, Profesional, Fechas).
  - `InsumosView.jsx` (Nombre, Tipo, Stock, Precios).
  - `ConsultasView.jsx` (Paciente, Motivo, Diagnóstico).
  - `FacturasView.jsx` (Cliente, Fechas, Montos).
- Evita saturación innecesaria de solicitudes HTTP en cada pulsación de tecla y previene colisiones asíncronas.

#### 3. Soporte para Respuestas HTTP 429 en Frontend
- **Interceptor Axios (`src/services/api.js`):**
  - Captura el código HTTP `429 Too Many Requests` y emite el evento global `vet:ratelimit`.
- **Alerta Visual en Interfaz (`src/App.jsx`):**
  - Banner flotante con advertencia amigable informando al usuario si el servidor requiere un momento de espera, evitando que las tablas se queden en blanco silenciosamente.

#### 4. Modificación de Permisos para el Rol `Recepcionista` y Visualización del Veterinario
- **Backend (.NET 10):**
  - `Endpoints/Usuarios.cs`: El endpoint `GET /api/v1/usuarios` se amplió con `.RequireAuthorization(policy => policy.RequireRole("Administrador", "Veterinario", "Recepcionista"))`, permitiendo a la recepcionista consultar la nómina de médicos y profesionales para resolver sus nombres en la agenda.
  - `Endpoints/Especialidades.cs`: El endpoint `GET /api/v1/especialidades` se amplió para incluir a `"Recepcionista"`.
  - `Endpoints/Citas.cs`: Los endpoints de creación (`POST`) y actualización (`PUT`) de citas se actualizaron para autorizar a `"Recepcionista"`.
- **Frontend (React / Vite):**
  - En `CitasView.jsx`, la bandera de permisos `canCreateOrEdit` se actualizó para incluir `Recepcionista`: `hasRole(['Administrador', 'Veterinario', 'Recepcionista'])`.
  - Ahora el rol de Recepcionista puede consultar y seleccionar al Médico/Veterinario en los filtros, ver el nombre del profesional asignado en la tabla de citas (`usuario.nombreCompleto`) y agendar/editar citas médicas con el profesional correspondiente.

#### 5. Verificación Técnica
- **Backend .NET:** Compilado con `dotnet build` (0 errores) y en ejecución en `http://localhost:5021`.
- **Frontend React (Vite):** `npm run build` exitoso con 0 errores (tiempo: 868ms).

---

## 📌 Próximos Pasos / Tareas Pendientes
- [x] Rate limiting ampliado en backend (1000 req/min) y debouncing de filtros implementado.
- [x] Interceptor de código 429 con notificación en frontend configurado.
- [x] Rol Recepcionista autorizado para consultar médicos y agendar citas en backend y frontend.
- [ ] Recibir nuevos requerimientos o ajustes adicionales por parte del usuario.
- [ ] Mantener la bitácora actualizada con cada cambio solicitado.


