export interface Catalogo {
  id: number;
  nombre: string;
  codigoSunat?: string | null;
}

export interface Catalogos {
  documentos: Catalogo[];
  ocupantes: Catalogo[];
  pagos: Catalogo[];
  usuarios?: Catalogo[];
  turnosAbiertos?: TurnoDisponible[];
}

export interface TurnoDisponible {
  idTurno: number;
  idUsuario: number;
  usuario: string;
  fechaApertura: string;
}

export interface CatalogosApi {
  tiposDocumento: Catalogo[];
  formasPago: Catalogo[];
  usuarios: Catalogo[];
  turnosAbiertos: TurnoDisponible[];
}
