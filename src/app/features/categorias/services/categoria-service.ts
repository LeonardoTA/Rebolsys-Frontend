import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { Categoria } from '../models/categoria.model';
@Injectable({ providedIn: 'root' })
export class CategoriaService {
  private http = inject(HttpClient);
  listar() {
    return this.http.get<Categoria[]>(environment.apiUrl + '/categorias');
  }
  crear(nombreCategoria: string) {
    return this.http.post<Categoria>(environment.apiUrl + '/categorias', {
      nombreCategoria,
    });
  }
}
