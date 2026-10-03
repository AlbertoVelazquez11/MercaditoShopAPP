# FASE 2: Arquitectura y Modelo de Datos

> Se reutiliza la arquitectura de TamalitosAPP (SPA Vanilla ES6, hash router, IndexedDB + localStorage, Service Worker cache-first, Vercel).

---

## 1. Stack técnico

- **Frontend:** HTML5 + CSS3 + JavaScript ES6 (Vanilla, sin framework, sin build step).
- **Persistencia:** IndexedDB (datos transaccionales) + localStorage (configuración).
- **Offline:** Service Worker con cache-first / stale-while-revalidate.
- **Exportación:** Web Share API + CSV con BOM UTF-8 + respaldo JSON completo.
- **Despliegue:** Vercel (HTTPS, requerido para Service Worker en iOS).

## 2. Estructura de archivos

```text
PWA MercaditoShop/
├── Codigo/
│   ├── icons/                      # iconos PNG + SVG + logo
│   ├── css/
│   │   ├── variables.css           # design tokens
│   │   ├── base.css                # reset, tipografía, safe areas
│   │   ├── components.css          # cards, botones, badges, inputs, modales
│   │   └── views.css               # estilos por pantalla
│   ├── js/
│   │   ├── app.js                  # bootstrap
│   │   ├── router.js               # hash router
│   │   ├── store.js                # estado reactivo (Observer)
│   │   ├── db.js                   # wrapper IndexedDB
│   │   ├── export.js               # CSV / JSON respaldo
│   │   ├── gestures.js             # swipe-to-delete / touch
│   │   ├── utils.js                # fechas, moneda, ids
│   │   ├── negocio.js              # cálculos: prorrateo, costos, métricas
│   │   ├── views/
│   │   │   ├── home.js             # Inicio (logo + Venta + Administración)
│   │   │   ├── admin.js            # Hub de Administración
│   │   │   ├── compras.js          # CRUD compras + lotes
│   │   │   ├── catalogar.js        # catalogación de lotes recibidos
│   │   │   ├── inventario.js       # inventario agrupado por tipo de lote
│   │   │   ├── tipo-lotes.js       # CRUD tipos de lote + combinar/descombinar
│   │   │   ├── corte.js            # cierre de tipo de lote
│   │   │   ├── descuentos.js       # asignación de descuentos mixtos
│   │   │   ├── venta.js            # POS de venta
│   │   │   └── config.js           # nombre, logo, tema, exportar
│   │   └── components/
│   │       ├── header.js           # barra superior + atrás
│   │       ├── modal.js            # confirmaciones
│   │       ├── toast.js            # notificaciones
│   │       ├── swipe-item.js       # lista con swipe
│   │       └── date-filter.js      # filtro por fecha
│   ├── index.html
│   ├── manifest.json
│   └── sw.js
├── Documentacion/
└── README.md
```

## 3. Mapa de rutas (hash router)

| Ruta | Vista | Descripción |
|---|---|---|
| `#/` | `home` | Logo + botones Venta / Administración + engrane |
| `#/admin` | `admin` | Hub: Compras, Catalogar, Inventario, Tipo de Lote, Corte, Descuentos |
| `#/compras` | `compras` | Lista y formulario de compras/lotes |
| `#/catalogar` | `catalogar` | Compras recibidas pendientes de catalogar → detalle por lote |
| `#/inventario` | `inventario` | Inventario agrupado por tipo de lote |
| `#/tipo-lotes` | `tipo-lotes` | CRUD tipos de lote, combinar/descombinar |
| `#/corte` | `corte` | Cierre de tipos de lote + histórico |
| `#/descuentos` | `descuentos` | Ventas mixtas con descuento pendiente |
| `#/venta` | `venta` | Punto de venta |
| `#/config` | `config` | Configuración (nombre, logo, tema, exportar) |

---

## 4. Modelo de datos — IndexedDB

**DB:** `MercaditoShop` · **Version:** `1`

### 4.1 `Configuracion` (localStorage)

```json
{
  "nombreNegocio": "Mercadito Shop",
  "logo": null,
  "version": "1.0.0",
  "tema": "light",
  "ultimaExportacion": null
}
```

### 4.2 Object Stores

```javascript
// compras — cabecera de compra
{
  id: "compra_...",
  fecha: "YYYY-MM-DD",
  proveedor: string,
  costoEnvio: number,           // default 0
  estatus: "solicitada" | "pagada" | "en_camino" | "recibida" | "cancelada_devuelta",
  bloqueada: boolean,           // true al confirmar catalogación (desbloqueable)
  notas: string|null,
  creadoEn: ISO, actualizadoEn: ISO
}
// índices: fecha, estatus

// lotes — lote físico dentro de una compra (1..N)
{
  id: "lote_...",
  compraId: FK,
  nombreProducto: string,       // ej. "Calcetas navideñas"
  cantidad: number,             // cantidad esperada según compra
  costo: number,                // costo del lote
  cantidadRecibida: number,     // recepción real (parcial)
  subEstado: "recibido" | "no_llego" | "devuelto" | "reembolsado" | null,
  envíoProrrateado: number,     // calculado
  inversion: number,            // costo + envío (0 si reembolsado)
  catalogado: boolean,          // true al finalizar catalogación
  tipoLoteId: FK|null,          // asignado al catalogar
  creadoEn: ISO, actualizadoEn: ISO
}
// índices: compraId, tipoLoteId

// articulos — artículo catalogado dentro de un lote
{
  id: "art_...",
  loteId: FK|null,              // null = remanente de un corte
  tipoLoteId: FK,
  descripcion: string,          // única dentro del tipo de lote
  cantidad: number,             // cantidad catalogada
  stock: number,                // existencia restante
  precioSugerido: number,       // precio de venta sugerido
  costoUnitario: number,        // calculado al finalizar el lote
  esMerma: boolean,             // true → precio $0, no vendible
  esRemanente: boolean,         // true → proviene de un corte (inversión 0)
  creadoEn: ISO, actualizadoEn: ISO
}
// índices: loteId, tipoLoteId

// tipoLotes — agrupación en venta
{
  id: "tl_...",
  nombre: string,
  status: "en_venta" | "vendido" | "almacenado" | "cerrado",
  creadoEn: ISO, actualizadoEn: ISO
}
// índice: nombre

// ventas — cabecera de venta
{
  id: "venta_...",
  fecha: "YYYY-MM-DD", hora: "HH:mm:ss",
  subtotal: number, descuento: number, total: number,
  metodoPago: "efectivo" | "transferencia",
  pagoCon: number|null, cambio: number|null,
  estado: "cobrada" | "cancelada",
  motivoCancelacion: string|null,
  esMixta: boolean,             // true si abarca >1 tipo de lote
  descuentoAsignado: boolean,   // true si el descuento ya fue asignado
  creadoEn: ISO
}
// índices: fecha, estado

// detalleVenta — línea de venta
{
  id: "det_...",
  ventaId: FK,
  articuloId: FK,               // artículo específico consumido
  tipoLoteId: FK,
  descripcion: string,          // snapshot
  precioUnitario: number,       // snapshot (con descuento aplicado si asignado)
  costoUnitario: number,        // snapshot (promedio ponderado al vender)
  cantidad: number,
  subtotalLinea: number,
  creadoEn: ISO
}
// índices: ventaId, articuloId, tipoLoteId

// cortes — registro histórico de cierre
{
  id: "corte_...",
  tipoLoteId: FK,               // tipo de lote original cerrado
  nombreTipoLote: string,
  nuevoTipoLoteId: FK,          // remanente generado
  fecha: "YYYY-MM-DD",
  inversion: number, ventas: number, ganancia: number,
  productosVendidos: number, productosRestantes: number,
  detalle: Array,               // snapshot de artículos restantes
  creadoEn: ISO
}
// índices: tipoLoteId, fecha
```

### 4.3 Relaciones

```
COMPRA 1──N LOTE 1──N ARTICULO N──1 TIPO_LOTE
VENTA  1──N DETALLE_VENTA N──1 ARTICULO
VENTA  N──1 (opcional) TIPO_LOTE (vía detalleVenta)
TIPO_LOTE 1──N CORTE
```

---

## 5. Fórmulas de negocio (módulo `negocio.js`)

### 5.1 Compras / Lotes

```
Σ costoLotes = Σ(costo) de los lotes de la compra
envíoProrrateado_i = costoEnvio × (costo_i / Σ costoLotes)
                     (si Σ = 0 → reparto equitativo)

inversión_i = subEstado === "reembolsado" ? 0 : (costo_i + envíoProrrateado_i)
```

### 5.2 Catalogación

```
cantidadCatalogada = Σ(cantidad) de artículos del lote
cantidadVendible   = Σ(cantidad) de artículos con esMerma === false
costoUnitario_i    = inversión_i / cantidadVendible

- Excedente: cantidadCatalogada > cantidad  → se reparte el costo (baja costoUnitario)
- Merma:     cuenta para completar el lote, precioSugerido $0, se absorbe en costoUnitario
- Faltante:  al confirmar, el lote reduce su total a cantidadCatalogada
             (inversión se mantiene → sube costoUnitario)
```

### 5.3 Tipo de Lote (métricas derivadas)

```
inversiónTotal      = Σ inversión de lotes catalogados asignados (no reembolsados)
cantidadVendibleTotal = Σ cantidad de artículos no merma
costoPromedio       = inversiónTotal / cantidadVendibleTotal   (promedio ponderado)

ventasTotales       = Σ ventas cobradas del tipo de lote (desde detalleVenta)
pendiente           = inversiónTotal − ventasTotales            (negativo = ganancia)
ganancia            = ventasTotales − inversiónTotal
gananciaEstimada    = Σ(precioSugerido × stock no merma) − inversiónTotal
```

### 5.4 Venta

- Al cobrar: `costoUnitario` de cada línea = `costoPromedio` del tipo de lote (snapshot).
- `subtotalLinea = precioUnitario × cantidad`.
- Descuento por ticket (monto fijo):
  - **Un solo lote:** se distribuye y asigna automáticamente (`descuentoAsignado = true`).
  - **Mixta:** queda `descuentoAsignado = false` → módulo Descuentos.
- Consumo de stock: **FIFO por lote** (el artículo del lote más antiguo reduce primero). El costo es promedio ponderado (no FIFO).
- Cancelar venta: `estado = cancelada`, restaura stock sumando `cantidad` al `articuloId` de cada línea.

### 5.5 Corte

- Snapshot de métricas → registro en `cortes`.
- El tipo de lote original pasa a `status = cerrado` (histórico).
- Se crea un nuevo `tipoLote` (mismo nombre) con los artículos restantes copiados como `esRemanente = true`, `loteId = null`, inversión en 0, ventas en 0.

---

## 6. UX / Design System (heredado de TamalitosAPP)

- Design tokens en `variables.css` (colores, tipografía SF, espaciados, radios, safe areas).
- Touch targets ≥ 48px.
- `font-size` de inputs ≥ 16px (evita zoom en iOS).
- `overscroll-behavior: contain`, scroll interno en `#app`.
- Componentes reutilizables: `header`, `modal`, `toast`, `swipe-item`, `date-filter`.
- Home: logo centrado + botón **Venta** + botón **Administración** + engrane ⚙️ arriba a la izquierda.

---

## 7. Estrategia offline y respaldo

- Service Worker cache-first para el shell.
- Exportación CSV (BOM UTF-8) con Web Share API + fallback de descarga.
- Respaldo JSON completo de todas las tablas de IndexedDB + importación validada con resumen y confirmación.
