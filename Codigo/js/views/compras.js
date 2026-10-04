// views/compras.js — CRUD de compras y lotes (Sprint 2).
import { header } from '../components/header.js';
import { toast } from '../components/toast.js';
import { confirmar } from '../components/modal.js';
import { dateFilter } from '../components/date-filter.js';
import { getAll, get, put, remove, bulkPut, getAllByIndex } from '../db.js';
import { uid, hoyISO, fecha, moneda, escapeHtml, aNumero } from '../utils.js';
import { prorratearEnvio, inversionLote, totalCompra } from '../negocio.js';
import { ESTATUS_COMPRA, SUBESTADO_LOTE } from '../dominio.js';
import { navigate } from '../router.js';

const ESTATUS_OPTIONS = Object.entries(ESTATUS_COMPRA).filter(([v]) => v !== 'recibida_parcial');
const SUBESTADO_OPTIONS = Object.entries(SUBESTADO_LOTE);

export const compras = {
  title: 'Compras',
  render(container, params) {
    if (params.id) return renderDetalle(container, params.id);
    if (params.editar) return renderFormulario(container, params.editar);
    if (params.nueva !== undefined) return renderFormulario(container, null);
    return renderLista(container);
  },
};

/* ---------- helpers ---------- */
function loteVacio() {
  return { nombreProducto: '', cantidad: '', costo: '' };
}

async function getProveedores() {
  const comprasData = await getAll('compras');
  return [...new Set(comprasData.map((c) => c.proveedor).filter(Boolean))].sort();
}

function badgeEstatus(estatus) {
  switch (estatus) {
    case 'recibida':
      return 'badge--success';
    case 'recibida_parcial':
      return 'badge--warning';
    case 'cancelada_devuelta':
      return 'badge--danger';
    case 'pagada':
    case 'en_camino':
      return 'badge--primary';
    default:
      return 'badge--warning';
  }
}

async function lotesPorCompra() {
  const lotes = await getAll('lotes');
  const map = new Map();
  for (const l of lotes) {
    if (!map.has(l.compraId)) map.set(l.compraId, []);
    map.get(l.compraId).push(l);
  }
  return map;
}

/* ---------- lista ---------- */
async function renderLista(container) {
  header(container, 'Compras', { back: true });
  const view = document.createElement('div');
  view.className = 'view';
  view.innerHTML = `
    <div id="compras-filtro"></div>
    <div id="compras-lista" style="margin-top:12px"></div>
    <button class="fab" id="compras-nueva" aria-label="Nueva compra" type="button">＋</button>
  `;
  container.appendChild(view);

  const listaEl = view.querySelector('#compras-lista');
  const porCompra = await lotesPorCompra();

  async function cargar({ desde = '', hasta = '' } = {}) {
    let comprasData = await getAll('compras');
    comprasData = comprasData
      .filter((c) => (!desde || c.fecha >= desde) && (!hasta || c.fecha <= hasta))
      .sort((a, b) => (a.fecha < b.fecha ? 1 : -1));

    if (!comprasData.length) {
      listaEl.innerHTML = `
        <div class="empty">
          <div class="empty__icon">📦</div>
          <div class="empty__title">Sin compras</div>
          <p>Tocá “＋” para registrar tu primera compra.</p>
        </div>`;
      return;
    }

    listaEl.innerHTML = comprasData
      .map((c) => {
        const ls = porCompra.get(c.id) || [];
        const total = totalCompra(ls, c.costoEnvio);
        return `
        <a class="list-item" href="#/compras?id=${c.id}">
          <div class="list-item__body">
            <div class="list-item__title">${escapeHtml(c.proveedor)}</div>
            <div class="list-item__subtitle">${fecha(c.fecha)} · ${ls.length} lote(s)${c.bloqueada ? ' · 🔒' : ''}</div>
          </div>
          <span class="badge ${badgeEstatus(c.estatus)}">${ESTATUS_COMPRA[c.estatus] || c.estatus}</span>
          <span style="font-weight:600">${moneda(total)}</span>
        </a>`;
      })
      .join('');
  }

  dateFilter(view.querySelector('#compras-filtro'), { onChange: cargar });
  view.querySelector('#compras-nueva').addEventListener('click', () => navigate('/compras?nueva=1'));
  await cargar();
}

/* ---------- formulario ---------- */
async function renderFormulario(container, id) {
  const editando = !!id;
  const compra = editando ? await get('compras', id) : null;
  const lotesPrevios = editando ? await getAllByIndex('lotes', 'compraId', id) : [];

  if (editando && compra?.bloqueada) {
    header(container, 'Compra bloqueada', { back: true });
    const view = document.createElement('div');
    view.className = 'view';
    view.innerHTML = `
      <div class="stub">
        <div class="stub__icon">🔒</div>
        <div class="empty__title">Compra bloqueada</div>
        <p>Fue catalogada. Desbloqueala desde su detalle para editarla.</p>
        <a class="btn btn--ghost" href="#/compras?id=${id}">Ver detalle</a>
      </div>`;
    container.appendChild(view);
    return;
  }

  header(container, editando ? 'Editar compra' : 'Nueva compra', { back: true });
  const view = document.createElement('div');
  view.className = 'view';

  const proveedores = await getProveedores();
  view.innerHTML = `
    <form id="form-compra" class="stack">
      <div class="field">
        <label for="c-fecha">Fecha</label>
        <input id="c-fecha" class="input" type="date" value="${compra?.fecha || hoyISO()}" />
      </div>
      <div class="field">
        <label for="c-proveedor">Proveedor</label>
        <input id="c-proveedor" class="input" type="text" list="c-proveedores" value="${escapeHtml(compra?.proveedor || '')}" placeholder="Ej. Distribuidora X" autocomplete="off" />
        <datalist id="c-proveedores">${proveedores.map((p) => `<option value="${escapeHtml(p)}"></option>`).join('')}</datalist>
      </div>
      <div class="field">
        <label for="c-envio">Costo de envío (MXN)</label>
        <input id="c-envio" class="input" type="number" inputmode="decimal" min="0" step="0.01" value="${compra?.costoEnvio ?? 0}" />
      </div>
      <div class="field">
        <label>Lotes</label>
        <div id="lotes" class="stack"></div>
        <button id="add-lote" class="btn btn--ghost btn--block" type="button">＋ Agregar lote</button>
      </div>
      <button id="guardar" class="btn btn--primary btn--block btn--lg" type="submit">Guardar compra</button>
    </form>
  `;
  container.appendChild(view);

  const lotesEl = view.querySelector('#lotes');
  const lotesState = lotesPrevios.length ? lotesPrevios.map((l) => ({ ...l })) : [loteVacio()];

  function renderLotes() {
    lotesEl.innerHTML = lotesState
      .map(
        (l, i) => `
      <div class="card" data-i="${i}">
        <div class="card__row" style="margin-bottom:8px">
          <span class="card__title">Lote ${i + 1}</span>
          <button type="button" class="btn btn--icon lote-del" aria-label="Quitar lote">✕</button>
        </div>
        <div class="field">
          <label>Nombre del producto</label>
          <input class="input lote-nombre" value="${escapeHtml(l.nombreProducto || '')}" placeholder="Ej. Calcetas navideñas" />
        </div>
        <div style="display:flex;gap:8px">
          <div class="field" style="flex:1"><label>Cantidad</label><input class="input lote-cantidad" type="number" inputmode="numeric" min="0" step="1" value="${l.cantidad ?? ''}" /></div>
          <div class="field" style="flex:1"><label>Costo (MXN)</label><input class="input lote-costo" type="number" inputmode="decimal" min="0" step="0.01" value="${l.costo ?? ''}" /></div>
        </div>
      </div>`
      )
      .join('');

    lotesEl.querySelectorAll('.lote-del').forEach((btn) =>
      btn.addEventListener('click', () => {
        const i = Number(btn.closest('.card').dataset.i);
        lotesState.splice(i, 1);
        if (!lotesState.length) lotesState.push(loteVacio());
        renderLotes();
      })
    );
    lotesEl.querySelectorAll('.lote-nombre').forEach((inp) =>
      inp.addEventListener('input', (e) => {
        lotesState[Number(inp.closest('.card').dataset.i)].nombreProducto = e.target.value;
      })
    );
    lotesEl.querySelectorAll('.lote-cantidad').forEach((inp) =>
      inp.addEventListener('input', (e) => {
        lotesState[Number(inp.closest('.card').dataset.i)].cantidad = e.target.value;
      })
    );
    lotesEl.querySelectorAll('.lote-costo').forEach((inp) =>
      inp.addEventListener('input', (e) => {
        lotesState[Number(inp.closest('.card').dataset.i)].costo = e.target.value;
      })
    );
  }
  renderLotes();

  view.querySelector('#add-lote').addEventListener('click', () => {
    lotesState.push(loteVacio());
    renderLotes();
  });

  view.querySelector('#form-compra').addEventListener('submit', async (e) => {
    e.preventDefault();
    const proveedor = view.querySelector('#c-proveedor').value.trim();
    const fechaVal = view.querySelector('#c-fecha').value;
    const envio = aNumero(view.querySelector('#c-envio').value);

    if (!proveedor) return toast('Ingresá el proveedor', 'error');
    if (!fechaVal) return toast('Ingresá la fecha', 'error');

    const lotes = lotesState.map((l) => ({
      ...l,
      nombreProducto: (l.nombreProducto || '').trim(),
      cantidad: aNumero(l.cantidad),
      costo: aNumero(l.costo),
    }));

    if (!lotes.length) return toast('Agregá al menos un lote', 'error');
    for (const l of lotes) {
      if (!l.nombreProducto) return toast('Todos los lotes necesitan nombre', 'error');
      if (l.cantidad <= 0) return toast(`Cantidad inválida en “${l.nombreProducto}”`, 'error');
      if (l.costo < 0) return toast(`Costo inválido en “${l.nombreProducto}”`, 'error');
    }

    const ahora = new Date().toISOString();
    const compraId = id || uid('compra');
    const prorrateo = prorratearEnvio(envio, lotes);

    const lotesGuardar = lotes.map((l, i) => {
      const prev = lotesPrevios.find((p) => p.id === l.id) || {};
      const subEstado = prev.subEstado ?? 'en_camino';
      const envioProrrateado = prorrateo[i];
      return {
        id: l.id || uid('lote'),
        compraId,
        nombreProducto: l.nombreProducto,
        cantidad: l.cantidad,
        costo: l.costo,
        cantidadRecibida: prev.cantidadRecibida ?? null,
        subEstado,
        envioProrrateado,
        inversion: inversionLote({ costo: l.costo, envioProrrateado, subEstado }),
        catalogado: prev.catalogado ?? false,
        tipoLoteId: prev.tipoLoteId ?? null,
        creadoEn: prev.creadoEn || ahora,
        actualizadoEn: ahora,
      };
    });

    await put('compras', {
      id: compraId,
      fecha: fechaVal,
      proveedor,
      costoEnvio: envio,
      estatus: compra?.estatus || 'solicitada',
      bloqueada: compra?.bloqueada || false,
      notas: compra?.notas || null,
      creadoEn: compra?.creadoEn || ahora,
      actualizadoEn: ahora,
    });
    await bulkPut('lotes', lotesGuardar);

    // elimina lotes removidos en la edición
    const idsGuardados = new Set(lotesGuardar.map((l) => l.id));
    for (const p of lotesPrevios) {
      if (!idsGuardados.has(p.id)) await remove('lotes', p.id);
    }

    toast(editando ? 'Compra actualizada' : 'Compra registrada', 'success');
    navigate(`/compras?id=${compraId}`);
  });
}

/* ---------- detalle ---------- */
async function renderDetalle(container, id) {
  const compra = await get('compras', id);
  if (!compra) {
    header(container, 'Compras', { back: true });
    const view = document.createElement('div');
    view.className = 'view';
    view.innerHTML = `<div class="empty"><div class="empty__icon">⚠️</div><div class="empty__title">Compra no encontrada</div></div>`;
    container.appendChild(view);
    return;
  }

  const lotes = await getAllByIndex('lotes', 'compraId', id);
  const total = totalCompra(lotes, compra.costoEnvio);

  header(container, 'Detalle de compra', { back: true });
  const view = document.createElement('div');
  view.className = 'view';
  view.innerHTML = `
    <div class="card stack">
      <div class="card__row"><span class="muted">Proveedor</span><strong>${escapeHtml(compra.proveedor)}</strong></div>
      <div class="card__row"><span class="muted">Fecha</span><strong>${fecha(compra.fecha)}</strong></div>
      <div class="card__row"><span class="muted">Envío</span><strong>${moneda(compra.costoEnvio)}</strong></div>
      <div class="card__row"><span class="muted">Total</span><strong>${moneda(total)}</strong></div>
      <div class="field" style="margin:0">
        <label for="c-estatus">Estatus</label>
        <select id="c-estatus" class="select">
          ${ESTATUS_OPTIONS.map(([v, label]) => `<option value="${v}" ${compra.estatus === v ? 'selected' : ''}>${label}</option>`).join('')}
          <option value="recibida_parcial" disabled ${compra.estatus === 'recibida_parcial' ? 'selected' : ''}>Recibido parcial</option>
        </select>
      </div>
      ${compra.bloqueada ? `<p style="margin:0">🔒 Compra catalogada (bloqueada).</p>` : ''}
    </div>

    <div class="card stack">
      <h3>Lotes (${lotes.length})</h3>
      <p>Al recibir, marcá cantidad recibida y sub-estado por lote. Solo “Reembolsado” descuenta la inversión.</p>
      <div id="det-lotes" class="stack"></div>
    </div>

    <div class="stack" style="margin-top:16px">
      ${compra.bloqueada ? `<button id="desbloquear" class="btn btn--ghost btn--block" type="button">🔓 Desbloquear</button>` : `<a class="btn btn--ghost btn--block" href="#/compras?editar=${id}">✏️ Editar</a>`}
      <button id="eliminar" class="btn btn--danger btn--block" type="button">🗑️ Eliminar compra</button>
    </div>
  `;
  container.appendChild(view);

  const detLotes = view.querySelector('#det-lotes');
  const estatusSelect = view.querySelector('#c-estatus');

  function actualizarEstatusSelect() {
    estatusSelect.value = compra.estatus;
  }

  async function guardarRecepcion() {
    for (const l of lotes) {
      l.inversion = inversionLote({ costo: l.costo, envioProrrateado: l.envioProrrateado, subEstado: l.subEstado });
      l.actualizadoEn = new Date().toISOString();
    }
    await bulkPut('lotes', lotes);

    // Estatus automático según sub-estados de los lotes.
    const recibidos = lotes.filter((l) => l.subEstado === 'recibido').length;
    if (lotes.length > 0 && recibidos === lotes.length) {
      compra.estatus = 'recibida';
    } else if (recibidos > 0) {
      compra.estatus = 'recibida_parcial';
    }
    compra.actualizadoEn = new Date().toISOString();
    await put('compras', compra);
    actualizarEstatusSelect();
  }

  function renderDetLotes() {
    detLotes.innerHTML = lotes
      .map(
        (l, i) => `
      <div class="card" data-i="${i}">
        <div class="card__row" style="margin-bottom:8px">
          <strong>${escapeHtml(l.nombreProducto)}</strong>
          <span class="badge badge--neutral">${l.subEstado ? SUBESTADO_LOTE[l.subEstado] : 'En camino'}</span>
        </div>
        <div class="card__row"><span class="muted">Cantidad</span><span>${l.cantidad}</span></div>
        <div class="card__row"><span class="muted">Costo</span><span>${moneda(l.costo)}</span></div>
        <div class="card__row"><span class="muted">Inversión</span><span>${moneda(l.inversion)}</span></div>
        <div class="card__row">
          <span class="muted">Cantidad recibida</span>
          <input class="input det-recibido" type="number" inputmode="numeric" min="0" step="1" value="${l.cantidadRecibida ?? l.cantidad}" style="max-width:96px" />
        </div>
        <div class="field" style="margin:0">
          <label>Sub-estado</label>
          <select class="select det-subestado">
            ${SUBESTADO_OPTIONS.map(([v, label]) => `<option value="${v}" ${l.subEstado === v ? 'selected' : ''}>${label}</option>`).join('')}
          </select>
        </div>
      </div>`
      )
      .join('');

    detLotes.querySelectorAll('.det-recibido').forEach((inp) =>
      inp.addEventListener('change', async (e) => {
        lotes[Number(inp.closest('.card').dataset.i)].cantidadRecibida = aNumero(e.target.value);
        await guardarRecepcion();
      })
    );
    detLotes.querySelectorAll('.det-subestado').forEach((sel) =>
      sel.addEventListener('change', async (e) => {
        const i = Number(sel.closest('.card').dataset.i);
        lotes[i].subEstado = e.target.value;
        await guardarRecepcion();
        renderDetLotes();
      })
    );
  }
  renderDetLotes();

  view.querySelector('#c-estatus').addEventListener('change', async (e) => {
    compra.estatus = e.target.value;
    if (compra.estatus === 'recibida') {
      // Al marcar la compra como "Recibido", todos los lotes quedan recibidos y catalogables.
      for (const l of lotes) l.subEstado = 'recibido';
      await guardarRecepcion();
      renderDetLotes();
    } else {
      compra.actualizadoEn = new Date().toISOString();
      await put('compras', compra);
    }
    toast('Estatus actualizado', 'success');
  });

  if (compra.bloqueada) {
    view.querySelector('#desbloquear').addEventListener('click', async () => {
      const ok = await confirmar({
        titulo: 'Desbloquear compra',
        mensaje: 'Vas a poder editar una compra que ya fue catalogada. ¿Continuar?',
        textoConfirmar: 'Desbloquear',
        peligroso: true,
      });
      if (!ok) return;
      compra.bloqueada = false;
      compra.actualizadoEn = new Date().toISOString();
      await put('compras', compra);
      navigate(`/compras?id=${id}`);
    });
  }

  view.querySelector('#eliminar').addEventListener('click', async () => {
    const ok = await confirmar({
      titulo: 'Eliminar compra',
      mensaje: 'Se eliminará la compra y todos sus lotes. Esta acción no se puede deshacer.',
      textoConfirmar: 'Eliminar',
      peligroso: true,
    });
    if (!ok) return;
    for (const l of lotes) await remove('lotes', l.id);
    await remove('compras', id);
    toast('Compra eliminada', 'success');
    navigate('/compras');
  });
}
