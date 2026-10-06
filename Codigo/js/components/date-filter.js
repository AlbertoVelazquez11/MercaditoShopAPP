// components/date-filter.js — filtro por rango de fechas.
import { hoyISO } from '../utils.js';

/**
 * Crea un filtro de rango de fechas (desde / hasta).
 * @param {HTMLElement} container
 * @param {{desde?:string, hasta?:string, onChange?:Function}} opts
 * @returns {{getValues:Function, desde:HTMLInputElement, hasta:HTMLInputElement}}
 */
export function dateFilter(container, { desde = hoyISO(), hasta = hoyISO(), onChange } = {}) {
  const div = document.createElement('div');
  div.className = 'date-filter';

  const title = document.createElement('div');
  title.className = 'date-filter__title';
  title.textContent = 'Filtrar por fecha';

  const fieldDesde = document.createElement('label');
  fieldDesde.className = 'date-filter__field';
  const labelDesde = document.createElement('span');
  labelDesde.className = 'date-filter__label';
  labelDesde.textContent = 'Desde';
  const desdeInput = document.createElement('input');
  desdeInput.type = 'date';
  desdeInput.className = 'input';
  desdeInput.value = desde;
  fieldDesde.append(labelDesde, desdeInput);

  const fieldHasta = document.createElement('label');
  fieldHasta.className = 'date-filter__field';
  const labelHasta = document.createElement('span');
  labelHasta.className = 'date-filter__label';
  labelHasta.textContent = 'Hasta';
  const hastaInput = document.createElement('input');
  hastaInput.type = 'date';
  hastaInput.className = 'input';
  hastaInput.value = hasta;
  fieldHasta.append(labelHasta, hastaInput);

  const emit = () => onChange && onChange({ desde: desdeInput.value, hasta: hastaInput.value });
  desdeInput.addEventListener('change', emit);
  hastaInput.addEventListener('change', emit);

  div.append(title, fieldDesde, fieldHasta);
  container.appendChild(div);

  return {
    desde: desdeInput,
    hasta: hastaInput,
    getValues: () => ({ desde: desdeInput.value, hasta: hastaInput.value }),
  };
}
