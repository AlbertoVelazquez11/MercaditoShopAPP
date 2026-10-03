// app.js — bootstrap: config, tema, base de datos, router y service worker.
import { initRouter } from './router.js';
import { cargarConfig, aplicarTema, store } from './store.js';
import { openDB } from './db.js';
import { preventDoubleTapZoom } from './gestures.js';

async function boot() {
  // Configuración y tema
  const config = cargarConfig();
  aplicarTema(config.tema);
  store.set({ config, ready: true });

  // Base de datos
  try {
    await openDB();
  } catch (e) {
    console.error('IndexedDB no disponible:', e);
  }

  // Router
  initRouter();

  // Mejora táctil
  preventDoubleTapZoom();

  // Service worker (offline)
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch((e) => {
        console.warn('Service worker no registrado:', e);
      });
    });
  }
}

boot().catch((e) => console.error('Error al iniciar la app:', e));
