import React, { forwardRef } from 'react';

export const NumericInput = forwardRef(function NumericInput({
  allowDecimal, step, min = 0, value, onChange, onKeyDown, onBeforeInput, onPaste, onDrop, ...props
}, ref) {
  const decimal = allowDecimal ?? (step === 'any' || (step != null && Number(step) > 0 && Number(step) < 1));
  const validText = text => (decimal ? /^\d*(?:\.\d*)?$/ : /^\d*$/).test(text);
  const allowTransfer = text => text.length > 0 && validText(text);
  return <input {...props} ref={ref} type="number" min={min} step={step ?? (decimal ? 'any' : 1)}
    inputMode={decimal ? 'decimal' : 'numeric'} value={value}
    onKeyDown={event => {
      onKeyDown?.(event);
      if (!event.defaultPrevented && !event.ctrlKey && !event.metaKey && !event.altKey &&
          event.key.length === 1 && !validText(event.key)) event.preventDefault();
    }}
    onBeforeInput={event => {
      onBeforeInput?.(event);
      const text = event.data ?? event.nativeEvent.data;
      if (text && !validText(text)) event.preventDefault();
    }}
    onPaste={event => {
      onPaste?.(event);
      if (!allowTransfer(event.clipboardData.getData('text'))) event.preventDefault();
    }}
    onDrop={event => {
      onDrop?.(event);
      if (!allowTransfer(event.dataTransfer.getData('text'))) event.preventDefault();
    }}
    onChange={event => {
      if (!validText(event.target.value)) {
        // Reject the whole input instead of silently changing e.g. 1e3 into 13.
        event.target.value = value ?? '';
        return;
      }
      onChange?.(event);
    }} />;
});
