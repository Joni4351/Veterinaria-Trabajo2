// Do not coerce scientific notation, signs, expressions or non-number primitives.
export function plainNumberInput(value, allowDecimal = true) {
  if (typeof value === 'number') return Number.isFinite(value) && (allowDecimal || Number.isInteger(value)) ? value : NaN;
  if (typeof value !== 'string') return NaN;
  const pattern = allowDecimal ? /^(?:\d+(?:\.\d*)?|\.\d+)$/ : /^\d+$/;
  return pattern.test(value) ? Number(value) : NaN;
}
