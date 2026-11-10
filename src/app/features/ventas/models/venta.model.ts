import { Comprobante } from "../../reservas/models/comprobante.model";
import {
  CobroReserva,
  DetalleReserva,
} from "../../reservas/models/reserva-api.model";
export interface VentaDetalle {
  idConsumo: number;
  idProducto: number;
  nombreProducto: string;
  cantidad: number;
  precioUnitario: number;
  total: number;
  stockRestante: number;
  imagenRuta: string | null;
}
export interface Venta {
  pagado?: number;
  saldo?: number;
  idUsuario?: number;
  estadoVenta?: string;
  editable?: boolean;
  idReserva?: number | null;
  idVenta: number;
  numero: string;
  fechaVenta: string;
  modoVenta: "SEPARADA" | "CARGO_RESERVA";
  compradorNombre: string;
  idDetalleReserva: number | null;
  referenciaReserva: string | null;
  habitacion: string | null;
  estadoCobro: string;
  subtotal: number;
  igv: number;
  total: number;
  vuelto: number;
  detalles: VentaDetalle[];
  comprobante: Comprobante | null;
}

export interface VentaActualizar {
  compradorNombre: string | null;
  detalles: { idProducto: number; cantidad: number; precioEsperado?: number }[];
}
export interface VentaRequest {
  claveRegistro: string;
  modoVenta: "SEPARADA" | "CARGO_RESERVA";
  idDetalleReserva: number | null;
  idCliente: number | null;
  compradorNombre: string | null;
  detalles: { idProducto: number; cantidad: number; precioEsperado?: number }[];
  efectivoRecibido: number | null;
  cobro?: CobroReserva;
}
export interface ReservaVenta {
  idReserva: number;
  idDetalleReserva: number;
  referencia: string;
  numero: string;
  habitacion: string;
  clienteNombre: string;
  idCliente: number;
  huespedes: string[];
  estadoDetalle: DetalleReserva["estadoDetalle"];
  fechaIngreso: string;
  fechaSalida: string;
}
