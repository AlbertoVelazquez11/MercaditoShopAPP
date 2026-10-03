// dominio.js — constantes y etiquetas del dominio (compartidas entre sprints).

export const ESTATUS_COMPRA = {
  solicitada: 'Solicitada',
  pagada: 'Pagada',
  en_camino: 'En camino',
  recibida: 'Recibida',
  cancelada_devuelta: 'Cancelada/Devuelta',
};

export const SUBESTADO_LOTE = {
  recibido: 'Recibido',
  no_llego: 'No llegó',
  devuelto: 'Devuelto',
  reembolsado: 'Reembolsado',
};

export const STATUS_TIPO_LOTE = {
  en_venta: 'En Venta',
  vendido: 'Vendido',
  almacenado: 'Almacenado',
  cerrado: 'Cerrado',
};

export const METODO_PAGO = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
};
