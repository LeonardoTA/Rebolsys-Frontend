import { HttpErrorResponse } from '@angular/common/http';
import { ErrorResponse } from '../models/error-response';

export function erroresDeValidacion(
  err: HttpErrorResponse,
): Record<string, string> {
  const respuesta = err.error as Partial<ErrorResponse> | null;
  return respuesta?.validationErrors ?? {};
}

export function mensajeError(err: HttpErrorResponse): string {
  if (err.status === 0 || err.status === 502 || err.status === 504) {
    return 'No se pudo conectar con REBOLSYS. Comprueba que el backend esté iniciado.';
  }
  const validaciones = Object.values(erroresDeValidacion(err));
  if (validaciones.length) {
    return [...new Set(validaciones)].join('. ');
  }
  const respuesta = err.error as Partial<ErrorResponse> | null;
  return respuesta?.message || `Error ${err.status}: ${err.statusText}`;
}
