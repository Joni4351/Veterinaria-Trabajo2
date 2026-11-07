# Registro facial de usuarios

El módulo está en **Administración → Registro Facial**, exclusivamente para administradores.
Solo registra, consulta metadatos, reemplaza y elimina descriptores; no modifica el login.

## Preparación de Supabase

1. Respalde la tabla existente y ejecute `database/registro_facial_cifrado.sql` en el editor SQL de Supabase como propietario.
2. El script conserva `public."ReconocimientoFacial"`, su FK a `Usuarios`, `UsuarioId UNIQUE`, fechas y estado. Agrega `FechaActualizacion` si falta y las columnas de constancia de consentimiento: `ConsentimientoFecha`, `ConsentimientoAdministradorId` y `ConsentimientoVersion`.
3. `DescriptorFacial` sigue siendo **JSONB**, pero su restricción cambia: contiene un sobre AES-256-GCM (`version`, `algorithm`, `model`, `nonce`, `ciphertext`, `tag`), no los 128 valores en claro. La API comprueba que el descriptor original tenga exactamente 128 números finitos antes de cifrarlo. El cifrado autentica también el identificador del usuario para impedir intercambiar descriptores entre cuentas.
4. Se habilita RLS y se revocan permisos a `PUBLIC`, `anon` y `authenticated`. El navegador no accede directamente a Supabase. La conexión Npgsql del servidor debe pertenecer a un rol de confianza con permisos adecuados y ownership/bypass de RLS. Nunca publique esa conexión ni la clave de cifrado en variables `VITE_*`.
5. El cambio usa `NOT VALID` para no borrar ni convertir silenciosamente datos existentes. Los registros antiguos en claro deben reemplazarse desde el módulo, con consentimiento renovado. Los campos de consentimiento de esos registros permanecen nulos hasta entonces. Tras revisar todos los registros, ejecute:

   ```sql
   ALTER TABLE public."ReconocimientoFacial"
     VALIDATE CONSTRAINT "ReconocimientoFacial_DescriptorCifrado_check";
   ```

   Si falla, todavía hay filas antiguas o incompatibles. No considere terminada la migración de datos hasta validarla. El script no cifra retroactivamente respaldos ni registros anteriores.

No se modifican otras tablas ni se ejecuta este SQL automáticamente al arrancar la API.

## Clave de cifrado

Configure **`Biometrics:EncryptionKey`**, una clave aleatoria de 32 bytes en Base64, independiente de JWT. Ejemplo PowerShell para generar y configurar una clave en la terminal que iniciará la API:

```powershell
$facialKeyBytes = [byte[]]::new(32)
$facialRng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$facialRng.GetBytes($facialKeyBytes)
$facialRng.Dispose()
$env:Biometrics__EncryptionKey = [Convert]::ToBase64String($facialKeyBytes)
dotnet run --project VeterinariaAPI --launch-profile http
```

Guarde esa clave en el gestor de secretos del despliegue y manténgala estable entre reinicios e instancias. El ejemplo solo configura el proceso actual: no lo repita para cada arranque. Sin una clave válida, registrar/reemplazar devuelve 503; consultar y eliminar siguen disponibles. Perder o cambiar la clave impide recuperar los descriptores existentes. La rotación requiere una migración de recifrado, fuera de esta etapa. No hay endpoint que devuelva o descifre descriptores.

## Flujo y consentimiento

- Seleccione un usuario; búsqueda por nombre o correo y paginación de 25 resultados.
- Confirme que el titular fue informado y dio consentimiento para el propósito descrito. La casilla registra la **constancia del administrador**, no una firma electrónica del titular.
- Cargue JPG/JPEG o PNG de hasta 5 MB y 20 megapíxeles, revise la vista previa y analice.
- Los modelos oficiales se sirven desde `frontend/public/models/face-api`; no se utiliza un servicio externo para analizar la foto. El descriptor y la imagen solo se mantienen temporalmente en memoria del frontend. No se guardan en localStorage ni se sube la imagen al backend.
- La detección exige exactamente un rostro detectado, confianza mínima y tamaño suficiente. Son controles orientativos de calidad, no una garantía de identidad ni una prueba de vida.
- Confirme el registro o reemplazo. Reemplazar conserva `FechaRegistro`, `Activo` y `UltimoAcceso`, actualiza `FechaActualizacion` y renueva la constancia de consentimiento. Una edición concurrente devuelve 409 para evitar reemplazos silenciosos.
- Eliminar requiere confirmación y solo elimina la fila biométrica; preserva la cuenta. La constancia ligada a esa fila también se elimina.

## API

Todos los endpoints requieren JWT con rol Administrador y verifican que su `NameIdentifier` siga correspondiendo a un administrador en la base. Las respuestas utilizan `Cache-Control: no-store`.

| Método | Ruta | Resultado |
| --- | --- | --- |
| GET | `/api/v1/registro-facial/usuarios?buscar=...&pagina=1` | Usuarios y metadatos faciales, sin hashes ni descriptores |
| GET | `/api/v1/registro-facial/{usuarioId}` | Estado y fechas; registro nulo si no existe |
| POST | `/api/v1/registro-facial/{usuarioId}` | Registro inicial; 409 si ya existe |
| PUT | `/api/v1/registro-facial/{usuarioId}` | Reemplazo con control de última actualización |
| DELETE | `/api/v1/registro-facial/{usuarioId}` | Elimina solo el registro facial |

POST/PUT reciben `descriptor`, `consentimiento: true`, `consentimientoVersion: "registro-facial-v1"` y, al reemplazar, la `fechaActualizacion` devuelta por la consulta (puede ser null para registros nunca editados). La API no puede demostrar que el descriptor enviado por un administrador provino de una fotografía; no se usa para autenticar en esta etapa.

Use HTTPS en despliegues reales. Evite registrar cuerpos de solicitudes o habilitar `EnableSensitiveDataLogging`/captura de payloads en proxy/APM para estas rutas.

## Verificación

```powershell
dotnet test VeterinariaAPI.Tests/VeterinariaAPI.Tests.csproj --filter FullyQualifiedName~RegistroFacialTests
cd frontend
npm test
npm run build
npm audit
npm run test:facial:e2e
```

Las pruebas del backend usan una base InMemory aislada y configuración de prueba propia: verifican 401/403, administrador vigente, CRUD, cifrado recuperable, consentimiento, tamaños de descriptor, duplicados y conservación de cuenta/estado. Las pruebas de UI simulan la detección para verificar el flujo, errores y confirmaciones. La prueba Playwright utiliza Microsoft Edge instalado, modelos reales y una imagen de ejemplo oficial; verifica rechazo de cero/varios rostros, registro con un rostro, contenido del payload y ancho móvil con una API simulada. No sustituye una prueba contra PostgreSQL/Supabase real. Para usar Chromium en otro equipo, instale su navegador con Playwright y ajuste `channel` en `playwright.facial.config.js`.

Dependencias añadidas: `face-api.js@0.22.2`, con carga dinámica, y `@playwright/test` como dependencia de desarrollo. Se fuerza `node-fetch` 2.7 compatible dentro de TensorFlow para corregir una dependencia antigua; también se actualizan `follow-redirects` y `undici` en el lockfile. Licencia y procedencia de modelos en su directorio.

## Creación de usuarios

Las cuentas nuevas se crean exclusivamente en Administración → Cuentas de Usuarios. El endpoint `/api/v1/usuarios/register` exige JWT con rol Administrador y valida que el rol asignado exista. La pantalla pública solo permite iniciar sesión; el acceso a Administración se oculta para los demás roles y la ruta mantiene su protección.
