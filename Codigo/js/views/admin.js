// views/admin.js — hub de administración con accesos a los 6 módulos.
import { header } from '../components/header.js';

const MODULOS = [
  { href: '#/compras', icon: '📦', label: 'Compras' },
  { href: '#/catalogar', icon: '🏷️', label: 'Catalogar' },
  { href: '#/inventario', icon: '📊', label: 'Inventario' },
  { href: '#/tipo-lotes', icon: '🗂️', label: 'Tipo de Lote' },
  { href: '#/corte', icon: '✂️', label: 'Corte' },
  { href: '#/descuentos', icon: '💸', label: 'Descuentos' },
];

export const admin = {
  title: 'Administración',
  render(container) {
    header(container, 'Administración', { back: true });
    const view = document.createElement('div');
    view.className = 'view';
    view.innerHTML = `
      <div class="admin-grid">
        ${MODULOS.map(
          (m) => `
          <a class="admin-tile" href="${m.href}">
            <span class="admin-tile__icon">${m.icon}</span>
            <span class="admin-tile__label">${m.label}</span>
          </a>`
        ).join('')}
      </div>
    `;
    container.appendChild(view);
  },
};
