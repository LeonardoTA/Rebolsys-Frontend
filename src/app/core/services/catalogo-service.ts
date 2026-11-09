import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Catalogos, OperadoresCatalogos } from '../models/catalogo.model';

@Injectable({ providedIn: 'root' })
export class CatalogoService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  listar() {
    return this.http.get<Catalogos>(`${this.base}/recepcion/catalogos`);
  }
  operadores() {
    return this.http.get<OperadoresCatalogos>(
      `${this.base}/recepcion/catalogos`,
    );
  }
}
