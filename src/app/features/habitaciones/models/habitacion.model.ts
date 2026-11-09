export interface Bloque {
  referencia: string;
  cliente: string;
  ingreso: string;
  salida: string;
  estado: string;
}

export interface Habitacion {
  idHabitacion: number;
  numero: string;
  tipo: string;
  capacidad: number;
  plazasCama?: number;
  maxMenoresSinCama?: number;
  precio: number;
  estado: string;
  disponible: boolean;
  reservas: Bloque[];
}

export interface OcupacionHabitacion {
  capacidadPersonas: number;
  plazasCama: number;
  maxMenoresSinCama: number;
}

export type EstadoHabitacion =
  'DISPONIBLE' | 'OCUPADO' | 'LIMPIEZA' | 'MANTENIMIENTO';

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

export type HabitacionConfiguracionRequest = Omit<
  HabitacionConfiguracion,
  'idHabitacion' | 'nombreTipo' | 'precioBase' | 'imagenRuta'
>;
