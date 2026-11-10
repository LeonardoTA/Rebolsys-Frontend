import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Pagina } from '../../core/models/pagina-response';

export interface TipoCaja {
  idTipoMovimiento: number;
  nombre: string;
  signo: -1 | 1;
}

export interface ArqueoCaja {
  idFormaPago: number;
  formaPago: string;
  montoCalculado: number;
  montoDeclarado: number | null;
  diferencia: number | null;
}

export interface TurnoCaja {
  idTurno: number;
  fechaApertura: string;
  fechaCierre: string | null;
  montoBase: number;
  abierto: boolean;
  tipos: TipoCaja[];
  ingresosManuales: number;
  gastosManuales: number;
  arqueos: ArqueoCaja[];
  revision: string | null;
  bloqueoCierre: string | null;
}

export interface MovimientoCaja {
  idFlujo: number;
  tipo: string;
  signo: -1 | 1;
  concepto: string;
  monto: number;
  fechaHora: string;
  documentoRespaldo: string | null;
  evidencia: string | null;
}

export interface DatosMovimiento {
  idTipoMovimiento: number;
  concepto: string;
  monto: number;
  claveRegistro: string;
}

@Injectable({ providedIn: 'root' })
export class CajaApi {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl + '/caja';

  actual() { return this.http.get<TurnoCaja | null>(this.base + '/actual'); }

  turno(id: number) { return this.http.get<TurnoCaja>(`${this.base}/turnos/${id}`); }

  movimientos(id: number, pagina: number) {
    return this.http.get<Pagina<MovimientoCaja>>(`${this.base}/turnos/${id}/movimientos`, { params: { pagina } });
  }

  registrar(id: number, datos: DatosMovimiento, archivo: File | null) {
    const partes = new FormData();
    partes.append('datos', new Blob([JSON.stringify(datos)], { type: 'application/json' }));
    if (archivo) partes.append('archivo', archivo);
    return this.http.post<MovimientoCaja>(`${this.base}/turnos/${id}/movimientos`, partes);
  }

  cerrar(id: number, revision: string, arqueos: { idFormaPago: number; montoDeclarado: number }[]) {
    return this.http.post<TurnoCaja>(`${this.base}/turnos/${id}/cierre`, { revision, arqueos });
  }
}
