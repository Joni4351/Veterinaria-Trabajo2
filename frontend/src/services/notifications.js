// Emit only after the complete write operation succeeds, never for each HTTP request.
export function notifySuccess(message) {
  if (typeof message === 'string' && message.trim())
    window.dispatchEvent(new CustomEvent('vet:success', { detail: { message } }));
}

export function notifyConflict(message, title = 'No se pudo completar la operación') {
  if (typeof message === 'string' && message.trim())
    window.dispatchEvent(new CustomEvent('vet:conflict', { detail: { message, title } }));
}
