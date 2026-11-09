import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { FiltrosConsulta } from '../../../core/models/filtros-consulta';
import { Pagina } from '../../../core/models/pagina-response';
import { parametrosConsulta } from '../../../core/utils/http-params';
import {
  EstadoHabitacion,
  Habitacion,
  HabitacionConfiguracion,
  HabitacionConfiguracionRequest,
  OcupacionHabitacion,
} from '../models/habitacion.model';

@Injectable({ providedIn: 'root' })
export class HabitacionService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  listar(desde: string, hasta: string) {
    return this.http.get<Habitacion[]>(`${this.base}/habitaciones`, {
      params: { desde, hasta },
    });
  }

  actualizarOcupacion(id: number, datos: OcupacionHabitacion) {
    return this.http.put<OcupacionHabitacion & { idHabitacion: number }>(
      this.base + '/habitaciones/' + id + '/ocupacion',
      datos,
    );
  }
  habitaciones(filtros: FiltrosConsulta = {}) {
    return this.http.get<Pagina<HabitacionConfiguracion>>(
      `${this.base}/habitaciones/configuracion/pagina`,
      { params: parametrosConsulta(filtros) },
    );
  }

  habitacionesTodas() {
    return this.http.get<HabitacionConfiguracion[]>(
      `${this.base}/habitaciones/configuracion`,
    );
  }

  habitacion(id: number) {
    return this.http.get<HabitacionConfiguracion>(
      `${this.base}/habitaciones/${id}`,
    );
  }

  guardarHabitacion(id: number | null, datos: HabitacionConfiguracionRequest) {
    return id === null
      ? this.http.post<HabitacionConfiguracion>(
          `${this.base}/habitaciones`,
          datos,
        )
      : this.http.put<HabitacionConfiguracion>(
          `${this.base}/habitaciones/${id}`,
          datos,
        );
  }

  cambiarEstadoHabitacion(id: number, estadoHabitacion: EstadoHabitacion) {
    return this.http.patch<HabitacionConfiguracion>(
      `${this.base}/habitaciones/${id}/estado`,
      { estadoHabitacion },
    );
  }
}
