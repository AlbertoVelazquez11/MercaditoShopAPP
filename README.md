# 🛍️ Mercadito Shop — PWA Offline para Control de Inventario por Lotes

PWA 100% offline para administrar mercancía comprada por lotes (mayoreo), catalogar artículos, vender al público y monitorear la **recuperación de la inversión**.

---

## 🎯 Objetivo

- Registrar **compras** con 1 o más **lotes**.
- **Catalogar** cada lote en **artículos** con descripción y precio sugerido.
- Agrupar lotes en **Tipos de Lote** para sumar inversión, ventas y stock.
- **Vender** con precio sugerido y descuentos.
- **Monitorear** cuánto falta por recuperar o la ganancia generada.
- **Cortar** lotes al final de temporada y reiniciar el remanente.

---

## 🧩 Módulos

| Módulo | Ruta | Descripción |
|---|---|---|
| Inicio | `#/` | Logo + Venta + Administración + engrane |
| Administración | `#/admin` | Hub de módulos |
| Compras | `#/compras` | Compras con lotes, estatus y recepción parcial |
| Catalogar | `#/catalogar` | Clasificar lotes recibidos en artículos |
| Inventario | `#/inventario` | Inventario agrupado por tipo de lote |
| Tipo de Lote | `#/tipo-lotes` | CRUD, combinar/descombinar |
| Corte | `#/corte` | Cierre de temporada + histórico |
| Descuentos | `#/descuentos` | Asignación de descuentos mixtos |
| Venta | `#/venta` | Punto de venta |
| Configuración | `#/config` | Nombre, logo, tema, exportar |

---

## 📖 Documentación

- [Fase 1 — Decisiones y resolución de dudas](Documentacion/fase1_decisiones.md)
- [Fase 2 — Arquitectura y modelo de datos](Documentacion/fase2_arquitectura.md)
- [Fase 3 — Épicas e historias de usuario](Documentacion/fase3_historias_usuario.md)
- [Fase 4 — Plan de trabajo por sprints](Documentacion/fase4_plan_trabajo.md)

---

## 🚀 Stack técnico

- HTML5 + CSS3 + JavaScript ES6 (Vanilla, sin framework)
- IndexedDB + localStorage
- Service Worker cache-first (offline-first)
- Vercel (HTTPS)

---

## ✅ Estado

| Sprint | Alcance | Estado |
|---|---|---|
| 1 | Core PWA, shell, DB, Home, Config | ⏳ Pendiente |
| 2 | Compras y Lotes | ⏳ Pendiente |
| 3 | Catalogar | ⏳ Pendiente |
| 4 | Tipo de Lote e Inventario | ⏳ Pendiente |
| 5 | Venta (POS) | ⏳ Pendiente |
| 6 | Descuentos y Corte | ⏳ Pendiente |
| 7 | Exportación, QA y lanzamiento | ⏳ Pendiente |
