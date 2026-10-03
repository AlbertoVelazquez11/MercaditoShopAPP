// db.js — wrapper de IndexedDB (promesas) + esquema v1 de MercaditoShop.

const DB_NAME = 'MercaditoShop';
const DB_VERSION = 1;

/** Object stores y sus índices (no keyPath → usa out-of-line key "id"). */
const STORES = {
  compras: { indices: ['fecha', 'estatus'] },
  lotes: { indices: ['compraId', 'tipoLoteId'] },
  articulos: { indices: ['loteId', 'tipoLoteId'] },
  tipoLotes: { indices: ['nombre'] },
  ventas: { indices: ['fecha', 'estado'] },
  detalleVenta: { indices: ['ventaId', 'articuloId', 'tipoLoteId'] },
  cortes: { indices: ['tipoLoteId', 'fecha'] },
};

let dbPromise = null;

/** Abre (o crea) la base de datos. */
export function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      for (const [name, def] of Object.entries(STORES)) {
        let store;
        if (db.objectStoreNames.contains(name)) {
          store = req.transaction.objectStore(name);
        } else {
          store = db.createObjectStore(name, { keyPath: 'id' });
        }
        for (const idx of def.indices) {
          if (!store.indexNames.contains(idx)) store.createIndex(idx, idx, { unique: false });
        }
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('La base de datos está bloqueada por otra pestaña.'));
  });
  return dbPromise;
}

/** getAll(store) → array de todos los registros. */
export async function getAll(storeName) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction(storeName, 'readonly').objectStore(storeName).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

/** get(store, key) → registro o undefined. */
export async function get(storeName, key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction(storeName, 'readonly').objectStore(storeName).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** getByIndex(store, index, value) → primer registro que coincide. */
export async function getByIndex(storeName, index, value) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction(storeName, 'readonly').objectStore(storeName).index(index).get(value);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** getAllByIndex(store, index, value) → todos los que coinciden. */
export async function getAllByIndex(storeName, index, value) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction(storeName, 'readonly').objectStore(storeName).index(index).getAll(value);
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

/** put(store, value) → guarda (inserta o actualiza) usando la key id. */
export async function put(storeName, value) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).put(value);
    tx.oncomplete = () => resolve(value);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('Transacción abortada'));
  });
}

/** bulkPut(store, values) → guarda varios en una sola transacción. */
export async function bulkPut(storeName, values) {
  if (!values.length) return [];
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    for (const v of values) store.put(v);
    tx.oncomplete = () => resolve(values);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('Transacción abortada'));
  });
}

/** remove(store, key) → elimina un registro. */
export async function remove(storeName, key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('Transacción abortada'));
  });
}

/** clear(store) → vacía un store. */
export async function clear(storeName) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('Transacción abortada'));
  });
}

/** Vuelca toda la base de datos a un objeto clave→array (para respaldo). */
export async function dumpAll() {
  const out = {};
  for (const name of Object.keys(STORES)) {
    out[name] = await getAll(name);
  }
  return out;
}

/** Restaura todas las tablas desde un dump validado. */
export async function restoreAll(dump) {
  for (const name of Object.keys(STORES)) {
    await clear(name);
    if (Array.isArray(dump[name])) await bulkPut(name, dump[name]);
  }
}

export { DB_NAME, DB_VERSION, STORES };
