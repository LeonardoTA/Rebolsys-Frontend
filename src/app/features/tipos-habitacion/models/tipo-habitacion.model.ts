export interface TipoHabitacion {
  idTipoHabitacion: number;
  nombreTipo: string;
  capacidadMax: number;
  precioBase: number;
}

export type TipoHabitacionRequest = Omit<TipoHabitacion, 'idTipoHabitacion'>;
