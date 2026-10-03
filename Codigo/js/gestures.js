// gestures.js — utilidades táctiles (swipe y anti-doble-tap zoom).
/**
 * Detecta swipe horizontal en un elemento.
 * @param {HTMLElement} el
 * @param {{left?:Function, right?:Function}} handlers
 */
export function onSwipe(el, handlers) {
  let startX = null;
  let startY = null;

  el.addEventListener(
    'touchstart',
    (e) => {
      const t = e.touches[0];
      startX = t.clientX;
      startY = t.clientY;
    },
    { passive: true }
  );

  el.addEventListener(
    'touchend',
    (e) => {
      if (startX === null) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) {
        (dx < 0 ? handlers.left : handlers.right)?.();
      }
      startX = null;
      startY = null;
    },
    { passive: true }
  );
}

/** Evita el zoom por doble-tap (mejora la experiencia de botones en iOS). */
export function preventDoubleTapZoom() {
  let last = 0;
  document.addEventListener(
    'touchend',
    (e) => {
      const now = Date.now();
      if (now - last < 300) e.preventDefault();
      last = now;
    },
    { passive: false }
  );
}
