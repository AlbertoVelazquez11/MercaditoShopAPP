// negocio.js — reglas y cálculos financieros del dominio (funciones puras).
import { redondear } from './utils.js';

/**
 * Prorrateo del costo de envío entre lotes, proporcional al costo de cada lote.
 * Si la suma de costos es 0, reparte equitativamente.
 * @param {number} costoEnvio
 * @param {{costo:number}[]} lotes
 * @returns {number[]} monto de envío asignado a cada lote (mismo orden).
 */
export function prorratearEnvio(costoEnvio, lotes) {
  const envio = Number(costoEnvio) || 0;
  const n = lotes.length;
  if (n === 0) return [];
  if (n === 1) return [redondear(envio)];

  const totalCosto = lotes.reduce((acc, l) => acc + (Number(l.costo) || 0), 0);
  if (totalCosto === 0) {
    const eq = redondear(envio / n);
    const out = new Array(n).fill(eq);
    out[n - 1] = redondear(envio - eq * (n - 1)); // ajuste por redondeo
    return out;
  }
  return lotes.map((l) => redondear(envio * ((Number(l.costo) || 0) / totalCosto)));
}

/**
 * Inversión de un lote: costo + envío prorrateado; 0 si fue reembolsado.
 * @param {{costo:number, envioProrrateado?:number, subEstado?:string}} lote
 */
export function inversionLote(lote) {
  if (lote.subEstado === 'reembolsado') return 0;
  return redondear((Number(lote.costo) || 0) + (Number(lote.envioProrrateado) || 0));
}

/** Cantidad vendible: suma de cantidades de artículos no merma. */
export function cantidadVendible(articulos) {
  return articulos.reduce((acc, a) => acc + (a.esMerma ? 0 : (Number(a.cantidad) || 0)), 0);
}

/** Costo unitario de un lote: inversión repartida entre las unidades vendibles. */
export function costoUnitarioLote(inversion, unidadesVendibles) {
  const inv = Number(inversion) || 0;
  const unidades = Number(unidadesVendibles) || 0;
  return unidades > 0 ? redondear(inv / unidades) : 0;
}

/** Inversión total de un conjunto de lotes (reembolsados suman 0). */
export function inversionTotalLotes(lotes) {
  return redondear(lotes.reduce((acc, l) => acc + inversionLote(l), 0));
}

/** Total de una compra: Σ costo de lotes + costo de envío. */
export function totalCompra(lotes, costoEnvio) {
  return redondear(
    (lotes || []).reduce((acc, l) => acc + (Number(l.costo) || 0), 0) + (Number(costoEnvio) || 0)
  );
}

/** Costo promedio ponderado de un tipo de lote. */
export function costoPromedioPonderado(inversionTotal, unidadesVendibles) {
  return costoUnitarioLote(inversionTotal, unidadesVendibles);
}

/** Ventas totales desde líneas de detalle (snapshot subtotalLinea). */
export function ventasTotales(detalles) {
  return redondear((detalles || []).reduce((acc, d) => acc + (Number(d.subtotalLinea) || 0), 0));
}

/** Subtotal de una línea de venta. */
export function subtotalLinea(precioUnitario, cantidad) {
  return redondear((Number(precioUnitario) || 0) * (Number(cantidad) || 0));
}

/** Total de venta aplicando descuento (monto fijo), nunca negativo. */
export function totalVenta(subtotal, descuento) {
  return Math.max(0, redondear((Number(subtotal) || 0) - (Number(descuento) || 0)));
}

/** Cambio a devolver si paga de más. */
export function calcularCambio(pagoCon, total) {
  const cambio = (Number(pagoCon) || 0) - (Number(total) || 0);
  return cambio > 0 ? redondear(cambio) : 0;
}

/**
 * Ganancia estimada: venta potencial a precio sugerido − inversión.
 * Solo considera artículos no merma con stock > 0.
 */
export function gananciaEstimada(articulos, inversionTotal) {
  const potencial = (articulos || []).reduce(
    (acc, a) => acc + (a.esMerma ? 0 : (Number(a.precioSugerido) || 0) * (Number(a.stock) || 0)),
    0
  );
  return redondear(potencial - (Number(inversionTotal) || 0));
}

/**
 * Métricas consolidadas de un tipo de lote.
 * @param {{inversionTotal:number, cantidadVendibleTotal:number, ventasTotales:number, articulos:Array}} datos
 */
export function metricasTipoLote({ inversionTotal, cantidadVendibleTotal, ventasTotales: ventas, articulos }) {
  const inversion = Number(inversionTotal) || 0;
  const unidades = Number(cantidadVendibleTotal) || 0;
  const ventasTot = Number(ventas) || 0;
  return {
    inversionTotal: redondear(inversion),
    cantidadVendibleTotal: unidades,
    costoPromedio: costoPromedioPonderado(inversion, unidades),
    ventasTotales: redondear(ventasTot),
    pendiente: redondear(inversion - ventasTot),
    ganancia: redondear(ventasTot - inversion),
    gananciaEstimada: gananciaEstimada(articulos, inversion),
  };
}
