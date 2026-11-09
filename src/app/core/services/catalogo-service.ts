import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Catalogos } from '../models/catalogo.model';

@Injectable({ providedIn: 'root' })
export class CatalogoService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  listar() {
    return this.http.get<Catalogos>(`${this.base}/recepcion/catalogos`);
  }
}
