// utils.js — utilidades puras: ids, fechas, moneda, texto seguro.

/** Genera un id único con prefijo semántico. */
export function uid(prefix = 'id') {
  const rand = Math.random().toString(36).slice(2, 10);
  const time = Date.now().toString(36);
  return `${prefix}_${time}_${rand}`;
}

/** Fecha de hoy en formato YYYY-MM-DD (local). */
export function hoyISO() {
  return aISO(new Date());
}

/** Convierte un Date a YYYY-MM-DD (local). */
export function aISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Hora actual HH:mm:ss (local). */
export function horaActual() {
  const n = new Date();
  return [n.getHours(), n.getMinutes(), n.getSeconds()]
    .map((x) => String(x).padStart(2, '0'))
    .join(':');
}

/** Timestamp ISO con milisegundos. */
export function ahoraISO() {
  return new Date().toISOString();
}

/** Formatea moneda MXN con centavos, sin redondeo forzado. */
export function moneda(num) {
  const n = Number(num) || 0;
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

/** Formatea una fecha ISO (YYYY-MM-DD) a texto legible. */
export function fecha(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  return date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** Redondea a 2 decimales. */
export function redondear(num) {
  return Math.round((Number(num) + Number.EPSILON) * 100) / 100;
}

/** Convierte texto a número; devuelve 0 si no es válido. */
export function aNumero(val) {
  const n = parseFloat(String(val).replace(/[$,]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

/** Escapa HTML para renderizado seguro de texto ingresado por el usuario. */
export function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Devuelve la clave de hoy para agrupar por fecha. */
export function claveHoy() {
  return hoyISO();
}
