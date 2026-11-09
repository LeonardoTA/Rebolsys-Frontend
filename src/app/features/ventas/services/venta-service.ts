import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { environment } from "../../../../environments/environment";
import { Pagina } from "../../../core/models/pagina-response";
import { Venta, VentaRequest, ReservaVenta } from "../models/venta.model";
import { VentaActualizar } from "../models/venta.model";
@Injectable({ providedIn: "root" })
export class VentaService {
  private http = inject(HttpClient);
  private base = environment.apiUrl + "/ventas";
  registrar(data: VentaRequest) {
    return this.http.post<Venta>(this.base, data);
  }
  obtener(id: number | string) {
    return this.http.get<Venta>(this.base + "/" + id);
  }
  actualizar(id: number | string, datos: VentaActualizar) {
    return this.http.put<Venta>(this.base + "/" + id, datos);
  }
  listar(pagina = 0, tamanio = 10) {
    return this.http.get<Pagina<Venta>>(this.base, {
      params: { pagina, tamanio },
    });
  }
  reservas(buscar = "") {
    return this.http.get<ReservaVenta[]>(this.base + "/reservas", {
      params: { buscar },
    });
  }
}
