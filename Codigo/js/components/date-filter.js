// components/date-filter.js — filtro por rango de fechas.
/**
 * Crea un filtro de rango de fechas (desde / hasta).
 * @param {HTMLElement} container
 * @param {{desde?:string, hasta?:string, onChange?:Function}} opts
 * @returns {{getValues:Function, desde:HTMLInputElement, hasta:HTMLInputElement}}
 */
export function dateFilter(container, { desde = '', hasta = '', onChange } = {}) {
  const div = document.createElement('div');
  div.className = 'date-filter';

  const desdeInput = document.createElement('input');
  desdeInput.type = 'date';
  desdeInput.className = 'input';
  desdeInput.value = desde;
  desdeInput.setAttribute('aria-label', 'Desde');

  const hastaInput = document.createElement('input');
  hastaInput.type = 'date';
  hastaInput.className = 'input';
  hastaInput.value = hasta;
  hastaInput.setAttribute('aria-label', 'Hasta');

  const emit = () => onChange && onChange({ desde: desdeInput.value, hasta: hastaInput.value });
  desdeInput.addEventListener('change', emit);
  hastaInput.addEventListener('change', emit);

  div.append(desdeInput, hastaInput);
  container.appendChild(div);

  return {
    desde: desdeInput,
    hasta: hastaInput,
    getValues: () => ({ desde: desdeInput.value, hasta: hastaInput.value }),
  };
}
