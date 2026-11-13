# Requisitos e instalación de VetClinic Pro

Esta guía permite preparar el proyecto después de descargarlo. Los comandos están escritos para PowerShell y parten de la raíz del repositorio, salvo que se indique otra carpeta.

## 1. Elegir cómo ejecutar el proyecto

| Modalidad | Qué instalar |
| --- | --- |
| Sin Docker | .NET SDK 8.0, Node.js 22.12 o superior compatible con las dependencias del proyecto y npm. Una base PostgreSQL local o en Supabase. |
| Con Docker | Docker Desktop o Docker Engine, con contenedores Linux y Docker Compose v2. No hace falta instalar Node.js ni .NET en el equipo anfitrión. |

Git permite clonar y actualizar el repositorio. También se necesita un navegador con JavaScript habilitado e Internet para descargar dependencias o imágenes. Si se usa Supabase, el servidor necesita conexión a Internet durante el funcionamiento.

Comprobaciones para la modalidad sin Docker:

```powershell
dotnet --version
node --version
npm --version
```

Para Docker:

```powershell
docker --version
docker compose version
```

### 1.1. Instalar Node.js y npm: necesario si NO se utiliza Docker

1. Comprobar si ya están instalados con `node --version` y `npm --version`.
2. Si faltan, abrir la [descarga oficial de Node.js](https://nodejs.org/en/download).
3. Seleccionar una versión Node.js 22.x desde 22.12 compatible con este proyecto y el instalador correspondiente al sistema operativo. En Windows se puede utilizar el instalador `.msi`.
4. Ejecutar el instalador y conservar la instalación de npm y la incorporación al PATH.
5. Cerrar y abrir la terminal; repetir los dos comandos de comprobación.

npm se instala junto con Node.js; no hace falta instalarlo por separado. Si ambos comandos ya funcionan y la versión es compatible, no es necesario reinstalarlos.

### 1.2. Instalar .NET SDK: necesario si NO se utiliza Docker

1. Comprobar con `dotnet --list-sdks` si aparece un SDK 8.0.x.
2. Si falta, abrir la [descarga oficial de .NET 8](https://dotnet.microsoft.com/en-us/download/dotnet/8.0).
3. Descargar **SDK**, no solamente Runtime, para el sistema operativo y arquitectura del equipo.
4. Ejecutar el instalador, volver a abrir la terminal y comprobar `dotnet --list-sdks`.

El SDK permite restaurar paquetes, compilar y ejecutar el backend. No es necesario instalar Visual Studio para seguir los comandos de esta guía.

### 1.3. Preparar PostgreSQL: necesario para guardar los datos

Elegir una alternativa:

- **Supabase:** disponer de un proyecto propio y obtener los datos de conexión PostgreSQL. No es necesario instalar PostgreSQL en el computador.
- **PostgreSQL local sin Docker:** instalar y ejecutar un servidor PostgreSQL, crear una base vacía y contar con un usuario autorizado. El esquema se prepara en el apartado 3.2.
- **Sandbox Docker:** el script del apartado 4 prepara su propia base local; no hay que instalar PostgreSQL por separado.

Las credenciales de PostgreSQL permiten conectar el servidor con la base. Son distintas de las cuentas con las que las personas inician sesión en VetClinic.

### 1.4. Instalar Docker: necesario SOLO si se elige esa modalidad

1. Seguir las [instrucciones oficiales de Docker Desktop para Windows](https://docs.docker.com/desktop/setup/install/windows-install/) o las correspondientes al sistema operativo utilizado.
2. Completar los requisitos de virtualización y WSL 2 cuando el instalador los solicite.
3. Iniciar Docker Desktop y utilizar contenedores Linux.
4. Comprobar `docker --version` y `docker compose version`.

Con Docker no es necesario instalar Node.js, npm ni .NET en el equipo anfitrión: se utilizan dentro de las imágenes. En esta modalidad tampoco se ejecuta manualmente `npm ci` para levantar la aplicación.

### 1.5. Descargar el proyecto

Se puede descargar el repositorio como ZIP y descomprimirlo, o clonarlo con Git. Git solo es necesario para la segunda opción y para actualizar ramas mediante comandos.

Abrir PowerShell en la carpeta que contiene `frontend`, `VeterinariaAPI` y `compose.yaml`. Si se utiliza una copia anterior, actualizarla a la rama que contiene los cambios antes de instalar sus dependencias.

## 2. Dependencias npm del frontend

### 2.1. Instalar todos los paquetes: necesario sin Docker

Desde la raíz del repositorio:

```powershell
cd frontend
npm ci
```

Esperar a que termine sin errores. Este comando instala React, Axios, **face-api.js** y todos los demás paquetes declarados; no hace falta ejecutar una instalación por cada nombre. Después se continúa con la configuración del apartado 3. El frontend se inicia más adelante con `npm run dev`.

- **Cuándo hacerlo:** al instalar el proyecto por primera vez en un computador o cuando cambien los archivos de dependencias al actualizar el repositorio.
- **Cuándo no hace falta:** cada vez que se inicia la página, si las dependencias ya están instaladas y no han cambiado.
- `package.json` declara los paquetes y `package-lock.json` fija las versiones resueltas que instala `npm ci`.
- `npm install` también instala los paquetes del proyecto, pero puede actualizar el archivo de bloqueo; para una copia descargada con su archivo de bloqueo se utiliza `npm ci`.
- No utilizar `pip install -r requirements.txt`: corresponde a Python y no instala las dependencias de este frontend.

### 2.2. Si aparece un error que indica que falta face-api.js

1. Confirmar que la terminal esté dentro de `frontend`.
2. Comprobar que se descargó la rama actualizada. En esta versión, `face-api.js` ya está declarado en ambos archivos de dependencias.
3. Ejecutar `npm ci` y revisar que finalice correctamente. Si falla, resolver el error mostrado antes de iniciar Vite.
4. Iniciar nuevamente con `npm run dev`.

Si se trabaja deliberadamente con una copia antigua que no declara el paquete, se puede añadir desde `frontend`:

```powershell
npm install face-api.js@0.22.2
```

**La instalación individual no es un paso adicional necesario en la versión actual.** Ese comando modifica los archivos de dependencias y no sustituye la instalación del resto de paquetes. No usarlo como solución automática si `npm ci` falló por otro motivo.

### 2.3. Paquetes que instala npm

| Dependencias de la aplicación | Uso |
| --- | --- |
| `react`, `react-dom` | Interfaz de usuario. |
| `react-router-dom` | Navegación entre páginas. |
| `axios` | Solicitudes al backend. |
| `zod` | Validación de formularios. |
| `face-api.js` | Procesamiento facial. |
| `lucide-react` | Iconos. |
| `three` | Gráficos y efectos 3D. |

| Herramientas de desarrollo | Uso |
| --- | --- |
| `vite`, `@vitejs/plugin-react` | Desarrollo y compilación. |
| `vitest`, `jsdom` | Pruebas de componentes en un entorno simulado. |
| `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom` | Pruebas de interfaz e interacciones. |
| `@playwright/test` | Pruebas en navegador. |
| `@axe-core/playwright` | Comprobaciones automáticas de accesibilidad. |
| `oxlint` | Análisis del código. |
| `@types/react`, `@types/react-dom` | Información de tipos para las herramientas de desarrollo. |

El backend utiliza paquetes NuGet declarados en `VeterinariaAPI/VeterinariaAPI.csproj`; se instalan con `dotnet restore`, no con npm.

## 3. Instalación sin Docker

### 3.1. Instalar los paquetes del backend y configurarlo

Desde la raíz, ejecutar:

```powershell
cd VeterinariaAPI
dotnet restore
```

Este comando descarga los paquetes NuGet del backend, incluidos Entity Framework Core, Npgsql y autenticación JWT. Es necesario al preparar el equipo y cuando cambien sus dependencias; no hace falta instalar cada paquete manualmente. En los comandos de arranque del apartado siguiente se vuelve a indicar dotnet restore para que puedan seguirse desde el principio.


1. Si todavía no existe una configuración privada, copiar `VeterinariaAPI/appsettings.json.example` como `VeterinariaAPI/appsettings.json`. **No sobrescribir una configuración existente.**
2. Completar sus valores:

   | Configuración | Valor requerido |
   | --- | --- |
   | `ConnectionStrings:miconexion` | Conexión Npgsql a la base PostgreSQL. |
   | `Jwt:Key` | Secreto aleatorio robusto de al menos 32 bytes. |
   | `Jwt:Issuer` y `Jwt:Audience` | Identificadores coherentes con el servidor; la plantilla propone `VeterinariaAPI`. |
   | `Jwt:ExpireMinutes` | Duración del token; la plantilla propone 60 minutos. |
   | `Biometrics:EncryptionKey` | Clave de exactamente 32 bytes codificados en Base64. |

Ejemplo de estructura de conexión, con valores que deben reemplazarse:

```text
Host=TU_SERVIDOR;Port=5432;Database=TU_BASE;Username=TU_USUARIO;Password=TU_CONTRASEÑA;SSL Mode=Require
```

En Supabase, utilizar los datos de conexión o del pooler de su propio proyecto, incluido su puerto real. Para PostgreSQL local, adaptar también la configuración SSL al servidor utilizado.

Se pueden utilizar variables de entorno en lugar de archivos privados, con nombres como `ConnectionStrings__miconexion` y `Jwt__Key`. El backend no carga archivos `.env` automáticamente.

**Conservar la misma clave biométrica si ya existen rostros registrados.** No subir secretos a Git ni colocarlos en variables públicas `VITE_*`.

### 3.2. Preparar la base y el primer administrador

El motor utilizado es PostgreSQL. El archivo histórico `veterinariodb.sql` corresponde a SQL Server y no debe utilizarse para esta instalación.

Para una base **nueva, vacía y dedicada a esta instalación**, el backend puede aplicar las migraciones al arrancar mediante `Database__MigrateOnStartup=true`. No activar esta opción indiscriminadamente sobre una base existente, especialmente si fue creada manualmente y no tiene un historial EF conciliado.

Para crear la primera cuenta sin datos de demostración, añadir al objeto principal del archivo privado `appsettings.json`, conservando el resto de secciones y las comas necesarias:

```json
"Bootstrap": {
  "AdminEmail": "TU_CORREO",
  "AdminPassword": "TU_CONTRASEÑA_SEGURA_DE_AL_MENOS_12_CARACTERES"
}
```

Los marcadores deben reemplazarse por valores propios. Este mecanismo crea al administrador solamente si la tabla de usuarios está vacía y el modo de demostración está desactivado.

Desde la raíz del repositorio, ejecutar en una terminal:

```powershell
cd VeterinariaAPI
dotnet restore
$env:ASPNETCORE_ENVIRONMENT = 'Production'
$env:Demo__Enabled = 'false'
# SOLO para la primera preparación de una base nueva y vacía:
$env:Database__MigrateOnStartup = 'true'
dotnet run --no-launch-profile --urls http://localhost:5021
```

Una vez creada y comprobada la base, detener el servidor, retirar la variable de inicialización de esa terminal y volver a iniciarlo:

```powershell
Remove-Item Env:Database__MigrateOnStartup -ErrorAction SilentlyContinue
dotnet run --no-launch-profile --urls http://localhost:5021
```

Si la base ya estaba preparada, omitir la activación inicial de migraciones. Revisar los mensajes del servidor: que la API esté escuchando no demuestra por sí solo que el esquema sea correcto.

Después de comprobar el acceso del administrador, se puede retirar la sección `Bootstrap` del archivo privado. Las demás cuentas se crean desde Administración.

**Modo desarrollo:** `dotnet run --launch-profile http` utiliza `Development` y activa el sembrado de demostración. Ese modo puede crear cuentas y registros de prueba en tablas vacías; utilizarlo sobre una base destinada a pruebas. No debe confundirse con la instalación anterior sin demostración.

### 3.3. Instalar y ejecutar el frontend

Abrir otra terminal desde la raíz:

```powershell
cd frontend
npm ci
```

Si todavía no existe `frontend/.env`, crearlo a partir de `frontend/.env.example` y configurar:

```dotenv
VITE_API_URL=http://localhost:5021
```

Iniciar la interfaz:

```powershell
npm run dev -- --port 5173 --strictPort
```

Abrir **http://localhost:5173** e ingresar con la cuenta de la base configurada. La terminal del backend y la del frontend deben permanecer abiertas. Reiniciar Vite si se modifica su `.env`.

## 4. Alternativa con Docker

### Demostración local aislada

Con Docker iniciado, desde la raíz:

```powershell
.\scripts\Start-DockerSandbox.ps1
```

Abrir **http://localhost:15173**. Esta modalidad prepara una base PostgreSQL local de demostración, genera claves privadas y no utiliza Supabase. Para las cuentas de demostración, consultar la sección de credenciales de prueba del [README](README.md).

### Conexión a Supabase

Si no existe `.env.docker`, copiar `.env.docker.example` como `.env.docker`. Completar conexión, JWT y clave biométrica. Si la base no tiene usuarios y se necesita crear el primero, añadir valores propios para:

```dotenv
Bootstrap__AdminEmail=TU_CORREO
Bootstrap__AdminPassword=TU_CONTRASEÑA_SEGURA_DE_AL_MENOS_12_CARACTERES
```

Preparar y revisar el esquema de Supabase antes de arrancar. Después:

```powershell
docker compose --env-file .env.docker config --quiet
docker compose --env-file .env.docker up --build -d --wait
```

Abrir **http://localhost:5173**, o el puerto configurado en `FRONTEND_PORT`. Esta modalidad no aplica migraciones a Supabase por defecto.

## 5. Reconocimiento facial

Para verificar el rostro durante el inicio de sesión se necesita cámara, permiso del navegador, un registro facial activo y una clave de cifrado válida en el servidor. El administrador registra el rostro con consentimiento del titular.

Los modelos de `face-api.js` deben estar disponibles en `frontend/public/models/face-api`. La cámara requiere `localhost` o un contexto seguro HTTPS; una dirección remota HTTP puede bloquearla. Las cuentas sin rostro registrado omiten la verificación facial después de validar correo y contraseña.

## 6. Comandos de verificación opcionales

Desde `frontend`:

```powershell
npm test
npm run build
npm run lint
```

Para las pruebas de navegador:

```powershell
npx playwright install chromium
$env:CI = 'true'
npm run test:facial:e2e
Remove-Item Env:CI -ErrorAction SilentlyContinue
```

Esta configuración usa Chromium instalado por Playwright; sin `CI`, la configuración local busca Microsoft Edge. No se necesitan estos navegadores de prueba para el uso normal de la página.

Desde la raíz, para pruebas del backend:

```powershell
dotnet test VeterinariaAPI.Tests/VeterinariaAPI.Tests.csproj
```

## 7. Notas para bases existentes

- No reemplazar claves ni archivos privados que ya funcionen.
- No crear contraseñas en texto plano directamente en `PasswordHash`; utilizar la creación de usuarios del sistema o el mecanismo inicial `Bootstrap`.
- No aplicar el esquema inicial encima de tablas existentes. Una base sin `__EFMigrationsHistory` requiere conciliación antes de adoptar el historial EF completo.
- El script `database/migraciones/HistoricoInventarioFacturaSupabase.sql` es un despliegue puntual para una base existente. No repetirlo donde ya estén las columnas `Cantidad` y `PrecioUnitario`.
- Conservar respaldos privados de datos y clave biométrica.

Requisitos de uso y configuración ampliados: [REQUISITOS_DE_USO.md](REQUISITOS_DE_USO.md). Instrucciones generales: [README.md](README.md).

