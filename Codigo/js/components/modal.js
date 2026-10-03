// components/modal.js — diálogo de confirmación (Promise<boolean>).
/**
 * Muestra un modal de confirmación.
 * @param {{titulo?:string, mensaje?:string, textoConfirmar?:string, textoCancelar?:string, peligroso?:boolean}} opts
 * @returns {Promise<boolean>} true si confirma.
 */
export function confirmar({
  titulo = '¿Confirmar?',
  mensaje = '',
  textoConfirmar = 'Confirmar',
  textoCancelar = 'Cancelar',
  peligroso = false,
} = {}) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');

    const title = document.createElement('div');
    title.className = 'modal__title';
    title.textContent = titulo;

    const body = document.createElement('div');
    body.className = 'modal__body';
    body.textContent = mensaje;

    const actions = document.createElement('div');
    actions.className = 'modal__actions';

    const cancel = document.createElement('button');
    cancel.className = 'btn btn--ghost';
    cancel.textContent = textoCancelar;

    const ok = document.createElement('button');
    ok.className = `btn ${peligroso ? 'btn--danger' : 'btn--primary'}`;
    ok.textContent = textoConfirmar;

    const close = (value) => {
      overlay.remove();
      document.removeEventListener('keydown', onKey);
      resolve(value);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') close(false);
      if (e.key === 'Enter') close(true);
    };

    cancel.addEventListener('click', () => close(false));
    ok.addEventListener('click', () => close(true));
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close(false);
    });
    document.addEventListener('keydown', onKey);

    actions.append(cancel, ok);
    modal.append(title, body, actions);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    ok.focus();
  });
}
