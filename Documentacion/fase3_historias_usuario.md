# FASE 3: Épicas e Historias de Usuario (Gherkin)

Formato INVEST + criterios de aceptación en Gherkin.

---

## Épica 0: Infraestructura PWA y Shell (EP-00)

### HU-001: Instalación y funcionamiento offline
```gherkin
Dado que abro la URL de la app en Safari por HTTPS
Cuando selecciono Compartir > "Agregar al inicio"
Entonces la app se instala con icono y nombre configurables
Y al abrirla desde el inicio se ejecuta sin barra de URL

Dado que la app ya se cargó al menos una vez con internet
Cuando activo el Modo Avión y la abro
Entonces la interfaz carga sin errores
Y puedo registrar compras, catalogar, vender y consultar inventario
```

### HU-002: Navegación entre pantallas
```gherkin
Dado que estoy en cualquier pantalla secundaria
Cuando presiono "← Atrás"
Entonces regreso a la pantalla padre correspondiente sin recargar la página
```

---

## Épica 1: Inicio y Configuración (EP-01)

### HU-010: Pantalla principal con accesos
```gherkin
Dado que abro la app
Cuando se carga la pantalla de Inicio
Entonces veo el logo centrado
Y debajo un botón "Venta"
Y debajo un botón "Administración"
Y en la esquina superior izquierda un engrane (⚙️) para Configuración
```

### HU-011: Cambiar nombre, logo y tema
```gherkin
Dado que estoy en Configuración
Cuando modifico el nombre, selecciono un logo y elijo tema
Y presiono "Guardar"
Entonces los cambios persisten al cerrar y reabrir la app
Y se reflejan en la pantalla de Inicio
```

### HU-012: Exportar y respaldar
```gherkin
Dado que estoy en Configuración > Exportar
Cuando elijo exportar CSV o respaldo JSON
Entonces se genera el archivo correspondiente y se abre el panel de compartir
Dado que importo un respaldo JSON válido
Cuando confirmo la importación
Entonces se restauran todas las tablas con resumen previo
```

---

## Épica 2: Compras (EP-02)

### HU-020: Registrar compra con uno o varios lotes
```gherkin
Dado que estoy en Compras
Cuando presiono "Nueva compra"
Y lleno fecha, proveedor, costo de envío
Y agrego 1 o más lotes (nombre del producto, cantidad, costo)
Y presiono "Guardar"
Entonces la compra queda con estatus "Solicitada"
Y aparece en la lista con su total calculado
```

### HU-021: Gestionar estatus de compra
```gherkin
Dado que existe una compra
Cuando edito su estatus
Entonces puedo cambiarlo libremente entre Solicitada, Pagada, En camino, Cancelada/Devuelta y Recibida

Dado que la compra fue cancelada/devuelta
Cuando la consulto
Entonces ya no se ofrece para catalogar
```

### HU-022: Recepción parcial con sub-estados por lote
```gherkin
Dado que una compra con varios lotes se recibe parcialmente
Cuando indico por lote: cantidad recibida y sub-estado (No llegó, Devuelto, Reembolsado)
Entonces solo "Reembolsado" descuenta el costo del lote de la inversión
Y "No llegó" y "Devuelto" conservan su costo en la inversión
```

### HU-023: Bloqueo y desbloqueo tras catalogar
```gherkin
Dado que una compra ya fue catalogada
Cuando intento editarla
Entonces la compra está bloqueada
Dado que necesito corregirla
Cuando presiono "Desbloquear" y confirmo
Entonces puedo editarla nuevamente
```

---

## Épica 3: Catalogar (EP-03)

### HU-030: Detectar lotes recibidos por catalogar
```gherkin
Dado que existe una compra con estatus "Recibida" (completa o parcial)
Cuando entro a Catalogar
Entonces la compra aparece como pendiente de catalogar
Y solo se listan los lotes recibidos
```

### HU-031: Cabecera del lote con precios calculados
```gherkin
Dado que abro un lote para catalogar
Cuando se muestra la cabecera
Entonces veo nombre del tipo de producto, cantidad, precio total y precio por producto calculado
```

### HU-032: Agregar artículos al lote
```gherkin
Dado que estoy catalogando un lote
Cuando agrego registros con descripción, precio sugerido y cantidad
Entonces se agregan al lote y se valida que la descripción no se repita en el tipo de lote
Y la estimación de ganancia se recalcula en vivo
```

### HU-033: Completar lote con excedente y merma
```gherkin
Dado que estoy catalogando
Cuando la cantidad sumada de los registros completa o supera el total del lote
Entonces el lote puede finalizar
Y el excedente se permite (el costo se reparte entre más unidades)
Y la merma se agrega con precio sugerido $0 y no es vendible
```

### HU-034: Finalizar con faltante
```gherkin
Dado que la cantidad sumada es menor que el total del lote
Cuando presiono "Finalizar"
Entonces aparece la alerta "Faltan productos para completar el lote, ¿Desea marcarlos como faltantes?"
Dado que confirmo
Entonces el lote reduce su total de productos y se recalcula el costo por unidad
```

### HU-035: Asignar tipo de lote y crear inventario
```gherkin
Dado que finalizo la catalogación de un lote
Cuando elijo o creo el Tipo de Lote al que pertenece
Entonces los artículos se añaden al inventario de ese tipo de lote
Y la compra se bloquea
```

---

## Épica 4: Inventario y Tipo de Lote (EP-04)

### HU-040: Ver inventario agrupado por tipo de lote
```gherkin
Dado que estoy en Inventario
Cuando se carga la vista
Entonces veo por cada tipo de lote: nombre, costo por unidad, inversión a recuperar (pendiente) y ganancia estimada
Y debajo el listado de artículos con cantidad existente y precio sugerido
```

### HU-041: Crear y editar tipos de lote
```gherkin
Dado que estoy en Tipo de Lote
Cuando creo o edito un tipo de lote
Entonces puedo definir nombre y status (En Venta, Vendido, Almacenado)
Y el status "Almacenado" lo oculta de la pantalla de Venta
```

### HU-042: Combinar lotes en un mismo tipo de lote
```gherkin
Dado que un tipo de lote ya tiene mercancía
Cuando asigno un nuevo lote catalogado al mismo tipo de lote
Entonces se suman inversión, ventas y stock
Y los artículos con la misma descripción se fusionan como uno solo
```

### HU-043: Descombinar lotes (atribución al más antiguo)
```gherkin
Dado que un tipo de lote combina varios lotes
Cuando descombino
Entonces las ventas realizadas se restan del lote más antiguo primero
Y cada lote muestra su inventario e inversión de forma separada
```

---

## Épica 5: Venta (EP-05)

### HU-050: Seleccionar artículos agrupados por tipo de lote
```gherkin
Dado que estoy en Venta
Cuando se carga la vista
Entonces veo los artículos agrupados por tipo de lote activo (En Venta)
Y cada artículo muestra su precio sugerido y existencia
Y los artículos agotados o con precio $0 (merma) no aparecen
```

### HU-051: Venta con descuento y método de pago
```gherkin
Dado que tengo artículos en la comanda
Cuando cobro
Entonces puedo agregar un descuento por ticket (monto fijo) y elegir método de pago (Efectivo/Transferencia)
Y el total se calcula correctamente
```

### HU-052: Reducción de inventario por venta
```gherkin
Dado que confirmo una venta
Cuando se procesa
Entonces se reduce el stock del artículo específico consumido (lote más antiguo primero)
Y se registra snapshot de precio y costo unitario por línea
```

### HU-053: Cancelar venta y restaurar stock
```gherkin
Dado que existe una venta cobrada
Cuando la cancelo con motivo
Entonces se restaura el stock de los artículos vendidos
Y la venta se excluye de los cálculos de recuperación
```

### HU-054: Indicador de recuperación en venta
```gherkin
Dado que estoy en Venta o en el resumen de un tipo de lote
Cuando consulto
Entonces veo cuánto falta por recuperar o la ganancia generada (ventas − inversión)
Y en ventas mixtas el cálculo se lleva por cada tipo de lote y general
```

---

## Épica 6: Descuentos (EP-06)

### HU-060: Listar ventas mixtas con descuento pendiente
```gherkin
Dado que existió una venta mixta con descuento
Cuando entro a Descuentos
Entonces aparece la venta como pendiente de asignar
```

### HU-061: Asignar descuento y recalcular
```gherkin
Dado que abro una venta mixta con descuento
Cuando determino a qué tipo de lote / artículo se aplica el descuento
Y guardo
Entonces se recalculan las cuentas de ese tipo de lote
Y la venta queda marcada como descuento asignado (con registro de ajuste)
```

---

## Épica 7: Corte (EP-07)

### HU-070: Cerrar un tipo de lote
```gherkin
Dado que estoy en Corte
Cuando selecciono un tipo de lote y confirmo el cierre
Entonces se guarda el histórico: inversión, si se recuperó, ganancia, productos vendidos y restantes
```

### HU-071: Generar remanente con inversión en cero
```gherkin
Dado que cerré un tipo de lote con producto restante
Cuando se genera el nuevo tipo de lote
Entonces conserva el stock restante con costo unitario informativo
Y su inversión y ventas inician en cero
Y puede quedar Almacenado (oculto de venta) hasta reactivarlo
```

---

## Épica 8: Indicador de recuperación de inversión (EP-08)

### HU-080: Monitorear recuperación por tipo de lote
```gherkin
Dado que tengo lotes catalogados y ventas registradas
Cuando consulto el inventario o el detalle de un tipo de lote
Entonces veo la inversión total, lo pendiente por recuperar y la ganancia
Y el indicador se actualiza con cada venta, cancelación, descuento o reembolso
```
