// views/home.js — pantalla principal: logo + Venta + Administración + engrane.
import { store } from '../store.js';
import { escapeHtml } from '../utils.js';

export const home = {
  title: 'Inicio',
  render(container) {
    const cfg = store.state.config;
    const view = document.createElement('div');
    view.className = 'view home';
    view.innerHTML = `
      <a class="btn btn--icon home__gear" href="#/config" aria-label="Configuración">⚙️</a>
      <img class="home__logo" src="${cfg.logo || './icons/icon.svg'}" alt="Logo" />
      <div>
        <div class="home__brand">${escapeHtml(cfg.nombreNegocio)}</div>
        <div class="home__subtitle">Control de inventario por lotes</div>
      </div>
      <div class="home__actions">
        <a class="btn btn--primary" href="#/venta">🛒 Venta</a>
        <a class="btn btn--ghost" href="#/admin">⚙️ Administración</a>
      </div>
    `;
    container.appendChild(view);
  },
};
