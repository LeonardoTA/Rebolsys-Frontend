export interface Catalogo {
  id: number;
  nombre: string;
  codigoSunat?: string | null;
}

export interface Catalogos {
  documentos: Catalogo[];
  ocupantes: Catalogo[];
  pagos: Catalogo[];
}
