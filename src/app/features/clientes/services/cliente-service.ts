import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { Cliente } from '../models/cliente.model';

@Injectable({ providedIn: 'root' })
export class ClienteService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  buscarPorDocumento(tipo: number, documento: string) {
    return this.http.get<Cliente>(`${this.base}/recepcion/clientes`, {
      params: { tipoDocumento: tipo, numeroDocumento: documento },
    });
  }
}
