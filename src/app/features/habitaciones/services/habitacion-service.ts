import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { Habitacion, OcupacionHabitacion } from '../models/habitacion.model';

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
}
