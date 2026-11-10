// Emit only after the complete write operation succeeds, never for each HTTP request.
export function notifySuccess(message) {
  if (typeof message === 'string' && message.trim())
    window.dispatchEvent(new CustomEvent('vet:success', { detail: { message } }));
}
