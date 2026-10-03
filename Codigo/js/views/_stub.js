// views/_stub.js — helper para vistas vacías (placeholder de sprints futuros).
import { header } from '../components/header.js';

export function makeStub({ title, icon, description }) {
  return {
    title,
    render(container) {
      header(container, title, { back: true });
      const view = document.createElement('div');
      view.className = 'view';
      view.innerHTML = `
        <div class="stub">
          <div class="stub__icon">${icon}</div>
          <div class="empty__title">${title}</div>
          <p>${description}</p>
          <span class="badge badge--neutral">Disponible en un sprint posterior</span>
        </div>
      `;
      container.appendChild(view);
    },
  };
}
