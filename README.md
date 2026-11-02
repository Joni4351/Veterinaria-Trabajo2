# VetClinic Pro — Sistema de Gestión Clínica Veterinaria
## Trabajo 2: Frontend, Consumo de API y Seguridad de Extremo a Extremo

![.NET 8](https://img.shields.io/badge/.NET-8.0-blue)
![React](https://img.shields.io/badge/React-19.0-61dafb)
![Vite](https://img.shields.io/badge/Vite-8-646cff)
![WCAG](https://img.shields.io/badge/WCAG-2.2%20AA-success)
![Audit](https://img.shields.io/badge/npm%20audit-0%20vulnerabilities-brightgreen)

Plataforma integral para clínicas veterinarias que combina una **API RESTful desarrollada en ASP.NET Core 8.0** con un **cliente web moderno en React 19 (Vite)**, implementando autenticación JWT, autorización por roles (RBAC), control de concurrencia y rate limiting, accesibilidad universal **WCAG 2.2 Nivel AA**, diseño responsivo mobile-first y mitigación de riesgos de seguridad **OWASP Top 10**.

---

## 📋 Estructura del Repositorio (Monorepo)

```
Veterinaria-Trabajo2/
├── VeterinariaAPI/              # Backend en ASP.NET Core 8.0 (Minimal APIs)
│   ├── Endpoints/               # Endpoints RESTful con validación y roles
│   ├── Middlewares/             # Excepciones sanitizadas y headers de seguridad
│   ├── Models/ y Repositories/  # Entidades y capa de persistencia EF Core
│   ├── Program.cs               # Configuración de CORS, JWT y Rate Limiting
│   └── .env.example             # Referencia de variables; conexión SQL Server obsoleta
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
├── INFORME_TECNICO.md           # Informe técnico formal con matriz OWASP y WCAG
├── AI_LOG.md                    # Bitácora detallada de prompts y decisiones con IA
├── BITACORA.md                  # Registro cronológico de hitos del proyecto
└── README.md                    # Instrucciones de instalación y ejecución
```

---

## 🚀 Requisitos previos

- **.NET SDK 8.0** (`dotnet --version`).
- **Node.js 22.12 o superior** y npm (`node -v` y `npm -v`). Vite 8 también admite Node 20 desde 20.19; Node 18 no es compatible.
- Una base **PostgreSQL local o en Supabase**, accesible y con las tablas de la aplicación ya creadas.

Los comandos siguientes usan **PowerShell** y parten de la raíz del repositorio.

---

## ⚙️ Paso 1: Preparar PostgreSQL

El backend usa Npgsql y lee **`ConnectionStrings:miconexion`**. El archivo `veterinariodb.sql` es un script histórico para SQL Server y no puede ejecutarse directamente en PostgreSQL.

**Limitación para una instalación desde cero:** el repositorio no incluye migraciones ni un script de creación para PostgreSQL. La API tampoco ejecuta `EnsureCreated` ni `Migrate`: solo intenta insertar datos iniciales en tablas existentes. Necesitas una base previamente preparada o un respaldo PostgreSQL compatible facilitado por el responsable del proyecto. Crear una base vacía no basta.

Para preparar un esquema nuevo, queda pendiente adaptar el DDL a PostgreSQL y comprobar tablas, columnas, claves, identidades y tipos contra `VeterinariaAPI/Models/VeterinariodbContext.cs`. Ese modelo todavía contiene un valor predeterminado de SQL Server para `Factura.FechaEmision` (`CONVERT([date],getdate())`), que debe adaptarse antes de generar migraciones PostgreSQL.

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

1. **Autenticación JWT en el Cliente**:
   - Almacenamiento seguro del token con análisis de riesgos documentado frente a cookies HttpOnly y XSS.
   - Inyección automática como cabecera `Authorization: Bearer <token>` mediante interceptor Axios.
   - Detección de expiración y respuestas 401 con limpieza inmediata de sesión y redirección forzada a `/login`.
2. **Autorización Basada en Roles (RBAC)**:
   - Rutas privadas mediante `<ProtectedRoute allowedRoles={['...']} />`.
   - Vistas denegadas amigables (`AccessDeniedView`) ante código HTTP 403 Forbidden.
   - Doble candado: la API valida obligatoriamente el claim de rol en cada petición, impidiendo intrusiones externas.
3. **Seguridad del Backend para Navegadores**:
   - Política **CORS restringida** exclusivamente a `http://localhost:5173` y `http://localhost:3000`.
   - **Cabeceras HTTP de Seguridad**: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection: 1; mode=block`, `Referrer-Policy: strict-origin-when-cross-origin`.
   - **Rate Limiting (HTTP 429)**: Límite de 5 solicitudes/minuto en rutas de autenticación, protegiendo contra ataques de fuerza bruta.
   - **Manejo Sanitizado de Excepciones**: `GlobalExceptionMiddleware` enmascara errores internos y no filtra stack traces en producción.
4. **Validación de Formularios con Zod**:
   - Esquemas tipados y robustos para Login, Pacientes y Clientes.
   - Mensajes de error en tiempo real vinculados semánticamente a los inputs mediante `aria-describedby` y `role="alert"`.
5. **Accesibilidad Universal (WCAG 2.2 Nivel AA)**:
   - Navegación fluida 100% por teclado con foco visible destacado (`:focus-visible`).
   - Cierre de modales con tecla `Escape` y trampa de foco.
   - Objetivos táctiles mínimos de **$44 \times 44$ píxeles**.
   - Ratio de contraste superior a $4.5:1$ en todos los textos y estados anunciados mediante `aria-live`.
6. **Diseño Responsivo Mobile-First**:
   - Operable en viewports desde 320 px de ancho.
   - Menú off-canvas (drawer hamburguesa) para pantallas móviles y adaptación de tablas clínicas con scroll horizontal suave.

---

## 🧪 Pruebas Automatizadas

Ejecuta las pruebas por separado de la instalación. La cantidad de casos y el resultado de la auditoría deben comprobarse en cada ejecución.

Desde la raíz, configura JWT en una terminal separada antes de ejecutar las pruebas del backend. La suite genera tokens con estos valores fijos de prueba:

```powershell
$env:Jwt__Key = 'Mi_super-claveultra-secreta1234:)'
$env:Jwt__Issuer = 'VeterinarioApi'
$env:Jwt__Audience = 'VeterinarioApiUsuarios'
dotnet test VeterinariaAPI.Tests/VeterinariaAPI.Tests.csproj
```

La suite utiliza EF Core InMemory; no verifica el esquema PostgreSQL. Conserva tu secreto propio para ejecutar la aplicación.

Para el frontend, desde otra terminal en la raíz:

```powershell
cd frontend
npm test
npm run build
npm audit
```

`npm test` ejecuta Vitest sobre `src/test`; no ejecuta el archivo de `e2e/`.

---

## 📚 Documentación de Entrega

Para detalles exhaustivos de evaluación, consulta los siguientes documentos:
- 📄 **[INFORME_TECNICO.md](INFORME_TECNICO.md)**: Informe técnico formal con la justificación de diseño, matriz completa de 7 riesgos OWASP mitigados, auditoría WCAG 2.2 AA y métricas.
- 🤖 **[AI_LOG.md](AI_LOG.md)**: Bitácora de Inteligencia Artificial que declara la herramienta (Gemini 3.8 Flash), modelo, plan, prompts empleados y decisiones de aceptación/corrección/descarte.
- 📓 **[BITACORA.md](BITACORA.md)**: Registro cronológico de actividades, sesiones de trabajo e hitos del proyecto.

