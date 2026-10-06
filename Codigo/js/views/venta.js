// views/venta.js — punto de venta (Sprint 5).
import { header } from '../components/header.js';
import { toast } from '../components/toast.js';
import { confirmar } from '../components/modal.js';
import { getAll, get, put, bulkPut, getAllByIndex } from '../db.js';
import { uid, hoyISO, horaActual, fecha, moneda, escapeHtml, aNumero, redondear } from '../utils.js';
import {
  costoPromedioPonderado,
  inversionTotalLotes,
  cantidadVendible,
  totalVenta,
  distribuirDescuento,
} from '../negocio.js';
import { METODO_PAGO } from '../dominio.js';
import { navigate } from '../router.js';

const METODO_OPTIONS = Object.entries(METODO_PAGO);

export const venta = {
  title: 'Venta',
  render(container, params) {
    if (params.historial !== undefined) return renderHistorial(container);
    return renderPOS(container);
  },
};

async function renderPOS(container) {
  const histBtn = document.createElement('a');
  histBtn.className = 'btn btn--icon';
  histBtn.href = '#/venta?historial=1';
  histBtn.setAttribute('aria-label', 'Historial de ventas');
  histBtn.textContent = '🕘';

  header(container, 'Venta', { back: true, right: histBtn, home: false });
  const view = document.createElement('div');
  view.className = 'view';
  view.innerHTML = `
    <div id="pos-grupos" class="stack"></div>
    <div id="pos-cart" style="margin-top:16px"></div>
  `;
  container.appendChild(view);

  const [tipoLotes, articulos, lotes, compras, detalles] = await Promise.all([
    getAll('tipoLotes'),
    getAll('articulos'),
    getAll('lotes'),
    getAll('compras'),
    getAll('detalleVenta'),
  ]);

  const activos = tipoLotes.filter((t) => t.status === 'en_venta');
  const compraPorId = new Map(compras.map((c) => [c.id, c]));
  const fechaLote = new Map(lotes.map((l) => [l.id, compraPorId.get(l.compraId)?.fecha || '9999']));

  // costo promedio por tipo de lote (snapshot al vender)
  const lotesPorTipo = new Map();
  for (const l of lotes) {
    if (!lotesPorTipo.has(l.tipoLoteId)) lotesPorTipo.set(l.tipoLoteId, []);
    lotesPorTipo.get(l.tipoLoteId).push(l);
  }
  const costoPromedioPorTipo = new Map();
  const ventasPorTipo = new Map();
  for (const d of detalles) {
    ventasPorTipo.set(d.tipoLoteId, (ventasPorTipo.get(d.tipoLoteId) || 0) + (Number(d.subtotalLinea) || 0));
  }
  for (const t of activos) {
    const lts = lotesPorTipo.get(t.id) || [];
    const arts = articulos.filter((a) => a.tipoLoteId === t.id);
    costoPromedioPorTipo.set(t.id, costoPromedioPonderado(inversionTotalLotes(lts), cantidadVendible(arts)));
  }

  // productos disponibles: no merma, stock > 0
  const vendibles = articulos.filter((a) => !a.esMerma && (Number(a.stock) || 0) > 0);

  const gruposEl = view.querySelector('#pos-grupos');
  const cartEl = view.querySelector('#pos-cart');

  if (!activos.length || !vendibles.length) {
    gruposEl.innerHTML = `
      <div class="empty">
        <div class="empty__icon">🛒</div>
        <div class="empty__title">Sin productos en venta</div>
        <p>Catalogá lotes y dejá el tipo de lote en “En Venta”.</p>
      </div>`;
    return;
  }

  // render grupos de productos
  const cart = new Map(); // key -> {tipoLoteId, descripcion, precioSugerido, cantidad, nombreTipo}

  gruposEl.innerHTML = activos
    .map((t) => {
      const arts = vendibles.filter((a) => a.tipoLoteId === t.id);
      if (!arts.length) return '';
      // agrupar por descripción para mostrar una sola línea
      const porDesc = new Map();
      for (const a of arts) {
        const k = a.descripcion.toLowerCase();
        if (!porDesc.has(k)) porDesc.set(k, { descripcion: a.descripcion, precioSugerido: a.precioSugerido, stock: 0 });
        porDesc.get(k).stock += a.stock;
      }
      const inv = inversionTotalLotes(lotesPorTipo.get(t.id) || []);
      const pendiente = inv - (ventasPorTipo.get(t.id) || 0);
      const productos = [...porDesc.values()]
        .map(
          (p) => `
        <button type="button" class="product-btn pos-add" data-tl="${t.id}" data-desc="${escapeHtml(p.descripcion)}" data-precio="${p.precioSugerido}" data-nombre="${escapeHtml(t.nombre)}">
          <span class="product-btn__name">${escapeHtml(p.descripcion)}</span>
          <span class="product-btn__price">${moneda(p.precioSugerido)}</span>
          <span class="product-btn__stock">${p.stock} disp.</span>
        </button>`
        )
        .join('');
      return `
      <div class="card stack">
        <div class="card__row">
          <h3>${escapeHtml(t.nombre)}</h3>
          ${pendiente > 0
            ? `<span style="color:var(--c-danger)">por recuperar: ${moneda(pendiente)}</span>`
            : `<span style="color:var(--c-success)">Ganancia: ${moneda(-pendiente)}</span>`}
        </div>
        <div class="product-grid">${productos}</div>
      </div>`;
    })
    .join('');

  function renderCart() {
    if (!cart.size) {
      cartEl.innerHTML = `
        <div class="card" style="text-align:center">
          <p>Comanda vacía. Tocá un producto para agregarlo.</p>
        </div>`;
      return;
    }
    const lineas = [...cart.values()];
    const subtotal = lineas.reduce((a, l) => a + l.precioSugerido * l.cantidad, 0);
    cartEl.innerHTML = `
      <div class="card stack">
        <h3>Comanda</h3>
        ${lineas
          .map(
            (l) => `
          <div class="card__row">
            <div class="list-item__body">
              <div class="list-item__title" style="font-size:14px">${escapeHtml(l.descripcion)}</div>
              <div class="list-item__subtitle">${escapeHtml(l.nombreTipo)}</div>
            </div>
            <button type="button" class="btn btn--icon cart-dec" data-k="${l.key}" aria-label="Menos">−</button>
            <strong>${l.cantidad}</strong>
            <button type="button" class="btn btn--icon cart-inc" data-k="${l.key}" aria-label="Más">＋</button>
            <span style="min-width:70px;text-align:right">${moneda(l.precioSugerido * l.cantidad)}</span>
          </div>`
          )
          .join('')}
        <div class="card__row"><strong>Subtotal</strong><strong>${moneda(subtotal)}</strong></div>
        <button id="pos-cobrar" class="btn btn--primary btn--block btn--lg" type="button">Cobrar</button>
      </div>`;
    cartEl.querySelectorAll('.cart-inc').forEach((b) =>
      b.addEventListener('click', () => {
        const l = cart.get(b.dataset.k);
        l.cantidad++;
        renderCart();
      })
    );
    cartEl.querySelectorAll('.cart-dec').forEach((b) =>
      b.addEventListener('click', () => {
        const l = cart.get(b.dataset.k);
        l.cantidad--;
        if (l.cantidad <= 0) cart.delete(b.dataset.k);
        renderCart();
      })
    );
    cartEl.querySelector('#pos-cobrar').addEventListener('click', () => renderCobro(subtotal, lineas));
  }

  function renderCobro(subtotal, lineas) {
    const esMixta = new Set(lineas.map((l) => l.tipoLoteId)).size > 1;
    cartEl.innerHTML = `
      <div class="card stack">
        <h3>Cobro</h3>
        <div class="card__row"><span class="muted">Subtotal</span><strong>${moneda(subtotal)}</strong></div>
        ${esMixta ? `<p class="muted" style="font-size:13px">Venta mixta: el descuento quedará pendiente de asignar.</p>` : ''}
        <div class="field"><label>Descuento (MXN)</label><input id="cob-desc" class="input" type="number" inputmode="decimal" min="0" step="0.01" value="0" /></div>
        <div class="field"><label>Método de pago</label><select id="cob-metodo" class="select">${METODO_OPTIONS.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select></div>
        <div class="card__row"><span class="muted">Total</span><strong id="cob-total">${moneda(subtotal)}</strong></div>
        <button id="cob-confirmar" class="btn btn--accent btn--block btn--lg" type="button">Confirmar venta</button>
        <button id="cob-cancelar" class="btn btn--ghost btn--block" type="button">Volver</button>
      </div>`;

    const descInput = cartEl.querySelector('#cob-desc');
    const totalEl = cartEl.querySelector('#cob-total');

    function recalcCobro() {
      const d = aNumero(descInput.value);
      totalEl.textContent = moneda(totalVenta(subtotal, d));
    }
    descInput.addEventListener('input', recalcCobro);

    cartEl.querySelector('#cob-cancelar').addEventListener('click', renderCart);
    cartEl.querySelector('#cob-confirmar').addEventListener('click', async () => {
      const descuento = aNumero(descInput.value);
      const total = totalVenta(subtotal, descuento);
      const metodoPago = cartEl.querySelector('#cob-metodo').value;

      try {
        await confirmarVenta({ lineas, subtotal, descuento, total, metodoPago, esMixta });
      } catch (e) {
        return toast(e.message, 'error');
      }

      toast(`Venta cobrada: ${moneda(total)}`, 'success');
      cart.clear();
      renderCart();
      // refresca disponibilidad
      navigate('/venta');
    });
  }

  // bind agregar producto
  gruposEl.querySelectorAll('.pos-add').forEach((btn) =>
    btn.addEventListener('click', () => {
      const key = `${btn.dataset.tl}::${btn.dataset.desc.toLowerCase()}`;
      const item = cart.get(key) || {
        key,
        tipoLoteId: btn.dataset.tl,
        descripcion: btn.dataset.desc,
        nombreTipo: btn.dataset.nombre,
        precioSugerido: aNumero(btn.dataset.precio),
        cantidad: 0,
      };
      item.cantidad++;
      cart.set(key, item);
      renderCart();
      cartEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    })
  );

  renderCart();
}

/* ---------- confirmación de venta (FIFO) ---------- */
async function confirmarVenta({ lineas, subtotal, descuento, total, metodoPago, esMixta }) {
  const articulos = await getAll('articulos');
  const lotes = await getAll('lotes');
  const compras = await getAll('compras');
  const compraPorId = new Map(compras.map((c) => [c.id, c]));
  const fechaLote = new Map(lotes.map((l) => [l.id, compraPorId.get(l.compraId)?.fecha || '9999']));

  // costo promedio por tipo de lote
  const lotesPorTipo = new Map();
  for (const l of lotes) {
    if (!lotesPorTipo.has(l.tipoLoteId)) lotesPorTipo.set(l.tipoLoteId, []);
    lotesPorTipo.get(l.tipoLoteId).push(l);
  }

  const lineasConSubtotal = lineas.map((l) => ({ ...l, subtotal: l.precioSugerido * l.cantidad }));
  const aplicarDescuento = !esMixta && descuento > 0;
  const lineasNetas = aplicarDescuento
    ? distribuirDescuento(lineasConSubtotal, descuento)
    : lineasConSubtotal.map((l) => ({ ...l, descuentoLinea: 0, subtotalLinea: l.subtotal }));

  const ventaId = uid('venta');
  const ahora = new Date().toISOString();
  const detalles = [];

  for (const linea of lineasNetas) {
    const inv = inversionTotalLotes(lotesPorTipo.get(linea.tipoLoteId) || []);
    const artsTl = articulos.filter((a) => a.tipoLoteId === linea.tipoLoteId);
    const costoPromedio = costoPromedioPonderado(inv, cantidadVendible(artsTl));
    const precioUnitario = redondear(linea.subtotalLinea / linea.cantidad);

    // FIFO: artículos del lote más antiguo primero
    const candidatos = articulos
      .filter(
        (a) =>
          a.tipoLoteId === linea.tipoLoteId &&
          !a.esMerma &&
          a.descripcion.toLowerCase() === linea.descripcion.toLowerCase() &&
          (Number(a.stock) || 0) > 0
      )
      .sort((a, b) => (fechaLote.get(a.loteId) || '9999').localeCompare(fechaLote.get(b.loteId) || '9999'));

    let pendiente = linea.cantidad;
    for (const a of candidatos) {
      if (pendiente <= 0) break;
      const tomar = Math.min(a.stock, pendiente);
      a.stock -= tomar;
      a.actualizadoEn = ahora;
      detalles.push({
        id: uid('det'),
        ventaId,
        articuloId: a.id,
        tipoLoteId: linea.tipoLoteId,
        descripcion: a.descripcion,
        precioUnitario,
        costoUnitario: costoPromedio,
        cantidad: tomar,
        subtotalLinea: redondear(precioUnitario * tomar),
        creadoEn: ahora,
      });
      pendiente -= tomar;
    }
    if (pendiente > 0) {
      throw new Error(`Stock insuficiente para “${linea.descripcion}”`);
    }
  }

  await put('ventas', {
    id: ventaId,
    fecha: hoyISO(),
    hora: horaActual(),
    subtotal: redondear(subtotal),
    descuento: redondear(descuento),
    total,
    metodoPago,
    estado: 'cobrada',
    motivoCancelacion: null,
    esMixta,
    descuentoAsignado: !esMixta || descuento === 0,
    creadoEn: ahora,
  });
  await bulkPut('articulos', articulos.filter((a) => detalles.some((d) => d.articuloId === a.id)));
  await bulkPut('detalleVenta', detalles);
}

/* ---------- historial de ventas ---------- */
async function renderHistorial(container) {
  header(container, 'Ventas', { back: true, home: false });
  const view = document.createElement('div');
  view.className = 'view';
  view.innerHTML = `<div id="ventas-lista"></div>`;
  container.appendChild(view);

  const listaEl = view.querySelector('#ventas-lista');
  const ventas = (await getAll('ventas')).sort((a, b) => (a.creadoEn < b.creadoEn ? 1 : -1));

  if (!ventas.length) {
    listaEl.innerHTML = `<div class="empty"><div class="empty__icon">🕘</div><div class="empty__title">Sin ventas</div><p>Todavía no hay ventas registradas.</p></div>`;
    return;
  }

  listaEl.innerHTML = ventas
    .map(
      (v) => `
    <div class="card stack">
      <div class="card__row">
        <div class="list-item__body">
          <div class="list-item__title">${fecha(v.fecha)} · ${v.hora}</div>
          <div class="list-item__subtitle">${METODO_PAGO[v.metodoPago] || v.metodoPago}${v.esMixta ? ' · mixta' : ''}${!v.descuentoAsignado ? ' · 💸 pendiente' : ''}</div>
        </div>
        <span class="badge ${v.estado === 'cobrada' ? 'badge--success' : 'badge--danger'}">${v.estado === 'cobrada' ? 'Cobrada' : 'Cancelada'}</span>
      </div>
      <div class="card__row"><span class="muted">Total</span><strong>${moneda(v.total)}</strong></div>
      ${v.estado === 'cobrada' ? `<button class="btn btn--danger btn--block venta-cancelar" data-id="${v.id}" type="button">Cancelar venta</button>` : `<p class="muted" style="font-size:13px">Motivo: ${escapeHtml(v.motivoCancelacion || '—')}</p>`}
    </div>`
    )
    .join('');

  listaEl.querySelectorAll('.venta-cancelar').forEach((btn) =>
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      const motivo = await promptTexto('Motivo de cancelación');
      if (motivo === null) return;
      const ok = await confirmar({
        titulo: 'Cancelar venta',
        mensaje: 'Se restaurará el stock de los artículos vendidos y la venta se excluirá de los cálculos.',
        textoConfirmar: 'Cancelar venta',
        peligroso: true,
      });
      if (!ok) return;

      const v = await get('ventas', id);
      const detalles = await getAllByIndex('detalleVenta', 'ventaId', id);
      for (const d of detalles) {
        const a = await get('articulos', d.articuloId);
        if (a) {
          a.stock += d.cantidad;
          a.actualizadoEn = new Date().toISOString();
          await put('articulos', a);
        }
      }
      v.estado = 'cancelada';
      v.motivoCancelacion = motivo;
      await put('ventas', v);
      toast('Venta cancelada y stock restaurado', 'success');
      navigate('/venta?historial=1');
    })
  );
}

// prompt simple de texto (modal con input)
function promptTexto(titulo) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal">
        <div class="modal__title">${titulo}</div>
        <div class="modal__body"><input id="pt-input" class="input" type="text" placeholder="Opcional" /></div>
        <div class="modal__actions">
          <button id="pt-cancel" class="btn btn--ghost" type="button">Cancelar</button>
          <button id="pt-ok" class="btn btn--primary" type="button">Aceptar</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    const input = overlay.querySelector('#pt-input');
    const cerrar = (v) => {
      overlay.remove();
      resolve(v);
    };
    overlay.querySelector('#pt-cancel').addEventListener('click', () => cerrar(null));
    overlay.querySelector('#pt-ok').addEventListener('click', () => cerrar(input.value.trim() || 'Sin motivo'));
    input.focus();
  });
}
