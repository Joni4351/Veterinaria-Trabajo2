# Verificación de accesibilidad de VetClinic

Fecha de comprobación: 11 de noviembre de 2026.

## Estado del requerimiento

Se implementaron mejoras de semántica, navegación, contraste y alternativas de información. La verificación automática aprobó en los escenarios descritos. El requerimiento completo permanece **pendiente de aceptación manual**: el asistente no realizó una sesión humana con teclado y NVDA o VoiceOver, ni una comprobación manual del zoom nativo del navegador. No se declara certificación WCAG AA.

Actualización del 11/11/2026: el usuario informó que las pruebas manuales de teclado descritas en el chat pasaron. Se registra como resultado comunicado por el usuario, sin atribuir una ejecución al asistente ni inferir una prueba con NVDA/VoiceOver. Quedan por registrar navegador, versión, pasos y evidencia del ensayo humano y completar la comprobación con lector de pantalla.

## Implementación

| Área | Tratamiento aplicado |
| --- | --- |
| Estructura | Una región principal por pantalla; encabezado principal de los módulos en h1, secciones en h2 y subsecciones en h3. Se corrigió la región main anidada en Pacientes. Las tablas declaran encabezados con scope de columna. |
| Navegación | Enlace existente para saltar al contenido; foco visible, orden natural del DOM sin tabulaciones positivas, foco al contenido al cambiar de ruta y títulos descriptivos por módulo. |
| Modales | Foco inicial, recorrido Tab/Shift+Tab contenido, Escape, restauración del foco y aislamiento del fondo mediante inert. Los controles ocultos no participan en el recorrido. Durante operaciones pendientes se conservan las restricciones de cierre existentes. |
| Menús | Menú móvil con foco inicial, recorrido contenido, fondo no interactivo y Escape con retorno al control de apertura. Exportación de auditoría enfoca su primera opción disponible, cierra con Escape o al abandonar el grupo y devuelve el foco. Los buscadores de consultas y facturas pueden descartar sus sugerencias desde el campo con Escape. |
| Formularios | Se mantienen etiquetas asociadas, obligatoriedad, errores en texto con role alert, aria-invalid y aria-describedby y foco en el primer error. La cantidad del PDF enlaza su ayuda y mensaje de error. Se retiraron nombres ARIA que discrepaban con el texto visible. |
| Contraste | Correcciones de navegación activa, botón superior, indicadores activos y bordes de controles. La auditoría comprueba contraste textual normal de 4,5:1 y grande de 3:1 donde axe puede determinarlo. Los bordes y anillos de foco usan variables de contraste; no se atribuye a axe una evaluación exhaustiva del contraste no textual. |
| Información visual | Estados y errores incluyen texto; pestaña activa con marca de selección además de color. Las barras de citas añaden tramas; las especialidades se relacionan con números, nombres y porcentajes. Se conservan alternativas textuales de imágenes informativas y se excluyen decoraciones del árbol accesible. |
| Dashboard | Cada sección tiene título y descripción asociados. Se añaden resúmenes, tabla desplegable con caption y encabezados, región desplazable alcanzable por teclado y alternativa también ante ausencia de registros. |
| Ampliación | Disposición responsiva y desplazamiento de tablas accesible. Se comprobaron pantallas de 390 píxeles, texto al 200 % y ampliación CSS al 200 %. Esta simulación complementa, pero no sustituye, la prueba manual del zoom nativo. |
| Movimiento | prefers-reduced-motion detiene las partículas y la animación continua del perro, responde a cambios de preferencia y mantiene los controles operativos. Se incorpora un control para pausar la animación del perro. Las transiciones CSS respetan la misma preferencia. |
| Idioma y título | Se conserva lang="es" y se actualiza el título del documento según la ruta, incluido el inicio de sesión. |

## Evidencia ejecutada

- Suite frontend: 104 pruebas aprobadas.
- Verificación posterior de avisos personalizados: 27 pruebas de navegador aprobadas; conflictos sin ventanas nativas, contraste en ambos temas, recuperación del foco y cancelación de recetas sin solicitudes. La auditoría general mantuvo cero incidencias en los mismos 28 escenarios.
- Suite de navegador: 25 pruebas aprobadas. Tras los ajustes finales de encabezados, tablas y exportación aprobaron cuatro casos focalizados; se añadió y aprobó una comprobación específica del foco y Escape en exportación.
- Compilación de producción correcta. Persisten advertencias anteriores de face-api.js, tamaño de paquetes y THREE.Clock.
- Auditoría axe sin exclusión de reglas en 28 escenarios: siete pantallas completas y siete secciones administrativas, en ambos temas. Resultado: **cero incidencias reportadas, incluidas cero críticas**. El dashboard se auditó con sus cuatro tablas abiertas. Evidencia: [AUDITORIA_AXE_2026-11-11.json](AUDITORIA_AXE_2026-11-11.json).
- La suite también audita con reglas WCAG seleccionadas los formularios y listados de clientes, pacientes, citas, consultas, insumos y facturas, formularios administrativos y login, en ambos temas.
- Recorrido **automatizado** exclusivamente mediante teclado desde Clientes: enlace de salto, apertura del formulario, envío inválido, foco y asociación textual del error, Escape y retorno al botón, reapertura, ingreso de los cuatro campos, envío y comprobación del registro. Las solicitudes utilizan datos simulados, sin escrituras en Supabase.
- Movimiento reducido, control del menú móvil y ampliación CSS al 200 % verificados en Santuario, Clientes, Pacientes, Citas, Consultas, Insumos, Facturas y Administración.

La auditoría usa Microsoft Edge y datos de prueba interceptados. No cubre todas las combinaciones de contenido, permisos, mensajes ni tecnologías de asistencia. Los estados automáticos de axe no equivalen a escuchar el resultado con un lector de pantalla. No se encontró NVDA en las ubicaciones habituales de instalación de esta sesión; no se instaló software adicional.

## Reproducción

Desde frontend:

```powershell
npm test -- --run
npm run build
$env:PLAYWRIGHT_PORT='5177'
npm run test:facial:e2e -- --output=test-results/accessibility-review
```

Los informes se generan en test-results, incluida auditoria-completa.json. La evidencia versionada corresponde a la ejecución de la fecha indicada, no a ejecuciones posteriores.

## Pauta de aceptación manual pendiente

La revisión de teclado fue comunicada como superada por el usuario; esta pauta conserva los pasos necesarios para documentarla y para completar la revisión con lector de pantalla.

1. En una base de pruebas, registrar fecha, navegador, versión del lector y persona que evalúa. Abrir una sesión autorizada y recorrer la aplicación sin ratón.
2. Alcanzar el enlace de salto con Tab y activarlo; comprobar que el foco es visible y llega al contenido. Recorrer módulos con Tab, Shift+Tab y Enter; comprobar nombre de página y orden de encabezados.
3. En Clientes, abrir el formulario, intentar enviar vacío, comprobar el anuncio textual del error y el foco en su campo. Completar datos válidos, guardar y comprobar el mensaje y el registro. Cerrar un modal con Escape y verificar el regreso al botón que lo abrió.
4. Repetir el flujo con NVDA o VoiceOver activo: confirmar que cada campo anuncia etiqueta, obligatoriedad, ayuda y error, y que el fondo de un modal no resulta navegable. Registrar lo efectivamente escuchado y cualquier discrepancia.
5. En Administración, recorrer los filtros del dashboard y abrir cada tabla con teclado. Comprobar títulos, descripciones, encabezados y valores de cada gráfico. Abrir exportación de auditoría, recorrer opciones y cerrar con Escape.
6. Establecer el zoom nativo del navegador en 200 %, revisar las pantallas y formularios y confirmar que se mantienen contenido y acciones. En tablas anchas, comprobar desplazamiento horizontal por teclado. Probar ambos temas y movimiento reducido.
7. Documentar resultado por paso, incidencias y correcciones; repetir los pasos afectados antes de declarar cumplido el requerimiento completo. La prueba de teclado fue comunicada como superada por el usuario; la revisión con lector de pantalla sigue **pendiente**, al igual que el registro detallado de la evidencia humana.
