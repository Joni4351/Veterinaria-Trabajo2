# Requisitos para utilizar VetClinic Pro

Este documento distingue lo que necesita una persona para usar la página de lo que necesita quien la instala. No contiene contraseñas ni claves privadas.

## 1. Requisitos para el usuario

- Un computador o dispositivo con un navegador moderno y JavaScript habilitado. Se pueden utilizar Chrome, Edge o Firefox; la compatibilidad completa depende de las pruebas realizadas en cada versión.
- Acceso a la dirección donde se ejecuta la aplicación. Si está instalada en el mismo equipo, se utiliza una dirección `localhost`.
- Conexión con el servidor de la aplicación. Si el servidor utiliza Supabase, también debe poder conectarse a Internet.
- Una cuenta registrada con correo y contraseña, creada por el administrador.
- El rol correspondiente a las funciones que se necesitan utilizar. No todas las cuentas tienen acceso a administración ni a las mismas operaciones.
- Almacenamiento del sitio habilitado en el navegador para conservar la sesión y la preferencia de tema.

**El usuario que solo accede a una instalación existente no necesita instalar .NET, Node.js, Docker ni PostgreSQL en su equipo.**

## 2. Requisitos para reconocimiento facial

- Cámara disponible y autorización del navegador para utilizarla durante la verificación del inicio de sesión.
- Rostro previamente registrado por el administrador y consentimiento para su tratamiento.
- Iluminación suficiente y rostro visible, sin otras personas dentro de la captura.
- Modelos de `face-api.js` disponibles en `frontend/public/models/face-api` y accesibles desde la aplicación.
- Clave biométrica configurada correctamente en el servidor.
- Acceso desde `localhost` o mediante HTTPS para que el navegador permita utilizar la cámara. El HTTP de una dirección remota puede bloquearla.

En la implementación actual se validan primero correo y contraseña. Si la cuenta tiene un registro facial activo, se solicita después la verificación del rostro. Las cuentas sin registro facial omiten ese paso. La cámara no es necesaria para las demás funciones.

El procesamiento utiliza `face-api.js`; no requiere contratar Azure Face API ni introducir una clave de ese servicio.

## 3. Requisitos de instalación: elegir una alternativa

| Alternativa | Requisitos en el equipo que ejecuta el sistema |
| --- | --- |
| Con Docker | Docker Engine o Docker Desktop en funcionamiento, contenedores Linux y Docker Compose v2. |
| Sin Docker | .NET SDK 8.0, Node.js 22.12 o superior compatible con las dependencias del proyecto y npm. |

En ambos casos se necesita:

- Una copia del repositorio con sus archivos de configuración y modelos faciales.
- Espacio para dependencias, imágenes y datos, y recursos suficientes para los servicios utilizados. El proyecto no establece un mínimo de RAM o procesador validado mediante pruebas de capacidad.
- Puertos disponibles para los servicios. La interfaz utiliza normalmente `5173`; el sandbox utiliza `15173`. Sin Docker, la API utiliza `5021`.
- Internet durante la primera descarga de dependencias o imágenes. También durante la operación si se utiliza una base en la nube.
- PowerShell para ejecutar los scripts `.ps1` incluidos en el proyecto.

Git es necesario si se quiere clonar, actualizar o trabajar con las ramas del repositorio; no es un requisito del navegador.

## 4. Base de datos

El backend utiliza **PostgreSQL** mediante Entity Framework Core y Npgsql. Puede conectarse a Supabase o a una instancia PostgreSQL configurada para la aplicación. La demostración Docker utiliza PostgreSQL 16 local.

La base debe tener las tablas, relaciones, columnas y restricciones compatibles con la versión del programa. El usuario de conexión debe tener los permisos necesarios para las operaciones de la aplicación. Para modificar el esquema se necesitan además permisos de administración adecuados.

### Si se utiliza Supabase

- Disponer de un proyecto accesible y sus datos de conexión PostgreSQL: servidor, puerto, base, usuario y contraseña.
- Configurar la conexión del backend; el frontend no debe contener credenciales de la base.
- Utilizar los datos del pooler correspondientes al proyecto cuando proceda y conexión SSL.
- Revisar los cambios de esquema antes de ejecutarlos. No aplicar una migración inicial de creación completa sobre tablas que ya existen.

El 13/11/2026 se aplicó en la base configurada del proyecto el cambio puntual que añade `Cantidad` y `PrecioUnitario` a `public."DetallesFactura"`. El script de referencia está en [HistoricoInventarioFacturaSupabase.sql](database/migraciones/HistoricoInventarioFacturaSupabase.sql). **No debe volver a ejecutarse sobre esa misma base.**

Esta aplicación puntual no incorporó la base al historial completo de Entity Framework. Como la base existente no tenía `__EFMigrationsHistory`, adoptar todas las migraciones requiere conciliar primero su esquema. En otra instalación se debe revisar su estado antes de aplicar cambios.

Los detalles antiguos de insumos sin cantidad registrada requieren consultar los documentos originales; no se deben completar mediante estimaciones basadas en los precios actuales.

El archivo histórico `veterinariodb.sql` corresponde a SQL Server y no sirve para inicializar directamente la base PostgreSQL actual.

## 5. Configuración privada obligatoria

| Configuración | Para qué sirve |
| --- | --- |
| `ConnectionStrings:miconexion` | Conectar el backend con PostgreSQL. |
| `Jwt:Key` | Firmar los tokens de sesión; utilizar un secreto aleatorio robusto de al menos 32 bytes. |
| `Jwt:Issuer` y `Jwt:Audience` | Identificar al emisor y destinatario de los tokens. Deben ser coherentes con la configuración del servidor. |
| `Jwt:ExpireMinutes` | Definir la duración de los tokens. |
| `Biometrics:EncryptionKey` | Cifrar y leer los descriptores faciales. Debe representar exactamente 32 bytes codificados en Base64. |

Se incluyen plantillas sin secretos:

- [appsettings.json.example](VeterinariaAPI/appsettings.json.example).
- [appsettings.Development.json.example](VeterinariaAPI/appsettings.Development.json.example).
- [.env.docker.example](.env.docker.example).
- [frontend/.env.example](frontend/.env.example).

Para Docker, copiar `.env.docker.example` como `.env.docker` y completar sus valores. Las claves se expresan como `Jwt__Key` y `Biometrics__EncryptionKey`, y la conexión como `ConnectionStrings__miconexion`.

Sin Docker se pueden usar los archivos privados `appsettings.json`/`appsettings.Development.json` o variables de entorno. **El backend no carga archivos `.env` automáticamente.** La plantilla de desarrollo solo incluye parte de la configuración; se debe conservar o completar también conexión y JWT.

Conservar la misma clave biométrica para poder leer los rostros ya registrados. No publicar archivos privados, claves ni respaldos de datos en Git. Las variables `VITE_*` del frontend son públicas y no deben contener secretos.

## 6. Puesta en marcha resumida

Ejecutar desde la raíz del repositorio, según la alternativa elegida.

### Docker con Supabase

Crear `.env.docker` a partir de la plantilla únicamente si todavía no existe y completar sus valores. Después:

```powershell
docker compose --env-file .env.docker config --quiet
docker compose --env-file .env.docker up --build -d --wait
```

Abrir `http://localhost:5173`, salvo que se haya configurado otro `FRONTEND_PORT`. Esta modalidad no aplica por defecto las migraciones de Supabase.

### Docker de demostración local

```powershell
.\scripts\Start-DockerSandbox.ps1
```

Abrir `http://localhost:15173`. Este entorno utiliza su propia base local y no contiene los datos ni las cuentas de Supabase. El script crea y conserva una configuración privada propia.

### Sin Docker

Una vez configurada la API y preparada la base, en una terminal:

```powershell
cd VeterinariaAPI
dotnet restore
dotnet run --launch-profile http
```

En otra terminal, desde la raíz:

```powershell
cd frontend
npm ci
npm run dev -- --port 5173 --strictPort
```

El frontend puede utilizar `VITE_API_URL=http://localhost:5021` en su archivo privado `.env`; también dispone de un proxy de desarrollo para `/api`. Abrir `http://localhost:5173`. Para instrucciones ampliadas, consultar [README.md](README.md).

## 7. Comprobaciones antes de utilizar la aplicación

1. Confirmar que la interfaz y la API estén funcionando y que la API pueda conectarse a la base correcta.
2. Comprobar que el esquema esté actualizado; una conexión exitosa no demuestra por sí sola que existan todas las columnas.
3. Contar con una cuenta de acceso válida. En una instalación nueva de producción, configurar `Bootstrap:AdminEmail` y `Bootstrap:AdminPassword` para crear el primer administrador cuando no hay usuarios; en Docker se utilizan las variables con doble guion bajo.
4. Verificar el inicio de sesión y los permisos del rol asignado.
5. Si se utiliza verificación facial, comprobar modelos, cámara, permisos y clave de cifrado.
6. Mantener respaldo de la base y de la clave biométrica en almacenamiento privado.

Los datos de demostración son opcionales. No son necesarios para utilizar el sistema con los registros reales del establecimiento.
