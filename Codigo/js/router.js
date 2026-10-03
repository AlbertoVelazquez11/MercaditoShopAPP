// router.js — hash router (SPA).
import { store } from './store.js';
import { home } from './views/home.js';
import { admin } from './views/admin.js';
import { config } from './views/config.js';
import { compras } from './views/compras.js';
import { catalogar } from './views/catalogar.js';
import { inventario } from './views/inventario.js';
import { tipoLotes } from './views/tipo-lotes.js';
import { corte } from './views/corte.js';
import { descuentos } from './views/descuentos.js';
import { venta } from './views/venta.js';

const ROUTES = {
  '/': home,
  '/admin': admin,
  '/compras': compras,
  '/catalogar': catalogar,
  '/inventario': inventario,
  '/tipo-lotes': tipoLotes,
  '/corte': corte,
  '/descuentos': descuentos,
  '/venta': venta,
  '/config': config,
};

/** Parsea el hash actual en { path, params }. */
export function parseHash() {
  const raw = location.hash.replace(/^#/, '') || '/';
  const [pathPart, queryPart] = raw.split('?');
  const path = pathPart.startsWith('/') ? pathPart : `/${pathPart}`;
  const params = {};
  if (queryPart) {
    new URLSearchParams(queryPart).forEach((v, k) => {
      params[k] = v;
    });
  }
  return { path, params };
}

/** Navega a una ruta (actualiza el hash). */
export function navigate(path) {
  if (parseHash().path === path) {
    render();
    return;
  }
  location.hash = path;
}

/** Renderiza la vista correspondiente a la ruta actual. */
export function render() {
  const { path, params } = parseHash();
  const route = ROUTES[path] || ROUTES['/'];
  const app = document.getElementById('app');
  app.innerHTML = '';
  try {
    route.render(app, params);
  } catch (e) {
    console.error(e);
    app.innerHTML = `
      <div class="view">
        <div class="stub">
          <div class="stub__icon">⚠️</div>
          <div class="empty__title">Error</div>
          <p>No se pudo cargar esta pantalla.</p>
        </div>
      </div>`;
  }
  store.set({ route: path });
  window.scrollTo(0, 0);
}

/** Arranca el router escuchando cambios de hash. */
export function initRouter() {
  window.addEventListener('hashchange', render);
  render();
}
