import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { Pagina } from '../../../core/models/pagina-response';
import {
  EstadoHabitacion,
  FiltrosConfiguracion,
  HabitacionConfiguracion,
  HabitacionConfiguracionRequest,
  Item,
  ItemAsignacion,
  ItemHistorial,
  ItemOperacion,
  ItemRequest,
  TipoHabitacion,
  TipoHabitacionRequest,
  TipoItem,
} from '../models/mantenimiento.model';

@Injectable({ providedIn: 'root' })
export class MantenimientoService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  private parametros(filtros: FiltrosConfiguracion) {
    let params = new HttpParams();
    for (const [nombre, valor] of Object.entries(filtros)) {
      if (valor !== null && valor !== undefined && valor !== '') params = params.set(nombre, valor);
    }
    return params;
  }
  habitaciones(filtros: FiltrosConfiguracion = {}) {
    return this.http.get<Pagina<HabitacionConfiguracion>>(
      `${this.base}/habitaciones/configuracion/pagina`,
      { params: this.parametros(filtros) },
    );
  }
  habitacionesTodas() {
    return this.http.get<HabitacionConfiguracion[]>(`${this.base}/habitaciones/configuracion`);
  }
  habitacion(id: number) {
    return this.http.get<HabitacionConfiguracion>(`${this.base}/habitaciones/${id}`);
  }
  guardarHabitacion(id: number | null, datos: HabitacionConfiguracionRequest) {
    return id === null
      ? this.http.post<HabitacionConfiguracion>(`${this.base}/habitaciones`, datos)
      : this.http.put<HabitacionConfiguracion>(`${this.base}/habitaciones/${id}`, datos);
  }
  cambiarEstadoHabitacion(id: number, estadoHabitacion: EstadoHabitacion) {
    return this.http.patch<HabitacionConfiguracion>(`${this.base}/habitaciones/${id}/estado`, {
      estadoHabitacion,
    });
  }
  tiposHabitacion() {
    return this.http.get<TipoHabitacion[]>(`${this.base}/tipos-habitacion`);
  }
  guardarTipoHabitacion(id: number | null, datos: TipoHabitacionRequest) {
    return id === null
      ? this.http.post<TipoHabitacion>(`${this.base}/tipos-habitacion`, datos)
      : this.http.put<TipoHabitacion>(`${this.base}/tipos-habitacion/${id}`, datos);
  }
  eliminarTipoHabitacion(id: number) {
    return this.http.delete<void>(`${this.base}/tipos-habitacion/${id}`);
  }
  items(filtros: FiltrosConfiguracion = {}) {
    return this.http.get<Pagina<Item>>(`${this.base}/items/configuracion`, {
      params: this.parametros(filtros),
    });
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
  tiposItem() {
    return this.http.get<TipoItem[]>(`${this.base}/tipos-item`);
  }
  crearTipoItem(nombreItem: string) {
    return this.http.post<TipoItem>(`${this.base}/tipos-item`, { nombreItem });
  }
}
