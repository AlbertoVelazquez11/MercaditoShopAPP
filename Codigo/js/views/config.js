// views/config.js — configuración: nombre, logo, tema y respaldo de datos.
import { header } from '../components/header.js';
import { toast } from '../components/toast.js';
import { confirmar } from '../components/modal.js';
import { cargarConfig, guardarConfig } from '../store.js';
import { escapeHtml, hoyISO } from '../utils.js';
import { respaldarJSON, importarRespaldo, descargarCSV } from '../export.js';
import { getAll } from '../db.js';

export const config = {
  title: 'Configuración',
  render(container) {
    const cfg = cargarConfig();
    header(container, 'Configuración', { back: true, home: false });

    const view = document.createElement('div');
    view.className = 'view';
    view.innerHTML = `
      <section class="card stack">
        <h3>Negocio</h3>
        <div class="field">
          <label for="cfg-nombre">Nombre de la app</label>
          <input id="cfg-nombre" class="input" type="text" value="${escapeHtml(cfg.nombreNegocio)}" maxlength="40" />
        </div>
        <div class="field">
          <label>Logo</label>
          <img id="cfg-logo-preview" class="config__logo" src="${cfg.logo || './icons/logo.png'}" alt="Logo" />
          <input id="cfg-logo-input" type="file" accept="image/*" class="hidden" />
          <div style="display:flex;gap:8px">
            <button id="cfg-logo-btn" class="btn btn--ghost" type="button">Cambiar logo</button>
            <button id="cfg-logo-clear" class="btn btn--ghost" type="button" ${cfg.logo ? '' : 'disabled'}>Quitar</button>
          </div>
        </div>
      </section>

      <section class="card stack">
        <h3>Tema</h3>
        <div class="theme-picker">
          <button type="button" data-tema="light" class="theme-picker__option ${cfg.tema !== 'dark' ? 'is-active' : ''}">☀️ Claro</button>
          <button type="button" data-tema="dark" class="theme-picker__option ${cfg.tema === 'dark' ? 'is-active' : ''}">🌙 Oscuro</button>
        </div>
      </section>

      <section class="card stack">
        <h3>Datos</h3>
        <p>Respalda o restaura toda la información de la app.</p>
        <button id="cfg-backup" class="btn btn--ghost btn--block" type="button">⬇️ Respaldar (JSON)</button>
        <button id="cfg-csv" class="btn btn--ghost btn--block" type="button">📄 Exportar inventario (CSV)</button>
        <button id="cfg-csv-compras" class="btn btn--ghost btn--block" type="button">📄 Exportar compras (CSV)</button>
        <button id="cfg-csv-ventas" class="btn btn--ghost btn--block" type="button">📄 Exportar ventas (CSV)</button>
        <button id="cfg-csv-cortes" class="btn btn--ghost btn--block" type="button">📄 Exportar cortes (CSV)</button>
        <input id="cfg-restore-input" type="file" accept="application/json,.json" class="hidden" />
        <button id="cfg-restore" class="btn btn--ghost btn--block" type="button">⬆️ Restaurar respaldo</button>
      </section>

      <p class="muted" style="text-align:center;margin-top:16px">v${escapeHtml(cfg.version)}</p>
    `;
    container.appendChild(view);

    // Nombre
    const nombre = view.querySelector('#cfg-nombre');
    nombre.addEventListener('change', () => {
      guardarConfig({ nombreNegocio: nombre.value.trim() || 'Mercadito Shop' });
      toast('Nombre guardado', 'success');
    });

    // Tema
    view.querySelectorAll('.theme-picker__option').forEach((b) =>
      b.addEventListener('click', () => {
        guardarConfig({ tema: b.dataset.tema });
        view.querySelectorAll('.theme-picker__option').forEach((o) => o.classList.toggle('is-active', o === b));
        toast('Tema aplicado', 'success');
      })
    );

    // Logo
    const logoInput = view.querySelector('#cfg-logo-input');
    const logoBtn = view.querySelector('#cfg-logo-btn');
    const logoClear = view.querySelector('#cfg-logo-clear');
    const preview = view.querySelector('#cfg-logo-preview');

    logoBtn.addEventListener('click', () => logoInput.click());
    logoInput.addEventListener('change', () => {
      const file = logoInput.files[0];
      if (!file) return;
      if (!file.type.startsWith('image/')) return toast('Selecciona una imagen', 'error');
      const reader = new FileReader();
      reader.onload = () => {
        guardarConfig({ logo: reader.result });
        preview.src = reader.result;
        logoClear.disabled = false;
        toast('Logo guardado', 'success');
      };
      reader.readAsDataURL(file);
    });
    logoClear.addEventListener('click', () => {
      guardarConfig({ logo: null });
      preview.src = './icons/logo.png';
      logoClear.disabled = true;
      logoInput.value = '';
      toast('Logo restablecido', 'success');
    });

    // Respaldo
    view.querySelector('#cfg-backup').addEventListener('click', async () => {
      try {
        await respaldarJSON();
        guardarConfig({ ultimaExportacion: new Date().toISOString() });
        toast('Respaldo generado', 'success');
      } catch (e) {
        toast('No se pudo generar el respaldo', 'error');
        console.error(e);
      }
    });

    view.querySelector('#cfg-csv').addEventListener('click', async () => {
      const arts = await getAll('articulos');
      if (!arts.length) return toast('Aún no hay artículos para exportar', 'info');
      descargarCSV(
        `inventario-${hoyISO()}.csv`,
        arts,
        [
          { key: 'descripcion', label: 'Descripción' },
          { key: 'cantidad', label: 'Cantidad' },
          { key: 'stock', label: 'Stock' },
          { key: 'precioSugerido', label: 'Precio sugerido' },
          { key: 'costoUnitario', label: 'Costo unitario' },
        ]
      );
      toast('CSV generado', 'success');
    });

    view.querySelector('#cfg-csv-compras').addEventListener('click', async () => {
      const filas = await getAll('compras');
      if (!filas.length) return toast('Aún no hay compras', 'info');
      descargarCSV(`compras-${hoyISO()}.csv`, filas, [
        { key: 'fecha', label: 'Fecha' },
        { key: 'proveedor', label: 'Proveedor' },
        { key: 'estatus', label: 'Estatus' },
        { key: 'costoEnvio', label: 'Envío' },
      ]);
      toast('CSV generado', 'success');
    });

    view.querySelector('#cfg-csv-ventas').addEventListener('click', async () => {
      const filas = await getAll('ventas');
      if (!filas.length) return toast('Aún no hay ventas', 'info');
      descargarCSV(`ventas-${hoyISO()}.csv`, filas, [
        { key: 'fecha', label: 'Fecha' },
        { key: 'hora', label: 'Hora' },
        { key: 'subtotal', label: 'Subtotal' },
        { key: 'descuento', label: 'Descuento' },
        { key: 'total', label: 'Total' },
        { key: 'metodoPago', label: 'Método' },
        { key: 'estado', label: 'Estado' },
      ]);
      toast('CSV generado', 'success');
    });

    view.querySelector('#cfg-csv-cortes').addEventListener('click', async () => {
      const filas = await getAll('cortes');
      if (!filas.length) return toast('Aún no hay cortes', 'info');
      descargarCSV(`cortes-${hoyISO()}.csv`, filas, [
        { key: 'fecha', label: 'Fecha' },
        { key: 'nombreTipoLote', label: 'Tipo de lote' },
        { key: 'inversion', label: 'Inversión' },
        { key: 'ventas', label: 'Ventas' },
        { key: 'ganancia', label: 'Ganancia' },
        { key: 'productosVendidos', label: 'Vendidos' },
        { key: 'productosRestantes', label: 'Restantes' },
      ]);
      toast('CSV generado', 'success');
    });

    // Restaurar
    const restoreInput = view.querySelector('#cfg-restore-input');
    view.querySelector('#cfg-restore').addEventListener('click', () => restoreInput.click());
    restoreInput.addEventListener('change', async () => {
      const file = restoreInput.files[0];
      if (!file) return;
      const ok = await confirmar({
        titulo: 'Restaurar respaldo',
        mensaje: 'Esto reemplazará TODOS los datos actuales. ¿Continuar?',
        textoConfirmar: 'Restaurar',
        peligroso: true,
      });
      if (!ok) {
        restoreInput.value = '';
        return;
      }
      try {
        const resumen = await importarRespaldo(file);
        const total = resumen.reduce((a, r) => a + r.registros, 0);
        toast(`Restaurado: ${total} registros`, 'success');
      } catch (e) {
        toast(e.message || 'No se pudo restaurar', 'error');
      } finally {
        restoreInput.value = '';
      }
    });
  },
};
