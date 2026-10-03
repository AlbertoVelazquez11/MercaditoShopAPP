# FASE 4: Plan de Trabajo por Sprints

> Misma dinámica de TamalitosAPP: sprints incrementales, cada uno con entregable funcional y verificable offline.

---

## Resumen de sprints

| Sprint | Alcance | Entregable |
|---|---|---|
| 1 | Core PWA: shell, esquema DB, router, store, Home, Config | App navegable con persistencia |
| 2 | Compras y Lotes | CRUD compras, estatus, recepción parcial, bloqueo/desbloqueo |
| 3 | Catalogar | Catalogación de lotes recibidos → artículos + inventario |
| 4 | Tipo de Lote e Inventario | Agrupación, métricas, combinar/descombinar |
| 5 | Venta (POS) | Ventas, descuento, reducción de stock, cancelación |
| 6 | Descuentos y Corte | Asignación de descuentos mixtos + cierre de lotes |
| 7 | Exportación, QA y lanzamiento | CSV/JSON, pulido iOS, deploy, documentación |

---

## Sprint 1 — Core PWA y Shell

**Objetivo:** base técnica reutilizada de TamalitosAPP + pantalla de inicio y configuración.

- [ ] `Codigo/` base: `index.html`, `manifest.json`, `sw.js`, `css/`, `js/` (app, router, store, db, utils, export, gestures).
- [ ] Esquema IndexedDB `MercaditoShop` v1 con todos los object stores e índices.
- [ ] Módulo `negocio.js` con funciones de cálculo (prorrateo, costos, métricas).
- [ ] Home con logo + botones Venta/Administración + engrane.
- [ ] Hub de Administración con accesos a los 6 módulos.
- [ ] Configuración: nombre, logo, tema (localStorage).
- [ ] Componentes base: header, modal, toast, swipe-item, date-filter.

**Criterio de salida:** la app abre offline, navega a todas las rutas vacías y guarda configuración.

---

## Sprint 2 — Compras y Lotes

**Objetivo:** registrar compras con 1..N lotes y gestionar su ciclo de vida.

- [ ] Lista de compras (fecha, proveedor, estatus, total).
- [ ] Formulario de compra: fecha, proveedor (autocompletar), costo de envío, lotes dinámicos (nombre, cantidad, costo).
- [ ] Cálculo de envío prorrateado e inversión por lote.
- [ ] Gestión de estatus libre: Solicitada → Pagada → En camino → Recibida / Cancelada-Devuelta.
- [ ] Recepción parcial: `cantidadRecibida` + sub-estado por lote (No llegó / Devuelto / Reembolsado).
- [ ] Regla: solo Reembolsado descuenta la inversión del lote.
- [ ] Bloqueo tras catalogar + desbloqueo con confirmación.
- [ ] Validaciones (proveedor, al menos 1 lote, montos ≥ 0).

**Criterio de salida:** se puede registrar y administrar una compra completa de extremo a extremo.

---

## Sprint 3 — Catalogar

**Objetivo:** convertir lotes recibidos en artículos con precio sugerido e inventario.

- [ ] Listar compras recibidas (completa o parcial) pendientes de catalogar.
- [ ] Solo lotes recibidos son catalogables.
- [ ] Cabecera de lote: tipo de producto, cantidad, precio total, precio por producto.
- [ ] Agregar registros: descripción (validar unicidad en el tipo de lote), precio sugerido, cantidad.
- [ ] Merma: precio sugerido $0, no vendible.
- [ ] Excedente: se permite y reparte el costo.
- [ ] Finalizar con faltante: alerta de confirmación, reduce total y recalcula costo unitario.
- [ ] Estimación de ganancia en vivo al catalogar.
- [ ] Asignar/crear Tipo de Lote al finalizar cada lote.
- [ ] Crear artículos en inventario y bloquear compra.

**Criterio de salida:** un lote recibido queda catalogado y disponible en inventario.

---

## Sprint 4 — Tipo de Lote e Inventario

**Objetivo:** agrupar artículos y monitorear recuperación de inversión.

- [ ] CRUD de tipos de lote (nombre, status: En Venta / Vendido / Almacenado).
- [ ] Inventario agrupado por tipo de lote: encabezado (nombre, costo por unidad, inversión pendiente, ganancia estimada) + listado de artículos (existencia, precio sugerido).
- [ ] Métricas derivadas con `negocio.js` (inversión total, costo promedio ponderado, pendiente, ganancia).
- [ ] Combinar: asignar más lotes al mismo tipo de lote → suma de inversión, ventas, stock; artículos con misma descripción se fusionan.
- [ ] Descombinar: atribuir ventas al lote más antiguo (FIFO) y mostrar por lote.
- [ ] Status "Almacenado" oculta el tipo de lote de Venta.

**Criterio de salida:** el inventario refleja correctamente inversión, stock y recuperación por tipo de lote.

---

## Sprint 5 — Venta (POS)

**Objetivo:** vender con descuento y reducir inventario por artículo.

- [ ] Pantalla de Venta con artículos agrupados por tipo de lote activo.
- [ ] Mostrar precio sugerido y existencia; ocultar agotados y merma.
- [ ] Comanda con cantidades, subtotales y total.
- [ ] Cobro: descuento por ticket (monto fijo), método de pago, pago con y cambio.
- [ ] Detección de venta mixta vs un solo lote.
- [ ] Descuento de un solo lote → asignación automática; mixta → pendiente.
- [ ] Reducción de stock por artículo específico (FIFO por lote más antiguo).
- [ ] Snapshot de precio y costo unitario por línea.
- [ ] Cancelación de venta con restauración de stock.
- [ ] Indicador de recuperación general y por lote en el resumen.

**Criterio de salida:** se completa una venta y el inventario/inversión se actualizan consistentemente.

---

## Sprint 6 — Descuentos y Corte

**Objetivo:** cerrar el ciclo financiero de los lotes.

- [ ] Módulo Descuentos: listar ventas mixtas con descuento pendiente.
- [ ] Asignar descuento a tipo de lote / artículo y recalcular cuentas (con auditoría).
- [ ] Módulo Corte: seleccionar tipo de lote y confirmar cierre.
- [ ] Guardar histórico (inversión, recuperación, ganancia, vendidos, restantes).
- [ ] Generar nuevo tipo de lote remanente con inversión 0 y costo unitario informativo.
- [ ] Estado "cerrado" para el tipo de lote original.
- [ ] Almacenar/reactivar remanente desde Tipo de Lote.

**Criterio de salida:** un tipo de lote puede cerrarse y su remanente reinicia en cero.

---

## Sprint 7 — Exportación, QA y Lanzamiento

**Objetivo:** respaldo, robustez y despliegue.

- [ ] Exportación CSV (compras, inventario, ventas, cortes).
- [ ] Respaldo/restauración JSON completo (todas las tablas).
- [ ] Validación de importación con resumen y confirmación.
- [ ] Auditoría iOS: standalone, safe areas, sin zoom en inputs, offline real.
- [ ] Pruebas de consistencia: venta→stock, cancelación→stock, descuento→cuentas, corte→remanente.
- [ ] Iconos y manifest correctos (instalación en inicio).
- [ ] Despliegue en Vercel.
- [ ] Documentación final (README + fases).

**Criterio de salida:** versión 1.0.0 instalable, offline y con respaldo.

---

## Trazabilidad (módulos ↔ historias ↔ sprints)

| Módulo | HUs | Sprints |
|---|---|---|
| PWA/Shell | HU-001, HU-002 | 1 |
| Inicio/Config | HU-010, HU-011, HU-012 | 1, 7 |
| Compras | HU-020…HU-023 | 2 |
| Catalogar | HU-030…HU-035 | 3 |
| Inventario/Tipo Lote | HU-040…HU-043 | 4 |
| Venta | HU-050…HU-054 | 5 |
| Descuentos | HU-060, HU-061 | 6 |
| Corte | HU-070, HU-071 | 6 |
| Indicador recuperación | HU-080 | 4, 5, 6 |

---

## Riesgos y notas

1. **Promedio ponderado vs FIFO:** costo = promedio ponderado; consumo de stock = FIFO. Ambos deben implementarse sin mezclarse en `negocio.js`.
2. **Unicidad de descripción:** debe validarse a nivel de Tipo de Lote (no global), clave de fusión de artículos.
3. **Corte con remanente:** el remanente usa `loteId = null` + `esRemanente = true` para no arrastrar inversión.
4. **Descuento mixto:** mantener `descuentoAsignado` para no recalcular mal hasta que el usuario lo asigne.
5. **Reembolso:** es la única vía que reduce inversión de un lote; documentar en UI para evitar confusiones.
