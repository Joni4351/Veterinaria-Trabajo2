# VetClinic Pro

Sistema de gestión veterinaria con React y Vite, API REST en ASP.NET Core 8 y PostgreSQL. Incluye clientes, pacientes, citas, consultas y recetas, inventario, facturación, reportes y administración de usuarios con permisos por rol.

## Instalación y ejecución con Docker

Después de configurar el archivo de entorno una sola vez, todo el sistema se inicia desde la raíz del repositorio con:

```sh
docker compose up
```

Este comando construye las imágenes si todavía no existen e inicia frontend, API y PostgreSQL. No es necesario instalar Node.js, npm, .NET ni PostgreSQL en el equipo anfitrión para esta modalidad.

### 1. Instalar los requisitos

- Git, para descargar el repositorio.
- Docker Desktop con Docker Compose v2. En Windows, usar el motor de contenedores Linux y mantener Docker Desktop iniciado.
- Un navegador actualizado y conexión a Internet para descargar las imágenes y dependencias durante la primera construcción.

Comprueba la instalación en una terminal:

```sh
git --version
docker --version
docker compose version
```

### 2. Descargar el proyecto

```sh
git clone https://github.com/Joni4351/Veterinaria-Trabajo2.git
cd Veterinaria-Trabajo2
```

Si ya lo descargaste, abre una terminal en la carpeta que contiene `compose.yaml`.

### 3. Crear la configuración privada

La plantilla [.env.example](.env.example) contiene opciones públicas de configuración y campos de credenciales vacíos; no incluye claves ni contraseñas reales.

En PowerShell:

```powershell
Copy-Item .env.example .env
```

En Linux o macOS:

```sh
cp .env.example .env
```

Edita el nuevo `.env` y completa los siguientes campos:

| Variable | Qué configurar |
| --- | --- |
| `SANDBOX_DB_PASSWORD` | Contraseña privada para el PostgreSQL local. Utiliza un valor aleatorio sin punto y coma; el generador de abajo es adecuado. |
| `Jwt__Key` | Clave aleatoria para firmar los tokens de sesión; usa el generador de abajo. |
| `Biometrics__EncryptionKey` | Clave Base64 de exactamente 32 bytes aleatorios para cifrar los descriptores faciales. |
| `Bootstrap__AdminEmail` | Correo que usarás para iniciar sesión como primer administrador. |
| `Bootstrap__AdminPassword` | Contraseña privada del administrador, de al menos 12 caracteres. |

Para generar una clave en PowerShell, ejecuta:

```powershell
$bytes = New-Object byte[] 32
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
try { $rng.GetBytes($bytes); [Convert]::ToBase64String($bytes) } finally { $rng.Dispose() }
```

En Linux/macOS, si tienes OpenSSL:

```sh
openssl rand -base64 32
```

Repite el generador por separado para la contraseña de PostgreSQL, la clave JWT y la clave biométrica. Copia cada resultado a su variable correspondiente. Puedes rodear los valores privados con comillas simples en `.env`.

Conserva estas opciones de la plantilla para instalar **todo el sistema con base local nueva**:

```dotenv
COMPOSE_PROFILES=local
FRONTEND_PORT=5173
Database__MigrateOnStartup=true
Demo__Enabled=false
```

Mantén `ConnectionStrings__miconexion` vacío para que Compose conecte la API al PostgreSQL local. No necesitas configurar las plantillas de entorno de las subcarpetas para esta modalidad.

El archivo `.env` está excluido de Git. Conserva una copia privada de sus claves; cambiar la clave biométrica impide descifrar los registros faciales existentes. Cambiar la contraseña de PostgreSQL en `.env` no cambia automáticamente la contraseña de una base ya creada en el volumen.

### 4. Iniciar todo el sistema

Desde la raíz:

```sh
docker compose up
```

La primera ejecución puede tardar varios minutos. Docker construye las imágenes, inicia PostgreSQL, aplica las migraciones mediante la API y crea el primer administrador **si la tabla de usuarios está vacía** y completaste las variables `Bootstrap__AdminEmail` y `Bootstrap__AdminPassword`. El frontend espera a que la API esté saludable.

No necesitas crear el administrador directamente en la base de datos. El modo predeterminado no carga pacientes ni facturas de demostración.

### 5. Abrir la aplicación

Entra en [http://localhost:5173](http://localhost:5173) e inicia sesión con el correo y la contraseña que configuraste para el administrador. Desde Administración puedes gestionar otras cuentas.

Si ese puerto está ocupado, cambia `FRONTEND_PORT` en `.env`, vuelve a ejecutar el comando y abre el puerto elegido. El servidor de desarrollo Vite no debe ocupar el mismo puerto.

### 6. Comprobar y detener los servicios

En otra terminal, dentro del repositorio:

```sh
docker compose ps
docker compose logs --tail=100 api
```

Para comprobar la disponibilidad de la API y su conexión a PostgreSQL:

```sh
docker compose exec api curl --fail http://localhost:8080/health/live
docker compose exec api curl --fail http://localhost:8080/health/ready
```

La API y PostgreSQL no se publican directamente al equipo; el navegador accede a la API mediante el frontend y su proxy Nginx. El puerto 5021 corresponde a la ejecución local sin contenedores.

Para detener los servicios conservando la base:

```sh
docker compose down
```

Los datos se conservan en el volumen `local-data` del proyecto Compose. No uses `down --volumes` si necesitas conservarlos.

Para iniciar en segundo plano puedes usar `docker compose up -d`. Después de descargar cambios de código, reconstruye con `docker compose up --build`.

## Usar una base de datos en la nube

Puedes reemplazar los valores de `.env` para conectar una base PostgreSQL en la nube, por ejemplo Supabase u otro proveedor compatible:

1. Configura `ConnectionStrings__miconexion` con la conexión privada entregada por el proveedor, incluyendo la configuración TLS requerida.
2. Deja `COMPOSE_PROFILES=` vacío para no iniciar PostgreSQL local.
3. Configura `Database__MigrateOnStartup=false` en una base existente. Revisa y aplica previamente las migraciones que correspondan, con respaldo y conciliación del esquema; el arranque no debe alterar indiscriminadamente una base con datos.
4. Usa las claves existentes si necesitas conservar sesiones o leer datos biométricos cifrados. El administrador de arranque solo se crea cuando no hay usuarios.
5. Ejecuta `docker compose up` y comprueba el estado de la API.

Esta modalidad inicia frontend y API; la base la proporciona el servicio externo. No requiere modificar el código del programa. Un respaldo de la base y de las claves privadas es necesario para una recuperación completa.

## Problemas frecuentes

- **Faltan claves al ejecutar Compose:** crea `.env` y completa los campos privados. Algunos mensajes del Compose mencionan `.env.docker`, usado por la configuración alternativa; el comando de esta guía carga `.env` automáticamente.
- **API sin conexión a la base:** revisa el estado y los registros con los comandos anteriores. Para la base local, conserva el perfil `local` y completa `SANDBOX_DB_PASSWORD`.
- **No existe usuario para entrar:** en una base nueva completa las variables Bootstrap y vuelve a iniciar la API. En una base que ya tiene usuarios, esas variables no reemplazan ni restablecen las cuentas existentes.
- **No aparecen los cambios de código:** reconstruye las imágenes con `docker compose up --build`.
- **Cámara no disponible:** el reconocimiento facial requiere permiso del navegador y un contexto seguro, como localhost o HTTPS en un despliegue remoto.

## Estructura principal

```text
Veterinaria-Trabajo2/
├── frontend/                  # React, Vite, pruebas y Dockerfile con Nginx
├── VeterinariaAPI/            # API, acceso a datos, Migrations y Dockerfile
├── VeterinariaAPI.Tests/      # Pruebas del backend
├── database/                 # Scripts SQL
├── scripts/                  # Herramientas de ejecución y comprobación
├── docs/                     # Documentación técnica específica
├── .github/workflows/        # Pipeline de GitHub Actions
├── compose.yaml              # Ejecución principal local o con PostgreSQL externo
├── compose.sandbox.yaml      # Configuración alternativa de demostración aislada
├── .env.example              # Plantilla sin credenciales reales
├── README.md                 # Esta guía de instalación con Compose
└── READMEOLD                 # README anterior conservado íntegramente
```

## Instalación sin Docker y documentación anterior

El [README anterior](READMEOLD) conserva las instrucciones previas, la ejecución directa con .NET y npm, configuraciones alternativas y detalles de pruebas. Para un primer arranque con Docker utiliza la secuencia de esta guía; no mezcles archivos de entorno de diferentes modalidades.
