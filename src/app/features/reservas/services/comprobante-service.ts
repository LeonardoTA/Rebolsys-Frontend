import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { environment } from "../../../../environments/environment";
import { CuentaDocumento } from "../models/reserva-api.model";
import { Emision, PrepararEmision } from "../models/emision.model";

@Injectable({ providedIn: "root" })
export class ComprobanteService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;
  configuracion() {
    return this.http.get<{
      ambiente: string;
      habilitada: boolean;
      configuracionPendiente: string[];
    }>(this.base + "/facturacion/configuracion");
  }
  emitir(
    idReserva: number,
    datos: {
      idUsuario: number;
      idTurno: number;
      tipo: string;
      idClienteReceptor: number;
      idVenta?: number;
    },
  ) {
    return this.http.post<CuentaDocumento>(
      `${this.base}/reservas/${idReserva}/comprobantes`,
      datos,
    );
  }
  estado(id: number) {
    return this.http.get<Emision>(
      `${this.base}/comprobantes/${id}/emision-electronica`,
    );
  }
  preparar(id: number, datos: PrepararEmision) {
    return this.http.post<Emision>(
      `${this.base}/comprobantes/${id}/emision-electronica`,
      datos,
    );
  }
  enviar(id: number, idUsuario: number) {
    return this.http.post<Emision>(
      `${this.base}/comprobantes/${id}/emision-electronica/envio`,
      { idUsuario },
    );
  }
  consultar(id: number, idUsuario: number) {
    return this.http.post<Emision>(
      `${this.base}/comprobantes/${id}/emision-electronica/consulta`,
      { idUsuario },
    );
  }
  archivo(id: number, tipo: "xml" | "cdr" | "pdf") {
    return this.http.get(
      `${this.base}/comprobantes/${id}/emision-electronica/${tipo}`,
      { responseType: "blob" },
    );
  }
}
