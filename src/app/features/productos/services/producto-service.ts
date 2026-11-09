import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Pagina } from '../../../core/models/pagina-response';
import { Catalogo } from '../../../core/models/catalogo.model';
import {
  AjusteStock,
  MovimientoInventario,
  Producto,
  ProductoRequest,
} from '../models/producto.model';

@Injectable({ providedIn: 'root' })
export class ProductoService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl + '/productos';
  private readonly recepcionCatalogosUrl = environment.apiUrl + '/recepcion/catalogos';

  listar(
    pagina = 0,
    tamanio = 10,
    buscar = '',
    estado = '',
    categoria: number | null = null,
    stockBajo: boolean | null = null,
  ) {
    let params = new HttpParams()
      .set('pagina', pagina.toString())
      .set('tamanio', tamanio.toString())
      .set('buscar', buscar);

    if (estado) {
      params = params.set('estado', estado);
    }
    if (categoria !== null && categoria !== undefined) {
      params = params.set('idCategoria', categoria.toString());
    }
    if (stockBajo !== null && stockBajo !== undefined) {
      params = params.set('stockBajo', stockBajo.toString());
    }

    return this.http.get<Pagina<Producto>>(this.base, { params });
  }

  catalogo() {
    return this.http.get<Producto[]>(this.base + '/catalogo');
  }

  obtener(id: number | string) {
    return this.http.get<Producto>(`${this.base}/${id}`);
  }

  crear(data: ProductoRequest) {
    return this.http.post<Producto>(this.base, data);
  }

  actualizar(id: number | string, data: ProductoRequest) {
    return this.http.put<Producto>(`${this.base}/${id}`, data);
  }

  desactivar(id: number | string) {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  ajustarStock(id: number | string, data: AjusteStock) {
    return this.http.post<Producto>(`${this.base}/${id}/ajustes-stock`, data);
  }

  movimientos(id: number | string) {
    return this.http.get<MovimientoInventario[]>(`${this.base}/${id}/movimientos`);
  }

  usuarios() {
    return this.http
      .get<{ usuarios: Catalogo[] }>(this.recepcionCatalogosUrl)
      .pipe(map((res) => res?.usuarios ?? []));
  }
}
