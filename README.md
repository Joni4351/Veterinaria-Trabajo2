# VetClinic Pro — Sistema de Gestión Clínica Veterinaria
## Trabajo 2: Frontend, Consumo de API y Seguridad de Extremo a Extremo

![.NET 8](https://img.shields.io/badge/.NET-8.0-blue)
![React](https://img.shields.io/badge/React-19.0-61dafb)
![Vite](https://img.shields.io/badge/Vite-6.0-646cff)
![Vitest](https://img.shields.io/badge/Vitest-17%2F17%20Passing-green)
![xUnit](https://img.shields.io/badge/xUnit-6%2F6%20Passing-green)
![WCAG](https://img.shields.io/badge/WCAG-2.2%20AA-success)
![Audit](https://img.shields.io/badge/npm%20audit-0%20vulnerabilities-brightgreen)

Plataforma integral para clínicas veterinarias que combina una **API RESTful desarrollada en ASP.NET Core 8.0** con un **cliente web moderno en React 19 (Vite)**, implementando autenticación JWT, autorización por roles (RBAC), control de concurrencia y rate limiting, accesibilidad universal **WCAG 2.2 Nivel AA**, diseño responsivo mobile-first y mitigación de riesgos de seguridad **OWASP Top 10**.

---

## 📋 Estructura del Repositorio (Monorepo)

```
VeterinariaAPI-master/
├── VeterinariaAPI/              # Backend en ASP.NET Core 8.0 (Minimal APIs)
│   ├── Controllers/ y Endpoints/ # Endpoints RESTful con validación y roles
│   ├── Middlewares/             # Excepciones sanitizadas y headers de seguridad
│   ├── Models/ y Repositories/  # Entidades y capa de persistencia EF Core
│   ├── Program.cs               # Configuración de CORS, JWT y Rate Limiting
│   └── .env.example             # Plantilla de configuración segura del backend
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
├── veterinariodb.sql            # Script DDL y datos semilla para SQL Server
├── INFORME_TECNICO.md           # Informe técnico formal con matriz OWASP y WCAG
├── AI_LOG.md                    # Bitácora detallada de prompts y decisiones con IA
├── GUIA_EXPOSICION.md           # Guía de defensa oral y guión de demostración en vivo
└── README.md                    # Instrucciones de instalación y ejecución
```

---

## 🚀 Requisitos Previos

Asegúrate de contar con las siguientes herramientas instaladas en tu equipo:
- **.NET SDK 8.0** (o superior): Comprueba con `dotnet --version`.
- **Node.js 18+** y **npm**: Comprueba con `node -v` y `npm -v`.
- **SQL Server 2019/2022** o **LocalDB** con **SQL Server Management Studio (SSMS)**.

---

## ⚙️ Paso 1: Configuración de la Base de Datos (SQL Server)

1. Abre **SQL Server Management Studio (SSMS)** o Azure Data Studio y conéctate a tu instancia local (`localhost`, `.` o `(localdb)\mssqllocaldb`).
2. Abre y ejecuta el archivo:
   ```
   veterinariodb.sql
   ```
3. El script creará la base de datos `veterinariodb` con todas las tablas del modelo clínico, relaciones, llaves foráneas y datos semilla iniciales (usuarios, roles, especialidades y pacientes).

---

## ⚙️ Paso 2: Configuración y Ejecución del Backend (.NET 8)

1. Navega al directorio del backend:
   ```bash
   cd VeterinariaAPI
   ```
2. Crea tu archivo de configuración o verifica que `appsettings.json` apunte a tu servidor SQL Server:
   ```json
   "ConnectionStrings": {
     "DefaultConnection": "Server=localhost;Database=veterinariodb;Trusted_Connection=True;TrustServerCertificate=True;"
   }
   ```
3. Ejecuta las pruebas del backend para verificar la suite de integración:
   ```bash
   dotnet test ../VeterinariaAPI.Tests/VeterinariaAPI.Tests.csproj
   ```
   *Debe arrojar: `Correctas! - Con error: 0, Superado: 6, Total: 6`.*
4. Inicia la API:
   ```bash
   dotnet run
   ```
   *La API quedará escuchando en `http://localhost:5021` (y `https://localhost:7054` con HTTPS).*

---

## ⚙️ Paso 3: Configuración y Ejecución del Frontend (React 19)

1. Abre una **nueva terminal** y navega a la carpeta del frontend:
   ```bash
   cd frontend
   ```
2. Si es la primera vez, copia el archivo de entorno de ejemplo:
   ```bash
   copy .env.example .env
   ```
   *(Contiene `VITE_API_URL=http://localhost:5021`)*.
3. Instala las dependencias:
   ```bash
   npm install
   ```
4. Ejecuta la suite de pruebas del frontend:
   ```bash
   npm test -- --run
   ```
   *Debe arrojar: `17 passed (17)` en 4 archivos de prueba.*
5. Inicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```
6. Abre tu navegador en:
   ```
   http://localhost:5173
   ```

---

## 👥 Credenciales de Prueba Preconfiguradas

Puedes iniciar sesión con cualquiera de los siguientes usuarios precargados en la base de datos:

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

El proyecto cuenta con un total de **23 pruebas automatizadas pasando al 100%**:

```bash
# 1. Pruebas Backend (.NET xUnit) - 6 pruebas
dotnet test VeterinariaAPI.Tests/VeterinariaAPI.Tests.csproj

# 2. Pruebas Frontend (Vitest + Testing Library) - 17 pruebas
cd frontend && npm test -- --run

# 3. Compilación de Producción del Frontend
cd frontend && npm run build

# 4. Auditoría de Seguridad de Dependencias
cd frontend && npm audit
# Resultado: found 0 vulnerabilities
```

---

## 📚 Documentación de Entrega

Para detalles exhaustivos de evaluación, consulta los siguientes documentos:
- 📄 **[INFORME_TECNICO.md](file:///c:/Users/joni5.DESKTOP-AF57599/Downloads/VeterinariaAPI-master/INFORME_TECNICO.md)**: Informe técnico formal con la justificación de diseño, matriz completa de 7 riesgos OWASP mitigados, auditoría WCAG 2.2 AA y métricas.
- 🤖 **[AI_LOG.md](file:///c:/Users/joni5.DESKTOP-AF57599/Downloads/VeterinariaAPI-master/AI_LOG.md)**: Bitácora de Inteligencia Artificial que declara la herramienta (Gemini 3.8 Flash), modelo, plan, prompts empleados y decisiones de aceptación/corrección/descarte.
- 🎤 **[GUIA_EXPOSICION.md](file:///c:/Users/joni5.DESKTOP-AF57599/Downloads/VeterinariaAPI-master/GUIA_EXPOSICION.md)**: Guía completa para la defensa oral de 15 puntos, guión de demostración en vivo paso a paso y banco de preguntas y respuestas técnicas del docente.
