// export.js — respaldo JSON completo y exportación CSV (BOM UTF-8).
import { dumpAll, restoreAll, STORES } from './db.js';
import { hoyISO } from './utils.js';

function download(nombre, contenido, mime) {
  const blob = new Blob([contenido], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Genera y descarga un respaldo JSON completo de IndexedDB. */
export async function respaldarJSON() {
  const data = await dumpAll();
  const payload = {
    app: 'MercaditoShop',
    version: 1,
    exportadoEn: new Date().toISOString(),
    data,
  };
  download(`mercadito-respaldo-${hoyISO()}.json`, JSON.stringify(payload, null, 2), 'application/json');
  return payload;
}

/** Construye un CSV con BOM UTF-8 (compatible Excel). */
export function csvConBOM(filas, columnas) {
  const sep = ',';
  const esc = (v) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = columnas.map((c) => esc(c.label)).join(sep);
  const body = filas.map((f) => columnas.map((c) => esc(f[c.key])).join(sep)).join('\n');
  return '\uFEFF' + [header, body].filter(Boolean).join('\n');
}

/** Descarga un CSV con nombre y columnas definidas. */
export function descargarCSV(nombre, filas, columnas) {
  download(nombre, csvConBOM(filas, columnas), 'text/csv;charset=utf-8');
}

/**
 * Importa un respaldo JSON, valida su forma y restaura todas las tablas.
 * @param {File} file
 * @returns {Promise<{tabla:string,registros:number}[]>} resumen por tabla.
 */
export async function importarRespaldo(file) {
  const text = await file.text();
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error('El archivo no es un JSON válido.');
  }
  if (!payload || payload.app !== 'MercaditoShop' || !payload.data || typeof payload.data !== 'object') {
    throw new Error('El respaldo no pertenece a Mercadito Shop o está incompleto.');
  }
  const data = payload.data;
  const tablas = Object.keys(STORES);
  const resumen = tablas.map((t) => ({
    tabla: t,
    registros: Array.isArray(data[t]) ? data[t].length : 0,
  }));
  await restoreAll(data);
  return resumen;
}
