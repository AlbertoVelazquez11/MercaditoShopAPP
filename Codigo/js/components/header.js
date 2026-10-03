// components/header.js — barra superior con botón de atrás y acciones.
export function header(container, title, { back = false, right = null } = {}) {
  const h = document.createElement('header');
  h.className = 'app-header';

  if (back) {
    const b = document.createElement('button');
    b.className = 'btn btn--icon';
    b.type = 'button';
    b.setAttribute('aria-label', 'Atrás');
    b.textContent = '‹';
    b.addEventListener('click', () => history.back());
    h.appendChild(b);
  } else {
    h.appendChild(placeholder());
  }

  const t = document.createElement('div');
  t.className = 'app-header__title';
  t.textContent = title;
  h.appendChild(t);

  if (right) {
    h.appendChild(right);
  } else {
    h.appendChild(placeholder());
  }

  container.appendChild(h);
  return h;
}

function placeholder() {
  const d = document.createElement('div');
  d.className = 'app-header__spacer';
  return d;
}
