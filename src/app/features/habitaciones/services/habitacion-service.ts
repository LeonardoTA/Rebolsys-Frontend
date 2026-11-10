import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { environment } from "../../../../environments/environment";
import { Habitacion, OcupacionHabitacion, MobiliarioHabitacion } from "../models/habitacion.model";
import { concatMap, map } from "rxjs";

interface HabitacionConfiguracion extends OcupacionHabitacion {
  idHabitacion: number;
  numeroCuarto: string;
  idTipoHabitacion: number;
  estadoHabitacion: string;
}

@Injectable({ providedIn: "root" })
export class HabitacionService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  listar(desde: string, hasta: string) {
    return this.http.get<Habitacion[]>(`${this.base}/habitaciones`, {
      params: { desde, hasta },
    }).pipe(map((habitaciones) => [...habitaciones].sort((a,b) =>
      a.numero.localeCompare(b.numero, 'es', {numeric:true}))));
  }

  actualizarOcupacion(id: number, datos: OcupacionHabitacion) {
    const url = this.base + "/habitaciones/" + id;
    return this.http.get<HabitacionConfiguracion>(url).pipe(
      concatMap((actual) =>
        this.http.put<HabitacionConfiguracion>(url, {
          numeroCuarto: actual.numeroCuarto,
          idTipoHabitacion: actual.idTipoHabitacion,
          estadoHabitacion: actual.estadoHabitacion,
          ...datos,
        }),
      ),
    );
  }
  mobiliario(id: number) {
    return this.http.get<MobiliarioHabitacion[]>(`${this.base}/habitaciones/${id}/items`);
  }
}
