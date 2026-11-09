export interface Comprobante {
  numero: string;
  fecha: string;
  receptor: string;
  documento: string;
  lineas: {
    descripcion: string;
    cantidad: number;
    valorUnitario: number;
    total: number;
  }[];
  total: number;
  pagado: number;
  devuelto: number;
  estado: string;
  pagos: { idPago: number; fecha: string; monto: number; devuelto: number }[];
}
