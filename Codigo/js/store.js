// store.js — estado reactivo (Observable) + configuración en localStorage.

export const CONFIG_KEY = 'mercadito:config';

export const DEFAULT_CONFIG = Object.freeze({
  nombreNegocio: 'Mercadito Shop',
  logo: null, // dataURL o null (usa el icono por defecto)
  version: '1.0.0',
  tema: 'light', // 'light' | 'dark'
  ultimaExportacion: null,
});

class Observable {
  #state;
  #listeners = new Set();

  constructor(initial) {
    this.#state = initial;
  }

  get state() {
    return this.#state;
  }

  set(patch) {
    this.#state = { ...this.#state, ...patch };
    this.#emit();
  }

  reset(value) {
    this.#state = value;
    this.#emit();
  }

  subscribe(fn) {
    this.#listeners.add(fn);
    return () => this.#listeners.delete(fn);
  }

  #emit() {
    for (const fn of this.#listeners) fn(this.#state);
  }
}

/** Store global de la app (ruta actual, estado de carga, config). */
export const store = new Observable({ route: null, ready: false, config: DEFAULT_CONFIG });

/** Lee la configuración desde localStorage con valores por defecto. */
export function cargarConfig() {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) return { ...DEFAULT_CONFIG };
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

/** Aplica el atributo data-tema al documento raíz. */
export function aplicarTema(tema) {
  document.documentElement.setAttribute('data-tema', tema === 'dark' ? 'dark' : 'light');
}

/** Guarda un parche de configuración y notifica a los suscriptores. */
export function guardarConfig(patch) {
  const next = { ...cargarConfig(), ...patch };
  localStorage.setItem(CONFIG_KEY, JSON.stringify(next));
  aplicarTema(next.tema);
  store.set({ config: next });
  return next;
}
