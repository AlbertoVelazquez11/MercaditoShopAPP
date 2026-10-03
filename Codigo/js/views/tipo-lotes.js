// views/tipo-lotes.js — CRUD de tipos de lote + detalle/descombinar (Sprint 4).
import { header } from '../components/header.js';
import { toast } from '../components/toast.js';
import { confirmar } from '../components/modal.js';
import { getAll, get, put, remove, getAllByIndex } from '../db.js';
import { uid, escapeHtml, moneda } from '../utils.js';
import { inversionTotalLotes, cantidadVendible, metricasTipoLote } from '../negocio.js';
import { STATUS_TIPO_LOTE, SUBESTADO_LOTE } from '../dominio.js';
import { navigate } from '../router.js';

const STATUS_OPTIONS = Object.entries(STATUS_TIPO_LOTE).filter(([k]) => k !== 'cerrado');

function badgeStatus(s) {
  switch (s) {
    case 'en_venta':
      return 'badge--success';
    case 'vendido':
      return 'badge--primary';
    case 'almacenado':
      return 'badge--warning';
    default:
      return 'badge--neutral';
  }
}

export const tipoLotes = {
  title: 'Tipo de Lote',
  render(container, params) {
    if (params.id) return renderDetalle(container, params.id);
    if (params.editar) return renderFormulario(container, params.editar);
    if (params.nueva !== undefined) return renderFormulario(container, null);
    return renderLista(container);
  },
};

async function renderLista(container) {
  header(container, 'Tipo de Lote', { back: true });
  const view = document.createElement('div');
  view.className = 'view';
  view.innerHTML = `<div id="tl-lista"></div><button class="fab" id="tl-nueva" aria-label="Nuevo tipo de lote" type="button">＋</button>`;
  container.appendChild(view);

  const listaEl = view.querySelector('#tl-lista');
  const tipoLotes = await getAll('tipoLotes');

  if (!tipoLotes.length) {
    listaEl.innerHTML = `
      <div class="empty">
        <div class="empty__icon">🗂️</div>
        <div class="empty__title">Sin tipos de lote</div>
        <p>Se crean automáticamente al catalogar, o tocá “＋”.</p>
      </div>`;
  } else {
    listaEl.innerHTML = tipoLotes
      .sort((a, b) => a.nombre.localeCompare(b.nombre))
      .map(
        (t) => `
      <a class="list-item" href="#/tipo-lotes?id=${t.id}">
        <div class="list-item__body">
          <div class="list-item__title">${escapeHtml(t.nombre)}</div>
        </div>
        <span class="badge ${badgeStatus(t.status)}">${STATUS_TIPO_LOTE[t.status] || t.status}</span>
      </a>`
      )
      .join('');
  }

  view.querySelector('#tl-nueva').addEventListener('click', () => navigate('/tipo-lotes?nueva=1'));
}

async function renderFormulario(container, id) {
  const editando = !!id;
  const tipo = editando ? await get('tipoLotes', id) : null;
  header(container, editando ? 'Editar tipo de lote' : 'Nuevo tipo de lote', { back: true });

  const view = document.createElement('div');
  view.className = 'view';
  view.innerHTML = `
    <form id="tl-form" class="stack">
      <div class="field">
        <label for="tl-nombre">Nombre</label>
        <input id="tl-nombre" class="input" type="text" value="${escapeHtml(tipo?.nombre || '')}" placeholder="Ej. Calcetas" maxlength="60" />
      </div>
      <div class="field">
        <label for="tl-status">Status</label>
        <select id="tl-status" class="select">
          ${STATUS_OPTIONS.map(([v, label]) => `<option value="${v}" ${tipo?.status === v ? 'selected' : ''}>${label}</option>`).join('')}
        </select>
      </div>
      <button class="btn btn--primary btn--block btn--lg" type="submit">Guardar</button>
    </form>
  `;
  container.appendChild(view);

  view.querySelector('#tl-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const nombre = view.querySelector('#tl-nombre').value.trim();
    const status = view.querySelector('#tl-status').value;
    if (!nombre) return toast('Ingresá el nombre', 'error');

    const ahora = new Date().toISOString();
    const tipoId = id || uid('tl');
    await put('tipoLotes', {
      id: tipoId,
      nombre,
      status,
      creadoEn: tipo?.creadoEn || ahora,
      actualizadoEn: ahora,
    });
    toast(editando ? 'Tipo de lote actualizado' : 'Tipo de lote creado', 'success');
    navigate(`/tipo-lotes?id=${tipoId}`);
  });
}

async function renderDetalle(container, id) {
  const tipo = await get('tipoLotes', id);
  if (!tipo) {
    header(container, 'Tipo de Lote', { back: true });
    const view = document.createElement('div');
    view.className = 'view';
    view.innerHTML = `<div class="empty"><div class="empty__icon">⚠️</div><div class="empty__title">No encontrado</div></div>`;
    container.appendChild(view);
    return;
  }

  const [lotes, articulos, detalles] = await Promise.all([
    getAllByIndex('lotes', 'tipoLoteId', id),
    getAllByIndex('articulos', 'tipoLoteId', id),
    getAll('detalleVenta'),
  ]);
  const ventas = detalles
    .filter((d) => d.tipoLoteId === id)
    .reduce((a, d) => a + (Number(d.subtotalLinea) || 0), 0);

  const m = metricasTipoLote({
    inversionTotal: inversionTotalLotes(lotes),
    cantidadVendibleTotal: cantidadVendible(articulos),
    ventasTotales: ventas,
    articulos,
  });

  header(container, escapeHtml(tipo.nombre), { back: true });
  const view = document.createElement('div');
  view.className = 'view';
  view.innerHTML = `
    <div class="card stack">
      <div class="card__row">
        <span class="badge ${badgeStatus(tipo.status)}">${STATUS_TIPO_LOTE[tipo.status] || tipo.status}</span>
        <select id="tl-status" class="select" style="max-width:160px">
          ${STATUS_OPTIONS.map(([v, label]) => `<option value="${v}" ${tipo.status === v ? 'selected' : ''}>${label}</option>`).join('')}
        </select>
      </div>
      <div class="card__row"><span class="muted">Inversión total</span><strong>${moneda(m.inversionTotal)}</strong></div>
      <div class="card__row"><span class="muted">Costo por unidad</span><strong>${moneda(m.costoPromedio)}</strong></div>
      <div class="card__row"><span class="muted">Por recuperar</span><strong>${moneda(m.pendiente)}</strong></div>
      <div class="card__row"><span class="muted">Ventas</span><strong>${moneda(m.ventasTotales)}</strong></div>
      <div class="card__row"><span class="muted">Ganancia estimada</span><strong>${moneda(m.gananciaEstimada)}</strong></div>
    </div>

    <div class="card stack">
      <h3>Artículos</h3>
      ${articulos.length
        ? articulos
            .map(
              (a) => `
        <div class="card__row" style="padding:4px 0">
          <span>${escapeHtml(a.descripcion)}${a.esMerma ? ' · 🗑️' : ''}${a.esRemanente ? ' · ♻️' : ''}</span>
          <span class="muted">stock ${a.stock} · ${moneda(a.precioSugerido)}</span>
        </div>`
            )
            .join('')
        : `<p class="muted">Sin artículos.</p>`}
    </div>

    <div class="card stack">
      <h3>Lotes (descombinar)</h3>
      ${lotes.length
        ? lotes
            .map(
              (l) => `
        <div class="card" style="background:var(--c-surface-2)">
          <div class="card__row">
            <strong>${escapeHtml(l.nombreProducto)}</strong>
            <span class="badge badge--neutral">${l.subEstado ? SUBESTADO_LOTE[l.subEstado] : 'Recibido'}</span>
          </div>
          <div class="card__row"><span class="muted">Cantidad</span><span>${l.cantidad}</span></div>
          <div class="card__row"><span class="muted">Inversión</span><span>${moneda(l.inversion)}</span></div>
        </div>`
            )
            .join('')
        : `<p class="muted">Sin lotes (posible remanente de corte).</p>`}
    </div>

    <div class="stack" style="margin-top:16px">
      <a class="btn btn--ghost btn--block" href="#/tipo-lotes?editar=${id}">✏️ Editar</a>
      <button id="tl-del" class="btn btn--danger btn--block" type="button">🗑️ Eliminar</button>
    </div>
  `;
  container.appendChild(view);

  view.querySelector('#tl-status').addEventListener('change', async (e) => {
    tipo.status = e.target.value;
    tipo.actualizadoEn = new Date().toISOString();
    await put('tipoLotes', tipo);
    toast('Status actualizado', 'success');
  });

  view.querySelector('#tl-del').addEventListener('click', async () => {
    if (articulos.length || lotes.length) {
      return toast('No se puede eliminar: tiene artículos o lotes. Usá “Vendido” o “Almacenado”.', 'error');
    }
    const ok = await confirmar({
      titulo: 'Eliminar tipo de lote',
      mensaje: 'Se eliminará el tipo de lote. Esta acción no se puede deshacer.',
      textoConfirmar: 'Eliminar',
      peligroso: true,
    });
    if (!ok) return;
    await remove('tipoLotes', id);
    toast('Tipo de lote eliminado', 'success');
    navigate('/tipo-lotes');
  });
}
