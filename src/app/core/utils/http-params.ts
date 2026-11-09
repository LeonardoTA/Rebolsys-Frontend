import { HttpParams } from '@angular/common/http';
import { FiltrosConsulta } from '../models/filtros-consulta';

export function parametrosConsulta(filtros: FiltrosConsulta): HttpParams {
  let params = new HttpParams();
  for (const [nombre, valor] of Object.entries(filtros)) {
    if (valor !== null && valor !== undefined && valor !== '')
      params = params.set(nombre, valor);
  }
  return params;
}
