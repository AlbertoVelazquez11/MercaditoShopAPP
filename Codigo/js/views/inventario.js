// views/inventario.js — inventario agrupado por tipo de lote (Sprint 4).
import { header } from '../components/header.js';
import { getAll } from '../db.js';
import { moneda, escapeHtml } from '../utils.js';
import { inversionTotalLotes, cantidadVendible, metricasTipoLote } from '../negocio.js';

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
      return `
      <div class="card stack">
        <div class="card__row">
          <h3>${escapeHtml(g.tipo.nombre)}</h3>
          <a class="badge badge--primary" href="#/tipo-lotes?id=${g.tipo.id}">Detalle</a>
        </div>
        <div class="card__row"><span class="muted">Costo por unidad</span><strong>${moneda(m.costoPromedio)}</strong></div>
        <div class="card__row"><span class="muted">Inversión por recuperar</span><strong>${moneda(m.pendiente)}</strong></div>
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
      </div>`;
    })
    .join('');
}
