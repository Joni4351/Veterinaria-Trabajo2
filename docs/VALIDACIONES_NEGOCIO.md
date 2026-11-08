# Validaciones del negocio veterinario

Las reglas se aplican a POST y PUT desde la API, independientemente del frontend. Los formularios también validan formatos, fechas, cantidades y campos obligatorios.

| Área | Reglas añadidas o corregidas |
| --- | --- |
| Clientes | Teléfono de 8 a 15 dígitos, con separadores permitidos y `+` solo al inicio; correo de hasta 150 caracteres; espacios exteriores y correo normalizados; RUT con cuerpo estrictamente numérico y distinto de cero. Se conserva el control existente de duplicados. |
| Pacientes | Dueño existente; identificador entero en el formulario; nombre de 2 a 100 caracteres y alergias hasta 500, alineados con el frontend; peso obligatorio mayor a 0 y hasta 300 kg conforme al límite actual de la interfaz. |
| Agenda | Paciente y especialidad existentes; profesional con rol Veterinario; estado admitido; fecha no vacía; ninguna otra cita no cancelada del mismo paciente o veterinario en el mismo instante. Una cita con consulta no puede cancelarse ni cambiar de paciente. |
| Horario de agenda | Las fechas UTC recibidas se convierten a hora de la clínica en America/Santiago y se almacenan como timestamp sin zona, conforme al esquema existente. El formulario conserva la hora local al editar. |
| Consultas | Paciente existente; cita opcional existente y del mismo paciente; no se atienden citas canceladas ni se duplican consultas para una misma cita. Una consulta con receta o facturación no puede reasignarse de paciente/cita. Se permiten atenciones sin cita para urgencias y carga histórica. |
| Recetas | Consulta existente; fechas válidas y vigencia igual o posterior a la emisión. Los detalles requieren receta e insumo existentes; se conserva la duración de 1 a 365 días y las dosis obligatorias. |
| Inventario | Nombre y tipo validados sin contar espacios exteriores; tipo mínimo de 2 caracteres, alineado con la interfaz. Se conservan stock entero no negativo y precio positivo. |
| Facturas | Cliente existente; fecha válida; total positivo e impuestos no superiores al total cuando no hay líneas; hasta 100 líneas válidas; tipos cita/insumo; referencias existentes; cantidades enteras positivas; insumos agrupados por producto; total recalculado mayor a cero y hasta 10.000.000. Una cita cancelada o de un paciente de otro cliente se rechaza. Las referencias de especialidad/consulta deben coincidir con la atención indicada. |
| Detalles independientes de factura | Factura y referencias existentes; una consulta o un insumo por línea; consulta del cliente correcto. No se permite mover una línea a otra factura o cambiar su insumo mediante PUT, para evitar desajustes con el inventario. |
| Formularios | Zod 4 utiliza `error.issues`; se corrige el acceso anterior a `error.errors`, que podía impedir mostrar los mensajes. Se rechazan fechas inexistentes como 31 de febrero y cantidades fraccionarias de inventario. |

Estados de agenda: Pendiente, Confirmada, En Curso, Completada, Cancelada. Se acepta Atendida como estado heredado. No se prohíben fechas pasadas porque el sistema permite cargar antecedentes históricos. No se introducen horarios de apertura ni duración de turnos sin que estén definidos por la clínica.

## Alcance y límites

- No se ejecutan cambios de esquema ni modificaciones sobre los datos de Supabase. El mapeo de FechaHora se alinea con el tipo timestamp without time zone ya existente.
- La detección de choques es para el mismo instante; el modelo no tiene duración o intervalo de atención. Los bloqueos ante solicitudes simultáneas requieren restricciones/transacciones adicionales en PostgreSQL; las consultas de validación previas no constituyen una garantía de exclusión concurrente.
- El modelo de detalle de factura todavía no almacena cantidad y precio histórico por separado. Las nuevas validaciones no sustituyen esa mejora necesaria para reconstruir correctamente el inventario al editar facturas antiguas cuando cambió el precio del producto.
- No se alteran permisos de roles, el tratamiento clínico, ni el flujo de registro facial.

## Comprobación

Las pruebas de backend (`BusinessValidationTests`) usan InMemory y verifican relaciones, agenda, estados, recetas, contactos y rechazo de facturas inválidas sin descuento de stock. Las pruebas de frontend (`businessSchemas.test.js`) verifican formatos, fechas, estados, peso, identificadores e impuestos. Las pruebas existentes de facturación y flujos siguen ejecutándose para comprobar compatibilidad.
