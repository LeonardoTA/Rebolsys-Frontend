import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { Pagina } from '../../../core/models/pagina-response';
import { Producto, ProductoRequest } from '../models/producto.model';
@Injectable({ providedIn: 'root' })
export class ProductoService {
  private http = inject(HttpClient);
  private base = environment.apiUrl + '/productos';
  listar(
    pagina = 0,
    tamanio = 10,
    buscar = '',
    estado = '',
    categoria: number | null = null,
  ) {
    const params: any = { pagina, tamanio, buscar };
    if (estado) params.estado = estado;
    if (categoria !== null) params.idCategoria = categoria;
    return this.http.get<Pagina<Producto>>(this.base, { params });
  }
  catalogo() {
    return this.http.get<Producto[]>(this.base + '/catalogo');
  }
  obtener(id: number | string) {
    return this.http.get<Producto>(this.base + '/' + id);
  }
  crear(data: ProductoRequest) {
    return this.http.post<Producto>(this.base, data);
  }
  actualizar(id: number | string, data: ProductoRequest) {
    return this.http.put<Producto>(this.base + '/' + id, data);
  }
  desactivar(id: number) {
    return this.http.delete<void>(this.base + '/' + id);
  }
}
