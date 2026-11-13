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

---

### Sesión 12 - 09/11/2026: Confirmaciones posteriores a operaciones RF-51

**Objetivo técnico:** Completar el requerimiento de mensajes de éxito para las
operaciones de registro, modificación y eliminación que anteriormente solo
cerraban formularios o refrescaban listados.

**Implementación:** Se añadió un servicio de notificación y un componente
compartido en el contenedor autenticado. Se integraron confirmaciones en
clientes, pacientes, citas, consultas, inventario, facturas y sus detalles,
especialidades, roles y eliminación de usuarios. Los avisos se emiten después
de recibir la confirmación del servidor y se mantienen fuera del formulario,
por lo que continúan visibles al cerrarlo o navegar entre módulos. Se preservan
las confirmaciones contextuales previamente implementadas para usuarios nuevos,
recetas, registro facial y datos de demostración.

El componente permite cierre manual, retirada automática a los ocho segundos,
pausa al interactuar mediante puntero o teclado, anuncio accesible y adaptación
a los temas claro y oscuro. Las cancelaciones y errores no generan mensajes de
éxito. Se evitó un interceptor genérico de respuestas para no anunciar como
operación completada una solicitud intermedia de un flujo compuesto.

**Componentes afectados:** `App.jsx`, el servicio `notifications.js`, el
componente `SuccessNotification` con sus estilos, las vistas de los módulos
indicados, pruebas de frontend y navegador, `AI_LOG.md` y `BITACORA.md`.

**Validación ejecutada:**

| Comprobación | Resultado |
| --- | --- |
| Suite de frontend | 69 pruebas aprobadas en 15 archivos; cuatro nuevas pruebas de notificaciones. |
| Suite de navegador con API simulada | 11 pruebas aprobadas; se verificaron alta, modificación, eliminación y rechazo sin aviso de éxito. |
| Compilación de producción | Correcta, con los avisos preexistentes de tamaño de paquetes y compatibilidad de `fs`. |
| Formato de cambios | Comprobado mediante `git diff --check`. |

El primer intento del nuevo caso de navegador falló por un selector demasiado
estricto para una etiqueta con indicador obligatorio. Se ajustaron los
selectores a los controles reales; la prueba dirigida y la suite posterior
finalizaron correctamente.

**Resultado y alcance:** RF-51 dispone ahora de confirmación explícita en las
operaciones revisadas. El aviso acredita la respuesta satisfactoria del
guardado o eliminación, no la recarga posterior del listado. No se modificó el
backend ni la base de Supabase; no se ejecutaron pruebas de backend ni se
realizaron commits o publicaciones en esta intervención.

---

### Sesión 13 - 09/11/2026: Prueba inicial con veinte usuarios concurrentes

**Objetivo técnico:** Comprobar operaciones simultáneas de pacientes y producir
mediciones iniciales sin intervenir la base de Supabase.

**Implementación:** Se añadió `VeterinariaAPI.Tests/ConcurrentPatientsTests.cs`.
La prueba prepara veinte cuentas veterinarias y un propietario en una base
InMemory aislada y utiliza veinte sesiones HTTP distintas con JWT de prueba.
Tras el calentamiento y veinte lecturas secuenciales de referencia, ejecuta
cinco ráfagas coordinadas: crear veinte pacientes, consultarlos, actualizarlos,
comprobar sus modificaciones y eliminarlos. Se mantiene la configuración de
autorización y los límites de solicitudes de la aplicación.

**Resultados de la ejecución final:**

| Indicador | Resultado |
| --- | --- |
| Sesiones virtuales autenticadas | 20 cuentas distintas |
| Solicitudes simultáneas en vuelo | Pico de 20 en cada fase |
| Solicitudes de las cinco ráfagas | 100, con 0 errores |
| Pacientes de prueba creados y eliminados | 20 creados y 20 eliminados |
| Pacientes restantes del lote | 0; se conserva el total inicial de 6 pacientes del fixture |
| Auditoría comprobada | 60 eventos de pacientes y correspondencia de responsable |
| Máximo de creación | 59,99 ms |
| Máximo de consulta | 17,22 ms |
| Máximo de modificación | 19,38 ms |
| Máximo de comprobación de modificaciones | 21,68 ms |
| Máximo de eliminación | 18,35 ms |

La prueba dirigida terminó correctamente. También se limpiaron el propietario
y las cuentas de prueba. Se generó
`VeterinariaAPI.Tests/TestResults/concurrencia-pacientes-20.json`, con tiempos
medios, percentil 95, máximos y errores. Este resultado queda fuera de Git por
estar en un directorio de resultados de pruebas. Se verificó el formato de los
cambios con `git diff --check`.

**Limitaciones:** Los resultados corresponden a TestServer e InMemory; no
incluyen tráfico de red, tiempos de PostgreSQL, Supabase, carga de interfaz,
pruebas sostenidas ni autenticación simultánea mediante el endpoint de login.
La concurrencia medida es de solicitudes HTTP pendientes. Esta evidencia es
inicial y no demuestra el cumplimiento de los RNF de rendimiento en producción.
No se realizaron cambios de optimización de consultas ni modificaciones en
Supabase. No se ejecutaron nuevamente las suites completas de frontend o
backend; se ejecutó exclusivamente el nuevo escenario dirigido.

**Archivos afectados:** el nuevo archivo de pruebas y ambas bitácoras.

---

### Sesión 14 - 09/11/2026: Optimización de consultas RNF-04

**Objetivo técnico:** Reducir lecturas y transferencia de datos innecesarias
en los módulos existentes, preservando sus reglas funcionales y de seguridad.

**Implementación:**

| Área | Antes | Cambio aplicado |
| --- | --- | --- |
| Listados de doce endpoints | Entidades rastreadas aunque solo se consultaban | `AsNoTracking` en las lecturas; edición y auditoría mantienen seguimiento. |
| Validación de clientes | Descarga de la tabla para comprobar duplicados | Comprobaciones `AnyAsync` de existencia, manteniendo normalización y exclusión del registro editado. |
| Usuarios y citas | Materialización de entidades completas de usuario | Proyección SQL de campos visibles, sin recuperar hashes de contraseña para el listado. |
| Dashboard | Seis solicitudes y seis listados completos para contar y mostrar vistas previas | Una solicitud de resumen; en PostgreSQL, seis conteos escalares en un comando y dos consultas con límite de cinco registros cada una. |
| Historial de auditoría | Conteo adicional además de la agrupación por acción | Total derivado de la agrupación existente. |
| Vista de consultas | Recarga de recetas al filtrar consultas | Carga inicial y actualización posterior a operaciones sobre recetas. |

Se preservó el orden por identificador de las vistas previas del dashboard y
se incorporó cancelación de su solicitud al abandonar la vista. Los conteos
del resumen representan la totalidad de cada entidad, aunque se limite la
cantidad de registros de las vistas previas.

**Archivos afectados:** `Endpoints/Dashboard.cs`, endpoints de listados y
auditoría, `Program.cs`, `DashboardView.jsx`, `ConsultasView.jsx`, nuevas pruebas
de consultas y dashboard, pruebas de navegador y ambas bitácoras.

**Validación ejecutada:**

- Backend: 93 pruebas aprobadas en la suite local, excluyendo la prueba externa
  de conexión a Supabase y el escenario de concurrencia.
- Concurrencia: el escenario de veinte sesiones se ejecutó por separado y pasó.
- Frontend: 71 pruebas aprobadas en 16 archivos.
- Navegador: 12 pruebas aprobadas con API simulada, incluida la carga del
  dashboard sin descargar los seis listados.
- Construcción del SQL de conteos de PostgreSQL: comprobada mediante
  `ToQueryString`, sin abrir una conexión a la base.
- Compilaciones de backend y frontend: correctas. Revisión de formato mediante
  `git diff --check`.

**Resultado y alcance:** Se eliminaron lecturas masivas y repetidas en los
flujos indicados. No se aplicaron cambios de esquema, índices o datos en
Supabase. No se midieron latencias de PostgreSQL ni se ejecutó `EXPLAIN ANALYZE`;
por ello no se declara una reducción porcentual ni cumplimiento definitivo de
tiempos en producción. La paginación obligatoria de todos los listados queda
fuera de esta intervención para conservar sus contratos y formularios actuales.
Las pruebas funcionales usan InMemory y el escenario de concurrencia tampoco
representa un ensayo sobre PostgreSQL real.

---

### Sesión 15 - 09/11/2026: Errores comprensibles y accesibilidad de formularios

**Objetivo técnico:** Resolver las deficiencias observadas en RNF-15 y RNF-17
y reforzar las medidas de accesibilidad de RNF-18, mediante componentes comunes
y comprobaciones automatizadas verificables.

**Implementación realizada:**

| Requisito | Mejoras |
| --- | --- |
| RNF-15 | Formateo común de errores de conexión y HTTP, instrucciones de recuperación, aviso global para consultas fallidas y normalización de errores por campo. Los mensajes de servidor no exponen detalles internos y las cancelaciones no generan avisos de error. |
| RNF-17 | Indicadores y leyendas comunes de obligatoriedad, atributos `required`, etiquetas asociadas a controles y mensajes de validación enlazados. Se enfoca el primer error y se mejoró la validación individual al crear usuarios. |
| RNF-18 | Contención y restauración del foco en diálogos, Escape, enlace de salto, activación de tarjetas mediante teclado, ajustes de contraste y foco, controles accesibles y preferencias de movimiento reducido. |

Se incorporaron `AccessibleForm`, `AccessibleDialog`, `ErrorNotification`,
`apiErrors.js` y `accessibility.css`. Se adaptaron los formularios y los diálogos
de los módulos, incluida la confirmación de eliminación. Se corrigió un selector
de citas de facturación sin nombre accesible. Se ajustaron los esquemas para
rechazar costo base y stock vacíos sin rechazar el valor explícito cero, que
continúa permitido. El dashboard utiliza columnas flexibles en pantallas estrechas.

**Validación ejecutada:**

- **Frontend:** 88 pruebas aprobadas en 19 archivos.
- **Navegador:** 17 pruebas aprobadas con una API simulada.
- **axe:** 30 estados de listados y formularios en ambos temas sin infracciones
  detectadas de las reglas seleccionadas. Se comprobó adicionalmente el login
  con errores en modo claro y oscuro.
- **Interacción:** comprobaciones de foco dentro de un diálogo, restauración al
  cerrar, primer error de formulario, cierre de avisos, salto al contenido y una
  vista móvil con texto al 200 % sin desbordamiento horizontal.
- **Compilación de producción:** correcta, con los avisos de paquetes ya
  existentes. Formato revisado mediante `git diff --check`.

Durante la revisión se detectaron y corrigieron fallos de contraste en estados,
stock, importes y una leyenda sobre fondo translúcido, así como el nombre del
selector de facturación. Se actualizaron selectores de pruebas afectados por
las nuevas etiquetas y se corrigió una espera de carga antes del primer Tab.

**Archivos afectados:** componentes y estilos compartidos de accesibilidad,
interceptor y formateador de errores, vistas de módulos, formularios, esquemas
de costo y stock, archivos de pruebas, dependencias de desarrollo y ambas
bitácoras. La referencia técnica fue [WCAG 2.2](https://www.w3.org/TR/WCAG22/).

**Resultado y limitaciones:** Se implementaron las mejoras funcionales y las
comprobaciones indicadas. No se declara una certificación integral WCAG 2.2 AA:
faltan evaluaciones manuales completas, tecnologías de asistencia, otros
navegadores y estados no incluidos en la muestra. La prueba de ampliación de
texto cubre la vista de clientes. No se modificó Supabase ni se realizaron
pruebas nuevas de backend, commits o despliegues en esta intervención.

## Sesión 16 — 09/11/2026 — Simplificación de leyendas en formularios

**Objetivo:** Eliminar el texto auxiliar general que explica la obligatoriedad de los campos, preservando las validaciones y los indicadores existentes.

**Implementación y componentes afectados:** Se eliminó la leyenda del componente compartido `frontend/src/components/AccessibleForm.jsx` y su estilo sin uso en `frontend/src/accessibility.css`. Se actualizaron simultáneamente esta bitácora y `AI_LOG.md`. Los asteriscos, los campos obligatorios y el tratamiento de errores conservan su comportamiento.

**Validación y resultado:** Las tres pruebas de controles accesibles finalizaron correctamente. La búsqueda de la leyenda y de su clase en el código fuente del frontend no obtuvo coincidencias. No se realizó una nueva comprobación visual ni una ejecución completa de pruebas; no se modificaron el backend ni la base de datos.

## Sesión 17 — 09/11/2026 — Contornos uniformes en administración

**Objetivo:** Unificar la presentación de las opciones del menú administrativo mediante un contorno redondeado común.

**Implementación y componentes afectados:** Se modificó `frontend/src/views/AdminConfigView.css` para aplicar el borde temático a todas las pestañas, incluidas especialidades, roles de seguridad y cuentas de usuario. Se retiró el selector posicional limitado a las tres primeras opciones. Se actualizaron simultáneamente `AI_LOG.md` y esta bitácora.

**Validación y resultado:** La compilación de producción del frontend terminó correctamente, con los avisos preexistentes de face-api.js y tamaño de paquetes. No se efectuó una inspección visual en navegador ni se modificaron el backend o la base de datos.

## Sesión 18 — 11/11/2026 — Migración inicial sin aplicación remota

**Objetivo:** Versionar el esquema actual mediante EF Core sin alterar la base Supabase.

**Implementación:** Se incorporaron la migración InicialPostgreSQL, su diseñador, snapshot y script SQL; una fábrica de contexto exclusiva de diseño con conexión local inoperante; y el manifiesto de dotnet-ef 8.0.11. Se adaptó FechaEmision a CURRENT_DATE y se actualizaron README, AI_LOG y esta bitácora. Componentes: VeterinariaAPI/Migrations, VeterinariaAPI/Data/VeterinariodbContextFactory.cs, VeterinariaAPI/Models/VeterinariodbContext.cs, .config/dotnet-tools.json y database/migraciones/InicialPostgreSQL.sql.

**Validación:** Compilación Release y generación SQL correctas; ausencia de cambios pendientes del modelo verificada tras recompilar el ensamblado con la nueva migración. Script con 14 tablas del modelo y tabla de historial. Revisión de espacios mediante git diff --check correcta. No se ejecutó la suite de pruebas.

**Resultado y límites:** Archivos generados localmente sin aplicar migraciones, ejecutar SQL, iniciar la API ni conectar a Supabase. Pendientes la validación en PostgreSQL desechable y la comparación con el esquema real. La migración inicial completa requiere un procedimiento específico de adopción antes de utilizarse en una base existente.

## Sesión 19 — 11/11/2026 — Paciente determinado por la cita

**Objetivo:** Evitar selecciones inconsistentes de paciente al crear o editar consultas asociadas a una cita.

**Implementación:** Se modificó frontend/src/views/ConsultasView.jsx para asignar el paciente de la cita, mostrar únicamente esa opción y bloquear su modificación. La atención sin cita permite selección libre. Se conservó la validación existente del backend para creación y edición. Se incorporó frontend/src/test/ConsultaPaciente.test.jsx y se actualizaron AI_LOG.md y BITACORA.md.

**Validación y resultado:** Una prueba de interfaz y doce pruebas de validación de backend aprobadas; compilación frontend satisfactoria con avisos previos. La prueba de backend aprobada utilizó almacenamiento en memoria y permisos ampliados tras una ejecución restringida sin finalización. No se comprobó visualmente en navegador ni se modificó Supabase. Los cambios de migraciones previos se mantienen separados de esta intervención.

## Sesión 20 — 11/11/2026 — Selección contextual de paciente y cita

**Objetivo:** Incorporar búsqueda textual de pacientes y limitar las opciones de cita al animal seleccionado, excluyendo las completadas.

**Implementación:** Se modificaron ConsultasView.jsx y ConsultaPaciente.test.jsx. Los resultados muestran animal, especie y datos de propietario; la búsqueda admite nombre, especie, dueño o RUT. Cambiar la búsqueda limpia paciente y cita, y la selección explícita establece el animal. Se preservan asociaciones históricas completadas en edición sin ofrecerlas como nuevas opciones. Se actualizaron AI_LOG.md y BITACORA.md.

**Validación y límites:** Una prueba de interfaz aprobada que cubre búsqueda, filtrado por paciente y estado, cambio de animal y resultado vacío; compilación satisfactoria con avisos previos. No se realizó inspección visual ni pruebas nuevas del backend. La intervención no modifica la base de datos ni añade restricciones de estado al servidor.

## Sesión 21 — 11/11/2026 — Búsqueda de pacientes sin listado inicial

**Objetivo:** Mostrar coincidencias únicamente al introducir texto y mantener vacío el campo al crear consultas.

**Implementación:** En ConsultasView.jsx se retiraron la preselección inicial y la apertura del listado al enfocar; los resultados requieren texto significativo. Se conserva el paciente de consultas existentes. Se ampliaron las comprobaciones de ConsultaPaciente.test.jsx y se actualizaron AI_LOG.md y BITACORA.md.

**Validación y límites:** Una prueba de interfaz aprobada para inicio vacío, clic y foco sin despliegue, texto en blanco, búsqueda, selección previa y borrado; mantiene las verificaciones de citas por paciente y estado. Sin inspección visual ni nueva compilación en esta intervención. Backend y Supabase sin modificaciones.

## Sesión 22 — 11/11/2026 — Emisión del día y recetas sin valores predefinidos

**Objetivo:** Solicitar los datos de nuevas recetas sin contenido preseleccionado y controlar la coherencia temporal de recetas y facturas.

**Implementación:** Se vaciaron los valores iniciales de fechas, medicamento, dosis y duración en ConsultasView.jsx, conservando datos existentes al editar. Se centralizó la fecha de Chile y su validación en dateValidation.js y los esquemas de recetas y facturas, con límites de calendario en ambos formularios. BusinessValidationFilter rechaza emisiones distintas de hoy en creación y edición; mantiene el rechazo de vigencia anterior. Se actualizaron FacturasView.jsx, pruebas de negocio, auditoría, esquemas, ConsultaPaciente.test.jsx y el nuevo EmissionDates.test.js. AI_LOG.md y esta bitácora se actualizaron conjuntamente.

**Validación:** 90 pruebas frontend de la suite aprobadas; tras añadir la comprobación de receta vacía, dos pruebas del archivo afectado aprobadas. 95 pruebas backend aprobadas, excluyendo prueba externa Supabase y concurrencia separada. Compilación frontend correcta con avisos previos. Casos cubiertos: emisión de hoy, ayer y mañana; creación y edición; límites de vigencia; cambio de fecha chilena respecto de UTC; datos iniciales vacíos y límites de controles.

**Resultado y limitaciones:** La restricción alcanza emisiones de recetas y facturas, no agenda ni filtros históricos. También limita la edición de documentos históricos conforme a la regla solicitada, sin actualizar sus fechas automáticamente. No se ejecutaron pruebas de navegador, no se modificó Supabase ni se aplicaron migraciones.

## Sesión 23 — 11/11/2026 — Alta de insumos sin valores predefinidos

**Objetivo:** Requerir el ingreso explícito de nombre, categoría, stock y precio al crear insumos.

**Implementación:** En InsumosView.jsx se vaciaron los valores iniciales y de apertura de tipo, stock y precio, manteniendo vacío el nombre y agregando una opción de categoría sin selección. Se conservaron los valores existentes en edición y las validaciones actuales. Se actualizaron ambas bitácoras.

**Validación y límites:** Cuatro pruebas de RequiredNumbers.test.js aprobadas. Sin nueva compilación o revisión visual; backend y Supabase sin cambios.

## Sesión 24 — 11/11/2026 — Localización de clientes al facturar

**Objetivo:** Permitir seleccionar clientes por nombre o RUT mediante resultados de búsqueda contextual.

**Implementación:** FacturasView.jsx incorpora campo vacío para nuevas facturas y resultados debajo únicamente al escribir texto significativo. Los resultados muestran nombre y RUT; se normalizan tildes, mayúsculas y formato del RUT. Se mantiene la selección existente al editar y su sincronización cuando se asigna por cita. Se añadió FacturaCliente.test.jsx y se actualizaron AI_LOG.md y esta bitácora.

**Validación y límites:** Prueba de interfaz aprobada para búsqueda, selección, inicio vacío, foco y ausencia de resultados; compilación satisfactoria con avisos previos. No se ejecutaron nuevas pruebas de backend ni inspección visual en navegador. No se modificó la base de datos.

## Sesión 25 — 11/11/2026 — Citas por propietario en facturación

**Objetivo:** Evitar que el selector de facturación muestre citas de otros clientes.

**Implementación:** En FacturasView.jsx se eliminó la devolución del catálogo completo ante ausencia de cliente o coincidencias. Se conserva todo estado, incluidas citas completadas; se limpia la cita al cambiar la búsqueda de cliente y se verifica su disponibilidad al incorporarla. Se precisaron los mensajes del selector y se amplió FacturaCliente.test.jsx. Ambas bitácoras se actualizaron conjuntamente.

**Validación y límites:** Una prueba de interfaz aprobada para pertenencia, completadas, cliente sin citas y reinicio de selección. Sin nueva compilación, inspección visual ni pruebas de backend. Supabase sin modificaciones.

## Sesión 26 — 11/11/2026 — Mensajes de información faltante en facturación

**Objetivo:** Explicar al usuario los datos o conceptos pendientes cuando intenta emitir una factura incompleta.

**Implementación:** FacturasView.jsx permite activar Confirmar y Emitir Factura y muestra conjuntamente errores de campos, aviso general y explicación de incorporación de conceptos, impidiendo enviar mientras falten datos. Se mantiene el foco en el primer campo inválido. Se amplió FacturaCliente.test.jsx y se actualizaron AI_LOG.md y BITACORA.md.

**Validación y límites:** Dos pruebas de interfaz aprobadas, incluida la comprobación de errores asociados, foco y ausencia de solicitudes de creación ante información incompleta. Compilación correcta con avisos previos. Sin inspección visual ni pruebas nuevas de backend; base de datos sin modificaciones.

## Sesión 27 — 11/11/2026 — Formulario de facturación adaptable

**Objetivo:** Facilitar el uso de facturación al 100 % de zoom con campos y acciones accesibles dentro de la pantalla.

**Implementación:** FacturasView.jsx y el nuevo FacturasView.css incorporan distribución de dos columnas en escritorio, una columna en móvil, ventana de ancho adaptable, límite de altura y cuerpo desplazable separado de encabezado y botones. El portal del diálogo evita superposición de la barra lateral y cabecera sobre el formulario. Se incorporó una prueba de adaptación en e2e/accesibilidad.spec.js y se actualizaron AI_LOG.md y BITACORA.md.

**Validación:** Dos pruebas unitarias de facturación aprobadas, compilación correcta con avisos previos y una prueba de navegador aprobada en tres resoluciones: 1366x768, 1920x1080 y 390x844. Se verificaron límites de pantalla, controles visibles, ausencia de desbordamiento horizontal y ausencia de desplazamiento vertical en el estado inicial de escritorio. Capturas de escritorio y móvil inspeccionadas tras corregir interferencias de capas.

**Resultado y límites:** El formulario inicial cabe completo en las resoluciones de escritorio comprobadas; en pantallas pequeñas o con contenido extenso se desplaza únicamente el cuerpo, conservando las acciones visibles. Validación de navegador con datos simulados en Edge, sin cambios en backend o Supabase.

## Sesión 28 — 11/11/2026 — Ejecución reproducible con Docker Compose

**Objetivo:** Contenerizar la interfaz y API de VetClinic y verificar su funcionamiento mediante PostgreSQL local sin afectar Supabase.

**Implementación:** Se crearon VeterinariaAPI/Dockerfile, frontend/Dockerfile y sus .dockerignore, compose.yaml, compose.sandbox.yaml y frontend/docker/nginx.conf. La interfaz compilada utiliza Nginx con proxy de mismo origen y resolución de rutas SPA; ambos servicios finales ejecutan usuarios no root. Se añadieron comprobaciones HTTP de vida y disponibilidad de base, dependencia de servicios saludables, plantilla .env.docker.example y script Start-DockerSandbox.ps1 con claves aleatorias persistidas en archivo privado ignorado. El sandbox inicializa exclusivamente su volumen PostgreSQL vacío con el SQL de la migración inicial. Se incorporaron pruebas de salud del backend y una prueba de navegador Docker independiente. Se actualizaron frontend/package.json, .gitignore, README.md, AI_LOG.md y esta bitácora.

**Validación:** Configuración Compose válida, imágenes construidas, tres servicios saludables y sintaxis Nginx correcta. Prueba real sobre PostgreSQL: login, listados, dashboard y creación, modificación y eliminación de un cliente temporal. Una prueba de navegador aprobada sin API simulada cubrió proxy, rechazo anónimo, manifiesto facial, autenticación y recarga de ruta con sesión. Suite backend: 97 aprobadas, con conexión externa y concurrencia separada excluidas. Readiness respondió 503 con la base local detenida y 200 tras recuperarla. Se comprobó ausencia de archivos privados de configuración en las imágenes finales, ejecución sin root y reutilización de configuración y volumen al repetir el arranque. Persisten avisos de compilación preexistentes.

**Resultado y límites:** Sandbox local disponible en http://localhost:15173, sin conexión a Supabase y con sus propios registros. El SQL inicial fue ejecutado en PostgreSQL local; quedan pendientes equivalencia de esquema remoto, pruebas completas de todos los módulos y aplicación posterior mediante EF CLI. No se implementaron TLS, despliegue público o pipeline. Para usar Supabase se requiere completar la configuración privada y considerar las escrituras del sembrado existente. Sin commits, push ni publicación de imágenes en esta intervención.

## Sesión 29 — 11/11/2026 — Asociación clínica de los detalles de factura

**Objetivo:** Conservar el identificador de la consulta al facturar una atención y evitar que una cita seleccionada quede fuera del detalle sin advertencia.

**Implementación:** FacturasView.jsx utiliza el catálogo de consultas para resolver la atención mediante CitaId, envía ConsultaId y exige incorporar la selección al detalle antes de emitir. Se informa cuando una cita aún no tiene consulta. BusinessValidationFilter completa y valida la referencia clínica en creación y edición y rechaza atenciones sin consulta. Las líneas de producto conservan únicamente InsumoId. Se ampliaron FacturaCliente.test.jsx y BusinessValidationTests.cs, y se prepararon consultas reales en dos pruebas antiguas de ApiIntegrationTests.cs. README, AI_LOG y esta bitácora se actualizaron conjuntamente.

**Validación:** 95 pruebas frontend y 99 backend aprobadas; se excluyeron prueba externa de Supabase y concurrencia separada. Compilación y reconstrucción de Docker correctas. En PostgreSQL local se verificaron referencias separadas en factura mixta, permanencia de ConsultaId al editar y rechazo de cita sin consulta. La comprobación HTTP requirió corregir la preparación de identificadores escalares; los registros temporales se retiraron. Persisten avisos previos de compilación.

**Resultado y límites:** El sandbox funciona con el ajuste. Una fila de insumo mantiene ConsultaId nulo por diseño; la atención corresponde a otra fila con su referencia clínica. No se alteraron datos de Supabase, facturas históricas ni estructura de tablas. La aplicación ejecutada fuera de Docker requiere recargar el backend para incorporar el cambio.

## Sesión 30 — 11/11/2026 — Prevención de envíos repetidos en formularios

**Objetivo:** Bloquear temporalmente las acciones de registro y actualización para impedir solicitudes consecutivas mientras la operación anterior no finaliza.

**Implementación:** Se añadió useAsyncActionLock.js con una referencia de exclusión inmediata y estado de procesamiento. AccessibleForm y SubmitButton centralizan el bloqueo, texto de espera y aria-busy. Trece controles de envío en diez componentes utilizan el comportamiento compartido. ConfirmModal incorpora el mismo mecanismo para confirmaciones de registro facial, generación de datos y otras acciones, bloqueando además su cancelación pendiente. Se actualizaron componentes de formularios, pruebas, README.md, AI_LOG.md y esta bitácora.

**Validación:** 98 pruebas frontend y 19 pruebas de navegador aprobadas. Se comprobaron eventos repetidos, una sola solicitud durante la espera, recuperación después de un error y un nuevo envío permitido tras finalizar, además de la preservación de restricciones y foco. Se ajustaron la sincronización de un caso previo y el nombre del diálogo del nuevo caso de navegador antes de la ejecución final. Compilación frontend y reconstrucción de su imagen Docker satisfactorias, con avisos previos.

**Resultado y límites:** Protección por instancia en la interfaz, sin idempotencia general del servidor ni modificación de duplicados anteriores. Backend y Supabase sin cambios en esta intervención. API y base Docker estaban detenidas al finalizar la comprobación; se dejó también detenido el frontend actualizado, con su imagen lista para el próximo inicio. Sin nuevas pruebas backend, commits o push.

## Sesión 31 — 11/11/2026 — Entrada numérica sin exponentes ni expresiones

**Objetivo:** Evitar caracteres y notaciones no admitidas en campos numéricos, conservando enteros o decimales según la magnitud del negocio.

**Implementación:** NumericInput.jsx centraliza las restricciones de teclado, pegado, arrastre y cambio de valor. Se aplicó a diecisiete controles de seis vistas, incluidos filtros. Los enteros se reservan para existencias, cantidades, días y registros; peso e importes permiten punto decimal. numberValidation.js refuerza cinco esquemas de validación para rechazar notación científica y expresiones antes de convertir valores. La edición de cantidades de facturación exige enteros. Se añadieron pruebas de componente y navegador, y se actualizaron README, AI_LOG y esta bitácora. Teléfonos y RUT conservan su formato específico.

**Validación:** Suite frontend: 101 aprobadas; comprobación final focalizada: siete aprobadas. Suite de navegador: veinte aprobadas, con pruebas de símbolos, pegado, exponentes, borrado y decimales válidos. La prueba real permitió corregir un rechazo del estado parcial del punto decimal antes de la ejecución satisfactoria. Compilación e imagen Docker reconstruidas correctamente, con avisos previos; sin incidencias en las comprobaciones de accesibilidad seleccionadas existentes.

**Resultado y límites:** Restricción aplicada a la interfaz y sus esquemas; backend sin cambios en esta intervención y sin pruebas nuevas. No se modificó Supabase ni se iniciaron contenedores que estaban detenidos. La imagen está lista para el próximo arranque. Sin commits o push.

## Sesión 32 — 11/11/2026 — Configuración explícita de la prueba externa

**Objetivo:** Retirar configuración sensible de un archivo de pruebas antes de publicar los cambios de la rama.

**Implementación:** Tras el rechazo inicial del push por revisión automática, Test_Supabase_Connection se cambió a una conexión recibida mediante VETCLINIC_TEST_POSTGRES_CONNECTION y consulta SELECT 1. Se añadió ExternalDatabaseFactAttribute para omitir la prueba sin configuración explícita. Se actualizaron README.md, AI_LOG.md y esta bitácora. No se registraron valores de credenciales.

**Validación y alcance:** 99 pruebas backend aprobadas y una externa omitida, excluyendo concurrencia separada. No se detectaron patrones de conexión con credenciales literales en el archivo corregido; git diff --check correcto. No se conectó a Supabase. La corrección no elimina datos del historial ni cambia contraseñas del proveedor.


## Sesión 33 — 11/11/2026 — Dashboard de gestión y visualizaciones de negocio

**Objetivo:** Integrar un tablero operativo con cuatro visualizaciones, filtros interactivos y datos agregados actualizados desde el backend.

**Implementación:** Se creó DashboardAnalytics.cs y se registró su endpoint autenticado en Dashboard.cs, manteniendo el resumen anterior. Se incorporaron agregaciones de facturas, citas y existencias, validación del rango máximo de 366 días y filtros de agenda e inventario. DashboardView.jsx y sus nuevos componentes y estilos presentan gráficos de línea, barras apiladas, anillo y barras horizontales, indicadores, próximas citas y tablas alternativas. La vista se adapta a móvil y a ambos temas. El cliente API notifica escrituras exitosas; el panel consulta cada 30 segundos cuando está visible, al recuperar foco y al cambiar filtros, cancela peticiones obsoletas y conserva la última lectura ante errores. Se actualizaron pruebas, README.md, AI_LOG.md y esta bitácora.

**Validación:** Backend: 110 aprobadas y una externa omitida, excluyendo concurrencia separada. Frontend: suite final de 104 aprobadas, incluidos cinco casos específicos del dashboard y cobertura del temporizador. Compilación correcta con advertencias previas. La suite final de navegador registró 21 pruebas aprobadas; este último se corrigió por un selector de prueba y por medición de contraste durante la transición de tema. Se verificaron filtros, refresco por notificación, cuatro gráficos, temas claro/oscuro y anchos de 1440 y 390 píxeles, sin desbordamiento ni incidencias automáticas seleccionadas de accesibilidad. Se revisaron capturas de escritorio y móvil.

**Resultado y límites:** Tablero conectado al endpoint de agregación, sin migraciones ni cambios en Supabase. La facturación no representa cobros y el inventario no es histórico. Pruebas backend aisladas en memoria; no se comprobó PostgreSQL real al encontrarse Docker detenido. La actualización automática utiliza consultas periódicas. Sin commits ni publicación en la rama remota.

## Sesión 34 — 11/11/2026 — Tablero exclusivo de Administración

**Objetivo:** Trasladar el dashboard al apartado administrativo y restringir sus datos al rol Administrador.

**Implementación:** AdminConfigView incorpora Dashboard de gestión como nueva pestaña. App.jsx presenta HomeView en la ruta inicial, renombra su enlace lateral a Inicio y mantiene la protección administrativa existente. HomeView ofrece agenda y pacientes; el enlace a Administración depende del rol. Los dos endpoints del dashboard restringen la autorización a Administrador. Se adaptaron las pruebas de autorización y navegador y se actualizaron README.md, AI_LOG.md y esta bitácora. Se conservan los gráficos y filtros existentes.

**Validación:** 111 pruebas backend aprobadas, una externa omitida y concurrencia separada excluida; cobertura de acceso permitido para Administrador, denegación 403 para otros roles y 401 sin autenticación. Las 104 pruebas frontend aprobaron y la compilación finalizó correctamente con advertencias previas. La prueba visual en la pestaña administrativa aprobó en ambos temas y resoluciones de escritorio y móvil, sin desbordamiento ni incidencias automáticas seleccionadas de accesibilidad. Se adaptaron los casos de navegación para comprobar la ausencia del dashboard fuera de Administración.

**Resultado y límites:** Tablero administrativo con autorización también en el servidor. Sin migraciones, modificaciones de Supabase, commits ni push; pruebas backend con almacenamiento aislado en memoria.

**Cierre de pruebas de navegador:** Veinte casos aprobados en la ejecución completa y el restante aprobado en repetición focalizada tras precisar el selector del enlace lateral administrativo, que resultaba ambiguo al incorporarse otro acceso desde Inicio. Los 21 casos quedaron verificados entre ambas ejecuciones.

## Sesión 35 — 11/11/2026 — Restauración del santuario interactivo

**Objetivo:** Recuperar el perro 3D y su entrada de navegación manteniendo separado el dashboard administrativo.

**Implementación:** Se reincorporó VeterinaryPet3D en HomeView con distribución responsiva y colores del proyecto; App.jsx identifica la pantalla como Santuario. Se conservaron los controles originales del compañero y los accesos a módulos. Se ampliaron las pruebas de navegador y se actualizaron AI_LOG.md y esta bitácora.

**Validación y límites:** Compilación correcta y tres pruebas focalizadas de navegador aprobadas: modelo visible, interacción Acariciar, acceso por los tres roles y conservación de las restricciones administrativas. Se ajustó el selector visual del lienzo decorativo tras una primera comprobación. Persisten advertencias previas de face-api.js, tamaño del paquete y THREE.Clock; la reincorporación de Three.js incrementa el paquete principal. Sin cambios de backend, operaciones en Supabase, commits ni push.

## Sesión 36 — 11/11/2026 — Rediseño visual de la bienvenida

**Objetivo:** Mejorar la presentación del santuario mediante una bienvenida compacta y accesos de navegación claros.

**Implementación:** HomeView.jsx incorpora tarjetas con iconos, descripción y enlaces a agenda, pacientes y Administración según el rol. Se separó el panel del compañero 3D para eliminar la alineación vertical que generaba espacio vacío. El nuevo HomeView.css define composición responsiva, jerarquía tipográfica y estilos con variables de tema y reducción de movimiento. Se ampliaron las pruebas de navegador y se actualizaron AI_LOG.md y esta bitácora.

**Validación y alcance:** Compilación correcta y cuatro pruebas focalizadas de navegador aprobadas. Se verificaron resoluciones de 1440 y 390 píxeles, temas claro/oscuro, enlaces, lienzo del perro, interacción y restricciones administrativas. No se detectaron desbordamientos ni incidencias en las comprobaciones automáticas de accesibilidad seleccionadas para la bienvenida. Se revisó visualmente la captura de escritorio oscuro. Permanecen advertencias previas de Three.js, face-api.js y tamaño del paquete. Sin cambios de backend, operaciones en Supabase, commits ni push.

## Sesión 37 — 11/11/2026 — Accesibilidad transversal y auditoría

**Objetivo:** Reforzar la accesibilidad de módulos, formularios, navegación y visualizaciones con evidencia automática y una aceptación manual explícitamente delimitada.

**Implementación:** Se corrigieron jerarquías de encabezados y una región principal anidada, se declararon encabezados de tablas y se añadieron títulos de ruta y foco al contenido. Los modales aíslan el fondo y preservan el foco; el menú móvil y la exportación de auditoría gestionan apertura, recorrido, Escape y retorno. Se reforzaron asociaciones de ayuda y errores, contraste y coincidencia entre nombre visible y accesible. El dashboard incorpora descripciones, tablas identificadas, tramas y números para complementar el color. Las animaciones respetan movimiento reducido y el perro admite pausa. Se actualizaron componentes comunes, vistas, estilos, pruebas, README, informe de accesibilidad, evidencia JSON, AI_LOG y esta bitácora.

**Validación:** 104 pruebas frontend y 25 pruebas de navegador aprobadas, con compilación correcta y advertencias existentes. Axe registró cero incidencias en 28 escenarios completos de siete pantallas y siete secciones administrativas en ambos temas. Los controles de formularios y login también aprobaron. Se verificaron registro automatizado exclusivamente por teclado, errores, Escape, foco, menú móvil, ampliación CSS al 200 % y movimiento reducido. Cuatro casos de cierre, una prueba de exportación con Escape y la auditoría final comprobaron los últimos ajustes. Se corrigieron errores de fixtures y selectores durante las ejecuciones iniciales, junto con los defectos reales detectados.

**Resultado y límites:** Mejoras implementadas y evidencia reproducible documentada en docs/ACCESIBILIDAD.md y AUDITORIA_AXE_2026-11-11.json. La prueba humana con teclado y lector de pantalla y el zoom nativo siguen pendientes; se incluye una pauta de aceptación y no se afirma cumplimiento integral ni certificación. Sin cambios de backend, Supabase, commits ni push.

## Sesión 38 — 11/11/2026 — Avisos y confirmaciones personalizados

**Objetivo:** Reemplazar las ventanas nativas de conflicto y confirmación por componentes coherentes con la interfaz del proyecto.

**Implementación:** Se incorporaron ConflictDialog y su estilo, una notificación central notifyConflict y el montaje único en App. Se reemplazaron ocho llamadas de alerta de siete módulos y la confirmación nativa de recetas. Se conservan mensajes de negocio, temas claro/oscuro y bloqueo de envíos repetidos. ConfirmModal utiliza identificadores únicos; AccessibleDialog recupera el foco en un control del diálogo subyacente si el anterior ya no está disponible. Se actualizaron pruebas, README, documentación de accesibilidad, AI_LOG y esta bitácora.

**Validación:** 104 pruebas frontend aprobadas y compilación correcta con avisos previos. Casos de navegador comprueban conflicto 409, explicación de restricciones, contraste en ambos temas, Escape y retorno del foco, ausencia de ventanas nativas, cancelación de receta sin solicitud y eliminación confirmada única. Se corrigieron el retorno del foco desde un botón deshabilitado y un selector de prueba que debía identificar Volver. No quedan llamadas a alert ni confirm o prompt del navegador en el código revisado.

**Resultado y límites:** Avisos propios de la aplicación y confirmación destructiva explícita. Se registró la comunicación del usuario sobre pruebas manuales de teclado superadas, sin asumir uso de lector de pantalla. Pruebas de navegador con respuestas simuladas, sin cambios de backend ni Supabase, commits o push.

**Cierre:** La suite completa de navegador aprobó sus 27 pruebas y mantuvo sin incidencias los 28 escenarios de auditoría general.

## Sesión 39 — 11/11/2026 — Seis indicadores consultables desde la web

**Objetivo:** Completar los indicadores del dashboard para obtener sus resultados sin operaciones manuales y consultar su definición desde la interfaz.

**Implementación:** El servicio analítico calcula promedio por factura, porcentaje de insumos agotados y participación por especialidad, reutilizando los agregados existentes. Se devuelve null si el denominador está vacío. Nuevas tarjetas muestran promedio e insumos agotados; DashboardIndicatorGuide reúne seis indicadores con pregunta de negocio, fórmula y resultado. Se ajustaron la distribución responsiva, la presentación monetaria del promedio y las pruebas de backend, frontend y navegador. Se actualizaron README, AI_LOG y esta bitácora. Se conserva la exclusividad administrativa y el alcance independiente de los filtros de agenda e inventario.

**Validación y resultado:** Backend: 112 aprobadas y una externa omitida, excluyendo concurrencia separada. Frontend: 105 aprobadas; se corrigió la ambigüedad de un selector por repetición del nombre en tarjeta y tabla. Compilación correcta con avisos previos. Dos casos focalizados de navegador aprobaron, con seis fórmulas y resultados, ambos temas, móvil y 28 escenarios generales sin incidencias. Se revisó la captura de escritorio oscuro.

**Límites:** Sin cambios de esquema ni Supabase; almacenamiento en memoria en las pruebas backend y datos interceptados en navegador. No se verificó PostgreSQL real. Sin commits ni push.

## Sesión 40 — 11/11/2026 — Indicadores derivados compatibles con respuestas anteriores

**Objetivo:** Evitar No calculable cuando existen totales suficientes pero la respuesta no contiene los campos derivados.

**Implementación:** dashboardData.js normaliza la respuesta antes de mostrarla, conservando cálculos válidos y derivando los ausentes desde los totales del mismo conjunto filtrado. Se distingue cero agotados de ausencia de inventario y se conserva el tratamiento de denominadores vacíos. DashboardView comparte los datos normalizados con las tarjetas y la guía. Se actualizaron pruebas, README, AI_LOG y esta bitácora.

**Validación:** 106 pruebas frontend aprobadas, compilación correcta con avisos previos y un caso de navegador aprobado con los valores de la captura: promedio $37.088,33 y agotados 0 %. La prueba también verifica selección de 30 días y participación por especialidad. El escenario sin denominador continúa aprobado.

**Alcance:** La causa es compatible con campos derivados ausentes en una instancia previa de la API; no se inspeccionó la respuesta real del usuario ni se reinició su servidor. Sin consultas adicionales, cambios de backend o Supabase, commits ni push.

## Sesión 41 — 12/11/2026 — Verificación técnica y corrección de brechas de evaluación

**Objetivo:** Verificar criterios de implementación de Evaluacion3_LPWII y subsanar incumplimientos demostrables sin producir informes académicos ni intervenir Supabase.

**Implementación:** Se añadieron tres reportes administrativos filtrados y paginados, sus exportaciones CSV/XLSX/PDF y preparación de impresión, con registro de auditoría y autorización administrativa. Se separaron consultas y estrategias de formato mediante ReportService e IReportFormat. Se incorporó análisis HTTP externo de IA configurable sobre agregados, con validación, límite de respuesta, timeout y tratamiento seguro de fallos. Se implementó el flujo de estados de citas en interfaz, backend y disparadores SQL, junto con restricciones e índices versionados. Se reforzaron errores relacionales, OpenAPI Bearer, arranque seguro sin cuentas de demostración por defecto en producción y verificación exclusiva de contraseñas con hash. Se añadieron datos iniciales sintéticos y se corrigió la coherencia de montos e IVA para nuevas facturas de demostración, preservando las existentes.

Se incorporó una carga histórica idempotente de 500 registros por entidad principal a lo largo de doce meses, con confirmación administrativa. Se agregaron orden/paginación visual a listados, página 404, pestaña Reportes y pruebas asociadas. Se extendieron Docker Compose, imágenes fijadas, plantilla sin secretos, CI y scripts de respaldo/restauración y validación aislada. Se conservaron los cambios anteriores y se actualizan simultáneamente AI_LOG y esta bitácora; no se elaboraron informes, presentaciones o documentos académicos.

**Componentes:** Endpoints y servicios de reportes, IA y datos históricos; autenticación, validación de negocio, middleware de excepciones, integridad del modelo, migraciones RefuerzoIntegridad y FlujoCitasSql, Program y SwaggerAuthorizationFilter; ReportesView, HistoricalSeedPanel, TablePagination, vistas principales y navegación; contenedores, Compose, .env.example, CI, scripts y suites técnicas.

**Validación:** Backend: 135 aprobadas y una integración externa omitida; frontend: 106 aprobadas y build correcto con advertencias de paquetes. Navegador: 28 escenarios generales aprobados y un escenario nuevo de reportes aprobado tras corregir el selector de prueba; otra prueba con backend/PostgreSQL reales en Docker comprobó login, recarga, tres reportes y descarga PDF. Axe no detectó incidencias en las comprobaciones seleccionadas en ambos temas; npm audit de producción reportó cero vulnerabilidades conocidas. OpenAPI contiene las rutas nuevas y seguridad Bearer. Las pruebas de IA usan proveedor simulado, incluyendo respuesta inválida, ausencia de configuración y timeout.

En vetclinic-review, los tres contenedores quedaron saludables y las migraciones se aplicaron localmente. Se verificaron doce meses, 500 registros históricos por entidad, repetición sin duplicados, rechazo SQL de stock negativo y transición inválida, nueve exportaciones y apertura mediante pypdf/openpyxl —con gráfico gerencial nativo—. Se comprobó respaldo/restauración temporal conservando 506 pacientes, 505 citas y 503 facturas. El escenario de veinte usuarios concurrentes emplea InMemory; no acredita rendimiento productivo.

**Pendientes y alcance:** Sin cambios en Supabase, commits ni push. Las migraciones requieren revisión antes de aplicarlas a datos reales. Pendientes llamada real de IA, ejecución/publicación de CI en GitHub, lector de pantalla humano, inspección completa de impresión y paginación SQL uniforme. Las cuentas heredadas con contraseña en texto plano necesitan restablecimiento. Se identificaron credenciales en diferencias históricas de Git, sin comprobar vigencia ni sanear el historial; corresponde rotarlas y planificar su limpieza. No se certifica cumplimiento integral de WCAG, OWASP o tiempos de producción. No se modificaron retrospectivamente registros de desarrollo anteriores.

## Sesión 42 — 12/11/2026 — Corrección de exportación y auditoría compatible

**Objetivo:** Permitir generar reportes con el CHECK de auditoría existente sin eliminar la trazabilidad ni modificar Supabase.

**Implementación:** Se corrigió la acción persistida por las exportaciones a CREAR, asociada a Reportes y con Operacion=EXPORTAR en metadatos. La consulta y detalle de auditoría presentan estos eventos como EXPORTAR, incluyendo filtros, búsqueda y resumen. Se permite consultar únicamente los campos seguros del detalle de reporte.

**Componentes:** ReportesApi, AuditoriaApi, SafeAuditValues, ReviewComplianceTests, AI_LOG y BITACORA.

**Validación:** 135 pruebas backend aprobadas y una integración externa omitida. Se verificaron los tres reportes, acción compatible, metadatos y consulta/detalle de exportaciones. La causa concuerda con la restricción CHECK del esquema compartido. Sin intervención sobre Supabase, commits o push.

**Comprobación relacional adicional:** En PostgreSQL Docker aislado se impuso temporalmente un CHECK equivalente para nuevos eventos, conservando los anteriores. Las nueve exportaciones se completaron; también pasó la consulta filtrada y agregada como EXPORTAR. La restricción temporal fue retirada al finalizar. No se modificó Supabase.


## Sesión 43 — 12/11/2026 — Organización visual de reportes administrativos

**Objetivo:** Compactar el panel de filtros y mejorar la presentación de las acciones de exportación conforme al diseño de VetClinic.

**Implementación:** Encabezado con icono y formatos disponibles, tarjeta de filtros adaptable a tres/dos/una columnas, barra de descarga con iconos e impresión destacada y mejoras de espaciado, superficies y paginación. Se mantienen los temas y los estilos de impresión existentes.

**Componentes:** ReportesView.jsx, ReportesView.css, accesibilidad.spec.js y ambas bitácoras.

**Validación:** Build correcto con avisos previos. Caso de navegador aprobado para filtros, paginación, descarga, manejo del error de IA, columnas de escritorio/móvil, ausencia de desbordamiento y axe sin incidencias en claro/oscuro. Capturas generadas a 1440 y 360 px; inspección visual de escritorio oscuro realizada. Prueba ejecutada en 5187 sin alterar el servidor del usuario en 5173. Sin modificaciones de backend, Supabase, commits o push.

## Sesión 44 — 12/11/2026 — Retiro de análisis externo de IA

**Objetivo:** Suprimir la integración externa de análisis de reportes solicitada por el usuario, manteniendo el reconocimiento facial y las exportaciones existentes.

**Implementación:** Eliminación del servicio HTTP, endpoint, registro DI, limitador dedicado, variables de configuración y controles de análisis. Se retiraron sus cuatro pruebas específicas y se ajustó la prueba de interfaz para comprobar que el botón ya no existe. Se conservaron los registros históricos de desarrollo.

**Componentes:** Program, InsightsService e Insights retirados, ReportesView, Compose, .env.example, pruebas backend/navegador y ambas bitácoras.

**Validación:** Backend: 131 pruebas aprobadas y una integración externa omitida; compilación frontend correcta con avisos previos y escenario de reportes aprobado en ambos temas y resoluciones. Sin referencias activas restantes al servicio retirado en los componentes examinados. Sin cambios en Supabase, despliegues, commits o push. Las instancias ya ejecutándose necesitan reinicio o reconstrucción para incorporar el cambio.
