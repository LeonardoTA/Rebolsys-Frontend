export interface Emision {
  idEmision: number;
  idComprobante: number;
  idUsuario: number;
  ambiente: string;
  estado:
    | "PREPARADO"
    | "ENVIANDO"
    | "ACEPTADO"
    | "RECHAZADO"
    | "INCIERTO"
    | "ERROR_ENVIO";
  serie: string;
  correlativo: number;
  subtotal: number;
  igv: number;
  total: number;
  codigoRespuesta: string | null;
  mensajeRespuesta: string | null;
  xmlDisponible: boolean;
  cdrDisponible: boolean;
}
export interface PrepararEmision {
  claveOperacion: string;
  idUsuario: number;
  tasaIgv: number;
  direccionReceptor: string | null;
  tratamientos: { numeroLinea: number; afectacion: string; tasaIgv: number }[];
  cuotas: { fechaPago: string; monto: number }[];
}
