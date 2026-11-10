export interface HabitacionConfig {
  idHabitacion: number;
  numeroCuarto: string;
  idTipoHabitacion: number;
  nombreTipo: string;
  estadoHabitacion: string;
  capacidadPersonas: number;
  plazasCama: number;
  maxMenoresSinCama: number;
  precioBase: number;
  precioPorNoche: number | null;
}
export interface TipoHabitacion {
  idTipoHabitacion: number;
  nombreTipo: string;
  capacidadMax: number;
  precioBase: number;
}
export interface TipoItem {
  idTipoItem: number;
  nombreItem: string;
}
export interface ItemConfig {
  idItem: number;
  nombreItem: string;
  idTipoItem: number;
  nombreTipo: string;
  estadoItem: string;
  idHabitacion: number | null;
  numeroCuarto: string | null;
  estadoActualItem: string | null;
}
export interface CatalogosConfig {
  tiposHabitacion: TipoHabitacion[];
  tiposItem: TipoItem[];
  estadosHabitacion: string[];
  estadosItem: string[];
  estadosConservacion: string[];
}
