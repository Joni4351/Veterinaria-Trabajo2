export const dashboardFixture = {
 periodo: { desde: '2026-11-01', hasta: '2026-11-02', agrupacion: 'dia' },
 indicadores: { totalFacturado: 357000, netoFacturado: 300000, impuestos: 57000, facturas: 4, promedioPorFactura: 89250, citas: 6, canceladas: 1, porcentajeCancelacion: 16.7, agotados: 1, bajoStock: 2, insumos: 4, porcentajeInsumosAgotados: 25 },
 facturacion: [{ periodo: '2026-11-01', total: 119000, facturas: 1 }, { periodo: '2026-11-02', total: 238000, facturas: 3 }],
 citasPorFecha: [{ periodo: '2026-11-01', estados: [{ estado: 'Confirmada', cantidad: 2 }, { estado: 'Cancelada', cantidad: 1 }] }, { periodo: '2026-11-02', estados: [{ estado: 'Completada', cantidad: 3 }] }],
 especialidades: [{ id: 1, nombre: 'Medicina General', cantidad: 4, porcentaje: 66.7 }, { id: 2, nombre: 'Cirugía', cantidad: 2, porcentaje: 33.3 }],
 inventario: [{ id: 1, nombreProducto: 'Insumo limitado', tipo: 'Medicamento', stockActual: 2 }, { id: 2, nombreProducto: 'Vacuna de prueba', tipo: 'Vacuna', stockActual: 0 }],
 proximasCitas: [{ id: 1, estado: 'Confirmada', paciente: 'Luna', fechaHora: '2026-11-12T15:00:00' }],
 opciones: { especialidades: [{ id: 1, nombre: 'Medicina General' }, { id: 2, nombre: 'Cirugía' }], veterinarios: [{ id: 2, nombre: 'Profesional de prueba' }], tiposInsumo: ['Medicamento','Vacuna'] }
};
