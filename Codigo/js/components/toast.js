// components/toast.js — notificaciones efímeras.
let containerEl = null;

function ensureContainer() {
  if (!containerEl) {
    containerEl = document.createElement('div');
    containerEl.className = 'toast-container';
    containerEl.setAttribute('aria-live', 'polite');
    document.body.appendChild(containerEl);
  }
  return containerEl;
}

/**
 * Muestra un toast.
 * @param {string} msg
 * @param {'info'|'success'|'error'} type
 * @param {number} timeout ms
 */
export function toast(msg, type = 'info', timeout = 2400) {
  const el = document.createElement('div');
  el.className = `toast${type !== 'info' ? ` toast--${type}` : ''}`;
  el.textContent = msg;
  ensureContainer().appendChild(el);
  setTimeout(() => el.remove(), timeout);
}
