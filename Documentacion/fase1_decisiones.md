# FASE 1: Decisiones de Contexto y Resolución de Dudas

> Estado: **Cerrada**. Todas las ambigüedades fueron respondidas y quedan como reglas de negocio definitivas para la construcción.

---

## 1. Contexto del proyecto

PWA offline para control de inventario de mercancía comprada por lotes (mayoreo), con el objetivo principal de **recuperar la inversión** y monitorear cuánto falta por recuperar o cuánta ganancia se ha generado.

- Productos típicos: calcetas, maquillaje variado, etc.
- Compra por **lotes** (mayoreo), catalogación por **artículos**, venta al público con precio sugerido y descuentos.

---

## 2. Resolución de dudas (Q&A)

### A. Modelo de datos y conceptos

| # | Duda | Decisión |
|---|---|---|
| A1 | Nomenclatura de entidades | `Compra → Lotes → Artículos`. El **Artículo** es la unidad clasificada. Un **Lote** es un conjunto de artículos. Un **Lote catalogado** se asigna a un **Tipo de Lote**, que es lo que aparece en Venta cuando está activo. |
| A2 | Identidad del artículo | **Descripción libre**, sin SKU ni foto. **No se permiten descripciones repetidas** dentro del mismo Tipo de Lote. |
| A3 | Costo por unidad con varios lotes | **Promedio ponderado** (inversión total / unidades totales). No FIFO para costo. |
| A4 | Composición de "inversión" | Inversión = Σ costo de lotes recibidos + **envío prorrateado proporcional al costo** del lote. La merma **no incrementa** inversión (se absorbe en el costo unitario). Solo el sub-estado **Reembolsado** descuenta el costo del lote. |
| A5 | Excedente | **Opción A**: el costo del lote se reparte entre todas las unidades encontradas (baja el costo unitario). |

### B. Compras

| # | Duda | Decisión |
|---|---|---|
| B1 | Flujo de estatus | **Libre** (no secuencial estricto). "Recibida" es estado terminal pero editable. "Cancelada/Devuelta" es un único estado de cancelación. |
| B2 | Recepción parcial | Por cada lote: campo `cantidadRecibida` + sub-estado (`No llegó`, `Devuelto`, `Reembolsado`). Solo **Reembolsado** descuenta el costo del lote de la inversión; `No llegó` y `Devuelto` mantienen su costo en la inversión. |
| B3 | Proveedor | Texto libre con **autocompletar** desde proveedores ya usados. |
| B4 | Bloqueo tras catalogar | La compra se bloquea al catalogar, pero **sí se puede desbloquear** (con confirmación) para editar. |

### C. Catalogar

| # | Duda | Decisión |
|---|---|---|
| C1 | "Costo sugerido" vs "Precio sugerido" | Es el **precio de venta sugerido** por artículo. Se unifica el término a **Precio Sugerido**. |
| C2 | Faltante | Al confirmar "marcar como faltantes", la inversión del lote **se mantiene** y solo **sube el costo unitario** (menos unidades para repartir el costo). |
| C3 | Estimación de ganancia | Se muestra **en vivo** al catalogar y se recalcula con merma/faltante/excedente. |
| C4 | Creación de inventario | Al **finalizar cada lote** (no al final de la compra), porque es en ese momento cuando se sabe qué artículos contiene. |

### D. Tipo de Lote / Inventario

| # | Duda | Decisión |
|---|---|---|
| D1 | "Inversión a recuperar" | Se muestran **ambas** (total y pendiente). La **pendiente** es la principal y se muestra en cada lote / tipo de lote. |
| D2 | "Ganancia total estimada" | Potencial si se vende todo al precio sugerido: `venta potencial − inversión`. |
| D3 | Combinar / Descombinar | **Combinar**: varios lotes asignados al mismo Tipo de Lote suman inversión, ventas y stock; artículos con la misma descripción se **fusionan** como uno solo. **Descombinar**: las ventas se restan del **lote más antiguo primero** (FIFO de consumo de inventario). |

### E. Venta

| # | Duda | Decisión |
|---|---|---|
| E1 | Reducción de inventario | Por **artículo específico**; si hay la misma descripción en varios lotes, se consume el **más antiguo primero** (FIFO). |
| E2 | Descuento | **Descuento por ticket (monto fijo)**. Ventas de un solo lote: se asigna automáticamente. Ventas mixtas: queda **pendiente de asignar** y se resuelve en el módulo Descuentos. |
| E3 | Editar/cancelar ventas | **Cancelar** venta restaura stock y la excluye de los cálculos. No se edita precio/cantidad de una venta pasada (se cancela y se rehace). |
| E4 | Método de pago | Sí se registra: `efectivo` / `transferencia`. |

### F. Corte

| # | Duda | Decisión |
|---|---|---|
| F1 | Remanente con inversión 0 | El stock restante se vuelve un nuevo Tipo de Lote con **inversión y ventas en 0** (ganancia = 100% de lo que se venda). El **costo unitario histórico se conserva solo informativo**. |
| F2 | Irreversibilidad | El corte es **irreversible** y queda como registro histórico consultable. |
| F3 | Relación con "Almacenado" | Son **independientes**: el corte genera el lote remanente y el usuario decide si lo almacena o lo deja en venta. |

### G. Descuentos

| # | Duda | Decisión |
|---|---|---|
| G1 | Alcance | Solo ventas **mixtas** con descuento pendiente. Las de un solo lote se asignan automáticamente. |
| G2 | Reasignación | Al reasignar un descuento se **recalculan retroactivamente** ganancia y recuperación, con registro de auditoría (fecha del ajuste). |

### H. Generales

| # | Duda | Decisión |
|---|---|---|
| H1 | Moneda y redondeo | **MXN con centavos**, sin redondeo forzado. |
| H2 | Reportes | Exportar **CSV/JSON** igual que TamalitosAPP (compras, inventario, ventas, cortes) + respaldo/restauración completo. |

---

## 3. Reglas de negocio derivadas (fórmulas base)

- `inversiónLote = (costoLote + envíoProrrateado)`; si sub-estado `Reembolsado` → `0`.
- `envíoProrrateado_lote = costoEnvio × (costoLote / Σ costoLotes de la compra)`.
- `cantidadVendible = Σ cantidad de artículos no merma`.
- `costoUnitario_lote = inversiónLote / cantidadVendible` (la merma se absorbe; el excedente reparte el costo; el faltante reduce el denominador).
- `costoPromedioTipoLote = inversiónTotal / cantidadVendibleTotal` (promedio ponderado).
- `ventasTotales = Σ ventas cobradas del tipo de lote`.
- `pendiente = inversiónTotal − ventasTotales` (si es negativa → hay ganancia).
- `ganancia = ventasTotales − inversiónTotal`.
- `gananciaEstimada = Σ(precioSugerido × stock) − inversiónTotal`.
- El **consumo de stock es FIFO por lote** (el lote más antiguo reduce inventario primero), aunque el **costo sea promedio ponderado**.

> Ver detalle completo del modelo de datos y fórmulas en `fase2_arquitectura.md`.
