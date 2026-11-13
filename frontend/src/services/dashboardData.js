// Older API processes may return totals without the newer derived fields.
// Use only aggregates from the same response, never the bounded preview lists.
function ratio(value, numerator, denominator, decimals) {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const scale = 10 ** decimals;
  return Math.round(numerator / denominator * scale) / scale;
}

export function normalizeDashboardData(data) {
  const stats = data?.indicadores || {};
  return {
    ...data,
    indicadores: {
      ...stats,
      promedioPorFactura: ratio(stats.promedioPorFactura, stats.totalFacturado, stats.facturas, 2),
      porcentajeInsumosAgotados: ratio(stats.porcentajeInsumosAgotados, stats.agotados * 100, stats.insumos, 1),
      porcentajeCancelacion: ratio(stats.porcentajeCancelacion, stats.canceladas * 100, stats.citas, 1)
    },
    especialidades: (data?.especialidades || []).map(item => ({ ...item, porcentaje: ratio(item.porcentaje, item.cantidad * 100, stats.citas, 1) }))
  };
}
