// Tests deterministas de las funciones puras del dominio (Sprint 1).
import assert from 'node:assert/strict';
import {
  prorratearEnvio,
  inversionLote,
  costoUnitarioLote,
  cantidadVendible,
  costoPromedioPonderado,
  ventasTotales,
  subtotalLinea,
  totalVenta,
  calcularCambio,
  gananciaEstimada,
  metricasTipoLote,
  totalCompra,
  agruparPorDescripcion,
  distribuirDescuento,
} from '../Codigo/js/negocio.js';
import { uid, aISO, moneda, redondear, aNumero, escapeHtml } from '../Codigo/js/utils.js';

let passed = 0;
let failed = 0;

function t(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failed++;
    console.error(`  ✗ ${name}\n    ${e.message}`);
  }
}

console.log('\nnegocio.js');
t('prorratearEnvio proporcional', () => {
  assert.deepEqual(prorratearEnvio(100, [{ costo: 50 }, { costo: 50 }]), [50, 50]);
  assert.deepEqual(prorratearEnvio(100, [{ costo: 25 }, { costo: 75 }]), [25, 75]);
});
t('prorratearEnvio reparto equitativo cuando suma 0', () => {
  assert.deepEqual(prorratearEnvio(30, [{ costo: 0 }, { costo: 0 }, { costo: 0 }]), [10, 10, 10]);
});
t('prorratearEnvio lote único y vacío', () => {
  assert.deepEqual(prorratearEnvio(100, [{ costo: 10 }]), [100]);
  assert.deepEqual(prorratearEnvio(100, []), []);
});
t('inversionLote (reembolsado = 0)', () => {
  assert.equal(inversionLote({ costo: 100, envioProrrateado: 10 }), 110);
  assert.equal(inversionLote({ costo: 100, envioProrrateado: 10, subEstado: 'reembolsado' }), 0);
  assert.equal(inversionLote({ costo: 100, subEstado: 'devuelto' }), 100);
});
t('costoUnitarioLote (y guarda de división por 0)', () => {
  assert.equal(costoUnitarioLote(110, 10), 11);
  assert.equal(costoUnitarioLote(110, 0), 0);
});
t('cantidadVendible excluye merma', () => {
  assert.equal(
    cantidadVendible([
      { cantidad: 5, esMerma: false },
      { cantidad: 3, esMerma: true },
      { cantidad: 2, esMerma: false },
    ]),
    7
  );
});
t('costoPromedioPonderado', () => {
  assert.equal(costoPromedioPonderado(1000, 100), 10);
  assert.equal(costoPromedioPonderado(1000, 0), 0);
});
t('ventasTotales desde subtotalLinea', () => {
  assert.equal(ventasTotales([{ subtotalLinea: 100 }, { subtotalLinea: 50.5 }]), 150.5);
  assert.equal(ventasTotales([]), 0);
});
t('subtotalLinea', () => {
  assert.equal(subtotalLinea(12.5, 3), 37.5);
});
t('totalVenta (nunca negativo)', () => {
  assert.equal(totalVenta(100, 30), 70);
  assert.equal(totalVenta(20, 30), 0);
});
t('calcularCambio', () => {
  assert.equal(calcularCambio(100, 70), 30);
  assert.equal(calcularCambio(50, 70), 0);
});
t('gananciaEstimada (merma no cuenta)', () => {
  assert.equal(
    gananciaEstimada(
      [
        { precioSugerido: 20, stock: 2, esMerma: false },
        { precioSugerido: 0, stock: 5, esMerma: true },
      ],
      10
    ),
    30
  );
});
t('metricasTipoLote consolidadas', () => {
  const m = metricasTipoLote({
    inversionTotal: 1000,
    cantidadVendibleTotal: 100,
    ventasTotales: 600,
    articulos: [{ precioSugerido: 15, stock: 50, esMerma: false }],
  });
  assert.equal(m.costoPromedio, 10);
  assert.equal(m.pendiente, 400);
  assert.equal(m.ganancia, -400);
  assert.equal(m.gananciaEstimada, -250);
});
t('totalCompra (Σ costo lotes + envío)', () => {
  assert.equal(totalCompra([{ costo: 100 }, { costo: 50 }], 10), 160);
  assert.equal(totalCompra([], 0), 0);
  assert.equal(totalCompra(null, 25), 25);
});
t('agruparPorDescripcion suma stock y fusiona mayúsculas', () => {
  const g = agruparPorDescripcion([
    { id: 'a', descripcion: 'Calceta reno', stock: 3, cantidad: 5, precioSugerido: 50, esMerma: false },
    { id: 'b', descripcion: 'calceta RENO', stock: 2, cantidad: 5, precioSugerido: 50, esMerma: false },
    { id: 'c', descripcion: 'Merma', stock: 1, cantidad: 1, precioSugerido: 0, esMerma: true },
  ]);
  assert.equal(g.length, 2);
  const calceta = g.find((x) => x.descripcion === 'Calceta reno');
  assert.equal(calceta.stock, 5);
  assert.equal(calceta.ids.length, 2);
});
t('distribuirDescuento reparte y suma exacto', () => {
  const r = distribuirDescuento([{ subtotal: 50 }, { subtotal: 30 }, { subtotal: 20 }], 10);
  assert.equal(r[0].subtotalLinea, 45); // 50 - 5
  assert.equal(r[1].subtotalLinea, 27); // 30 - 3
  assert.equal(r[2].subtotalLinea, 18); // 20 - 2 (absorbe redondeo)
  assert.equal(r.reduce((a, l) => a + l.descuentoLinea, 0), 10);
});
t('distribuirDescuento sin subtotal no divide por 0', () => {
  const r = distribuirDescuento([{ subtotal: 0 }], 10);
  assert.equal(r[0].subtotalLinea, 0);
});

console.log('\nutils.js');
t('uid con prefijo y único', () => {
  const a = uid('compra');
  const b = uid('compra');
  assert.ok(a.startsWith('compra_'));
  assert.notEqual(a, b);
});
t('aISO formato YYYY-MM-DD', () => {
  assert.equal(aISO(new Date(2024, 0, 5)), '2024-01-05');
  assert.equal(aISO(new Date(2024, 11, 25)), '2024-12-25');
});
t('moneda MXN con centavos', () => {
  assert.ok(moneda(1234.5).includes('234.50'));
  assert.ok(moneda(0).includes('0.00'));
});
t('redondear a 2 decimales', () => {
  assert.equal(redondear(1.234), 1.23);
  assert.equal(redondear(1.235), 1.24);
});
t('aNumero parsea y falla a 0', () => {
  assert.equal(aNumero('1,234.50'), 1234.5);
  assert.equal(aNumero('$50'), 50);
  assert.equal(aNumero('abc'), 0);
  assert.equal(aNumero(''), 0);
});
t('escapeHtml neutraliza caracteres', () => {
  assert.equal(escapeHtml('<a href="x">&\'</a>'), '&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;');
  assert.equal(escapeHtml(null), '');
});

console.log(`\n${passed} ok, ${failed} fallaron`);
if (failed > 0) process.exit(1);
