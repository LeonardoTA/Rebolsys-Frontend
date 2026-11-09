export type EstadoItem = 'Activo' | 'Inactivo' | 'En habitacion';

export type EstadoConservacion =
  'BUENO' | 'DANADO' | 'FALTANTE' | 'EN_REPARACION';

export interface Item {
  idItem: number;
  nombreItem: string;
  idTipoItem: number;
  estadoItem: EstadoItem;
  idDetalleHabitacion: number | null;
  idHabitacion: number | null;
  estadoActualItem: EstadoConservacion | null;
  nombreTipo: string;
  numeroCuarto: string | null;
}

export interface ItemRequest {
  nombreItem: string;
  idTipoItem: number;
  estadoItem: EstadoItem;
}

export interface ItemOperacion {
  claveOperacion: string;
  idUsuario: number;
  estadoActualItem: EstadoConservacion;
  observacion: string;
}

export interface ItemAsignacion extends ItemOperacion {
  idHabitacion: number | null;
}

export interface ItemHistorial {
  idMovimiento: number;
  accion: string;
  idUsuario: number;
  usuario: string;
  fechaMovimiento: string;
  idHabitacionOrigen: number | null;
  numeroOrigen: string | null;
  idHabitacionDestino: number | null;
  numeroDestino: string | null;
  estadoConservacion: EstadoConservacion;
  observacion: string;
}
