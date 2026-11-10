import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { environment } from "../../../../environments/environment";
import {
  HabitacionConfig,
  ItemConfig,
  CatalogosConfig,
  TipoHabitacion,
  TipoItem,
} from "../models/configuracion.model";
@Injectable({ providedIn: "root" })
export class ConfiguracionService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;
  catalogos() {
    return this.http.get<CatalogosConfig>(
      this.base + "/configuraciones/catalogos",
    );
  }
  habitaciones() {
    return this.http.get<HabitacionConfig[]>(
      this.base + "/habitaciones/configuracion",
    );
  }
  mobiliario() {
    return this.http.get<ItemConfig[]>(this.base + "/items");
  }
  guardarHabitacion(
    id: number | null,
    datos: Omit<HabitacionConfig, "idHabitacion" | "nombreTipo" | "precioBase">,
  ) {
    return id
      ? this.http.put<HabitacionConfig>(
          this.base + "/habitaciones/" + id,
          datos,
        )
      : this.http.post<HabitacionConfig>(this.base + "/habitaciones", datos);
  }
  guardarItem(
    id: number | null,
    datos: { nombreItem: string; idTipoItem: number; estadoItem: string },
  ) {
    return id
      ? this.http.put<ItemConfig>(this.base + "/items/" + id, datos)
      : this.http.post<ItemConfig>(this.base + "/items", datos);
  }
  asignar(
    id: number,
    datos: {
      claveOperacion: string;
      idUsuario: number;
      idHabitacion: number | null;
      estadoActualItem: string;
      observacion: string;
    },
  ) {
    return this.http.put<ItemConfig>(
      `${this.base}/items/${id}/asignacion`,
      datos,
    );
  }
  conservacion(
    id: number,
    datos: {
      claveOperacion: string;
      idUsuario: number;
      estadoActualItem: string;
      observacion: string;
    },
  ) {
    return this.http.put<ItemConfig>(
      `${this.base}/items/${id}/conservacion`,
      datos,
    );
  }
  desactivarItem(id: number) {
    return this.http.delete<void>(this.base + "/items/" + id);
  }
  crearTipoHabitacion(datos: {
    nombreTipo: string;
    capacidadMax: number;
    precioBase: number;
  }) {
    return this.http.post<TipoHabitacion>(
      this.base + "/tipos-habitacion",
      datos,
    );
  }
  crearTipoItem(nombreItem: string) {
    return this.http.post<TipoItem>(this.base + "/tipos-item", { nombreItem });
  }
}
