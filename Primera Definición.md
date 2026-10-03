Vamos a empezar un proyecto PWA similar a TamalitosAPP, mismo objetivo, usar de manera offline para llevar el control de inventario de productos, costos de la compra y la venta al público, en si la premisa es la siguiente: Se compraran lotes de producto (calcetas o maquillaje variado como mayoreo), y llevar el control de venta donde como objetivo principal es recuperar la inversión, teniendo un indicador para el monitorear cuanto falta para recuperar o la ganancia generada; Se necesitara catalogar cada producto de cada lote y asignar un precio sugerido, aunque en la venta se pueda generar un descuento. 

Analiza los módulos propuestos y genérame un listado de dudas o ambigüedades que identifiques para definir y responder antes de que se genere un plan de acción, si necesitas acceso o la ruta para explorar el proyecto TamalitosAPP me lo preguntas para que tengas todo el contexto de lo previo.

Los módulos propuestos son:

- UIX

Al iniciar la app tendrá como pantalla principal el logo en el centro, debajo el botón de Venta y otro botón debajo de este de Administración, donde estarán los botones de Compras, Catalogar, Inventario, Tipo de lote, Corte y Descuentos. arriba en la izquierda se tendrá el engrane que funciona como botón de configuración, para cambiar el icono, el nombre de la app, eso por el momento.

- Compras

1. En cada compra se registra la fecha de compra, proveedor y costo de envío, puede incluir desde 1 a más lotes.
2. En la compra, se registra por cada lote: el nombre del producto, cantidad y costo del lote.
3. Al registrarse la compra tendrá el estatus de Solicitada, y manualmente se podrá editar el estatus , y cambiarla a Pagada, En camino, Cancelada/Devuelta y como estatus final Recibida
4. En caso que una compra con más de un lote, sea recibida de manera parcial, se podrá asignar un estatus especifico al lote (No llegó, devuelto, reembolsado), solo el estatus reembolsado descuenta el costo del lote.
5. Solo cuando este recibida, podrá ser usada en el modulo de Catalogar, y cuando se confirme que ha sido catalogada, la compra se bloquea y no podrá ser editada nuevamente.

- Catalogar

1. Cuando se detecte que una compra a sido recibida de manera completa o parcial, se mostrará la opción para poderla catalogar lo lotes recibidos
2. Cada lote como información de cabecera, mostrará el nombre del tipo de producto, cantidad y precio total, así como el precio por producto calculado
3. Tendrá la opción de agregar los registros con la descripción del producto, costo sugerido y cantidad de los productos encontrados en el lote
4. Como regla, el lote termina de ser catalogado cuando la cantidad sumada de todos los registros complete o supere el total del lote, y agregue la estimación de ganancia total cuando se complete la venta (venta total y ganancia total (venta total menos inversión)
5. Puede que existan lotes que contengan más producto del esperado, se permite el excedente, al igual puede haya producto merma o faltante, por lo que la merma se agregara con precio sugerido $0 y el faltante se registre sí el usuario presione el botón, "Finalizar" y envíe una alerta "Faltan productos para completar el lote, ¿Desea marcarlos como faltantes?" y sí confirma, el lote reduce el total de productos y se recalcula el coste por unidad
6. Una vez catalogados los lotes se pueden agrupar por Tipo de lotes, por ejemplo si tengo un lote del tipo "Calcetas navideñas" y genero ventas donde estoy recuperando la inversión, pero me llega un segundo lote, lo catalogo de la misma forma y le agrego el mismo tipo de lote, el coste de inversión se suma, el producto catalogado también y la cantidad de venta generada también para llegar a la nueva meta o ganancia.

- Inventario

1. Los productos se agrupan por tipo de lote, un lote ya catalogado se añade al inventario del tipo de lote asignado.
2. Se muestra por cada tipo de lote, como encabezado el nombre del producto, costo por unidad, inversión a recuperar, ganancia total estimada y debajo muestra el listado de productos catalogados, la cantidad existente y precio sugerido

- Corte

1. El módulo de corte será el cierre de un tipo de lote, ya sea por fin de temporada o renovar lotes, por lo que se quedará como registro histórico la inversión realizada de ese tipo de lote, sí se recupero lo invertido, la ganancia, productos vendidos y productos restante, una vez hecho ese cierre, se genera nuevamente el tipo de lote con la cantidad de producto restante, pero inversión y productos vendidos en cero, el lote se puede almacenar (Desactivar) y ya no estará disponible para venta hasta que se reactive en el módulo de tipo de lotes

- Tipo de Lotes

1. Se puede crear, editar los tipos de lotes, sus campos son nombre, status (En Venta, Vendido, Almacenado) y combinar o descombinar lotes
2. En caso de descombinar lotes, el lote más antiguo es el que se reduce su inventario y genera las ventas

- Venta

1. En la pantalla principal estará el botón para entrar en modo Venta, donde se eligen los productos agrupados por tipo de lote, aunque la venta puede ser mixta, se llevara el calculo general y por lotes para el monitoreo de recuperación de la inversión.
2. Se mostrará el precio sugerido del producto pero se podrá agregar un descuento directo, si es uno o son varios productos y pertenecen al mismo lote queda registrado la venta a menor precio, para las ventas que son mixtas, en el apartado de Descuentos, se mostraran todas aquellas ventas donde se agrego un descuento para determinar a que producto se le aplico el descuento y ajustar las cuentas.
3. Por cada venta, va reduciendo el inventario existente por producto en el tipo de lote

- Descuentos

1. Módulo para ajustar las ventas con descuento y determinar a que Tipo de lote se le aplico el descuento y recalcular las cuentas

