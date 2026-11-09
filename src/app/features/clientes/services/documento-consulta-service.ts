import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

import { DocumentoConsulta } from '../models/documento-consulta.model';

@Injectable({ providedIn: 'root' })
export class DocumentoConsultaService {
  private readonly http = inject(HttpClient);

  consultar(tipo: 'DNI' | 'RUC', numero: string) {
    return this.http.get<DocumentoConsulta>(
      `${environment.apiUrl}/documentos/${tipo.toLowerCase()}/${encodeURIComponent(numero)}`,
    );
  }
}
