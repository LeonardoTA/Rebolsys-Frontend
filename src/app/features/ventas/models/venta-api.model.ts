export interface VentaApi {
  idVenta: number;
  idClienteComprador: number | null;
  compradorNombreLibre: string | null;
  idDetalleReserva: number | null;
  idUsuario: number;
  modalidadCobro: "RESERVA" | "SEPARADA";
  estadoVenta: "BORRADOR" | "CONFIRMADA" | "ANULADA";
  fechaRegistro: string;
  fechaConfirmacion: string | null;
  claveRegistro: string;
  total: number;
  detalles: {
    idDetalleVenta: number;
    idProducto: number;
    descripcion: string;
    cantidad: number;
    valorUnitario: number;
    igv: number;
    subtotal: number;
    total: number;
    estadoLinea: string;
  }[];
}
