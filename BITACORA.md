# Bitácora de Desarrollo - Sistema Veterinario (VetClinic Pro)

**Proyecto:** VeterinariaAPI & Frontend  
**Directorio Frontend:** `frontend/`
**Directorio Backend (.NET):** `VeterinariaAPI/`
**Base de datos actual:** PostgreSQL en Supabase. Las sesiones previas conservan las referencias históricas a SQL Server.
**Última consolidación documental:** 9 de noviembre de 2026.

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

### [Sesión 7] - 31 de Octubre de 2026
**Objetivo:** Resolver el Error 500 en autenticación, implementar la gestión dinámica de recetas médicas, reestructurar integralmente el módulo de facturación (cálculo de IVA 19%, integración con agenda de citas, descuento atómico de inventario y recálculo en edición), subsanar la pantalla en blanco en el frontend y renovar el diseño visual de los modales con tarjetas contextuales sólidas sobre fondo translúcido.

#### 1. Corrección de Error 500 en Login y Resiliencia de Autenticación
- **Diagnóstico:** Se identificó que el archivo de configuración en `VeterinariaAPI` estaba nombrado `appsetting.json` en lugar del estándar `appsettings.json`, impidiendo la carga de la clave JWT (`Jwt:Key`) y provocando `ArgumentNullException`. Adicionalmente, contraseñas existentes en base de datos sin formato base64 producían `FormatException` en el algoritmo de verificación de hash.
- **Solución implementada:**
  - Renombrado del archivo a `appsettings.json` con la configuración completa de Issuer, Audience y Secret Key.
  - En `AuthService.cs`, se implementó captura preventiva de `FormatException` en `VerifyPassword()`, garantizando rechazo limpio (HTTP 401) en lugar de error no controlado (HTTP 500).

#### 2. Módulo de Recetas Médicas (`ConsultasView.jsx` y `Recetas.cs`)
- Habilitada la actualización automática de recetas existentes al emitir un nuevo tratamiento farmacológico.
- Implementado el borrado individual y en cascada de recetas médicas asociadas a una consulta médica desde la interfaz y el backend.

#### 3. Refactorización Integral del Módulo de Facturación (`Facturas.cs`, `DetalleFacturas.cs` y `FacturasView.jsx`)
- **Cálculo Automático del IVA (19% Chileno):**
  - Campos `montoImpuestos` y `montoTotal` configurados como `readOnly`.
  - Cálculo en tiempo real: $\text{IVA} = \text{round}(\text{Subtotal} \times 0.19)$, $\text{Total} = \text{Subtotal} + \text{IVA}$ con redondeo de moneda nacional chilena (CLP).
- **Integración con la Agenda de Citas (`/api/v1/citas`):**
  - Selección de citas médicas creadas previamente en la agenda, mostrando Paciente, Dueño (RUT), Especialidad, Costo Base, Fecha y Estado.
  - Sincronización automática del cliente en la factura con el titular de la cita.
- **Regla Estricta de Selección Única de Cita:**
  - Al incorporar una cita médica a la factura, el selector y el botón "Agregar Cita" se bloquean (`disabled`) con aviso explicativo.
  - Al remover la cita del detalle, el selector se desbloquea inmediatamente para permitir seleccionar otra.
  - Validación en backend (`POST` y `PUT`) rechazando facturas con más de una cita (HTTP 400).
- **Control y Descuento Atómico de Inventario:**
  - Validación de stock disponible antes de cualquier deducción.
  - Transacciones atómicas con EF Core (`IDbContextTransaction` con guarda `db.Database.IsRelational()`) que descuentan el stock únicamente tras confirmar y crear la factura.
  - En edición (`PUT /api/v1/facturas/{id}`), el backend restituye el stock anterior antes de aplicar el nuevo consumo y reformula el IVA (19%) y el monto total automáticamente.

#### 4. Corrección de Pantalla en Blanco en React
- **Diagnóstico:** Omisión del import de `useMemo` desde `'react'` en `FacturasView.jsx`, arrojando `ReferenceError: useMemo is not defined` en el navegador.
- **Solución:** Se incorporó `useMemo` a los imports y se blindaron todas las colecciones con `Array.isArray()` defensivo.
- Creada suite de pruebas unitarias en `frontend/src/test/FacturasView.test.jsx`.

#### 5. Rediseño Visual UI/UX con Tarjetas Contextuales
- Se conservó el efecto translúcido del modal (`glassmorphism` con desenfoque de fondo).
- Todos los textos, encabezados, formularios y tablas se envolvieron en tarjetas visuales de fondo sólido (`#ffffff`), con sombras suaves y acentos cromáticos temáticos:
  - Cabecera de facturación: Tarjeta blanca con insignia verde/azul.
  - Sección 1: Datos de cliente y fecha en tarjeta blanca con etiquetas legibles.
  - Sección 2: Cita médica en tarjeta con acento azul clínico (`#bae6fd`).
  - Sección 3: Insumos en tarjeta con acento verde farmacia (`#bbf7d0`).
  - Sección 4: Tabla de detalles e insignias de subtotales agrupadas en tarjeta sólida.
  - Sección 5: Métricas de IVA y total en tarjetas financieras diferenciadas.
  - Pie de acciones: Botones de confirmación y cancelación en tarjeta inferior blanca.
  - Modal de Detalles (`isDetalleModalOpen`) y `ConfirmModal`: Aplicada la misma arquitectura visual.

#### 6. Verificación Técnica y Suites de Pruebas
- **Backend .NET 8:** 11/11 pruebas unitarias e integración aprobadas (`dotnet test`).
- **Frontend React (Vitest):** 24/24 pruebas aprobadas en 6 suites (`npm test`).
- **Vite Build:** Compilación de producción en 347ms sin advertencias críticas.

---

### Sesión 8 (2026-10-31) - Fase 8: Extensión del Rediseño Visual UI/UX con Tarjetas Contextuales a Todos los Módulos

#### 1. Contexto y Requerimiento
El usuario solicitó extender la arquitectura visual implementada previamente en facturación a todos los demás módulos del sistema:
- Mantener el fondo translúcido general con desenfoque (`modal-overlay` con `backdrop-filter: blur(4px)`).
- Envolver cada encabezado, sección de formulario, ficha técnica y pie de acciones en tarjetas visuales sólidas (`#ffffff`), con bordes suaves (`#e2e8f0`), sombras sutiles (`0 2px 8px rgba(0,0,0,0.06)`), esquinas redondeadas (`0.85rem`) y etiquetas de alto contraste (`#1e293b`).
- Evitar que los textos y campos floten directamente sobre el fondo transparente o se confundan con las tablas y datos subyacentes.

#### 2. Módulos y Modales Adaptados
1. **Módulo de Clientes (`ClientesView.jsx`):**
   - **Modal de Creación / Edición:** Contenedor estilizado con cabecera en tarjeta blanca con insignia azul/verde (`Users`), cuerpo de formulario en tarjeta sólida con etiquetas legibles y pie de acciones alineado a la derecha en tarjeta contextual.
2. **Módulo de Pacientes (`PacientesView.jsx`):**
   - **Modal Detalle de Ficha Clínica:** Encabezado con insignia canina (`Dog`), cuerpo clínico en tarjeta blanca con interlineado óptimo y pie de cierre encapsulado.
   - **Modal de Creación / Edición:** Cabecera con insignia temática, formulario en tarjeta sólida con campos Zod y pie de acciones (`Cancelar` / `Guardar Cambios`).
3. **Módulo de Agenda y Citas (`CitasView.jsx`):**
   - **Modal de Agendamiento / Edición:** Cabecera con insignia violeta de calendario (`Calendar`), cuerpo con selectores de mascota, especialidad, veterinario y fecha en tarjeta blanca, y pie de guardado encapsulado.
4. **Módulo de Consultas y Recetas Médicas (`ConsultasView.jsx`):**
   - **Modal de Consulta Clínica:** Cabecera con insignia médica (`Stethoscope`), formulario de diagnóstico y motivo en tarjeta sólida, y pie de acciones.
   - **Modal de Emisión / Actualización de Receta:** Cabecera con insignia farmacológica (`Pill`), tarjeta de resumen de tutor/paciente con acento celeste (`#bae6fd`), tarjeta de prescripción con medicamentos y dosis, y pie de acciones con soporte de actualización o eliminación.
5. **Módulo de Inventario e Insumos (`InsumosView.jsx`):**
   - **Modal de Insumo / Producto:** Cabecera con insignia de inventario (`Package`), formulario en tarjeta blanca con validaciones de stock y precio, y pie de acciones.
6. **Módulo de Configuración Administrativa (`AdminConfigView.jsx`):**
   - **Modal de Especialidades:** Cabecera con insignia de reconocimiento (`Award`), campos de costo base y nombre en tarjeta sólida, y pie de guardado.
   - **Modal de Roles y Permisos:** Cabecera con insignia de seguridad (`Shield`), campos de nombre y permisos de escritura en tarjeta blanca, y pie de guardado.
7. **Estilos Globales (`index.css`):**
   - Añadida regla predeterminada a `.modal-content` alineada con `.modal-container` para garantizar que ningún modal secundario quede sin fondo sólido si omite estilos específicos.

#### 3. Verificación de Compilación y Suites de Pruebas
- **Vite Build (`npm run build`):** Compilación de producción completada exitosamente sin errores de sintaxis ni de empaquetado (`✓ built in 1.16s`).
- **Frontend Vitest (`npm test -- --run`):** 24 de 24 pruebas aprobadas en 6 suites completas:
  - `clienteSchema.test.js` (5 pruebas)
  - `ProtectedRoute.test.jsx` (4 pruebas)
  - `FacturasView.test.jsx` (2 pruebas)
  - `LoginView.test.jsx` (5 pruebas)
  - `FlowIntegration.test.jsx` (1 prueba E2E integral)
  - `PacientesView.test.jsx` (7 pruebas CRUD y validación)
- **Backend .NET 8 (`dotnet test`):** 11 de 11 pruebas de integración y controladores aprobadas al 100%.

---

## 📌 Próximos Pasos / Tareas Pendientes
- [x] Rate limiting ampliado en backend (1000 req/min) y debouncing de filtros implementado.
- [x] Interceptor de código 429 con notificación en frontend configurado.
- [x] Rol Recepcionista autorizado para consultar médicos y agendar citas en backend y frontend.
- [x] Corrección de Error 500 en Login y manejo de contraseñas legado.
- [x] Gestión completa de recetas (actualización y eliminación en cascada).
- [x] Módulo de facturación con IVA 19% automático, cita única de agenda y descuento atómico de stock.
- [x] Pantalla en blanco solucionada con imports de React y guardas defensivas.
- [x] Rediseño UI/UX de formularios y detalles con tarjetas contextuales sobre fondo translúcido aplicado a Facturación.
- [x] Extensión del rediseño UI/UX con tarjetas contextuales a todos los módulos (Clientes, Pacientes, Citas, Consultas, Insumos, Administración).
- [ ] Recibir nuevos requerimientos o ajustes adicionales por parte del usuario.
- [ ] Mantener la bitácora actualizada con cada cambio solicitado.



---

### Sesión 9 - 01/11/2026: Migración de Base de Datos de SQL Server Local a Supabase PostgreSQL

#### 1. Contexto y Objetivos
- Migración definitiva del motor de base de datos desde Microsoft SQL Server local (Express) hacia PostgreSQL alojado en la nube en **Supabase**.
- Desacoplar por completo cualquier dependencia de SQL Server en el backend, impidiendo cargas y ejecuciones locales dependientes de dicho motor.
- Adaptar Entity Framework Core en .NET 8 con el proveedor oficial `Npgsql.EntityFrameworkCore.PostgreSQL`.

#### 2. Cambios Técnicos Implementados
- **Desinstalación y Limpieza de SQL Server:**
  - Se eliminó el paquete `Microsoft.EntityFrameworkCore.SqlServer` de `VeterinariaAPI.csproj`.
  - Se incorporó `Npgsql.EntityFrameworkCore.PostgreSQL` v8.0.11 unificando dependencias en EF Core 8.0.11.
  - Se eliminó la configuración fallback en `VeterinariodbContext.cs` (`optionsBuilder.UseSqlServer(...)`), garantizando que la API solo consuma la configuración inyectada por Dependency Injection sin fallbacks a instancias locales de SQLEXPRESS.
  - Se eliminaron las migraciones históricas específicas de SQL Server (`20260904061906_InitialCreate`) que generaban incompatibilidades con los extension methods de Npgsql.
- **Configuración de Conexión a Supabase:**
  - En `VeterinariaAPI/Program.cs`, se implementó el parser para el URI de conexión (`postgresql://...`).
  - Se integró la resolución automática hacia el Transaction/Session Pooler de Supabase (`aws-0-us-east-2.pooler.supabase.com:5432`) con autenticación `postgres.<project_ref>`, previniendo errores de resolución DNS en redes IPv4 (fallo clásico `WSANO_DATA` en el host directo `db.*.supabase.co`).
- **Pruebas y Verificación:**
  - Se añadió la prueba de conectividad directa a Supabase `Test_Supabase_Connection` en `VeterinariaAPI.Tests/ApiIntegrationTests.cs`.
  - Pruebas del Backend: **7/7 pruebas superadas exitosamente** (`dotnet test`).
  - Pruebas del Frontend: **22/22 pruebas superadas exitosamente** (`npm test -- --run`).

---

### Sesión 10 - 09/11/2026: Coordinación de los registros de desarrollo y asistencia

**Objetivo técnico:** Establecer un mecanismo de documentación coordinada de
las modificaciones del proyecto en `AI_LOG.md` y `BITACORA.md`, con redacción
técnica y académica y sin reproducir literalmente las instrucciones del usuario.

**Implementación realizada:** Se amplió la regla de trabajo en `AGENTS.md` para
exigir que cada intervención que modifique código, configuración, interfaz,
pruebas o documentación actualice ambos registros en la misma entrega. Se
definió que la bitácora de desarrollo describa el objetivo, la implementación,
los componentes afectados y la validación, mientras que el registro de IA
documente el requerimiento reformulado y la intervención asistida. Las entradas
deben mantener coherencia en fecha, alcance y resultados.

**Archivos afectados:** `AGENTS.md`, `AI_LOG.md` y `BITACORA.md`.

**Validación:** Se revisó la correspondencia entre ambas entradas y las
instrucciones del proyecto, y se verificó el formato con `git diff --check`.
No se ejecutaron pruebas de software por tratarse de cambios documentales.

**Resultado:** Regla de actualización conjunta incorporada a las instrucciones
del repositorio y registrada en ambos documentos. Se conserva el historial
previo; esta sesión no certifica ni actualiza resultados técnicos anteriores.

---

### Sesión 11 - 09/11/2026: Consolidación de auditoría, acceso facial e interfaz

**Objetivo técnico:** Documentar los avances recientes de trazabilidad,
autenticación, estabilidad de listados, presentación visual y configuración
reutilizable. Esta sesión consolida implementaciones ya realizadas; su
redacción no representa una nueva ejecución ni un despliegue del programa.

#### 1. Auditoría administrativa

- Incorporación del modelo y mapeo de `Auditoria`, captura de operaciones
  `CREAR`, `MODIFICAR` y `ELIMINAR` mediante Entity Framework Core, identificación
  de responsable y agrupación de eventos por operación.
- Exclusión de contraseñas, tokens y descriptores faciales mediante selección
  explícita de campos registrables.
- Endpoints de consulta restringidos a administradores, con filtros, búsqueda,
  paginación, resúmenes y comparación de valores anteriores y nuevos.
- Corrección de `Connection already open` en el contexto auxiliar de auditoría,
  preservando el uso de la conexión y transacción de la operación de negocio.
- Historial con tarjetas de resumen, etiquetas diferenciadas, consulta de
  detalles y eliminación de identificadores con almohadilla en el listado.
- Exportación CSV de la página visible y preparación de PDF con selección de
  1 a 100 registros, una consulta paginada, vista previa y salida mediante la
  impresión del navegador. El límite acota la transferencia; no garantiza por
  sí solo la capacidad de la base de datos.

**Componentes:** modelos y contexto de auditoría, `AuditOperation.cs`,
`Endpoints/Auditoria.cs`, `AuditoriaView.jsx`, `AuditoriaView.css` y pruebas
asociadas. La captura no cubre cambios directos por SQL ni reconstruye eventos
anteriores. No se verificó la atomicidad en PostgreSQL aislado.

#### 2. Estabilidad y presentación de los listados

- Orden ascendente por identificador en los repositorios para conservar la
  posición de los registros después de modificarlos.
- Estilo compartido entre los listados clínicos, comerciales y administrativos,
  basado en la tabla del historial: encabezados compactos, separadores,
  etiquetas y controles redondeados, con soporte claro, oscuro y móvil.
- Rediseño de las secciones de Administración con iconos, indicador activo y
  etiqueta visual para los datos de demostración. Esta etiqueta no implica
  que la base conectada sea un entorno aislado.
- Eliminación de subtítulos descriptivos de los módulos y referencias visibles
  a rutas de API, conservando instrucciones y mensajes de los formularios.
- Barra lateral desplegable mediante botón, recuperación del ancho de
  contenido en escritorio, cierre con Escape y al navegar en móvil, gestión de
  foco y exclusión de interacción del panel oculto.

**Componentes:** repositorios, vistas de los módulos, `AdminConfigView.css`,
`App.jsx`, `index.css` y `ListOrderingTests.cs`.

#### 3. Reconocimiento facial en el inicio de sesión

- Validación inicial de correo y contraseña. Las cuentas sin registro facial
  activo reciben acceso convencional; las cuentas con registro activo deben
  completar la comprobación facial antes de recibir su JWT.
- Desafío aleatorio de un solo uso, con vigencia de dos minutos y almacenamiento
  temporal en memoria. Los cambios de credenciales o registro invalidan la
  verificación pendiente.
- Captura mediante cámara, extracción local del descriptor con face-api.js y
  comparación en el servidor con el descriptor descifrado mediante AES-256-GCM.
  Se utiliza distancia euclídea y umbral de 0,5.
- Actualización de `UltimoAcceso` y registro de auditoría atribuido al usuario
  verificado. La cámara se libera al finalizar, cancelar, vencer o abandonar
  el paso; la sesión no se guarda mientras la verificación está pendiente.

**Componentes:** `LoginFacial.cs`, `FacialLoginChallenges.cs`,
`FacialEncryptionService.cs`, `Usuarios.cs`, `FacialLoginStep.jsx`,
`AuthContext.jsx`, `LoginView.jsx` y servicios y pruebas asociados.

**Limitaciones:** No existe detección de vida; el descriptor generado en el
cliente no demuestra presencia física. La cámara requiere HTTPS o localhost.
Los desafíos son locales al proceso y no sobreviven a reinicios. Las pruebas
no certifican precisión con usuarios y cámaras reales.

#### 4. Configuración y documentación

- Creación de `appsettings.json.example` y
  `appsettings.Development.json.example` con campos para completar, sin secretos.
- Adecuación de `.env.example` para Supabase, JWT y cifrado facial. El backend
  requiere que las variables se proporcionen al proceso y no lee `.env`
  automáticamente. Se comprobó la sintaxis de las plantillas JSON.
- Actualización del encabezado de esta bitácora para reflejar Supabase y usar
  directorios relativos, conservando intactos los registros históricos.
- Consolidación coordinada de este registro y de la sección 8 de `AI_LOG.md`.
  La regla vigente documenta cambios efectivos de código; no registra consultas
  explicativas sin implementación, salvo solicitud documental expresa.

#### 5. Validación observada

| Comprobación | Evidencia |
| --- | --- |
| Backend con login facial | 86 pruebas locales aprobadas, excluida la prueba externa de conexión a Supabase. |
| Login facial tras el ajuste de atribución de auditoría | 6 casos dirigidos aprobados. |
| Frontend tras la barra desplegable | 65 pruebas aprobadas en 14 archivos. |
| Suite de navegador previa a la barra desplegable | 9 pruebas aprobadas con API simulada. |
| Barra lateral desplegable | 1 prueba adicional dirigida aprobada en escritorio y móvil. |
| Compilación frontend | Correcta; avisos existentes de tamaño de paquetes y compatibilidad de `fs`. |

Los resultados proceden de ejecuciones anteriores observadas en esta
conversación; no se presentan como una nueva ejecución conjunta de todas las
pruebas. Las pruebas de API utilizan InMemory. La prueba de registro desde
fotografía utiliza modelos locales reales y una imagen de prueba, con API
simulada. Estas verificaciones no modificaron Supabase.

**Validación documental actual:** Contraste con los archivos y resultados
observados, y revisión de formato con `git diff --check`. No se volvieron a
ejecutar las suites por tratarse de una actualización documental.

**Estado de entrega:** Modificaciones disponibles en el directorio de trabajo;
esta intervención no crea commits, sube cambios a GitHub ni realiza despliegues.
