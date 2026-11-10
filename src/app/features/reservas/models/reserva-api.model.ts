import { ClienteDatos } from "../../clientes/models/cliente.model";

export interface OcupanteReserva {
  idReservaOcupante: number;
  idCliente: number;
  nombre: string;
  idOcupanteResponsable: number | null;
  parentescoResponsable: "PADRE" | "MADRE" | "TUTOR" | null;
  ocupaPlazaCama: boolean;
}

export interface DetalleReserva {
  idDetalleReserva: number;
  idHabitacion: number;
  numeroCuarto: string;
  fechaIngreso: string;
  fechaSalida: string;
  costoEstadia: number;
  estadoDetalle: "CONFIRMADA" | "EN_CURSO" | "FINALIZADA" | "CANCELADA";
  ocupantes: OcupanteReserva[];
}

export interface ReservaApi {
  idReserva: number;
  idCliente: number;
  idUsuario: number;
  titular: string;
  fechaRegistro: string;
  claveRegistro: string;
  detalles: DetalleReserva[];
}

export interface PagoReserva {
  idPago: number;
  idFormaPago: number;
  idTurno: number;
  monto: number;
  numeroOperacion: string | null;
  fechaPago: string;
}

export interface CuentaReserva {
  idReserva: number;
  numeroReserva: string;
  totalAlojamiento: number;
  totalCargos: number;
  totalPagado: number;
  saldoPendiente: number;
  admiteConsumosConsolidados: boolean;
  cuentas: CuentaDocumento[];
}

export interface CuentaDocumento {
  idCuenta: number | null;
  idReserva?: number;
  numeroReserva?: string;
  idVenta: number | null;
  tipo: string;
  estado: string;
  serie?: string;
  numero?: string | null;
  idClienteReceptor?: number;
  receptorNombre?: string | null;
  receptorNumeroDoc?: string | null;
  fechaEmision?: string | null;
  total: number;
  pagado: number;
  saldo: number;
  lineas?: {idDetalleReserva:number|null;idDetalleVenta:number|null;descripcion:string;cantidad:number;total:number}[];
  pagos: PagoReserva[];
}

export interface CobroReserva {
  idUsuario: number;
  idTurno: number;
  idFormaPago: number;
  numeroOperacion: string | null;
}

export interface ConfirmacionPago {
  forma: "EFECTIVO" | "PENDIENTE";
  recibido: number | null;
  monto?: number | null;
  cobro?: CobroReserva;
}

export interface ClienteDetalle {
  idCliente: number;
  persona: ClienteDatos;
  restriccionesMedicas: string | null;
}

export interface RegistroReservaApi {
  claveRegistro: string;
  idCliente: number;
  idUsuario: number;
  detalles: {
    idHabitacion: number;
    fechaIngreso: string;
    fechaSalida: string;
    costoEstadia: number;
    ocupantes: {
      idCliente: number;
      idClienteResponsable: number | null;
      parentescoResponsable: "PADRE" | "MADRE" | "TUTOR" | null;
      ocupaPlazaCama: boolean;
    }[];
  }[];
}

export function estadoReserva(reserva: ReservaApi): string {
  const estados = reserva.detalles.map((d) => d.estadoDetalle);
  if (estados.includes("EN_CURSO")) return "EN_CURSO";
  if (estados.includes("CONFIRMADA")) return "CONFIRMADA";
  return estados.includes("FINALIZADA") ? "FINALIZADA" : "CANCELADA";
}
