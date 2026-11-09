export interface Producto {
  idProducto: number;
  nombreProducto: string;
  precioActual: number;
  stock: number;
  stockMinimo: number;
  idCategoria: number;
  categoriaNombre: string;
  estadoProducto: 'ACTIVO' | 'INACTIVO';
  imagenRuta: string | null;
  stockBajo?: boolean;
}

export interface ProductoRequest {
  nombreProducto: string;
  precioActual: number;
  stock: number;
  stockMinimo: number;
  idCategoria: number;
  estadoProducto: 'ACTIVO' | 'INACTIVO';
  imagenRuta: string | null;
  stockAnterior?: number | null;
}

export interface AjusteStock {
  claveOperacion: string;
  idUsuario: number;
  stockAnterior: number;
  stockNuevo: number;
  observacion: string;
}

export interface MovimientoInventario {
  idMovimiento: number;
  claveOperacion: string;
  idUsuario: number;
  tipo: string;
  signo: number;
  cantidad: number;
  stockResultante: number;
  fechaMovimiento: string;
  observacion: string;
}
