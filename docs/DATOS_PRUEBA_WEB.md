# Hito 2: Datos y backend — Datos de prueba

Actualización: 7 de noviembre de 2026.

## 1. Introducción y objetivo

Los datos de prueba permiten evaluar las funcionalidades de una aplicación mediante registros que representan situaciones propias del negocio. En VetClinic Pro se utilizan para comprobar la gestión de clientes, mascotas, atenciones clínicas, inventario y facturación, así como las relaciones entre estas entidades.

Para facilitar la demostración académica, se implementó un generador accesible desde **Administración → Datos de prueba**. Su finalidad es incorporar un conjunto identificado de registros ficticios sin que el administrador deba introducir cada entidad manualmente. El procedimiento es semiautomático: el administrador inicia y confirma la operación, mientras que el backend crea los registros y establece sus relaciones.

## 2. Composición del conjunto de demostración

El lote se identifica mediante la versión `vetclinic-demo-v1`. Cuando no existen registros anteriores del mismo lote, su composición prevista es la siguiente:

| Entidad | Cantidad | Propósito |
| --- | ---: | --- |
| Usuario veterinario de demostración | 1 | Asignar las atenciones a un profesional de ejemplo. |
| Especialidades | 2 | Representar los servicios clínicos y sus precios. |
| Insumos | 2 | Comprobar existencias y líneas de facturación. |
| Clientes | 3 | Representar a los responsables de las mascotas. |
| Pacientes | 4 | Disponer de mascotas asociadas a sus respectivos dueños. |
| Citas | 4 | Representar dos atenciones completadas y dos citas programadas. |
| Consultas | 2 | Incorporar motivos y diagnósticos de ejemplo. |
| Recetas | 2 | Asociar prescripciones de demostración a las consultas. |
| Detalles de receta | 2 | Incorporar una indicación académica por receta. |
| Facturas | 2 | Representar el cobro de las atenciones realizadas. |
| Detalles de factura | 4 | Incorporar una línea de servicio y una de insumo por factura. |

El lote completo contiene **28 registros**, más un rol Veterinario únicamente si este no existe. Las cantidades efectivamente insertadas dependen del estado previo del lote y se muestran al finalizar cada ejecución. No se generan cuentas de administrador ni datos biométricos.

Los nombres incorporan el prefijo `DEMO V1` y los correos utilizan el dominio `seed.vetclinic.invalid`. Los RUT poseen un dígito verificador calculado para ejercitar la validación, sin que ello implique que pertenezcan a un rango oficialmente reservado. Los teléfonos, insumos e indicaciones se emplean como ejemplos académicos. Las recetas no constituyen instrucciones de tratamiento médico.

La cuenta veterinaria se crea con una contraseña aleatoria que no se publica. Su propósito es establecer relaciones clínicas válidas, no proporcionar una credencial de acceso compartida.

## 3. Procedimiento de carga desde la aplicación

El administrador realiza las siguientes acciones:

1. Inicia sesión y accede a **Administración → Datos de prueba**.
2. Revisa la composición prevista del lote y los clientes de demostración detectados.
3. Marca la casilla que confirma la incorporación de registros ficticios.
4. Selecciona **Generar datos de prueba**.
5. Confirma la operación en el diálogo presentado por la aplicación.
6. Consulta el resumen de registros creados o el mensaje de conflicto correspondiente.

No es necesario ejecutar un comando de carga ni un script SQL adicional. Consultar la vista previa no inserta registros. La generación requiere autorización de administrador tanto en la interfaz como en el servidor. Además del rol contenido en el JWT, la API verifica que la cuenta continúe teniendo ese rol en la base.

## 4. Persistencia y coherencia de los registros

Los datos se almacenan en la base configurada en la conexión del backend. Si esta conexión apunta a Supabase, los registros se guardan allí y permanecen después de cerrar o reiniciar la aplicación. Aparecen en los listados y pueden afectar inventario y reportes; no existe un interruptor para activarlos, ocultarlos o retirarlos automáticamente.

El generador crea las entidades siguiendo sus dependencias. Las consultas corresponden a las mascotas atendidas, las recetas se vinculan a sus consultas y las facturas utilizan al dueño de la mascota como cliente. Los importes se calculan a partir del catálogo de demostración, con IVA de 19 % y redondeo a pesos. Cada factura nueva descuenta una unidad del insumo correspondiente. Las fechas iniciales se calculan según la zona horaria America/Santiago.

En PostgreSQL, el código utiliza una transacción para agrupar la carga y un bloqueo asesor transaccional para serializar las solicitudes del generador. Ante un error, la transacción está diseñada para revertir las inserciones y actualizaciones de esa ejecución. Las secuencias de identidad pueden avanzar aunque la transacción se revierta. Estos mecanismos requieren una comprobación adicional con PostgreSQL real, como se indica en las limitaciones.

La implementación no requiere crear tablas o columnas adicionales. Para separar completamente la demostración académica de la operación real, se recomienda utilizar una base independiente.

## 5. Cargas repetidas y validaciones de protección

La identificación del lote se basa en sus correos, nombres y relaciones. Cuando el conjunto está completo y conserva sus identificadores, una nueva ejecución reutiliza los registros existentes y devuelve cero inserciones. Tampoco vuelve a descontar inventario ni restablece las existencias editadas.

Antes de escribir, se revisan conflictos de identidad y la consistencia de las facturas de demostración. Los comportamientos comprobados incluyen:

| Situación | Comportamiento del sistema |
| --- | --- |
| Lote completo cargado nuevamente | Reutiliza los registros y no genera duplicados. |
| RUT o correo reservado asociado a otro cliente | Rechaza la operación antes de vincular datos nuevos. |
| Factura con una línea eliminada o importes incoherentes | Devuelve un conflicto para revisión, sin generar nuevos cobros. |
| Receta y su detalle ausentes, con la facturación conservada | Completa esos registros sin crear otra factura ni descontar stock. |
| Cita completada modificada a cancelada | Rechaza la nueva carga de la atención. |
| Fallo en la consulta inicial | Presenta un mensaje y permite reintentar la vista previa. |
| Doble pulsación durante una carga | Bloquea una segunda solicitud desde la interfaz. |
| Cuenta sin autorización vigente | Rechaza el acceso al generador. |

La carga repetible no equivale a una restauración completa. Renombrar identificadores, cambiar relaciones o eliminar registros puede impedir reconocer el lote original y requerir revisión manual. La interfaz no incluye una eliminación masiva de los datos.

Si se interrumpe la conexión durante la generación, la falta de respuesta no permite determinar por sí sola si la operación se confirmó en el servidor. En ese caso, la interfaz solicita actualizar la vista previa antes de reintentar.

## 6. Pruebas realizadas y resultados

Se ejecutaron pruebas de permisos, primera carga, repetición, datos parciales, conflictos de identidad, facturas incompletas, conservación de inventario y errores de interfaz. Durante la revisión se reprodujeron tres fallos del backend: una línea de consulta eliminada podía originar otra factura, una línea de insumo faltante no se advertía y un correo reservado podía reutilizarse indebidamente. Se incorporaron verificaciones previas a la escritura y pruebas que comprueban el rechazo de estos casos.

También se incorporó el reintento de la vista previa y se reforzó el bloqueo de dobles confirmaciones.

| Verificación | Resultado registrado |
| --- | --- |
| Suite completa del backend, xUnit | 53 pruebas aprobadas. |
| Suite completa del frontend, Vitest | 48 pruebas aprobadas. |
| Pruebas de navegador en Edge, Playwright | 5 pruebas aprobadas. |
| Compilación de producción del frontend | Correcta. |

Estas cifras corresponden a las suites ejecutadas del proyecto, incluyendo funcionalidades previas; no representan únicamente pruebas del generador. La evidencia y los comandos utilizados se encuentran en [PRUEBAS_GENERADOR.md](PRUEBAS_GENERADOR.md).

## 7. Alcance y limitaciones de la verificación

Las pruebas del backend utilizaron EF Core InMemory y las pruebas de navegador emplearon respuestas simuladas de la API. Por tanto, los registros de prueba automatizada permanecieron separados de Supabase. No se generaron datos ni se modificó su esquema durante esta verificación.

No se dispone de un PostgreSQL aislado en el entorno de pruebas utilizado. En consecuencia, quedan pendientes la comprobación de restricciones propias de PostgreSQL, la reversión transaccional y dos cargas simultáneas con el bloqueo asesor. Los mecanismos están implementados, pero no se consideran verificados en una base PostgreSQL real. Los resultados no constituyen una garantía de ausencia absoluta de fallos.

El generador web se distingue del sembrado inicial de `Program.cs`, que se ejecuta al iniciar la API bajo condiciones de ausencia de datos. También se distingue de las migraciones: la carga incorpora registros; no administra la evolución del esquema.

## 8. Referencias de implementación

| Elemento | Archivo |
| --- | --- |
| Servicio generador y comprobaciones previas | `VeterinariaAPI/Services/DemoSeederService.cs` |
| Endpoints y autorización | `VeterinariaAPI/Endpoints/DatosPrueba.cs` |
| Interfaz administrativa | `frontend/src/views/DatosPruebaView.jsx` |
| Pruebas funcionales del generador | `VeterinariaAPI.Tests/DemoSeederTests.cs` |
| Pruebas de casos límite | `VeterinariaAPI.Tests/DemoSeederEdgeTests.cs` |
| Pruebas de interfaz | `frontend/src/test/DatosPruebaView.test.jsx` |
| Pruebas de navegador | `frontend/e2e/registro-facial.spec.js` |

Los endpoints utilizados son `GET /api/v1/admin/datos-prueba`, para consultar la vista previa, y `POST /api/v1/admin/datos-prueba`, para confirmar la generación del lote vigente.
