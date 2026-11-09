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
