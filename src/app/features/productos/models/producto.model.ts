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
