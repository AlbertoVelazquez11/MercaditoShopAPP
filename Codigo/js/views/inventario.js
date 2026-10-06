// views/inventario.js — inventario agrupado por tipo de lote (Sprint 4).
import { header } from '../components/header.js';
import { toast } from '../components/toast.js';
import { getAll, bulkPut } from '../db.js';
import { moneda, escapeHtml, aNumero } from '../utils.js';
import { inversionTotalLotes, cantidadVendible, metricasTipoLote, ventaMaxima, agruparPorDescripcion } from '../negocio.js';
import { navigate } from '../router.js';

export const inventario = {
  title: 'Inventario',
  render(container) {
    return renderGrupo(container);
  },
};

async function renderGrupo(container) {
  header(container, 'Inventario', { back: true });
  const view = document.createElement('div');
  view.className = 'view';
  view.innerHTML = `<div id="inv-grupos" class="stack"></div>`;
  container.appendChild(view);

  const cont = view.querySelector('#inv-grupos');
  const [tipoLotes, lotes, articulos, detalles] = await Promise.all([
    getAll('tipoLotes'),
    getAll('lotes'),
    getAll('articulos'),
    getAll('detalleVenta'),
  ]);

  const artsPorTipo = new Map();
  for (const a of articulos) {
    if (!artsPorTipo.has(a.tipoLoteId)) artsPorTipo.set(a.tipoLoteId, []);
    artsPorTipo.get(a.tipoLoteId).push(a);
  }
  const lotesPorTipo = new Map();
  for (const l of lotes) {
    if (!lotesPorTipo.has(l.tipoLoteId)) lotesPorTipo.set(l.tipoLoteId, []);
    lotesPorTipo.get(l.tipoLoteId).push(l);
  }
  const ventasPorTipo = new Map();
  for (const d of detalles) {
    ventasPorTipo.set(d.tipoLoteId, (ventasPorTipo.get(d.tipoLoteId) || 0) + (Number(d.subtotalLinea) || 0));
  }

  const grupos = tipoLotes
    .filter((t) => t.status !== 'cerrado')
    .map((t) => {
      const arts = artsPorTipo.get(t.id) || [];
      const lts = lotesPorTipo.get(t.id) || [];
      return {
        tipo: t,
        articulos: arts,
        lotes: lts,
        metricas: metricasTipoLote({
          inversionTotal: inversionTotalLotes(lts),
          cantidadVendibleTotal: cantidadVendible(arts),
          ventasTotales: ventasPorTipo.get(t.id) || 0,
          articulos: arts,
        }),
      };
    })
    .filter((g) => g.articulos.length > 0 || g.lotes.length > 0);

  if (!grupos.length) {
    cont.innerHTML = `
      <div class="empty">
        <div class="empty__icon">📊</div>
        <div class="empty__title">Inventario vacío</div>
        <p>Catalogá lotes para ver el inventario agrupado por tipo de lote.</p>
      </div>`;
    return;
  }

  cont.innerHTML = grupos
    .map((g) => {
      const m = g.metricas;
      const arts = g.articulos.filter((a) => !a.esMerma);
      const vm = ventaMaxima(g.articulos);
      return `
      <div class="card stack">
        <div class="card__row">
          <h3>${escapeHtml(g.tipo.nombre)}</h3>
          <a class="badge badge--primary" href="#/tipo-lotes?id=${g.tipo.id}">Detalle</a>
        </div>
        <div class="card__row"><span class="muted">Inversión total</span><strong>${moneda(m.inversionTotal)}</strong></div>
        ${m.pendiente > 0
          ? `<div class="card__row"><span class="muted">Inversión por recuperar</span><strong style="color:var(--c-danger)">${moneda(m.pendiente)}</strong></div>`
          : `<div class="card__row"><span class="muted">Ganancia de venta</span><strong style="color:var(--c-success)">${moneda(m.ganancia)}</strong></div>`}
        <div class="card__row"><span class="muted">Venta máxima</span><strong>${moneda(vm)}</strong></div>
        <div class="card__row"><span class="muted">Ganancia estimada</span><strong>${moneda(m.gananciaEstimada)}</strong></div>
        <div style="border-top:1px solid var(--c-border);margin-top:8px;padding-top:8px">
          ${arts
            .map(
              (a) => `
            <div class="card__row" style="padding:4px 0">
              <span>${escapeHtml(a.descripcion)}</span>
              <span class="muted">${a.stock} × ${moneda(a.precioSugerido)}</span>
            </div>`
            )
            .join('')}
        </div>
        <button class="btn btn--ghost btn--block btn--sm inv-edit" data-tipo="${g.tipo.id}" type="button">✏️ Editar artículos</button>
      </div>`;
    })
    .join('');

  cont.querySelectorAll('.inv-edit').forEach((btn) =>
    btn.addEventListener('click', () => abrirEditorArticulos(btn.dataset.tipo))
  );
}

/* ---------- editor de artículos por tipo de lote ---------- */
async function abrirEditorArticulos(tipoId) {
  const articulos = await getAll('articulos');
  const delTipo = articulos.filter((a) => a.tipoLoteId === tipoId);
  const grupos = agruparPorDescripcion(delTipo).filter((g) => !g.esMerma);

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.style.maxWidth = '440px';
  modal.style.maxHeight = '90vh';
  modal.style.overflowY = 'auto';
  modal.innerHTML = `
    <div class="modal__title">✏️ Editar artículos</div>
    <div id="edit-body" class="stack" style="margin-top:8px"></div>
    <div class="modal__actions" style="margin-top:16px">
      <button class="btn btn--ghost" id="edit-cancelar" type="button">Cancelar</button>
      <button class="btn btn--primary" id="edit-guardar" type="button">Guardar</button>
    </div>`;
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  const body = modal.querySelector('#edit-body');
  const nombres = grupos.map((g) => g.descripcion);

  body.innerHTML = grupos
    .map(
      (g) => `
    <div class="card" data-desc="${escapeHtml(g.descripcion)}" style="padding:12px">
      <div class="card__row" style="margin-bottom:8px">
        <strong>${escapeHtml(g.descripcion)}</strong>
        <span class="muted">stock ${g.stock}</span>
      </div>
      <div class="field">
        <label>Precio sugerido</label>
        <input class="input edit-precio" type="number" inputmode="decimal" min="0" step="0.01" value="${g.precioSugerido}" />
      </div>
      <div class="field">
        <label>Aumentar cantidad</label>
        <div style="display:flex;gap:8px">
          <input class="input edit-aum" type="number" inputmode="numeric" min="0" step="1" placeholder="0" style="flex:1" />
          <select class="select edit-aum-de" style="flex:1.4">
            <option value="">Restar de…</option>
            ${nombres.filter((n) => n !== g.descripcion).map((n) => `<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="field" style="margin-bottom:0">
        <label>Reducir cantidad</label>
        <div style="display:flex;gap:8px">
          <input class="input edit-red" type="number" inputmode="numeric" min="0" step="1" placeholder="0" style="flex:1" />
          <input class="input edit-motivo" type="text" placeholder="Motivo" style="flex:1.4" />
        </div>
      </div>
    </div>`
    )
    .join('');

  overlay.querySelector('#edit-cancelar').addEventListener('click', () => overlay.remove());

  overlay.querySelector('#edit-guardar').addEventListener('click', async () => {
    const filas = body.querySelectorAll('.card');
    const articulosPorDesc = new Map();
    for (const g of grupos) {
      const key = g.descripcion.toLowerCase();
      articulosPorDesc.set(key, delTipo.filter((a) => a.descripcion.toLowerCase() === key));
    }

    const cambiosPrecio = [];
    const aumentos = [];
    const reducciones = [];

    for (const fila of filas) {
      const key = fila.dataset.desc.toLowerCase();
      const precio = aNumero(fila.querySelector('.edit-precio').value);
      const aum = aNumero(fila.querySelector('.edit-aum').value);
      const aumDe = fila.querySelector('.edit-aum-de').value.trim();
      const red = aNumero(fila.querySelector('.edit-red').value);
      const motivo = fila.querySelector('.edit-motivo').value.trim();

      const g = grupos.find((x) => x.descripcion.toLowerCase() === key);
      if (precio !== Number(g.precioSugerido)) cambiosPrecio.push({ key, precio });
      if (aum > 0) {
        if (!aumDe) return toast(`Elegí de qué artículo restar para “${g.descripcion}”`, 'error');
        aumentos.push({ key, cantidad: aum, origen: aumDe.toLowerCase() });
      }
      if (red > 0) {
        if (!motivo) return toast(`Ingresá el motivo para reducir “${g.descripcion}”`, 'error');
        reducciones.push({ key, cantidad: red, motivo });
      }
    }

    const ahora = new Date().toISOString();
    const tocados = new Map();

    function restarDe(arts, n) {
      let pend = n;
      for (const a of arts) {
        if (pend <= 0) break;
        const stock = Number(a.stock) || 0;
        const tomar = Math.min(stock, pend);
        if (tomar > 0) {
          a.stock = stock - tomar;
          a.cantidad = Math.max(0, (Number(a.cantidad) || 0) - tomar);
          a.actualizadoEn = ahora;
          tocados.set(a.id, a);
          pend -= tomar;
        }
      }
      if (pend > 0) throw new Error('Stock insuficiente para completar el ajuste');
    }

    try {
      for (const c of cambiosPrecio) {
        for (const a of articulosPorDesc.get(c.key)) {
          a.precioSugerido = c.precio;
          a.actualizadoEn = ahora;
          tocados.set(a.id, a);
        }
      }
      for (const r of reducciones) {
        restarDe(articulosPorDesc.get(r.key), r.cantidad);
        for (const a of articulosPorDesc.get(r.key)) {
          if (tocados.has(a.id)) a.motivoAjuste = r.motivo;
        }
      }
      for (const aum of aumentos) {
        restarDe(articulosPorDesc.get(aum.origen), aum.cantidad);
        const destArts = articulosPorDesc.get(aum.key);
        const conStock = destArts.filter((a) => (Number(a.stock) || 0) > 0);
        const base = conStock[0] || destArts[0];
        base.stock = (Number(base.stock) || 0) + aum.cantidad;
        base.cantidad = (Number(base.cantidad) || 0) + aum.cantidad;
        base.actualizadoEn = ahora;
        tocados.set(base.id, base);
      }
    } catch (e) {
      return toast(e.message, 'error');
    }

    await bulkPut('articulos', [...tocados.values()]);
    toast('Artículos actualizados', 'success');
    overlay.remove();
    navigate('/inventario');
  });
}
