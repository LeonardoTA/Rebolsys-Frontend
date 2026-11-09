import { Catalogo } from '../../../core/models/catalogo.model';
import { Categoria } from '../../categorias/models/categoria.model';

export type EstadoHabitacion = 'DISPONIBLE' | 'OCUPADO' | 'LIMPIEZA' | 'MANTENIMIENTO';
export type EstadoItem = 'Activo' | 'Inactivo' | 'En habitacion';
export type EstadoConservacion = 'BUENO' | 'DANADO' | 'FALTANTE' | 'EN_REPARACION';

export interface TipoHabitacion {
  idTipoHabitacion: number;
  nombreTipo: string;
  capacidadMax: number;
  precioBase: number;
}
export type TipoHabitacionRequest = Omit<TipoHabitacion, 'idTipoHabitacion'>;
export interface HabitacionConfiguracion {
  idHabitacion: number;
  numeroCuarto: string;
  idTipoHabitacion: number;
  nombreTipo: string;
  estadoHabitacion: EstadoHabitacion;
  capacidadPersonas: number;
  plazasCama: number;
  maxMenoresSinCama: number;
  precioBase: number;
  imagenRuta?: string | null;
}
export type HabitacionConfiguracionRequest = Omit<HabitacionConfiguracion, 'idHabitacion' | 'nombreTipo' | 'precioBase' | 'imagenRuta'>;
export interface TipoItem { idTipoItem: number; nombreItem: string; }
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
export interface ItemRequest { nombreItem: string; idTipoItem: number; estadoItem: EstadoItem; }
export interface ItemOperacion {
  claveOperacion: string;
  idUsuario: number;
  estadoActualItem: EstadoConservacion;
  observacion: string;
}
export interface ItemAsignacion extends ItemOperacion { idHabitacion: number | null; }
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
export interface ConfiguracionCatalogos {
  tiposHabitacion: TipoHabitacion[];
  tiposItem: TipoItem[];
  categorias: Categoria[];
  estadosHabitacion: EstadoHabitacion[];
  estadosItem: EstadoItem[];
  estadosConservacion: EstadoConservacion[];
  estadosProducto: ('ACTIVO' | 'INACTIVO')[];
}
export interface OperadoresCatalogos { usuarios: Catalogo[]; }
export type FiltrosConfiguracion = Record<string, string | number | boolean | null | undefined>;
