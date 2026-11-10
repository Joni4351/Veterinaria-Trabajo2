export function normalizeFieldErrors(errors) {
  return Object.fromEntries(Object.entries(errors || {}).map(([field, messages]) =>
    [field.charAt(0).toLowerCase() + field.slice(1), [].concat(messages).join(' ')]));
}

export function getApiErrorMessage(error) {
  const status = error.response?.status;
  if (!status) return error.code === 'ECONNABORTED'
    ? 'El servidor tardó demasiado en responder. Actualice el listado antes de volver a enviar la operación.'
    : 'No se pudo confirmar la operación. Revise su conexión y actualice el listado antes de volver a intentarlo.';
  if (status === 401) return 'Su sesión no es válida o ha vencido. Inicie sesión nuevamente.';
  if (status === 403) return 'Su cuenta no tiene permisos para realizar esta operación.';
  if (status === 404) return 'El registro solicitado ya no está disponible. Actualice el listado.';
  if (status === 429) return 'Ha realizado demasiadas solicitudes. Espere un minuto antes de volver a intentarlo.';
  if (status >= 500) return 'El servicio no está disponible o no pudo completar la operación. Intente nuevamente en unos momentos; si el problema continúa, contacte al administrador.';
  const body = error.response?.data;
  const messages = body?.errors && Object.values(body.errors).flat().filter(message => typeof message === 'string');
  if (messages?.length) return messages.join(' ');
  if (status === 409) return typeof body?.message === 'string' ? body.message : 'El registro cambió o ya existe. Actualice el listado antes de continuar.';
  if (status === 413) return 'El archivo supera el tamaño permitido. Seleccione un archivo más pequeño.';
  return typeof body?.message === 'string' ? body.message : 'Revise los datos ingresados y corrija los campos indicados.';
}
