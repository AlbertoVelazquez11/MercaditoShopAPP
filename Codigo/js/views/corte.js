// views/corte.js — cierre de tipo de lote con histórico y remanente (Sprint 6).
import { header } from '../components/header.js';
import { toast } from '../components/toast.js';
import { confirmar } from '../components/modal.js';
import { getAll, get, put, bulkPut, getAllByIndex } from '../db.js';
import { uid, hoyISO, moneda, escapeHtml } from '../utils.js';
import { inversionTotalLotes, metricasTipoLote } from '../negocio.js';
import { navigate } from '../router.js';

export const corte = {
  title: 'Corte',
  render(container) {
    return renderLista(container);
  },
};

async function renderLista(container) {
  header(container, 'Corte', { back: true });
  const view = document.createElement('div');
  view.className = 'view';
  view.innerHTML = `<div id="corte-lista" class="stack"></div>`;
  container.appendChild(view);

  const cont = view.querySelector('#corte-lista');
  const [tipoLotes, lotes, articulos, detalles] = await Promise.all([
    getAll('tipoLotes'),
    getAll('lotes'),
    getAll('articulos'),
    getAll('detalleVenta'),
  ]);

  const lotesPorTipo = new Map();
  for (const l of lotes) {
    if (!lotesPorTipo.has(l.tipoLoteId)) lotesPorTipo.set(l.tipoLoteId, []);
    lotesPorTipo.get(l.tipoLoteId).push(l);
  }
  const ventasPorTipo = new Map();
  for (const d of detalles) {
    ventasPorTipo.set(d.tipoLoteId, (ventasPorTipo.get(d.tipoLoteId) || 0) + (Number(d.subtotalLinea) || 0));
  }

  const cortables = tipoLotes.filter((t) => t.status !== 'cerrado');

  if (!cortables.length) {
    cont.innerHTML = `<div class="empty"><div class="empty__icon">✂️</div><div class="empty__title">Nada por cortar</div><p>No hay tipos de lote activos para cerrar.</p></div>`;
    return;
  }

  cont.innerHTML = cortables
    .map((t) => {
      const arts = articulos.filter((a) => a.tipoLoteId === t.id);
      const m = metricasTipoLote({
        inversionTotal: inversionTotalLotes(lotesPorTipo.get(t.id) || []),
        cantidadVendibleTotal: arts.filter((a) => !a.esMerma).reduce((a, x) => a + (Number(x.cantidad) || 0), 0),
        ventasTotales: ventasPorTipo.get(t.id) || 0,
        articulos: arts,
      });
      return `
      <div class="card stack">
        <div class="card__row"><h3>${escapeHtml(t.nombre)}</h3></div>
        <div class="card__row"><span class="muted">Inversión</span><strong>${moneda(m.inversionTotal)}</strong></div>
        <div class="card__row"><span class="muted">Recuperado</span><strong>${moneda(m.ventasTotales)}</strong></div>
        <div class="card__row"><span class="muted">${m.ganancia >= 0 ? 'Ganancia' : 'Por recuperar'}</span><strong>${moneda(Math.abs(m.ganancia >= 0 ? m.ganancia : m.pendiente))}</strong></div>
        <button class="btn btn--danger btn--block corte-btn" data-id="${t.id}" data-nombre="${escapeHtml(t.nombre)}" type="button">✂️ Cortar (cierre de temporada)</button>
      </div>`;
    })
    .join('');

  cont.querySelectorAll('.corte-btn').forEach((btn) =>
    btn.addEventListener('click', async () => {
      const ok = await confirmar({
        titulo: 'Cortar tipo de lote',
        mensaje: `Cerrarás “${btn.dataset.nombre}”. Es irreversible: quedará histórico y el remanente reiniciará con inversión 0.`,
        textoConfirmar: 'Cortar',
        peligroso: true,
      });
      if (!ok) return;
      await performCorte(btn.dataset.id);
      toast('Corte realizado', 'success');
      navigate('/corte');
    })
  );
}

async function performCorte(tipoLoteId) {
  const tipo = await get('tipoLotes', tipoLoteId);
  const [lotes, articulos, detalles] = await Promise.all([
    getAllByIndex('lotes', 'tipoLoteId', tipoLoteId),
    getAllByIndex('articulos', 'tipoLoteId', tipoLoteId),
    getAll('detalleVenta'),
  ]);

  const inversion = inversionTotalLotes(lotes);
  const ventas = detalles
    .filter((d) => d.tipoLoteId === tipoLoteId)
    .reduce((a, d) => a + (Number(d.subtotalLinea) || 0), 0);
  const ganancia = ventas - inversion;

  const vendibles = articulos.filter((a) => !a.esMerma);
  const productosRestantes = vendibles.reduce((a, x) => a + (Number(x.stock) || 0), 0);
  const productosVendidos = vendibles.reduce((a, x) => a + (Number(x.cantidad) || 0), 0) - productosRestantes;

  const ahora = new Date().toISOString();
  const fechaCorte = hoyISO();

  // remanente: nuevo tipo de lote con artículos restantes (inversión 0)
  let nuevoTipoLoteId = null;
  const remanentes = vendibles.filter((a) => (Number(a.stock) || 0) > 0);
  if (remanentes.length) {
    nuevoTipoLoteId = uid('tl');
    await put('tipoLotes', {
      id: nuevoTipoLoteId,
      nombre: tipo.nombre,
      status: 'almacenado',
      creadoEn: ahora,
      actualizadoEn: ahora,
    });
    await bulkPut(
      'articulos',
      remanentes.map((a) => ({
        id: uid('art'),
        loteId: null,
        tipoLoteId: nuevoTipoLoteId,
        descripcion: a.descripcion,
        cantidad: a.stock,
        stock: a.stock,
        precioSugerido: a.precioSugerido,
        costoUnitario: a.costoUnitario, // informativo
        esMerma: false,
        esRemanente: true,
        creadoEn: ahora,
        actualizadoEn: ahora,
      }))
    );
  }

  // histórico
  await put('cortes', {
    id: uid('corte'),
    tipoLoteId,
    nombreTipoLote: tipo.nombre,
    nuevoTipoLoteId,
    fecha: fechaCorte,
    inversion,
    ventas,
    ganancia,
    productosVendidos,
    productosRestantes,
    detalle: remanentes.map((a) => ({ descripcion: a.descripcion, stock: a.stock, precioSugerido: a.precioSugerido })),
    creadoEn: ahora,
  });

  // cerrar original
  tipo.status = 'cerrado';
  tipo.actualizadoEn = ahora;
  await put('tipoLotes', tipo);
}
