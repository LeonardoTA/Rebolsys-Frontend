import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { Pagina } from '../../../core/models/pagina-response';
import { Reserva, Registro } from '../models/reserva.model';
import { Comprobante } from '../models/comprobante.model';

@Injectable({ providedIn: 'root' })
export class ReservaService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  listar(pagina = 0, tamanio = 10, buscar = '', estado = '') {
    return this.http.get<Pagina<Reserva>>(`${this.base}/reservas`, {
      params: { pagina, tamanio, buscar, estado },
    });
  }
  obtener(ref: string) {
    return this.http.get<Reserva>(`${this.base}/reservas/${ref}`);
  }
  crear(data: Registro) {
    return this.http.post<Reserva>(`${this.base}/reservas`, data);
  }
  actualizar(ref: string, data: Registro) {
    return this.http.put<Reserva>(`${this.base}/reservas/${ref}`, data);
  }
  eliminar(ref: string) {
    return this.http.delete<void>(`${this.base}/reservas/${ref}`);
  }
  cancelar(ref: string, motivo: string, confirmarDevolucion: boolean) {
    return this.http.post<Reserva>(`${this.base}/reservas/${ref}/cancelacion`, {
      motivo,
      confirmarDevolucion,
    });
  }
  pagar(
    ref: string,
    clavePago: string,
    efectivoRecibido: number,
    montoPago?: number | null,
  ) {
    return this.http.post<Reserva>(`${this.base}/reservas/${ref}/pago`, {
      clavePago,
      montoPago,
      efectivoRecibido,
    });
  }
  comprobante(ref: string, idComprobante?: number) {
    return this.http.get<Comprobante>(
      `${this.base}/reservas/${ref}/comprobante`,
      { params: idComprobante ? { idComprobante } : {} },
    );
  }
}
