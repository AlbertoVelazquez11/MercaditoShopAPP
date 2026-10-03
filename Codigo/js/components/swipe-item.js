// components/swipe-item.js — lista deslizable para revelar una acción (táctil + mouse).
const ACTION_W = 76;

/**
 * Envuelve un elemento de lista para que se pueda deslizar a la izquierda
 * y revelar un botón de acción.
 * @param {HTMLElement} contentEl elemento original (contenido).
 * @param {{actionLabel?:string, onAction?:Function}} opts
 * @returns {HTMLElement} wrapper insertable en el DOM.
 */
export function makeSwipeable(contentEl, { actionLabel = 'Eliminar', onAction } = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'swipe-item';

  const actions = document.createElement('div');
  actions.className = 'swipe-item__actions';
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'swipe-item__action swipe-item__action--delete';
  btn.textContent = actionLabel;
  btn.addEventListener('click', () => {
    reset();
    onAction && onAction();
  });
  actions.appendChild(btn);

  const content = document.createElement('div');
  content.className = 'swipe-item__content';
  content.appendChild(contentEl);

  wrap.appendChild(actions);
  wrap.appendChild(content);

  let startX = null;
  let startY = null;
  let startOffset = 0;
  let dragging = false;

  function reset() {
    startOffset = 0;
    content.style.transition = 'transform 0.2s ease';
    content.style.transform = 'translateX(0)';
  }

  content.addEventListener('pointerdown', (e) => {
    dragging = true;
    startX = e.clientX;
    startY = e.clientY;
    startOffset = startOffset; // conserva offset revelado
    content.style.transition = 'none';
  });

  window.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    if (Math.abs(dy) > Math.abs(dx)) {
      dragging = false;
      reset();
      return;
    }
    const next = Math.min(0, Math.max(-ACTION_W, startOffset + dx));
    content.style.transform = `translateX(${next}px)`;
    if (e.cancelable) e.preventDefault();
  });

  window.addEventListener('pointerup', () => {
    if (!dragging) return;
    dragging = false;
    content.style.transition = 'transform 0.2s ease';
    const current = parseFloat(content.style.transform.replace(/[^-\d.]/g, '')) || 0;
    startOffset = current < -ACTION_W / 2 ? -ACTION_W : 0;
    content.style.transform = `translateX(${startOffset}px)`;
  });

  return wrap;
}
