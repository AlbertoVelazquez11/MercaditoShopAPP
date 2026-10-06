// views/catalogar.js — catalogación de lotes recibidos → artículos (Sprint 3).
import { header } from '../components/header.js';
import { toast } from '../components/toast.js';
import { confirmar } from '../components/modal.js';
import { getAll, get, put, bulkPut, getAllByIndex, getByIndex } from '../db.js';
import { uid, fecha, moneda, escapeHtml, aNumero } from '../utils.js';
import { cantidadVendible, costoUnitarioLote, gananciaEstimada } from '../negocio.js';
import { navigate } from '../router.js';

export const catalogar = {
  title: 'Catalogar',
  render(container, params) {
    if (params.compra) return renderCompra(container, params.compra);
    return renderLista(container);
  },
};

function esCatalogable(l) {
  return !l.catalogado && (l.subEstado === null || l.subEstado === undefined || l.subEstado === 'recibido');
}

function targetDeLote(l) {
  return l.cantidadRecibida ?? l.cantidad;
}

/* ---------- lista de compras recibidas pendientes ---------- */
async function renderLista(container) {
  header(container, 'Catalogar', { back: true });
  const view = document.createElement('div');
  view.className = 'view';
  view.innerHTML = `<div id="cat-lista"></div>`;
  container.appendChild(view);

  const listaEl = view.querySelector('#cat-lista');
  const compras = await getAll('compras');
  const lotes = await getAll('lotes');
  const porCompra = new Map();
  for (const l of lotes) {
    if (!porCompra.has(l.compraId)) porCompra.set(l.compraId, []);
    porCompra.get(l.compraId).push(l);
  }

  const pendientes = compras
    .filter((c) => (c.estatus === 'recibida' || c.estatus === 'recibida_parcial') && !c.bloqueada)
    .map((c) => ({ compra: c, lotes: (porCompra.get(c.id) || []).filter(esCatalogable) }))
    .filter((x) => x.lotes.length > 0)
    .sort((a, b) => (a.compra.fecha < b.compra.fecha ? 1 : -1));

  if (!pendientes.length) {
    listaEl.innerHTML = `
      <div class="empty">
        <div class="empty__icon">🏷️</div>
        <div class="empty__title">Nada por catalogar</div>
        <p>No hay compras recibidas con lotes pendientes de catalogar.</p>
      </div>`;
    return;
  }

  listaEl.innerHTML = pendientes
    .map(
      (x) => `
    <a class="list-item" href="#/catalogar?compra=${x.compra.id}">
      <div class="list-item__body">
        <div class="list-item__title">${escapeHtml(x.compra.proveedor)}</div>
        <div class="list-item__subtitle">${fecha(x.compra.fecha)} · ${x.lotes.length} lote(s) por catalogar</div>
      </div>
      <span class="badge badge--primary">Catalogar →</span>
    </a>`
    )
    .join('');
}

/* ---------- catalogación de una compra ---------- */
async function renderCompra(container, compraId) {
  const compra = await get('compras', compraId);
  if (!compra) {
    header(container, 'Catalogar', { back: true });
    const view = document.createElement('div');
    view.className = 'view';
    view.innerHTML = `<div class="empty"><div class="empty__icon">⚠️</div><div class="empty__title">Compra no encontrada</div></div>`;
    container.appendChild(view);
    return;
  }

  const lotes = (await getAllByIndex('lotes', 'compraId', compraId)).filter(esCatalogable);
  const tipoLotes = await getAll('tipoLotes');
  const tiposActivos = tipoLotes.filter((t) => t.status !== 'cerrado');
  const articulosExistentes = await getAll('articulos');

  header(container, `Catalogar · ${compra.proveedor}`, { back: true });
  const view = document.createElement('div');
  view.className = 'view';
  view.innerHTML = `<div id="cat-lotes" class="stack"></div>`;
  container.appendChild(view);

  const cont = view.querySelector('#cat-lotes');
  if (!lotes.length) {
    cont.innerHTML = `<div class="empty"><div class="empty__icon">✅</div><div class="empty__title">Listo</div><p>Todos los lotes recibidos ya fueron catalogados.</p></div>`;
    return;
  }
  if (!tiposActivos.length) {
    cont.innerHTML = `
      <div class="empty">
        <div class="empty__icon">🗂️</div>
        <div class="empty__title">Primero creá un tipo de lote</div>
        <p>Necesitás al menos un tipo de lote para poder catalogar.</p>
        <a class="btn btn--primary" href="#/tipo-lotes?nueva=1" style="margin-top:12px">＋ Crear tipo de lote</a>
      </div>`;
    toast('Primero creá al menos un tipo de lote', 'error');
    return;
  }

  for (const lote of lotes) {
    cont.appendChild(await renderLoteCard(lote, tiposActivos, compra, articulosExistentes));
  }
}

/* ---------- tarjeta por lote ---------- */
async function renderLoteCard(lote, tipoLotes, compra, articulosExistentes = []) {
  const card = document.createElement('div');
  card.className = 'card stack';

  const target = targetDeLote(lote);
  const articulos = []; // estado en memoria
  const precioPorProducto = costoUnitarioLote(lote.inversion, target);

  // descripciones y precio actual por tipo de lote (para autocompletar y homologar)
  const descPorTipo = new Map();
  for (const a of articulosExistentes) {
    if (!descPorTipo.has(a.tipoLoteId)) descPorTipo.set(a.tipoLoteId, new Map());
    const m = descPorTipo.get(a.tipoLoteId);
    const key = (a.descripcion || '').trim().toLowerCase();
    if (!m.has(key)) m.set(key, Number(a.precioSugerido) || 0);
  }

  card.innerHTML = `
    <div class="card__row">
      <h3>${escapeHtml(lote.nombreProducto)}</h3>
      <span class="badge badge--neutral">Por catalogar</span>
    </div>
    <div class="card__row"><span class="muted">Cantidad</span><strong>${target}</strong></div>
    <div class="card__row"><span class="muted">Precio total (inversión)</span><strong>${moneda(lote.inversion)}</strong></div>
    <div class="card__row"><span class="muted">Precio por producto</span><strong id="g-costo">${moneda(precioPorProducto)}</strong></div>

    <div class="field">
      <label for="tl-${lote.id}">Tipo de Lote</label>
      <select id="tl-${lote.id}" class="select tl-select">
        <option value="" disabled selected>Elige el tipo de lote</option>
        ${tipoLotes.map((t) => `<option value="${t.id}">${escapeHtml(t.nombre)}</option>`).join('')}
        <option value="__new">➕ Crear nuevo tipo de lote</option>
      </select>
    </div>
    <div class="field tl-new hidden">
      <label>Nombre del nuevo tipo de lote</label>
      <input class="input tl-name" placeholder="Ej. Calcetas" />
    </div>

    <div id="arts" class="stack"></div>

    <div class="card" style="background:var(--c-surface-2)">
      <div class="card__row" style="margin-bottom:8px"><span class="card__title">＋ Agregar artículo</span></div>
      <div class="field"><input class="input a-desc" list="dl-${lote.id}" placeholder="Descripción (ej. Calceta reno)" autocomplete="off" /></div>
      <datalist id="dl-${lote.id}"></datalist>
      <div style="display:flex;gap:8px">
        <div class="field" style="flex:1"><label>Cantidad</label><input class="input a-cant" type="number" inputmode="numeric" min="1" step="1" placeholder="1" /></div>
        <div class="field" style="flex:1"><label>Precio sugerido</label><input class="input a-precio" type="number" inputmode="decimal" min="0" step="0.01" placeholder="0.00" /></div>
      </div>
      <label style="display:flex;align-items:center;gap:8px;font-size:14px"><input class="a-merma" type="checkbox" /> Merma (precio $0, no vendible)</label>
      <button class="btn btn--primary btn--block a-add" type="button" style="margin-top:8px">Agregar</button>
    </div>

    <div class="card__row">
      <span class="muted">Ganancia estimada</span>
      <strong id="g-est">${moneda(0)}</strong>
    </div>
    <div class="card__row"><span class="muted">Catalogado</span><strong id="g-sum">0 / ${target}</strong></div>

    <button class="btn btn--accent btn--block btn--lg f-finalizar" type="button">Finalizar lote</button>
  `;

  const artsEl = card.querySelector('#arts');
  const gEst = card.querySelector('#g-est');
  const gSum = card.querySelector('#g-sum');
  const gCosto = card.querySelector('#g-costo');

  function recalc() {
    const vend = cantidadVendible(articulos);
    const total = articulos.reduce((a, x) => a + (Number(x.cantidad) || 0), 0);
    gSum.textContent = `${total} / ${target}`;
    gEst.textContent = moneda(gananciaEstimada(articulos, lote.inversion));
    gCosto.textContent = moneda(costoUnitarioLote(lote.inversion, vend > 0 ? vend : target));
  }

  function renderArts() {
    if (!articulos.length) {
      artsEl.innerHTML = `<p class="muted">Sin artículos todavía.</p>`;
      recalc();
      return;
    }
    artsEl.innerHTML = articulos
      .map(
        (a, i) => `
      <div class="card__row" data-i="${i}" style="padding:8px 0;border-bottom:1px solid var(--c-border)">
        <div class="list-item__body">
          <div class="list-item__title" style="font-size:14px">${escapeHtml(a.descripcion)}${a.esMerma ? ' · 🗑️ merma' : ''}</div>
          <div class="list-item__subtitle">${a.cantidad} × ${moneda(a.precioSugerido)}</div>
        </div>
        <button type="button" class="btn btn--icon art-del" aria-label="Quitar">✕</button>
      </div>`
      )
      .join('');
    artsEl.querySelectorAll('.art-del').forEach((btn) =>
      btn.addEventListener('click', () => {
        articulos.splice(Number(btn.closest('.card__row').dataset.i), 1);
        renderArts();
      })
    );
    recalc();
  }
  renderArts();

  card.querySelector('.a-add').addEventListener('click', () => {
    const desc = card.querySelector('.a-desc').value.trim();
    const precio = aNumero(card.querySelector('.a-precio').value);
    const cant = aNumero(card.querySelector('.a-cant').value);
    const merma = card.querySelector('.a-merma').checked;

    if (!desc) return toast('Ingresá la descripción', 'error');
    if (articulos.some((a) => a.descripcion.toLowerCase() === desc.toLowerCase())) {
      return toast('La descripción ya existe en este lote', 'error');
    }
    if (cant <= 0) return toast('Cantidad debe ser mayor a 0', 'error');
    if (merma && precio !== 0) return toast('La merma debe tener precio $0', 'error');
    if (!merma && precio < 0) return toast('Precio inválido', 'error');

    articulos.push({ descripcion: desc, precioSugerido: merma ? 0 : precio, cantidad: cant, esMerma: merma });
    card.querySelector('.a-desc').value = '';
    card.querySelector('.a-precio').value = '';
    card.querySelector('.a-cant').value = '';
    card.querySelector('.a-merma').checked = false;
    renderArts();
  });

  // mostrar/ocultar campo de nuevo tipo de lote + actualizar sugerencias
  const tlSelect = card.querySelector('.tl-select');
  const tlNew = card.querySelector('.tl-new');
  const datalist = card.querySelector(`#dl-${lote.id}`);

  function actualizarSugerencias() {
    const map = descPorTipo.get(tlSelect.value);
    datalist.innerHTML = map ? [...map.keys()].map((d) => `<option value="${escapeHtml(d)}"></option>`).join('') : '';
  }

  tlSelect.addEventListener('change', () => {
    tlNew.classList.toggle('hidden', tlSelect.value !== '__new');
    actualizarSugerencias();
  });

  // sugerencia de precio al escribir una descripción existente
  card.querySelector('.a-desc').addEventListener('input', () => {
    const precioInput = card.querySelector('.a-precio');
    const key = card.querySelector('.a-desc').value.trim().toLowerCase();
    const map = descPorTipo.get(tlSelect.value);
    const precio = map && map.get(key);
    if (precio != null && !precioInput.value) {
      precioInput.value = precio;
    }
  });

  card.querySelector('.f-finalizar').addEventListener('click', async () => {
    if (!articulos.length) return toast('Agregá al menos un artículo', 'error');

    const totalCatalogado = articulos.reduce((a, x) => a + (Number(x.cantidad) || 0), 0);
    if (totalCatalogado < target) {
      const ok = await confirmar({
        titulo: 'Productos faltantes',
        mensaje: `Faltan ${target - totalCatalogado} producto(s) para completar el lote. ¿Desea marcarlos como faltantes?`,
        textoConfirmar: 'Marcar faltantes',
        textoCancelar: 'Seguir catalogando',
      });
      if (!ok) return;
    }

    const ganEst = gananciaEstimada(articulos, lote.inversion);
    if (ganEst < 0) {
      const ok = await confirmar({
        titulo: 'Ganancia estimada negativa',
        mensaje: `La ganancia estimada es ${moneda(ganEst)}. ¿Desea continuar de todos modos?`,
        textoConfirmar: 'Continuar',
        textoCancelar: 'Ajustar',
      });
      if (!ok) return;
    }

    // resolver tipo de lote
    let tipoLoteId = tlSelect.value;
    if (!tipoLoteId) return toast('Elegí el tipo de lote', 'error');
    if (tipoLoteId === '__new') {
      const nombre = card.querySelector('.tl-name').value.trim();
      if (!nombre) return toast('Ingresá el nombre del tipo de lote', 'error');
      tipoLoteId = await resolverTipoLote(nombre);
    }

    const costoUnitario = costoUnitarioLote(lote.inversion, cantidadVendible(articulos));

    // homologación de precio: si un artículo existente cambió de precio, actualizar solo los que tienen stock
    const tipoMap = descPorTipo.get(tipoLoteId);
    if (tipoMap) {
      const porDesc = new Map();
      for (const a of articulosExistentes) {
        if (a.tipoLoteId !== tipoLoteId) continue;
        const key = (a.descripcion || '').trim().toLowerCase();
        if (!porDesc.has(key)) porDesc.set(key, []);
        porDesc.get(key).push(a);
      }
      const aTocar = [];
      for (const art of articulos) {
        if (art.esMerma) continue;
        const key = art.descripcion.toLowerCase();
        const precioActual = tipoMap.get(key);
        if (precioActual != null && Number(art.precioSugerido) !== precioActual) {
          for (const a of porDesc.get(key) || []) {
            if ((Number(a.stock) || 0) > 0) {
              a.precioSugerido = Number(art.precioSugerido);
              a.actualizadoEn = new Date().toISOString();
              aTocar.push(a);
            }
          }
        }
      }
      if (aTocar.length) await bulkPut('articulos', aTocar);
    }

    await guardarArticulos(lote.id, tipoLoteId, articulos, costoUnitario);

    lote.catalogado = true;
    lote.tipoLoteId = tipoLoteId;
    lote.actualizadoEn = new Date().toISOString();
    await put('lotes', lote);

    // bloquear compra si ya no quedan lotes catalogables
    const restantes = (await getAllByIndex('lotes', 'compraId', compra.id)).filter(esCatalogable);
    if (!restantes.length) {
      compra.bloqueada = true;
      compra.actualizadoEn = new Date().toISOString();
      await put('compras', compra);
    }

    toast(`Lote "${lote.nombreProducto}" catalogado`, 'success');
    navigate('/catalogar');
  });

  return card;
}

async function resolverTipoLote(nombre) {
  const limpio = nombre.trim();
  const existente = await getByIndex('tipoLotes', 'nombre', limpio);
  if (existente) return existente.id;
  const ahora = new Date().toISOString();
  const id = uid('tl');
  await put('tipoLotes', { id, nombre: limpio, status: 'en_venta', creadoEn: ahora, actualizadoEn: ahora });
  return id;
}

async function guardarArticulos(loteId, tipoLoteId, articulos, costoUnitario) {
  const ahora = new Date().toISOString();
  // Los artículos se guardan SEPARADOS por lote para permitir consumo FIFO
  // (el más antiguo primero) en Venta. La fusión por descripción se hace en la vista.
  for (const a of articulos) {
    await put('articulos', {
      id: uid('art'),
      loteId,
      tipoLoteId,
      descripcion: a.descripcion,
      cantidad: a.cantidad,
      stock: a.cantidad,
      precioSugerido: a.precioSugerido,
      costoUnitario,
      esMerma: a.esMerma,
      esRemanente: false,
      creadoEn: ahora,
      actualizadoEn: ahora,
    });
  }
}
