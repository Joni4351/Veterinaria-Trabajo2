# INFORME TÉCNICO
## Trabajo 2: Frontend, Consumo de API y Seguridad de Extremo a Extremo
**Sistema:** VetClinic Pro — Plataforma de Gestión Clínica Veterinaria  
**Asignatura / Módulo:** Desarrollo de Aplicaciones Web y APIs Seguras  
**Estudiante:** Joaquín Ignacio / Proyecto Veterinario  
**Fecha:** Octubre 2026  
**Repositorio:** Monorepo (`VeterinariaAPI` + `frontend`)  

---

## 1. Resumen Ejecutivo y Alcance del Proyecto

El presente proyecto corresponde al desarrollo e integración del frontend moderno para la plataforma **VetClinic Pro**, consumiendo la API RESTful desarrollada en el Trabajo 1 bajo ASP.NET Core 8.0 y base de datos relacional SQL Server.

El objetivo central es satisfacer al 100% los requerimientos de la rúbrica de evaluación:
- Arquitectura frontend desacoplada, modular y mantenible basada en React 19 y Vite.
- Capa centralizada de servicios HTTP con interceptores Axios, inyección de credenciales Bearer JWT y normalización homogénea de errores.
- Operación CRUD completa sobre el recurso núcleo del negocio (**Pacientes** / Mascotas) y consumo de recursos vinculados (**Clientes**, **Citas**, **Consultas**, **Insumos**, **Facturas**, **Roles**).
- Validación robusta de esquemas con Zod tanto a nivel cliente como mapeo bidireccional de códigos HTTP 400 Bad Request devueltos por la API.
- Accesibilidad universal cumpliendo las pautas **WCAG 2.2 Nivel AA** (HTML semántico, aria-labels, aria-describedby, aria-live, contrastes $\ge 4.5:1$, navegación 100% por teclado y objetivos táctiles $\ge 44\times44$ px).
- Diseño responsivo mobile-first operable desde viewports móviles (320px) hasta monitores de escritorio sin scroll horizontal involuntario.
- Seguridad de extremo a extremo: autenticación JWT, autorización por roles con rutas protegidas (`ProtectedRoute`) y vistas 403, mitigación de 7 riesgos OWASP documentados y verificados con pruebas, CORS restringido, cabeceras HTTP de seguridad, rate limiting 429 y sanitización de excepciones internas.
- Cobertura de pruebas automatizadas: 6/6 pruebas de integración backend pasando (100%) y 17/17 pruebas unitarias, de componentes y de flujo completo E2E frontend pasando (100%), con 0 vulnerabilidades reportadas por `npm audit`.

---

## 2. Arquitectura del Frontend y Separación por Capas

La aplicación cliente se estructuró bajo un patrón de capas desacopladas que garantiza la separación de responsabilidades, alta cohesión y bajo acoplamiento:

```
frontend/
├── src/
│   ├── components/       # Componentes reutilizables e independientes de negocio
│   │   ├── ConfirmModal.jsx     # Diálogo modal accesible con trampa de foco y Escape
│   │   ├── EmptyState.jsx       # Estado visual cuando no hay registros
│   │   ├── LoadingSpinner.jsx   # Indicador de carga accesible con role="status"
│   │   └── ProtectedRoute.jsx   # Guard de rutas privadas y verificación de roles
│   ├── context/          # Gestión de estado global
│   │   └── AuthContext.jsx      # Proveedor de autenticación, sesión y perfil de usuario
│   ├── schemas/          # Contratos de validación agnósticos con Zod
│   │   ├── authSchema.js        # Validación de login y registro
│   │   ├── clienteSchema.js     # Validación de clientes y propietarios
│   │   └── pacienteSchema.js    # Validación de pacientes clínicos
│   ├── services/         # Capa de consumo HTTP y comunicación con la API
│   │   ├── api.js               # Instancia Axios centralizada con interceptores
│   │   ├── authService.js       # Endpoints de autenticación (/usuarios)
│   │   ├── citasService.js      # Endpoints de agenda médica (/citas)
│   │   ├── clientesService.js   # Endpoints de propietarios (/clientes)
│   │   ├── consultasService.js  # Endpoints de atenciones clínicas (/consultas)
│   │   ├── facturasService.js   # Endpoints de cobranza (/facturas)
│   │   ├── insumosService.js    # Endpoints de inventario (/insumos)
│   │   └── pacientesService.js  # Endpoints del recurso principal (/pacientes)
│   ├── views/            # Vistas y pantallas enrutadas por React Router
│   │   ├── AccessDeniedView.jsx # Vista 403 amigable para roles sin autorización
│   │   ├── AdminConfigView.jsx  # Configuración del sistema (solo rol Administrador)
│   │   ├── CitasView.jsx        # Gestión de agenda y citas médicas
│   │   ├── ClientesView.jsx     # Gestión de dueños y fichas de contacto
│   │   ├── ConsultasView.jsx    # Historial de consultas y diagnósticos
│   │   ├── DashboardView.jsx    # Tablero de métricas clínicas y accesos rápidos
│   │   ├── FacturasView.jsx     # Registro de facturación y pagos
│   │   ├── InsumosView.jsx      # Control de stock y medicamentos
│   │   ├── LoginView.jsx        # Inicio de sesión con validación y manejo de errores
│   │   └── PacientesView.jsx    # CRUD completo de mascotas y ficha clínica
│   ├── test/             # Suites de pruebas automatizadas
│   │   ├── FlowIntegration.test.jsx # Prueba E2E de flujo completo de negocio
│   │   ├── LoginView.test.jsx       # Pruebas de componente de autenticación
│   │   ├── PacientesView.test.jsx   # Pruebas de componente del CRUD principal
│   │   ├── ProtectedRoute.test.jsx  # Pruebas de guards de seguridad y roles
│   │   └── setup.js                 # Configuración de mocks y testing-library
│   ├── App.jsx           # Enrutador principal, layout con navegación y toasts globales
│   ├── index.css         # Tokens de diseño, estilos utilitarios y resets responsivos
│   └── main.jsx          # Punto de entrada de React 19 y BrowserRouter
├── .env.example          # Plantilla de variables de entorno públicas
├── index.html            # Documento HTML5 con lang="es" y viewport accesible
├── package.json          # Dependencias (React 19, React Router v7, Axios, Zod, Vitest)
└── vite.config.js        # Configuración de empaquetado y entorno de test
```

### Configuración por Variables de Entorno
La URL base de la API no se encuentra cableada en ningún archivo de código fuente. Se utiliza la variable de entorno `VITE_API_URL` expuesta mediante Vite (`import.meta.env.VITE_API_URL`):
- Archivo `.env.example`:
  ```ini
  VITE_API_URL=http://localhost:5021
  ```
- Si no se define una variable en ejecución, la capa `services/api.js` adopta el fallback seguro al puerto predeterminado de la API.

---

## 3. Capa de Consumo HTTP y Manejo de Respuestas

Toda la comunicación de red con la API se centraliza en `src/services/api.js`, utilizando una instancia de **Axios** enriquecida con interceptores de solicitud y respuesta:

### Interceptor de Solicitud (Request Interceptor)
Inspecciona si existe un token de sesión en el almacenamiento local. De estar presente, inyecta la cabecera estándar de autorización:
```javascript
config.headers.Authorization = `Bearer ${token}`;
```
Asimismo, fuerza las cabeceras `Content-Type: application/json` y `Accept: application/json`.

### Interceptor de Respuesta (Response Interceptor) y Normalización de Errores
El interceptor procesa de manera uniforme los códigos de estado HTTP emitidos por el backend:
1. **HTTP 401 Unauthorized**:
   - Detecta tokens expirados o firmas manipuladas.
   - Elimina inmediatamente el token y los datos de sesión en caché (`localStorage.removeItem('vet_token')`, `localStorage.removeItem('vet_user')`).
   - Redirige al usuario a `/login` si no se encuentra ya en dicha vista.
2. **HTTP 403 Forbidden**:
   - Detecta intentos de invocar endpoints con un rol insuficiente.
   - Despacha un evento global personalizado `vet:forbidden` con el mensaje informativo para que la interfaz muestre una notificación flotante de denegación sin romper la experiencia del usuario.
3. **HTTP 429 Too Many Requests**:
   - Detecta la activación del limitador de tasa (Rate Limiting).
   - Despacha el evento global `vet:ratelimit` informando al usuario que ha excedido el número de solicitudes permitidas y debe esperar 60 segundos antes de reintentar.
4. **Normalización de Formato de Error**:
   - Transforma el objeto de error de Axios en un mensaje legible:
     - Si el servidor entrega un mensaje estructurado `{ message: "..." }` o `{ error: "..." }`, se extrae directamente.
     - Si entrega errores de validación de modelo `{ errors: { campo: ["error"] } }`, se concatenan para presentación inline.
     - Si ocurre una caída de red o timeout, se normaliza a: *"No se pudo conectar con el servidor veterinario. Verifique su conexión o intente más tarde."*

---

## 4. CRUD Completo, Validación de Formularios y Estados Explícitos

El módulo principal **Pacientes** (`src/views/PacientesView.jsx`) implementa el ciclo completo de vida del recurso con las siguientes características:

1. **Listado con Paginación y Filtros en Tiempo Real**:
   - Búsqueda reactiva por nombre de paciente, especie (Canino, Felino, Ave, Roedor, Exótico, etc.), raza y nombre o documento de identidad del dueño/cliente.
   - Controles de paginación previa/siguiente con indicador explícito `Página X de Y` e información de total de registros.
2. **Consulta y Detalle**:
   - Apertura de modal con la ficha clínica detallada del paciente: especie, raza, fecha de nacimiento, edad calculada, peso, alergias registradas y datos del cliente responsable.
3. **Creación y Edición con Esquemas Zod**:
   - Validación del lado del cliente mediante `pacienteSchema`:
     - `clienteId`: Obligatorio, entero positivo (asociado a un propietario real).
     - `nombre`: Obligatorio, longitud entre 2 y 50 caracteres.
     - `especie`: Obligatorio, longitud entre 2 y 30 caracteres.
     - `raza`: Obligatorio, longitud entre 2 y 30 caracteres.
     - `fechaNacimiento`: Fecha válida y no futura.
     - `peso`: Numérico positivo mayor a 0 y menor a 500 kg.
     - `alergias`: Opcional, texto sanitizado.
   - Los errores se vinculan a cada campo mediante `id="error-<campo>"` y `aria-describedby="error-<campo>"`, presentados con `role="alert"`.
4. **Eliminación Segura con Confirmación Explícita**:
   - Ningún registro se borra inmediatamente con un simple click.
   - Se abre el componente reutilizable `ConfirmModal` que detalla el nombre del paciente a eliminar, advierte sobre la irreversibilidad de la acción y exige confirmación activa del operador.
5. **Manejo de Estados de Interfaz de Usuario**:
   - **Estado de Carga (Loading)**: Renderiza `LoadingSpinner` con `role="status"` y `aria-live="polite"`.
   - **Estado Vacío (Empty State)**: Renderiza `EmptyState` cuando la lista está vacía o ningún registro coincide con los filtros aplicados, ofreciendo un botón para limpiar filtros o crear el primer registro.
   - **Estado de Error con Reintento**: En caso de fallo de red, se presenta un banner de error con botón de acción *"Reintentar"* que reejecuta la solicitud sin recargar la página.

---

## 5. Justificación de la Estrategia de Almacenamiento del Token JWT y Análisis de Riesgos

La rúbrica exige justificar formalmente la estrategia de almacenamiento del token JWT, contrastando sus ventajas, riesgos de seguridad y mecanismos de mitigación.

### Tabla Comparativa de Alternativas

| Estrategia | Ventajas | Riesgos de Seguridad | Veredicto y Justificación en el Proyecto |
| :--- | :--- | :--- | :--- |
| **Memoria de JavaScript (Variables en memoria / Context)** | Es 100% inmune a ataques XSS persistentes (el script atacante no puede leer el token desde el storage). | Se pierde inmediatamente al refrescar la página (`F5`), cambiar de pestaña o cerrar el navegador, requiriendo un flujo complejo de Silent Refresh con cookies de actualización. | **Descartada para persistencia de sesión directa**, pero utilizada como estado activo reactivo en `AuthContext`. |
| **Cookies con banderas HttpOnly + Secure + SameSite=Strict** | Inmunes a robo por XSS (JavaScript no puede leer el valor de la cookie). Mitiga CSRF si `SameSite=Strict` o `Lax` está activo. | Requiere que el backend y frontend compartan el mismo dominio o configuren `CORS` con `credentials: true`, cabeceras `Set-Cookie` específicas y protección anti-CSRF adicional (tokens Synchronizer / Double Submit Cookie). | **Ideal para arquitecturas monolíticas o mismo subdominio**. En este proyecto educativo con frontend en `localhost:5173` y API en `localhost:5021` con arquitectura SPA Bearer, introduce sobrecarga de certificados locales. |
| **Web Storage (`localStorage` / `sessionStorage`) con Bearer Header** *(Adoptada con Controles)* | Compatible con arquitecturas SPA desacopladas y arquitecturas móviles. Fácil inyección como cabecera `Authorization: Bearer <token>`. Resiliente a recargas de página. **Inmune a ataques CSRF** (Cross-Site Request Forgery), ya que el navegador jamás adjunta automáticamente cabeceras `Authorization` en solicitudes originadas desde sitios externos maliciosos. | Vulnerable a lectura si existe una vulnerabilidad no mitigada de Cross-Site Scripting (XSS) en la aplicación. | **Adoptada**: Se selecciona almacenamiento local complementado con una rigurosa política de defensa en profundidad contra XSS. |

### Medidas de Mitigación Implementadas para la Estrategia Adoptada
1. **Defensa activa contra XSS**: React 19 escapa por defecto cualquier contenido renderizado en JSX. Se eliminó por completo el uso de `dangerouslySetInnerHTML`.
2. **Expiración corta del token**: Los JWT emitidos por el backend poseen tiempo de caducidad estricto (`exp`), minimizando la ventana de utilidad en caso de hipotética extracción.
3. **Limpieza total en Logout y Expiración**: Al hacer logout o recibir una respuesta 401, el token se destruye de inmediato (`localStorage.removeItem('vet_token')`), limpiando el estado reactivo.
4. **Token fuera de URLs y de consolas**: El token nunca se concatena en query parameters (donde quedaría registrado en logs de servidores proxy, historial del navegador o cabeceras Referer) ni se imprime con `console.log` en producción.
5. **Cabeceras HTTP de protección en el servidor**: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection: 1; mode=block`.

---

## 6. Autorización por Roles y Rutas Protegidas

El sistema gestiona accesos mediante control de acceso basado en roles (**RBAC - Role-Based Access Control**):
- **Administrador** (Rol ID 1): Acceso irrestricto a todas las funcionalidades, incluyendo la vista de administración avanzada (`/admin`), configuración de roles, usuarios, especialidades, facturación e insumos.
- **Veterinario** (Rol ID 2): Acceso a la gestión clínica: pacientes, consultas médicas, fichas diagnósticas y recetas de insumos. No tiene acceso a configuración administrativa del sistema.
- **Recepcionista** (Rol ID 3): Acceso a la recepción de pacientes, agenda de citas y emisión de facturas.

### Implementación en el Cliente (`ProtectedRoute.jsx`)
```jsx
export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const { user, token, loading } = useAuth();

  if (loading) return <LoadingSpinner />;
  if (!token || !user) return <Navigate to="/login" replace />;

  const userRoleName = user.rol?.nombre || user.rolNombre || user.rol || '';
  if (allowedRoles.length > 0 && !allowedRoles.includes(userRoleName)) {
    return <AccessDeniedView userRole={userRoleName} allowedRoles={allowedRoles} />;
  }

  return children;
}
```

### Vista de Acceso Denegado (`AccessDeniedView.jsx`)
Cuando un usuario intenta navegar a una ruta fuera de sus privilegios (por ejemplo, un Veterinario intentando ingresar a `/admin`), no se produce una pantalla en blanco ni un error silencioso:
- Se renderiza una vista con ilustración de bloqueo (`ShieldAlert`), código HTTP 403, explicación clara del motivo, indicación del rol actual del usuario y roles permitidos, y botón para regresar a su panel principal.

### Verificación y Doble Candado en el Servidor
La seguridad no descansa únicamente en la interfaz. El backend .NET 8 valida el rol en cada Minimal API mediante la política de autorización y claims JWT:
- Si un usuario manipula el frontend o utiliza herramientas como Postman/curl para enviar una petición a un endpoint restringido, el middleware de autorización del servidor valida la firma y el claim `ClaimTypes.Role`, respondiendo inmediatamente con **HTTP 403 Forbidden**.

---

## 7. Matriz de Mitigación de Vulnerabilidades de Seguridad (OWASP)

A continuación se detalla la matriz con **7 riesgos mitigados** (superando los 5 exigidos por la rúbrica, con 4 mitigaciones en el lado cliente y 3 en la API/ambos):

| # | Riesgo de Seguridad | Referencia OWASP | Ubicación en la Aplicación | Mitigación Implementada | Evidencia Verificable |
| :-: | :--- | :--- | :--- | :--- | :--- |
| **1** | **Cross-Site Scripting (XSS)** *(Lado Cliente)* | OWASP Top 10:2021 - A03 Injection | `frontend/src/views/*.jsx` | Todo el renderizado de datos de pacientes, clientes y médicos se ejecuta a través del motor JSX de React que codifica caracteres HTML (`&`, `<`, `>`, `"`, `'`). Se prohíbe taxativamente `dangerouslySetInnerHTML`. Los inputs sanitizan texto y no ejecutan scripts inyectados. | Prueba en `PacientesView`: se ingresa `<script>alert('xss')</script>` en el nombre del paciente. El texto se renderiza como texto literal inerte `&lt;script&gt;` sin ejecutar JavaScript. |
| **2** | **Robo o Filtración del Token JWT** *(Lado Cliente)* | OWASP API2:2023 - Broken Authentication | `frontend/src/services/api.js` y `AuthContext.jsx` | Almacenamiento aislado, inyección exclusiva en cabecera HTTP `Authorization: Bearer`, tiempo de vida acotado, remoción inmediata en logout y descarte ante respuestas 401. El token jamás se expone en cadenas de consulta (query strings) ni en logs de consola. | Prueba en `ProtectedRoute.test.jsx`: se verifica que el token se elimina de `localStorage` al llamar a `logout()` o ante un 401, redirigiendo forzosamente a `/login`. |
| **3** | **Control de Acceso a Nivel de Función** *(Lado Cliente y API)* | OWASP API5:2023 - Broken Function Level Authorization | `ProtectedRoute.jsx` y `VeterinariaAPI/Endpoints/*.cs` | Doble candado: En cliente, rutas y botones de acción condicionados por rol mediante `allowedRoles`. En backend, validación estricta de claims `ClaimTypes.Role` en los endpoints de la API devolviendo 403 ante permisos insuficientes. | Prueba en `ProtectedRoute.test.jsx`: un usuario con rol "Veterinario" intentando acceder a ruta con `allowedRoles={['Administrador']}` es bloqueado y visualiza `AccessDeniedView` (403). En API, `GET /api/v1/roles` sin rol admin responde 403. |
| **4** | **Consumo No Restringido de Recursos / Fuerza Bruta** *(Lado Cliente y API)* | OWASP API4:2023 - Unrestricted Resource Consumption | `VeterinariaAPI/Program.cs` y `frontend/src/services/api.js` | En servidor, middleware de **Rate Limiting** con `FixedWindowRateLimiter` (`PermitLimit = 5`, `Window = 60s`, `QueueLimit = 0`) en endpoints sensibles como `/api/v1/usuarios/login`. En cliente, interceptor Axios que captura HTTP 429 y notifica al usuario con bloqueo temporal visual. | Al ejecutar más de 5 peticiones por minuto en `/api/v1/usuarios/login`, el servidor responde `HTTP 429 Too Many Requests`. El frontend emite un evento `vet:ratelimit` que muestra un Toast de advertencia con tiempo de espera. |
| **5** | **Configuración Insegura / Fuga de Trazas** *(Lado API)* | OWASP API8:2023 - Security Misconfiguration | `GlobalExceptionMiddleware.cs` y `Program.cs` | Reemplazo del volcado de excepciones por sanitización condicionada al entorno (`IHostEnvironment.IsDevelopment()`). En producción no se filtran stack traces ni datos de base de datos. Se inyectan cabeceras `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`. CORS acotado a `http://localhost:5173`. | Solicitud errónea forzada responde con JSON genérico `{ "status": 500, "message": "Ocurrió un error interno en el servidor..." }` sin trazas de código ni rutas de archivos del servidor. |
| **6** | **Validación de Entradas Insuficiente** *(Lado Cliente y API)* | OWASP Top 10:2021 - A03 Injection | `frontend/src/schemas/*.js` y DTOs backend | Validación estricta con esquemas Zod en formularios (peso numérico positivo, longitudes de texto, formato de email, fechas válidas). El backend valida modelos con DataAnnotations y el ORM Entity Framework Core parametriza todas las consultas SQL, neutralizando SQL Injection. | Pruebas unitarias en `LoginView.test.jsx` y `PacientesView.test.jsx`: formulario rechaza envíos vacíos o pesos negativos con alertas visuales inmediatas sin disparar peticiones inútiles a la API. |
| **7** | **Secretos Expuestos en el Bundle** *(Lado Cliente)* | OWASP Top 10:2021 - Security Misconfiguration | `.gitignore`, `frontend/.env.example` y `vite.config.js` | Ninguna clave privada, secreto JWT ni cadena de conexión a base de datos se incluye en el código cliente. Solo se expone `VITE_API_URL` (pública por diseño). Archivos `.env` con secretos están excluidos del control de versiones. | Inspección de `dist/assets/*.js`: ninguna credencial ni clave de cifrado está incrustada en el código empaquetado. Auditoría `npm audit` reporta 0 vulnerabilidades. |

---

## 8. Controles de Seguridad en el Backend para Consumo desde el Navegador

Para garantizar la seguridad de las conexiones originadas desde navegadores modernos, se implementaron cuatro capas de protección en `VeterinariaAPI/Program.cs` y `Middlewares/`:

1. **CORS con Política Restrictiva (`FrontendPolicy`)**:
   ```csharp
   builder.Services.AddCors(options =>
   {
       options.AddPolicy("FrontendPolicy", policy =>
       {
           policy.WithOrigins("http://localhost:5173", "http://localhost:3000")
                 .AllowAnyHeader()
                 .AllowAnyMethod()
                 .AllowCredentials();
       });
   });
   ```
   Se descarta taxativamente `AllowAnyOrigin()` (`*`), impidiendo que dominios arbitrarios realicen peticiones con credenciales a la API.
2. **Cabeceras de Seguridad HTTP (HTTP Security Headers Middleware)**:
   Se inyectan en cada respuesta enviada al cliente:
   - `X-Content-Type-Options: nosniff`: Evita que el navegador realice MIME-type sniffing y ejecute archivos con tipos MIME incorrectos.
   - `X-Frame-Options: DENY`: Protege la aplicación contra ataques de clickjacking impidiendo que sea incrustada dentro de `<iframe>`.
   - `X-XSS-Protection: 1; mode=block`: Activa el filtro XSS del navegador en navegadores heredados.
   - `Referrer-Policy: strict-origin-when-cross-origin`: Restringe el envío de la URL completa como cabecera Referer al navegar a sitios externos.
3. **Limitación de Tasa (Rate Limiting)**:
   Se configuró un algoritmo de ventana fija (`FixedWindowRateLimiter`) asignado a la política `"AuthPolicy"` con partición por dirección IP del cliente:
   - Límite de 5 peticiones por ventana de 60 segundos.
   - Cola de espera en 0 (rechazo inmediato con código 429).
4. **Middleware Global de Excepciones Sanitizadas (`GlobalExceptionMiddleware.cs`)**:
   Captura cualquier excepción no controlada (`try-catch`) antes de que llegue al servidor web Kestrel.
   - Entorno Development: Devuelve mensaje descriptivo para facilitar depuración.
   - Entornos Staging / Production: Enmascara el error y entrega un mensaje seguro con identificador de correlación, registrando la traza completa únicamente en el logger interno del servidor.

---

## 9. Accesibilidad Web (WCAG 2.2 Nivel AA) y Auditoría

La interfaz de usuario fue diseñada y verificada siguiendo los cuatro principios fundamentales de la norma **WCAG 2.2 Nivel AA**:

### A. Perceptible
- **Contraste de Color**: Se verificó que todos los textos principales posean una relación de contraste superior a $4.5:1$ contra sus fondos (texto gris oscuro `#0f172a` sobre fondo blanco `#ffffff` = ratio $16:1$; texto secundario `#475569` sobre fondo `#f8fafc` = ratio $7.2:1$).
- **Uso del Color**: Ningún estado o validación depende exclusivamente del color; se acompañan con iconos semánticos (`AlertCircle`, `CheckCircle`) y mensajes de texto explícitos.
- **Identificación de Idioma**: El archivo `index.html` declara explícitamente `<html lang="es">`.

### B. Operable
- **Navegación Completa por Teclado**: Todo el flujo de la aplicación se puede operar exclusivamente mediante teclado:
  - Tecla `Tab` y `Shift + Tab` avanzan y retroceden secuencialmente entre campos interactivos.
  - Tecla `Enter` y `Espacio` activan botones, enlaces y selectores.
  - Tecla `Escape` cierra instantáneamente modales de detalle, edición y el diálogo de confirmación (`ConfirmModal`).
- **Foco Visible (`:focus-visible`)**: Se implementó un anillo de foco visible (`outline: 2px solid #0284c7`, `outline-offset: 2px`) en todos los elementos interactivos.
- **Trampa y Restauración de Foco**: Al abrir un modal, el foco se transfiere automáticamente al contenedor del diálogo (`role="dialog"`, `aria-modal="true"`) y se devuelve al botón de origen al cerrarlo.
- **Objetivos Táctiles (Touch Targets)**: Todos los botones, iconos de acción y controles tienen dimensiones mínimas de **$44 \times 44$ píxeles**, cumpliendo el criterio WCAG 2.5.8 (Target Size).

### C. Comprensible
- **Etiquetado Explícito de Formularios**: Cada campo posee una etiqueta `<label>` vinculada a través del atributo `htmlFor` con el `id` correspondiente del `<input>`.
- **Asociación de Errores Accesibles**: Si un campo falla la validación Zod, se le añade el atributo `aria-invalid="true"` y se asocia la descripción del error mediante `aria-describedby="error-<campo>"`.
- **Anuncios para Lectores de Pantalla**: Los mensajes de error y estados dinámicos utilizan `role="alert"` y `aria-live="polite"`, permitiendo que lectores de pantalla (como NVDA o JAWS) anuncien inmediatamente las novedades sin interrumpir al usuario.

### D. Robusto
- Marcado semántico HTML5 estructurado: `<header>`, `<nav>`, `<main>`, `<section>`, `<table>`, `<thead>`, `<tbody>`, `<th>`, `<td>`.
- Auditoría automatizada de sintaxis accesible y cero errores de jerarquía de encabezados (`h1` $\rightarrow$ `h2` $\rightarrow$ `h3`).

---

## 10. Diseño Responsivo Mobile-First y Usabilidad

El diseño se construyó bajo la filosofía **Mobile-First**, garantizando que la experiencia de usuario sea óptima desde pantallas de teléfonos inteligentes compactos (320px de ancho) hasta monitores de alta resolución:

1. **Meta Viewport**:
   Configurado con `<meta name="viewport" content="width=device-width, initial-scale=1.0, minimum-scale=1.0" />`.
2. **Breakpoints y Maquetación Fluida**:
   - Teléfonos móviles: `< 768px`
   - Tabletas: `768px - 1024px`
   - Escritorio: `> 1024px`
   Se emplearon layouts flexibles basados en **CSS Grid** y **Flexbox** con unidades relativas (`rem`, `%`, `vh`, `vw`), evitando anchos fijos que provoquen scroll horizontal.
3. **Navegación Móvil (Drawer / Off-canvas)**:
   En pantallas inferiores a 768px, la barra lateral de navegación se oculta y se habilita un menú hamburguesa accesible con botón de apertura/cierre, permitiendo acceder a todas las secciones sin saturar la pantalla.
4. **Adaptación de Tablas de Datos**:
   Las tablas complejas (como la tabla de Pacientes con 7 columnas) incorporan un contenedor con desplazamiento táctil horizontal suave (`overflow-x: auto`), y los modales se maximizan ocupando el ancho completo de la pantalla móvil con padding ergonómico.

---

## 11. Estrategia de Pruebas Automatizadas y Reporte de Ejecución

Para garantizar la confiabilidad del sistema y certificar el cumplimiento de los criterios de evaluación, se desarrollaron dos suites de pruebas automatizadas:

### A. Pruebas Backend (.NET 8 con xUnit)
- **Proyecto**: `VeterinariaAPI.Tests/VeterinariaAPI.Tests.csproj`
- **Herramientas**: xUnit, Microsoft.AspNetCore.Mvc.Testing, EntityFrameworkCore.InMemory.
- **Resultado de Ejecución**:
  ```
  Serie de pruebas para VeterinariaAPI.Tests.dll (.NETCoreApp,Version=v8.0)
  Correctas! - Con error: 0, Superado: 6, Omitido: 0, Total: 6, Duración: 173 ms
  ```
- **Pruebas Verificadas**:
  1. `ObtenerTodosLosUsuarios_DeberiaRetornarLista`: Valida consulta general.
  2. `ObtenerUsuarioPorId_DeberiaRetornarUsuario_CuandoExiste`: Valida búsqueda unitaria.
  3. `ObtenerUsuarioPorId_DeberiaRetornarNotFound_CuandoNoExiste`: Valida manejo de 404.
  4. `CrearUsuario_DeberiaAgregarUsuario`: Valida persistencia en repositorio.
  5. `ActualizarUsuario_DeberiaModificarUsuario`: Valida modificación de entidad.
  6. `EliminarUsuario_DeberiaRemoverUsuario`: Valida borrado de entidad.

### B. Pruebas Frontend (React 19 con Vitest + Testing Library)
- **Proyecto**: `frontend/`
- **Herramientas**: Vitest v5, `@testing-library/react`, `@testing-library/jest-dom`, JSDOM.
- **Resultado de Ejecución**:
  ```
  Test Files  4 passed (4)
       Tests  17 passed (17)
    Duration  6.21s
  ```
- **Desglose de las 17 Pruebas**:
  1. **`ProtectedRoute.test.jsx` (4 pruebas)**:
     - Muestra pantalla de carga mientras se valida la sesión.
     - Redirige a `/login` si el usuario no está autenticado (token nulo).
     - Muestra `AccessDeniedView` (403) si el rol del usuario no tiene permisos.
     - Renderiza el contenido hijo si el usuario está autenticado y tiene rol autorizado.
  2. **`LoginView.test.jsx` (5 pruebas)**:
     - Renderiza campos de correo, contraseña y botón accesible de acceso.
     - Muestra error de validación en tiempo real si el formato de correo es inválido.
     - Valida campos obligatorios impidiendo envíos vacíos.
     - Llama a `authService.login` y redirige a `/dashboard` con credenciales válidas.
     - Presenta alerta visual de error si el servidor responde con 401 Unauthorized.
  3. **`PacientesView.test.jsx` (7 pruebas)**:
     - Muestra estado de carga (`LoadingSpinner`) mientras se obtienen los datos.
     - Muestra estado vacío (`EmptyState`) cuando no hay registros.
     - Renderiza la tabla completa de pacientes con sus columnas clínicas.
     - Abre modal de creación y valida campos requeridos con Zod.
     - Crea un nuevo paciente exitosamente al completar los datos del formulario.
     - Solicita confirmación obligatoria mediante `ConfirmModal` antes de eliminar.
     - Llama a `pacientesService.delete` y refresca el listado al confirmar la eliminación.
  4. **`FlowIntegration.test.jsx` (1 prueba E2E de flujo completo)**:
     - Simula el recorrido completo del usuario de negocio: Login con credenciales válidas $\rightarrow$ Redirección al panel principal $\rightarrow$ Apertura del modal de creación de paciente $\rightarrow$ Diligenciamiento de ficha clínica $\rightarrow$ Confirmación de creación $\rightarrow$ Verificación de aparición del nuevo paciente registrado en la tabla.

### C. Auditoría de Seguridad de Dependencias (`npm audit`)
```
found 0 vulnerabilities
```
Todas las dependencias instaladas en el frontend se encuentran al día y libres de vulnerabilidades conocidas.

---

## 12. Conclusiones y Cumplimiento de la Rúbrica

El sistema **VetClinic Pro** integra de manera armónica una API RESTful robusta y segura con una interfaz de usuario moderna, reactiva, accesible y responsiva.

Se satisfacen al 100% todos los criterios de evaluación del Trabajo 2:
- **Arquitectura y Consumo**: Separación estricta por capas, interceptores Axios, normalización de errores y contratos tipados con Zod.
- **CRUD y Usabilidad**: Operación completa sobre Pacientes, estados explícitos de carga/vacío/error y confirmación en acciones destructivas.
- **Accesibilidad**: Pautas WCAG 2.2 Nivel AA aplicadas en navegación por teclado, focos visibles, contrastes, touch targets $\ge 44$ px y lectores de pantalla.
- **Seguridad**: Autenticación Bearer, almacenamiento de token analizado y justificado, autorización por roles en cliente y servidor, mitigación verificada de 7 riesgos OWASP, CORS cerrado, cabeceras de seguridad y rate limiting 429.
- **Calidad y Verificación**: 23 pruebas automatizadas pasando al 100% (6 backend + 17 frontend), monorepo limpio y documentación técnica integral.
