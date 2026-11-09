import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { FiltrosConsulta } from '../../../core/models/filtros-consulta';
import { Pagina } from '../../../core/models/pagina-response';
import { parametrosConsulta } from '../../../core/utils/http-params';
import {
  Item,
  ItemAsignacion,
  ItemHistorial,
  ItemOperacion,
  ItemRequest,
} from '../models/inmobiliario.model';
@Injectable({ providedIn: 'root' })
export class InmobiliarioService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;
  items(filtros: FiltrosConsulta = {}) {
    return this.http.get<Pagina<Item>>(`${this.base}/items/configuracion`, {
      params: parametrosConsulta(filtros),
    });
  }

  item(id: number) {
    return this.http.get<Item>(`${this.base}/items/${id}`);
  }

  guardarItem(id: number | null, datos: ItemRequest) {
    return id === null
      ? this.http.post<Item>(`${this.base}/items`, datos)
      : this.http.put<Item>(`${this.base}/items/${id}`, datos);
  }

  asignarItem(id: number, datos: ItemAsignacion) {
    return this.http.put<Item>(`${this.base}/items/${id}/asignacion`, datos);
  }

  conservarItem(id: number, datos: ItemOperacion) {
    return this.http.put<Item>(`${this.base}/items/${id}/conservacion`, datos);
  }

  desactivarItem(id: number) {
    return this.http.delete<void>(`${this.base}/items/${id}`);
  }

  historialItem(id: number) {
    return this.http.get<ItemHistorial[]>(`${this.base}/items/${id}/historial`);
  }
}
