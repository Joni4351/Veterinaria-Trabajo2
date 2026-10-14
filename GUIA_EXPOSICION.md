# GUÍA DE PREPARACIÓN PARA LA EXPOSICIÓN Y DEFENSA INDIVIDUAL
## Trabajo 2: Frontend, Consumo de API y Seguridad de Extremo a Extremo
**Sistema:** VetClinic Pro — Plataforma de Gestión Clínica Veterinaria  
**Puntaje en Rúbrica:** 15 puntos (15% de la nota final)  
**Tiempo Recomendado:** 5 a 7 minutos de exposición + demostración en vivo  

---

## 1. Estructura y Cronograma de la Presentación (5-7 Minutos)

Para asegurar la calificación máxima (**Destacado 100%**), la presentación debe cubrir de forma fluida y estructurada los tres ejes evaluados: **Arquitectura**, **Autenticación/Autorización** y **Seguridad**, acompañados de la **Demostración en Vivo**:

```
[00:00 - 01:00]  1. Introducción y Arquitectura General (Capas, React 19, Axios, .NET 8)
[01:00 - 02:30]  2. Flujo de Autenticación JWT, Storage y Autorización por Roles (RBAC)
[02:30 - 04:30]  3. Demostración en Vivo del Sistema Completo y Controles de Seguridad
[04:30 - 05:30]  4. Accesibilidad WCAG 2.2 AA, Diseño Responsivo y Pruebas Automatizadas
[05:30 - 07:00]  5. Conclusión y Ronda de Preguntas Técnicas del Docente
```

---

## 2. Guión Paso a Paso para la Demostración en Vivo (Live Demo Script)

> **Consejo previo:** Ten abiertas con antelación dos terminales (una para el Backend y otra para el Frontend) y el navegador Google Chrome con las Herramientas de Desarrollador (`F12`) en la pestaña **Network** (Red) y **Console** (Consola).

### Paso 1: Puesta en Marcha del Sistema
1. **Terminal 1 (Backend):**
   ```bash
   cd C:\Users\joni5.DESKTOP-AF57599\Downloads\VeterinariaAPI-master\VeterinariaAPI
   dotnet run
   ```
   *Explicar:* "La API levanta en `http://localhost:5021` bajo .NET 8, con políticas de CORS cerradas a `localhost:5173`, cabeceras de seguridad y rate limiting activo."
2. **Terminal 2 (Frontend):**
   ```bash
   cd C:\Users\joni5.DESKTOP-AF57599\Downloads\VeterinariaAPI-master\frontend
   npm run dev
   ```
   *Explicar:* "El frontend levanta con Vite en `http://localhost:5173`, consumiendo la URL base configurada desde la variable de entorno `VITE_API_URL`."

---

### Paso 2: Flujo de Autenticación y Token Bearer
1. Abre el navegador en `http://localhost:5173`.
2. Observa cómo al entrar a la raíz (`/`), el guard `ProtectedRoute` detecta la ausencia de sesión y te redirige automáticamente a `/login`.
3. Abre las DevTools (`F12`), pestaña **Network** (Red).
4. Inicia sesión con el usuario Administrador:
   - **Correo:** `admin@veterinaria.com`
   - **Contraseña:** `Admin123*`
5. Haz clic en **"Iniciar Sesión"**.
6. **Qué señalar al docente:**
   - Muestra la petición POST a `/api/v1/usuarios/login` con código `HTTP 200`.
   - Muestra el payload de respuesta que contiene el token JWT y el perfil de usuario.
   - Muestra la siguiente petición (`GET /api/v1/pacientes` o `/api/v1/citas`): enseña en los **Request Headers** la cabecera `Authorization: Bearer eyJhbGci...` inyectada automáticamente por el interceptor de solicitud de Axios.
   - Abre la pestaña **Application** $\rightarrow$ **Local Storage**: muestra la clave `vet_token` almacenada.

---

### Paso 3: Prueba de Expiración de Token y Manejo de 401 Unauthorized
1. En la pestaña **Application** $\rightarrow$ **Local Storage**, haz doble clic sobre el valor de `vet_token` y escribe `"token_invalido_expirado"`.
2. Recarga la página o intenta navegar a otra pestaña (por ejemplo, "Clientes").
3. **Qué señalar al docente:**
   - La API rechaza la petición con `HTTP 401 Unauthorized`.
   - El interceptor de respuesta de Axios captura inmediatamente el error 401, elimina el token corrupto del almacenamiento local y redirige de forma automática al usuario a `/login` sin dejar la aplicación en un estado inconsistente.

---

### Paso 4: Autorización por Roles y Manejo de 403 Forbidden
1. Vuelve a iniciar sesión, pero ahora con un usuario de rol **Veterinario**:
   - **Correo:** `vet@veterinaria.com`
   - **Contraseña:** `Vet123*`
2. **Qué señalar en la interfaz:**
   - El menú lateral adapta sus opciones: el enlace a **"Administración"** (`/admin`) está oculto para este rol.
3. **Prueba de intrusión / evasión de interfaz:**
   - Escribe manualmente en la barra de direcciones del navegador: `http://localhost:5173/admin` y presiona Enter.
4. **Qué señalar al docente:**
   - El componente `ProtectedRoute` intercepta la navegación y verifica que el rol `Veterinario` no figura en `allowedRoles={['Administrador']}`.
   - En lugar de una pantalla en blanco o un fallo no controlado, se renderiza la vista accesible **`AccessDeniedView`** con código **403 - Acceso Denegado**, explicando con cortesía técnica que su rol actual no cuenta con privilegios para esa sección.
   - Además, aclara: *"Si un usuario intentara llamar directamente al endpoint de la API mediante curl o Postman, el backend .NET también rechaza la solicitud con 403 Forbidden mediante su atributo de autorización por roles."*

---

### Paso 5: Prueba de Rate Limiting y Manejo de 429 Too Many Requests
1. Cierra sesión.
2. En la pantalla de Login, introduce credenciales erróneas y presiona el botón "Iniciar Sesión" **6 veces seguidas rápidamente**.
3. **Qué señalar al docente:**
   - En la sexta petición, la API responde con `HTTP 429 Too Many Requests`.
   - El interceptor de Axios intercepta el código 429 y emite el evento que despliega un **Toast flotante de advertencia**: *"Has realizado demasiadas solicitudes. Por favor espera 60 segundos antes de reintentar."*
   - Demuestra que el sistema está protegido contra ataques de fuerza bruta en contraseñas (OWASP API4:2023).

---

### Paso 6: Demostración de CRUD Completo en Pacientes
1. Inicia sesión como `admin@veterinaria.com`.
2. Ve al módulo **Pacientes**.
3. **Búsqueda y Filtros en tiempo real:**
   - Escribe en la barra de búsqueda *"Max"* o filtra por especie *"Canino"*. Muestra cómo la tabla filtra reactivamente los resultados.
4. **Validación de Formulario con Zod:**
   - Presiona el botón **"+ Nuevo Paciente"**.
   - Deja los campos vacíos y haz clic en "Guardar Paciente".
   - Muestra cómo aparecen inmediatamente los mensajes de error en rojo bajo cada campo (`Nombre es obligatorio`, `Especie es obligatoria`, `Peso debe ser mayor a 0`).
   - Muestra con el inspector de elementos que el campo tiene `aria-invalid="true"` y `aria-describedby="error-nombre"`.
5. **Creación Exitosa:**
   - Completa los datos: Dueño: *Juan Pérez*, Nombre: *Toby*, Especie: *Canino*, Raza: *Golden Retriever*, Peso: *28.5*, Alergias: *Ninguna*.
   - Guarda el paciente y muestra cómo aparece inmediatamente en la tabla.
6. **Detalle y Edición:**
   - Haz clic en el icono del ojo (Ver detalle) para abrir la ficha clínica.
   - Haz clic en el icono del lápiz (Editar) y modifica el peso a *29.0*. Guarda los cambios.
7. **Eliminación Segura con ConfirmModal:**
   - Haz clic en el icono del basurero (Eliminar).
   - **Qué señalar al docente:**
     - Se abre el componente accesible `ConfirmModal` que advierte el borrado irreversible del paciente.
     - Presiona la tecla `Escape`: el modal se cierra sin borrar.
     - Vuelve a abrirlo y confirma la eliminación: el paciente se borra y la lista se actualiza.

---

### Paso 7: Prueba de Inyección Neutralizada (Prevención de XSS)
1. Abre el modal de creación de paciente.
2. En el campo **Nombre**, ingresa el siguiente texto malicioso:
   ```html
   <script>alert('VULNERABLE XSS')</script>
   ```
3. Guarda el paciente.
4. **Qué señalar al docente:**
   - El script no se ejecuta en ningún momento.
   - React 19 escapa automáticamente todos los valores en el Virtual DOM, mostrándolo como texto literal inofensivo.
   - En el código no existe ningún uso de `dangerouslySetInnerHTML`.

---

### Paso 8: Demostración de Accesibilidad Universal (WCAG 2.2 Nivel AA)
1. **Navegación Exclusiva por Teclado:**
   - Suelta el mouse y coloca las manos a la vista.
   - Presiona la tecla `Tab` repetidamente: muestra cómo el **anillo de foco azul visible** (`outline: 2px solid #0284c7`) recorre secuencialmente el menú, la barra de búsqueda, los botones y la tabla.
   - Presiona `Enter` sobre el botón "+ Nuevo Paciente": el modal se abre y el foco se atrapa dentro del formulario.
   - Presiona `Escape`: el modal se cierra instantáneamente y el foco regresa al botón de origen.
2. **Dimensiones Táctiles:**
   - Inspecciona cualquier botón de acción con las DevTools: verifica que sus dimensiones de caja miden al menos **$44 \times 44$ píxeles**, cumpliendo WCAG 2.5.8.

---

### Paso 9: Demostración de Diseño Responsivo Mobile-First
1. En las DevTools de Chrome, activa el modo dispositivo (icono de teléfono / tablet `Ctrl + Shift + M`).
2. Ajusta el ancho a **375 px** (iPhone SE / estándar móvil) e incluso a **320 px** (móvil ultracompacto).
3. **Qué señalar al docente:**
   - No existe scroll horizontal involuntario en la ventana principal.
   - El menú lateral se convierte en un botón hamburguesa accesible que despliega un drawer suave (off-canvas).
   - La tabla de datos incorpora scroll horizontal suave en su contenedor para no desbordar la pantalla.
   - Los modales se ajustan al 100% del ancho con padding ergonómico.

---

### Paso 10: Evidencia de Pruebas Automatizadas
1. Abre la terminal y ejecuta la suite del Backend:
   ```bash
   dotnet test VeterinariaAPI.Tests/VeterinariaAPI.Tests.csproj
   ```
   *Resultado:* **6 superadas de 6 (100%)**.
2. Ejecuta la suite del Frontend:
   ```bash
   cd frontend
   npm test -- --run
   ```
   *Resultado:* **17 superadas de 17 (100%)** cubriendo guards de rutas protegidas, validación y estados de login, CRUD completo y la prueba E2E de flujo completo de negocio (`FlowIntegration.test.jsx`).
3. Muestra la auditoría de dependencias:
   ```bash
   npm audit
   ```
   *Resultado:* **0 vulnerabilities**.

---

## 3. Banco de Preguntas Técnicas del Docente y Respuestas de Nivel Experto

A continuación se recopilan las preguntas más habituales y profundas que la comisión evaluadora suele formular, junto con sus respuestas técnicas fundamentadas:

### P1: ¿Por qué eligieron almacenar el token JWT en `localStorage` en vez de usar una cookie con bandera `HttpOnly`?
> **Respuesta:**  
> "Evaluamos rigurosamente ambas estrategias según el modelo de amenazas OWASP.  
> Las cookies `HttpOnly` protegen el token frente a scripts maliciosos de lectura en el cliente, pero son vulnerables por diseño a ataques de **Cross-Site Request Forgery (CSRF)**, ya que el navegador las adjunta automáticamente en peticiones de origen cruzado, requiriendo tokens anti-CSRF adicionales y configuraciones complejas de dominio compartido en entornos de desarrollo desacoplados (puertos 5173 y 5021).  
> Por su parte, la estrategia **Bearer Token en Web Storage** es **100% inmune a CSRF**, ya que ningún navegador envía la cabecera `Authorization` de forma involuntaria. Su único riesgo teórico es el robo por Cross-Site Scripting (XSS). Por ello, aplicamos una defensa en profundidad contra XSS: renderizado seguro de React sin `dangerouslySetInnerHTML`, cabeceras HTTP de seguridad (`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`), tokens con tiempo de expiración corto y destrucción inmediata en logout y ante cualquier error 401."

---

### P2: ¿Qué sucede si un usuario malintencionado modifica el rol en el LocalStorage de su navegador para hacerse pasar por "Administrador"?
> **Respuesta:**  
> "En el frontend podría engañar temporalmente la interfaz para ver opciones de menú, pero **el sistema jamás depende de la confianza en el cliente**.  
> El token JWT está firmado criptográficamente por el servidor con una clave simétrica secreta (`HMAC-SHA256`). Cuando el cliente realiza cualquier petición HTTP a un endpoint protegido de la API, el middleware de autenticación de ASP.NET Core valida la firma digital del token y extrae los claims reales desde el servidor. Si el usuario alteró el token, la firma se invalida y el servidor responde `HTTP 401 Unauthorized`. Si el usuario conserva un token válido pero con rol 'Veterinario' e invoca una Minimal API que exige `RequireRole("Administrador")`, el backend rechaza inmediatamente la petición con `HTTP 403 Forbidden`."

---

### P3: ¿Cómo opera el interceptor de Axios frente a caídas de red o respuestas no estructuradas del servidor?
> **Respuesta:**  
> "En `src/services/api.js` configuramos un interceptor de respuesta que normaliza todas las excepciones.  
> Si la API devuelve un error de validación 400 con formato estándar de ASP.NET Core (`ProblemDetails` o diccionario de `errors`), extraemos y aplanamos los mensajes para presentarlos en el formulario. Si el servidor responde 401, limpiamos la sesión y redirigimos a `/login`. Si responde 403 o 429, emitimos eventos desacoplados (`vet:forbidden` y `vet:ratelimit`). Y si ocurre una falla física de red (servidor apagado o timeout sin respuesta HTTP), capturamos la excepción y devolvemos un mensaje amigable: *'No se pudo conectar con el servidor veterinario. Verifique su conexión o intente más tarde'*, evitando que la aplicación lance excepciones no controladas en consola."

---

### P4: ¿Por qué adoptaron Zod para la validación y qué ventajas ofrece frente a validaciones manuales con `if`?
> **Respuesta:**  
> "Adoptamos **Zod** porque permite definir esquemas declarativos que actúan como única fuente de verdad (Single Source of Truth) para la estructura y reglas de los datos.  
> A diferencia de validaciones manuales con condicionales imperativos que tienden a desincronizarse y dejar casos de borde sin validar, Zod ejecuta validaciones tipadas y exhaustivas (longitud mínima/máxima, tipos numéricos positivos, formatos de email, fechas no futuras). Además, con su método `safeParse()`, capturamos todos los problemas (`issues`) en una sola pasada y los transformamos directamente en el mapa de errores que alimenta los atributos de accesibilidad `aria-describedby` y `role="alert"` de cada campo."

---

### P5: ¿Cómo implementaron el Rate Limiting en .NET 8 y cómo está configurado?
> **Respuesta:**  
> "Utilizamos el middleware nativo `Microsoft.AspNetCore.RateLimiting` introducido en .NET 7/8.  
> Definimos la política `'AuthPolicy'` basada en el algoritmo de ventana fija (`FixedWindowRateLimiterOptions`). Se configuró un límite de 5 solicitudes (`PermitLimit = 5`) dentro de una ventana de 60 segundos (`Window = TimeSpan.FromSeconds(60)`), con partición por dirección IP remota (`httpContext.Connection.RemoteIpAddress`). La cola de solicitudes se estableció en 0 (`QueueLimit = 0`), lo que garantiza que una sexta petición en menos de un minuto no quede retenida, sino que sea rechazada de inmediato con el código de estado estándar `HTTP 429 Too Many Requests`."

---

### P6: ¿Qué rol jugó la Inteligencia Artificial en el proyecto y qué decisiones técnicas tomaron sobre sus sugerencias?
> **Respuesta:**  
> "Utilizamos el modelo **Gemini 3.8 Flash** en la plataforma **Antigravity** como asistente de pair-programming.  
> Todas las interacciones quedaron documentadas en el archivo `AI_LOG.md`. La IA fue muy valiosa para generar esqueletos de componentes y suites de pruebas, pero su código requirió intervención técnica crítica en varios puntos:
> 1. La IA propuso inicialmente compilar en `net10.0`, lo cual corregimos a `net8.0` para que coincidiera con el SDK estable instalado en nuestra máquina.
> 2. Sugirió usar `window.confirm()` para borrado, lo cual descartamos por no cumplir con WCAG 2.2 AA, construyendo el componente accesible `ConfirmModal`.
> 3. En las pruebas de Vitest, la IA cometió un error de hoisting con `vi.mock('react-router-dom')`, que corregimos utilizando la API `vi.hoisted()`.  
> Esto demuestra que la IA aceleró el desarrollo, pero el control arquitectónico y la comprensión de cada línea de código corresponden plenamente a nuestro equipo."
