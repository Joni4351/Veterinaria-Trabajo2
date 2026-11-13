# VetClinic Pro — Sistema de Gestión Clínica Veterinaria
## Trabajo 2: Frontend, Consumo de API y Seguridad de Extremo a Extremo

![.NET 8](https://img.shields.io/badge/.NET-8.0-blue)
![React](https://img.shields.io/badge/React-19.0-61dafb)
![Vite](https://img.shields.io/badge/Vite-8-646cff)

Plataforma de gestión veterinaria con **ASP.NET Core 8**, **React 19 y Vite 8**, y **PostgreSQL en Supabase**. Incluye gestión clínica, inventario, facturación, autenticación JWT, autorización por roles, registro facial administrativo, generación de datos de demostración y temas claro/oscuro. Las validaciones y pruebas se describen con su alcance y limitaciones; no se afirma una certificación integral de accesibilidad o seguridad.

Actualización de implementación y evidencias: **11 de noviembre de 2026**. La intervención asistida por IA y las decisiones solicitadas por el usuario se registran en [AI_LOG.md](AI_LOG.md).

---

## 📋 Estructura del Repositorio (Monorepo)

```
Veterinaria-Trabajo2/
├── VeterinariaAPI/              # Backend en ASP.NET Core 8.0 (Minimal APIs)
│   ├── Endpoints/               # Endpoints RESTful con validación y roles
│   ├── Middlewares/             # Excepciones sanitizadas y headers de seguridad
│   ├── Models/ y Repositories/  # Entidades y capa de persistencia EF Core
│   ├── Services/               # Autenticación, cifrado facial, roles y datos de demostración
│   ├── Program.cs               # Configuración de CORS, JWT y Rate Limiting
│   └── .env.example             # Plantilla de variables privadas del backend
├── VeterinariaAPI.Tests/        # Suite de pruebas unitarias/integración (.NET xUnit)
├── frontend/                    # Cliente web en React 19 + Vite + React Router
│   ├── src/
│   │   ├── components/          # ConfirmModal accesible, LoadingSpinner, EmptyState
│   │   ├── context/             # AuthContext y gestión reactiva de sesión
│   │   ├── schemas/             # Contratos de validación con Zod
│   │   ├── services/            # Axios centralizado con interceptores y servicios
│   │   ├── views/               # PacientesView (CRUD), LoginView, AccessDeniedView
│   │   └── test/                # Pruebas con Vitest y React Testing Library
│   ├── .env.example             # Plantilla de variables de entorno públicas
│   └── package.json             # Dependencias del frontend
├── veterinariodb.sql            # Script histórico SQL Server; incompatible con el backend actual
├── database/                    # Adaptación de la tabla facial a almacenamiento cifrado
├── docs/                        # Configuración, reglas de negocio y evidencia de pruebas
├── INFORME_TECNICO.md           # Informe técnico formal con matriz OWASP y WCAG
├── AI_LOG.md                    # Bitácora detallada de prompts y decisiones con IA
├── BITACORA.md                  # Registro cronológico de hitos del proyecto
└── README.md                    # Instrucciones de instalación y ejecución
```

---

## 🐳 Ejecución con Docker Compose

Docker Desktop debe estar iniciado con el motor de contenedores Linux y Compose disponible. Esta alternativa no requiere instalar .NET o Node en el equipo: sus imágenes realizan la compilación. El frontend se compila con Vite y se sirve mediante Nginx; la API utiliza ASP.NET Core 8. Ambos contenedores se ejecutan sin privilegios de administrador. El navegador accede a `/api` en el mismo origen y Nginx reenvía esas solicitudes a `api:8080`.

### Demostración aislada con PostgreSQL local

Desde la raíz, en PowerShell:

```powershell
.\scripts\Start-DockerSandbox.ps1
```

El script crea `.env.sandbox` con claves aleatorias privadas la primera vez y arranca el proyecto Compose `vetclinic-sandbox`. En ejecuciones posteriores conserva esas claves y el puerto. La aplicación queda en **http://localhost:15173**. Para elegir otro puerto en la primera ejecución: `Start-DockerSandbox.ps1 -Port 15174`; si el archivo ya existe, modifica `FRONTEND_PORT` en él.

Esta modalidad **no utiliza Supabase**. `compose.sandbox.yaml` fuerza la conexión a su servicio `database`, sin publicar PostgreSQL al equipo. Inicializa una base nueva mediante `database/migraciones/InicialPostgreSQL.sql` y luego ejecuta el sembrado inicial habitual de la API. No replica las cuentas o datos de Supabase. El volumen `vetclinic-sandbox_sandbox-data` conserva los registros al detener los contenedores; el script inicial SQL solo se ejecuta cuando ese volumen está vacío. Su inicialización no actualiza automáticamente una base local preexistente si cambia el modelo.

Estado, registros y detención conservando el volumen:

```powershell
docker compose --env-file .env.sandbox -p vetclinic-sandbox -f compose.yaml -f compose.sandbox.yaml ps
docker compose --env-file .env.sandbox -p vetclinic-sandbox -f compose.yaml -f compose.sandbox.yaml logs --tail 100
docker compose --env-file .env.sandbox -p vetclinic-sandbox -f compose.yaml -f compose.sandbox.yaml down
```

### Ejecución conectada a Supabase

```powershell
Copy-Item .env.docker.example .env.docker
```

Completa `.env.docker` con tu conexión Npgsql, clave JWT y clave biométrica. Utiliza las **mismas claves y parámetros de tu servidor actual** para mantener la compatibilidad con tokens y descriptores existentes. Las claves biométricas corresponden a 32 bytes en Base64; no deben regenerarse si se quiere leer los rostros ya almacenados. Escribe conexiones y claves entre comillas simples, como muestra la plantilla, para conservar caracteres literales como `$`. No subas el archivo completado a Git.

```powershell
docker compose --env-file .env.docker config --quiet
docker compose --env-file .env.docker up --build -d --wait
```

La aplicación estará en **http://localhost:5173**, o en el puerto que indique `FRONTEND_PORT`. La API permanece en la red interna. `compose.yaml` no aplica migraciones ni crea tablas en Supabase; el arranque conserva la reconciliación automática de roles y el sembrado de tablas vacías implementados en `Program.cs`, que sí pueden escribir en la base configurada. Las operaciones de la web también se guardan allí. Esta conexión remota no se utilizó para las pruebas de dockerización.

```powershell
docker compose --env-file .env.docker ps
docker compose --env-file .env.docker logs --tail 100
docker compose --env-file .env.docker down
```

### Comprobaciones y alcance

En facturación, una atención seleccionada debe añadirse con **Agregar Cita** y tener una consulta médica registrada. El formulario utiliza la relación `Consulta.CitaId` y envía el identificador de la consulta; la API también lo resuelve y valida al crear o editar. Una selección pendiente de agregar bloquea la emisión con un aviso. Los detalles son líneas independientes: la atención guarda `ConsultaId` y el producto guarda `InsumoId`, con la otra referencia vacía. No se generan consultas clínicas automáticamente para facturar citas sin atención registrada, ni se reparan asociaciones de facturas históricas sin revisión.

- `/health`: disponibilidad de Nginx. `/health/api`: conexión de la API a PostgreSQL. La disponibilidad de la API controla el orden de arranque de Compose; no acredita por sí sola la integridad completa del esquema.
- La API dispone internamente de `/health/live` y `/health/ready`, sin exponer configuraciones. Swagger permanece deshabilitado en el entorno `Production` de Compose.
- Las rutas de React admiten recarga directa; los modelos locales de face-api.js se incluyen en la imagen. La cámara puede utilizarse desde `localhost`. El acceso remoto con cámara requiere un contexto seguro; esta configuración local no incorpora publicación pública ni TLS.
- Los archivos `.dockerignore` excluyen configuraciones privadas, archivos `.env`, dependencias locales y artefactos de pruebas. El ejemplo `.env.docker.example` sí se versiona. Evita publicar la salida completa de `docker compose config` o inspecciones del entorno de contenedores, que pueden contener secretos; usa `config --quiet` para validar.
- La verificación inicial construyó las dos imágenes, arrancó tres servicios saludables con PostgreSQL 16 local, comprobó autenticación y CRUD de clientes, y ejecutó una prueba de navegador sin simular la API. El registro temporal fue eliminado.

Para repetir la prueba de navegador contra el sandbox iniciado en el puerto 15173, configura en la terminal `DOCKER_TEST_EMAIL` y `DOCKER_TEST_PASSWORD` con una cuenta de esa base local; después:

```powershell
cd frontend
npm run test:docker:e2e
```

La configuración de estas variables no debe guardarse en archivos versionados. La prueba Docker tiene una configuración independiente y no modifica las pruebas existentes que simulan la API.

Referencias: [servicios de Compose](https://docs.docker.com/reference/compose-file/services/) y [orden de arranque y salud](https://docs.docker.com/compose/how-tos/startup-order/).

## 🚀 Requisitos previos para ejecución sin Docker

- **.NET SDK 8.0** (`dotnet --version`).
- **Node.js 22.12 o superior** y npm (`node -v` y `npm -v`). Vite 8 también admite Node 20 desde 20.19; Node 18 no es compatible.
- Una base **PostgreSQL local o en Supabase**, accesible y con las tablas de la aplicación ya creadas.

Los comandos siguientes usan **PowerShell** y parten de la raíz del repositorio.

---

## ⚙️ Paso 1: Preparar PostgreSQL

El backend usa Npgsql y lee **`ConnectionStrings:miconexion`**. El archivo `veterinariodb.sql` es un script histórico para SQL Server y no puede ejecutarse directamente en PostgreSQL.

El repositorio incluye la migración inicial `InicialPostgreSQL` y su SQL en `database/migraciones/InicialPostgreSQL.sql`, generados desde el modelo de EF Core. El SQL se ejecutó correctamente para inicializar PostgreSQL 16 en el sandbox Docker y se verificaron arranque, autenticación y CRUD de clientes. No se ha aplicado a Supabase ni se ha ensayado `dotnet ef database update` contra PostgreSQL en esta intervención. La API no ejecuta `EnsureCreated` ni `Migrate` automáticamente. La migración describe la creación del esquema completo y no debe aplicarse directamente a una base Supabase que ya tenga esas tablas: su adopción requiere comparar los esquemas y preparar una línea base.

Para generar archivos sin conectarse a Supabase, desde la raíz del repositorio:

```powershell
dotnet tool restore
dotnet ef migrations add NombreDelCambio --project VeterinariaAPI --context VeterinariodbContext --configuration Release
dotnet ef migrations script --project VeterinariaAPI --context VeterinariodbContext --configuration Release --output cambio.sql
```

La fábrica de diseño `VeterinariodbContextFactory` evita iniciar la API y utiliza una conexión local inoperante sin secretos. No lee la conexión de producción; los comandos que necesiten una base real requieren una conexión explícita. Crear migraciones o generar SQL no los ejecuta. `Factura.FechaEmision` utiliza ahora `CURRENT_DATE`, compatible con PostgreSQL. La creación mediante SQL se comprobó en el sandbox; la comparación con Supabase y la evaluación integral de todas las restricciones y migraciones posteriores permanecen pendientes.

Para Supabase, usa los datos del pooler de tu propio proyecto. Se recomienda una cadena Npgsql `Host=...;Port=...;...`: el código reescribe algunas URL `postgresql://` hacia un pooler de región fija.

---

## ⚙️ Paso 2: Configurar y ejecutar el backend

1. Entra en la carpeta de la API:

   ```powershell
   cd VeterinariaAPI
   ```

2. Crea o actualiza `appsettings.Development.json` con tus datos. El archivo está excluido de Git. Ejemplo para PostgreSQL local:

   ```json
   {
     "ConnectionStrings": {
       "miconexion": "Host=localhost;Port=5432;Database=veterinariodb;Username=TU_USUARIO;Password=TU_PASSWORD"
     },
     "Jwt": {
       "Key": "REEMPLAZAR_POR_UN_SECRETO_ALEATORIO_DE_AL_MENOS_32_BYTES",
       "Issuer": "VeterinarioApi",
       "Audience": "VeterinarioApiUsuarios",
       "ExpireMinutes": "60"
     }
   }
   ```

   Para Supabase, sustituye `miconexion` por tus datos de conexión:

   ```text
   Host=HOST_DEL_POOLER;Port=PUERTO_DEL_POOLER;Database=postgres;Username=USUARIO_DEL_POOLER;Password=TU_PASSWORD;SSL Mode=Require
   ```

   También puedes configurar variables de entorno en la misma terminal; tienen prioridad sobre los archivos JSON:

   ```powershell
   $env:ConnectionStrings__miconexion = 'Host=localhost;Port=5432;Database=veterinariodb;Username=TU_USUARIO;Password=TU_PASSWORD'
   $env:Jwt__Key = 'REEMPLAZAR_POR_UN_SECRETO_ALEATORIO_DE_AL_MENOS_32_BYTES'
   $env:Jwt__Issuer = 'VeterinarioApi'
   $env:Jwt__Audience = 'VeterinarioApiUsuarios'
   $env:Jwt__ExpireMinutes = '60'
   ```

   Sustituye los marcadores antes de iniciar. **El backend no carga archivos `.env` automáticamente**. Copiar `VeterinariaAPI/.env.example` no configura la API; además, su conexión SQL Server está obsoleta. Las variables de PowerShell solo se aplican a esa terminal y sus procesos hijos.

3. Restaura las dependencias e inicia el perfil HTTP:

   ```powershell
   dotnet restore
   dotnet run --launch-profile http
   ```

   API: `http://localhost:5021`. Swagger en desarrollo: `http://localhost:5021/swagger`.

   El perfil opcional `https` usa `https://localhost:7189` y `http://localhost:5021`; requiere un certificado de desarrollo confiable.

4. Revisa los mensajes de arranque. `Aviso: No se pudo verificar o sembrar la base de datos inicial` indica un problema de conexión, esquema o datos. La API puede seguir escuchando aunque falle el sembrado; eso no confirma que la base funcione.

5. Para habilitar el guardado facial, ejecuta previamente `database/registro_facial_cifrado.sql` sobre la tabla existente, tras revisar sus cambios de restricción, columnas y permisos. Configura además `Biometrics:EncryptionKey` con una clave privada de 32 bytes en Base64. Genera una clave una sola vez:

   ```powershell
   $facialKeyBytes = [byte[]]::new(32)
   $facialRng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
   $facialRng.GetBytes($facialKeyBytes)
   $facialRng.Dispose()
   [Convert]::ToBase64String($facialKeyBytes)
   ```

   Agrega al objeto principal de `appsettings.Development.json`, conservando las demás secciones y las comas correspondientes:

   ```json
   "Biometrics": {
     "EncryptionKey": "PEGA_AQUI_LA_CLAVE_BASE64_GENERADA"
   }
   ```

   Conserva la clave en almacenamiento privado y estable; no la regeneres en cada inicio ni la publiques en el frontend o Git. El backend tampoco carga esta clave desde `.env` por sí solo. Sin una clave válida, registrar o reemplazar rostros devuelve 503. Más detalles y tratamiento de registros antiguos en [Registro Facial](docs/REGISTRO_FACIAL.md).

---

## ⚙️ Paso 3: Configurar y ejecutar el frontend

1. Abre otra terminal en la raíz del repositorio:

   ```powershell
   cd frontend
   Copy-Item .env.example .env
   ```

   Si ya tienes `.env`, conserva tu configuración. Para el perfil HTTP del backend debe contener:

   ```dotenv
   VITE_API_URL=http://localhost:5021
   ```

2. Instala las dependencias del archivo de bloqueo e inicia Vite:

   ```powershell
   npm ci
   npm run dev -- --port 5173 --strictPort
   ```

3. Abre `http://localhost:5173` con la API ejecutándose en la otra terminal. CORS permite `http://localhost:5173` y `http://localhost:3000`; otra dirección o puerto requiere ajustar la política del backend. Reinicia Vite si cambias `.env`.

---

## 👥 Credenciales de Prueba Preconfiguradas

Si las tablas existen y el sembrado termina correctamente, la API crea estos usuarios cuando la tabla de usuarios está vacía. En una base existente, las credenciales pueden ser diferentes. Estas cuentas son para desarrollo:

| Rol | Correo Electrónico | Contraseña | Permisos y Alcance en el Sistema |
| :--- | :--- | :--- | :--- |
| **Administrador** | `admin@veterinaria.com` | `Admin123*` | Acceso total: Pacientes, Citas, Insumos, Facturación y Panel `/admin`. |
| **Veterinario** | `vet@veterinaria.com` | `Vet123*` | Acceso a gestión clínica (Pacientes, Citas, Consultas). Bloqueado de `/admin` (403). |
| **Recepcionista** | `recepcion@veterinaria.com` | `Recep123*` | Acceso a recepción, agenda de citas y fichas de clientes. |

---

## 🛡️ Características de Seguridad y Arquitectura

### Funcionalidades implementadas por requerimiento

| Requerimiento | Comportamiento actual |
| --- | --- |
| Registro facial | Administración → Registro Facial; fotografía JPG/PNG de hasta 5 MB y 20 megapíxeles; consentimiento, detección de un rostro y descriptor de 128 números. Solo el descriptor se envía al servidor, se cifra con AES-256-GCM y se guarda en JSONB. Consulta de metadatos, reemplazo y eliminación con autorización de administrador. No se implementa login facial. |
| Creación de usuarios | Se retiró el registro público del login. Administración → Cuentas de Usuarios permite crear cuentas y asignar roles; `/api/v1/usuarios/register` exige Administrador. El menú Administración se oculta a los demás roles y su ruta permanece protegida. |
| Roles obligatorios | Al iniciar la API se crean los roles faltantes y se corrigen sus valores: Administrador `true`, Veterinario `true`, Recepcionista `false`. Se conservan IDs y asociaciones existentes. No se asumen IDs 1, 2 y 3. |
| Datos de prueba | Administración → Datos de prueba genera el lote `vetclinic-demo-v1` tras vista previa y doble confirmación. Reutiliza el lote intacto; revisa conflictos de identidad y facturas incompletas. Se guarda en la base conectada, incluida Supabase si así está configurada; no es un modo local activable/desactivable. |
| Validaciones del negocio | Referencias existentes, profesional veterinario, coincidencias exactas de agenda, coherencia cita/paciente, vigencia de recetas, contactos, cantidades y líneas de factura. Detalle en [VALIDACIONES_NEGOCIO.md](docs/VALIDACIONES_NEGOCIO.md). |
| Presentación | Selector luna/sol en la zona superior derecha, preferencia persistida, colores adaptados a ambos temas y barra lateral fija en escritorio. Se corrigió la alineación del formulario de usuarios. |
| JWT y sesión | Se valida firma, emisor, audiencia y vigencia en el servidor. Al restaurar una sesión, se comprueba el JWT antes de recuperar el usuario guardado; tokens vencidos, malformados o sin expiración numérica válida se descartan. |

Los roles se verifican al iniciar el backend; la reposición no es una vigilancia continua de la tabla. `PermisosEscritura` no sustituye las políticas de cada endpoint: Recepcionista, por ejemplo, puede crear/editar citas por autorización explícita del servidor.

El generador web no crea tablas, no elimina registros ni actúa como respaldo. Los datos DEMO aparecen en listados, inventario y reportes. Utiliza una base separada si necesitas aislamiento respecto de la operación real. El sembrado inicial de `Program.cs` es un mecanismo distinto, condicionado por las tablas existentes.

### Controles actuales

1. **Autenticación JWT en el Cliente**:
   - Token conservado en `localStorage`; este almacenamiento es accesible desde JavaScript y mantiene riesgos frente a XSS.
   - Inyección automática como cabecera `Authorization: Bearer <token>` mediante interceptor Axios.
   - Comprobación de expiración antes de restaurar el usuario guardado, y limpieza de sesión ante respuestas 401. No se añadió un temporizador de cierre ni renovación automática.
   - En el backend: `ValidateIssuer`, `ValidateAudience`, `ValidateLifetime` y `ValidateIssuerSigningKey` activados; emisión y validación comparten `Jwt:Audience`.
2. **Autorización Basada en Roles (RBAC)**:
   - Rutas privadas mediante `<ProtectedRoute allowedRoles={['...']} />`.
   - Vistas denegadas amigables (`AccessDeniedView`) ante código HTTP 403 Forbidden.
   - La API exige los roles declarados en cada operación protegida; los módulos facial y de datos de prueba comprueban además el rol actual de la cuenta en la base.
3. **Seguridad del Backend para Navegadores**:
   - Política **CORS restringida** exclusivamente a `http://localhost:5173` y `http://localhost:3000`.
   - **Cabeceras HTTP de Seguridad**: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection: 1; mode=block`, `Referrer-Policy: strict-origin-when-cross-origin`.
   - **Rate Limiting (HTTP 429)**: Límite de 5 solicitudes/minuto en el login. El registro de cuentas es una operación administrativa protegida.
   - **Manejo Sanitizado de Excepciones**: `GlobalExceptionMiddleware` enmascara errores internos y no filtra stack traces en producción.
4. **Validación de Formularios con Zod**:
   - Esquemas tipados y robustos para Login, Pacientes y Clientes.
   - Mensajes de error en tiempo real vinculados semánticamente a los inputs mediante `aria-describedby` y `role="alert"`.
   - Los formularios de registro y actualización bloquean el envío mientras su operación está pendiente y muestran «Procesando…». El bloqueo síncrono impide envíos repetidos por clic o teclado antes de la actualización visual y se libera al terminar o fallar. Las confirmaciones comparten esta protección. El alcance es la instancia de formulario o confirmación; no constituye idempotencia global del backend entre pestañas o clientes diferentes.
   - Los campos numéricos de formularios y filtros bloquean letras, notación científica (`e`, `E`), signos y expresiones al escribir, pegar o arrastrar texto. Stock, cantidades, días y número de registros utilizan enteros; peso e importes admiten punto decimal. Los esquemas también rechazan cadenas como `1e3`, sin convertirlas en otro valor. Se mantienen las reglas de formato propias del teléfono y RUT, que no son magnitudes numéricas.
5. **Controles de accesibilidad**:
   - Etiquetas, mensajes de error, foco visible (`:focus-visible`) y atributos ARIA en los componentes correspondientes.
   - El diálogo de confirmación permite cancelar con `Escape` cuando no hay una operación en curso y coloca el foco inicial en cancelar.
   - Tamaño táctil de referencia de 44 × 44 píxeles en componentes comunes; existen variantes compactas que requieren evaluación dentro de una auditoría completa.
   - Estados y errores anunciados mediante `aria-live` o roles semánticos. Estos controles no equivalen a una auditoría completa WCAG 2.2 AA.
6. **Diseño Responsivo Mobile-First**:
   - Adaptación de la navegación y formularios a pantallas móviles; se realizaron comprobaciones de navegador a 390 px.
   - Menú off-canvas (drawer hamburguesa) para pantallas móviles y adaptación de tablas clínicas con scroll horizontal suave.

---

## 🧪 Pruebas Automatizadas

Últimas ejecuciones observadas; se realizaron en momentos distintos y sus cantidades corresponden a las suites del proyecto, no solo a un módulo:

| Verificación | Resultado |
| --- | --- |
| Backend local, después de activar audiencia JWT | 67 pruebas aprobadas; se excluyó expresamente la prueba externa de conexión a Supabase. |
| Frontend, después de corregir la restauración de sesión | 59 pruebas aprobadas. |
| Navegador Edge con API simulada | 6 pruebas aprobadas; la detección facial utiliza los modelos locales reales. |
| Compilación frontend de producción | Correcta; conserva advertencias de tamaño de bundles y externalización de `fs` de face-api.js. |

Ejecuta las pruebas por separado de la instalación. La cantidad de casos y el resultado de la auditoría deben comprobarse en cada ejecución.

Desde la raíz, configura JWT en una terminal separada antes de ejecutar las pruebas del backend. La suite genera tokens con estos valores fijos de prueba:

```powershell
$env:Jwt__Key = 'Mi_super-claveultra-secreta1234:)'
$env:Jwt__Issuer = 'VeterinarioApi'
$env:Jwt__Audience = 'VeterinarioApiUsuarios'
dotnet test VeterinariaAPI.Tests/VeterinariaAPI.Tests.csproj -c Release --filter "FullyQualifiedName!~Test_Supabase_Connection"
```

Este comando ejecuta la suite local con EF Core InMemory y excluye `Test_Supabase_Connection`, que utiliza una conexión externa y debe revisarse antes de ejecutarla. No verifica el esquema ni las transacciones/bloqueos reales de PostgreSQL. Conserva tu secreto propio para ejecutar la aplicación.

Para el frontend, desde otra terminal en la raíz:

```powershell
cd frontend
npm test
npm run build
npm audit
```

`npm test` ejecuta Vitest sobre `src/test`; no ejecuta el archivo de `e2e/`.

Para las pruebas de navegador, con Microsoft Edge instalado:

```powershell
# Desde frontend; usa un puerto de pruebas para no cerrar tu servidor de desarrollo.
$env:PLAYWRIGHT_PORT = '5174'
npm run test:facial:e2e
```

Playwright levanta Vite y simula las respuestas de la API; no genera registros en Supabase. Si se requiere otro navegador, adapta `playwright.facial.config.js` y su instalación.

La prueba `Test_Supabase_Connection` no contiene credenciales incrustadas y se omite automáticamente cuando no se configura `VETCLINIC_TEST_POSTGRES_CONNECTION`. Esa variable debe contener una conexión privada de pruebas para habilitar explícitamente el acceso externo. No se debe versionar su valor. Retirar una credencial del código actual no la elimina de commits históricos; si sigue vigente, corresponde rotarla en el proveedor.

### Límites y cambios expresamente pendientes

- El SQL de la migración inicial se utilizó para crear PostgreSQL en el sandbox Docker y se verificaron operaciones básicas. Su adopción en Supabase, la aplicación mediante EF CLI y la evaluación integral de restricciones y migraciones posteriores siguen pendientes. El script facial adapta una tabla existente.
- El usuario solicitó aplicar únicamente la corrección de restauración de sesión. Se conserva `localStorage`; no se implementaron cookies HttpOnly, refresh tokens, revocación de sesiones ni eliminación del fallback heredado de contraseñas en texto plano.
- Las comprobaciones previas de agenda no garantizan exclusión entre peticiones concurrentes ni detectan intervalos completos, porque el modelo no tiene duración de atención.
- La cantidad y el precio histórico todavía no se almacenan por separado en cada detalle de factura. Esa mejora sigue siendo necesaria para una reconstrucción fiable del inventario cuando cambian los precios.
- El generador utiliza transacción y bloqueo asesor en PostgreSQL, pero su reversión y concurrencia real requieren validación en una base PostgreSQL aislada.

---

## 📚 Documentación de Entrega

- **[Datos de prueba — Hito 2](docs/DATOS_PRUEBA_WEB.md)**: documentación académica del generador web, composición del lote, persistencia, validaciones y resultados de pruebas.
- **[Evidencia de pruebas del generador](docs/PRUEBAS_GENERADOR.md)**: casos comprobados, fallos corregidos y límites de la verificación.

- **[Validaciones del negocio](docs/VALIDACIONES_NEGOCIO.md)**: reglas clínicas, agenda, contactos, recetas, facturación y límites de concurrencia.

- **[Registro Facial](docs/REGISTRO_FACIAL.md)**: configuración de cifrado, adaptación de la tabla existente en Supabase, consentimiento, endpoints y verificación del módulo administrativo.

Para detalles exhaustivos de evaluación, consulta los siguientes documentos:
- 📄 **[INFORME_TECNICO.md](INFORME_TECNICO.md)**: Informe técnico formal con la justificación de diseño, matriz completa de 7 riesgos OWASP mitigados, auditoría WCAG 2.2 AA y métricas.
- 🤖 **[AI_LOG.md](AI_LOG.md)**: Registro histórico de IA y actualización de las intervenciones realizadas con Codex; requerimientos, cambios, pruebas y decisiones de alcance.
- 📓 **[BITACORA.md](BITACORA.md)**: Registro cronológico de actividades, sesiones de trabajo e hitos del proyecto.

# Panel de gestión

Los conflictos que antes utilizaban alertas nativas del navegador se muestran mediante diálogos personalizados, con el motivo recibido de la API, temas claro/oscuro y cierre mediante Entendido o Escape. Las eliminaciones mantienen confirmación explícita; la eliminación de recetas también utiliza el componente de confirmación del proyecto. Los avisos no autorizan ni reintentan por sí mismos operaciones rechazadas.

La implementación y evidencia de accesibilidad, junto con la revisión manual pendiente, se detallan en [docs/ACCESIBILIDAD.md](docs/ACCESIBILIDAD.md). La auditoría automática registrada incluye 28 escenarios completos sin incidencias; no sustituye la aceptación con lector de pantalla.

El panel está disponible en **Administración → Dashboard de gestión**, exclusivamente para el rol Administrador. Tanto `GET /api/v1/dashboard/analitica` como el resumen anterior `GET /api/v1/dashboard` requieren JWT y rol Administrador; los demás roles reciben 403. Incluye cuatro visualizaciones: evolución de montos facturados (línea), citas por fecha y estado (barras apiladas), participación por especialidad (anillo) y existencias de insumos (barras horizontales). Cada gráfico ofrece una tabla alternativa de datos. La pantalla de inicio ofrece accesos a agenda y pacientes sin consultar indicadores administrativos.

El período predeterminado comprende los últimos 30 días; se puede seleccionar un rango de hasta 366 días y agrupar por día, semana o mes. Los filtros de especialidad, veterinario y estado afectan a la agenda. Categoría y existencias permiten filtrar el inventario, que representa el stock actual y no un histórico. Los montos corresponden a facturas emitidas, no a pagos ni ganancias.

Los seis indicadores pueden consultarse directamente: total facturado, promedio por factura, cantidad de citas, porcentaje de cancelaciones, participación de citas por especialidad y porcentaje de insumos agotados. El promedio utiliza el total con impuestos dividido entre la cantidad de facturas del período. El porcentaje de agotados utiliza todos los insumos de la categoría, independientemente del selector que limita las barras. La participación se devuelve para cada especialidad de las citas filtradas. Los promedios y porcentajes sin denominador se devuelven como null y se presentan como No calculable. El desplegable **Cómo se calculan los seis indicadores** ofrece una tabla con pregunta de negocio, fórmula y resultado actualizado. Se conserva adicionalmente el indicador de alertas de inventario.

Si una instancia anterior de la API aún no devuelve los campos derivados, la interfaz los calcula a partir de los agregados de esa misma respuesta. No utiliza las vistas previas acotadas de facturas o insumos como denominador. Cero agotados entre insumos existentes representa 0 %, mientras que un denominador vacío conserva No calculable.

Los datos se consultan al abrir la pantalla, cambiar filtros, regresar a la ventana y cada 30 segundos mientras está visible. Las operaciones exitosas de escritura realizadas mediante el cliente API notifican al panel para actualizarlo. Las solicitudes se cancelan al cambiar filtros o abandonar la vista; los errores conservan la última lectura e informan al usuario. El backend agrega los datos antes de enviarlos y limita las vistas previas a cinco citas próximas y doce insumos. No requiere modificaciones del esquema de PostgreSQL.

