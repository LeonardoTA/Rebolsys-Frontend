import { ClienteDatos, Cliente } from '../../clientes/models/cliente.model';

export interface ResponsableHuesped {
  idTipoDocumento: number;
  numeroDocumento: string;
  parentesco: 'PADRE' | 'MADRE' | 'TUTOR';
}

export interface Huesped {
  ocupaPlazaCama?: boolean;
  idHuesped?: number | null;
  persona: ClienteDatos;
  idTipoOcupante: number;
  responsable?: ResponsableHuesped | null;
}

export interface Estancia {
  idHabitacion: number;
  fechaIngreso: string;
  fechaSalida: string;
  huespedes: Huesped[];
}

export interface Registro {
  claveRegistro: string;
  cliente: ClienteDatos;
  habitaciones: Estancia[];
  formaRegistro: 'EFECTIVO' | 'PENDIENTE';
  efectivoRecibido: number | null;
  montoPago?: number | null;
}

export interface Linea extends Estancia {
  idDetalleReserva: number;
  numero: string;
  tipo: string;
  capacidad: number;
  plazasCama?: number;
  maxMenoresSinCama?: number;
  precio: number;
  costo: number;
  estado: string;
}

export interface Reserva {
  idReserva?: number;
  referencia: string;
  numero: string;
  cliente: Cliente;
  habitaciones: Linea[];
  estado: string;
  estadoCobro: string;
  total: number;
  pagado: number;
  saldo: number;
  comprobante: string | null;
  vuelto: number;
  devuelto: number;
  totalConsumos?: number;
  consumos?: {
    idConsumo: number;
    idVenta: number | null;
    idDetalleReserva: number;
    habitacion: string;
    descripcion: string;
    cantidad: number;
    total: number;
    estadoCobro: string;
    fecha: string;
  }[];
  comprobantes?: {
    idComprobante: number;
    numero: string;
    estado: string;
    total: number;
  }[];
}
