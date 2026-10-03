// views/descuentos.js — asignación de descuentos de ventas mixtas (Sprint 6).
import { header } from '../components/header.js';
import { toast } from '../components/toast.js';
import { confirmar } from '../components/modal.js';
import { getAll, get, put, getAllByIndex } from '../db.js';
import { fecha, moneda, escapeHtml, redondear } from '../utils.js';
import { distribuirDescuento } from '../negocio.js';
import { navigate } from '../router.js';

export const descuentos = {
  title: 'Descuentos',
  render(container, params) {
    if (params.venta) return renderAsignar(container, params.venta);
    return renderLista(container);
  },
};

async function renderLista(container) {
  header(container, 'Descuentos', { back: true });
  const view = document.createElement('div');
  view.className = 'view';
  view.innerHTML = `<div id="desc-lista"></div>`;
  container.appendChild(view);

  const listaEl = view.querySelector('#desc-lista');
  const ventas = await getAll('ventas');
  const pendientes = ventas
    .filter((v) => v.estado === 'cobrada' && v.esMixta && (Number(v.descuento) || 0) > 0 && !v.descuentoAsignado)
    .sort((a, b) => (a.creadoEn < b.creadoEn ? 1 : -1));

  if (!pendientes.length) {
    listaEl.innerHTML = `
      <div class="empty">
        <div class="empty__icon">💸</div>
        <div class="empty__title">Sin descuentos pendientes</div>
        <p>Los descuentos de ventas mixtas aparecen acá para asignarlos a un tipo de lote.</p>
      </div>`;
    return;
  }

  listaEl.innerHTML = pendientes
    .map(
      (v) => `
    <a class="list-item" href="#/descuentos?venta=${v.id}">
      <div class="list-item__body">
        <div class="list-item__title">${fecha(v.fecha)} · ${v.hora}</div>
        <div class="list-item__subtitle">Descuento por asignar</div>
      </div>
      <strong>${moneda(v.descuento)}</strong>
    </a>`
    )
    .join('');
}

async function renderAsignar(container, ventaId) {
  const venta = await get('ventas', ventaId);
  if (!venta) {
    header(container, 'Descuentos', { back: true });
    const view = document.createElement('div');
    view.className = 'view';
    view.innerHTML = `<div class="empty"><div class="empty__icon">⚠️</div><div class="empty__title">Venta no encontrada</div></div>`;
    container.appendChild(view);
    return;
  }

  const [detalles, tipoLotes] = await Promise.all([getAllByIndex('detalleVenta', 'ventaId', ventaId), getAll('tipoLotes')]);
  const tipoNombre = new Map(tipoLotes.map((t) => [t.id, t.nombre]));

  const porTipo = new Map();
  for (const d of detalles) {
    if (!porTipo.has(d.tipoLoteId)) porTipo.set(d.tipoLoteId, []);
    porTipo.get(d.tipoLoteId).push(d);
  }

  header(container, 'Asignar descuento', { back: true });
  const view = document.createElement('div');
  view.className = 'view';
  view.innerHTML = `
    <div class="card stack">
      <div class="card__row"><span class="muted">Venta</span><strong>${fecha(venta.fecha)} · ${venta.hora}</strong></div>
      <div class="card__row"><span class="muted">Descuento a asignar</span><strong>${moneda(venta.descuento)}</strong></div>
    </div>
    <div id="desc-tipos" class="stack"></div>
  `;
  container.appendChild(view);

  const cont = view.querySelector('#desc-tipos');
  cont.innerHTML = [...porTipo.entries()]
    .map(([tlId, lineas]) => {
      const nombre = tipoNombre.get(tlId) || 'Tipo de lote';
      const subtotal = lineas.reduce((a, l) => a + (Number(l.subtotalLinea) || 0), 0);
      return `
      <div class="card">
        <div class="card__row">
          <div class="list-item__body">
            <div class="list-item__title">${escapeHtml(nombre)}</div>
            <div class="list-item__subtitle">${lineas.length} línea(s) · ${moneda(subtotal)}</div>
          </div>
          <button class="btn btn--primary desc-aplicar" data-tl="${tlId}" type="button">Aplicar acá</button>
        </div>
      </div>`;
    })
    .join('');

  cont.querySelectorAll('.desc-aplicar').forEach((btn) =>
    btn.addEventListener('click', async () => {
      const tlId = btn.dataset.tl;
      const nombre = tipoNombre.get(tlId) || 'este tipo de lote';
      const ok = await confirmar({
        titulo: 'Asignar descuento',
        mensaje: `El descuento de ${moneda(venta.descuento)} se aplicará a “${nombre}” y se recalcularán sus cuentas.`,
        textoConfirmar: 'Asignar',
      });
      if (!ok) return;

      const lineas = porTipo.get(tlId).map((l) => ({ ...l, subtotal: Number(l.subtotalLinea) || 0 }));
      const netas = distribuirDescuento(lineas, venta.descuento);

      for (const n of netas) {
        const det = detalles.find((d) => d.id === n.id);
        if (det) {
          det.subtotalLinea = n.subtotalLinea;
          det.precioUnitario = redondear(n.subtotalLinea / (Number(det.cantidad) || 1));
          await put('detalleVenta', det);
        }
      }

      venta.descuentoAsignado = true;
      venta.ajusteDescuentoEn = new Date().toISOString();
      await put('ventas', venta);

      toast('Descuento asignado y cuentas recalculadas', 'success');
      navigate('/descuentos');
    })
  );
}
