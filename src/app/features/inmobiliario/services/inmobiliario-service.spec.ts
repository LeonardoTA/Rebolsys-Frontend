import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { InmobiliarioService } from './inmobiliario-service';

describe('InmobiliarioService: contrato de la API', () => {
  let service: InmobiliarioService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(InmobiliarioService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('conserva pagina cero, filtros booleanos false y búsquedas literales', () => {
    service
      .items({
        pagina: 0,
        tamanio: 10,
        buscar: '%_!',
        sinAsignar: false,
        idHabitacion: null,
        estado: '',
      })
      .subscribe();
    const req = http.expectOne((r) => r.url === '/api/v1/items/configuracion');
    expect(req.request.params.get('pagina')).toBe('0');
    expect(req.request.params.get('sinAsignar')).toBe('false');
    expect(req.request.params.get('buscar')).toBe('%_!');
    expect(req.request.params.has('idHabitacion')).toBe(false);
    expect(req.request.params.has('estado')).toBe(false);
    req.flush({
      contenido: [],
      pagina: 0,
      tamanio: 10,
      totalElementos: 0,
      totalPaginas: 0,
      ultima: true,
    });
  });
  it('retira mobiliario con su condición final y clave para un reintento seguro', () => {
    const datos = {
      claveOperacion: 'baja-001',
      idUsuario: 4,
      idHabitacion: null,
      estadoActualItem: 'FALTANTE' as const,
      observacion: 'Pérdida confirmada',
    };
    service.asignarItem(5, datos).subscribe();
    const req = http.expectOne('/api/v1/items/5/asignacion');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(datos);
    req.flush({
      idItem: 5,
      estadoItem: 'Activo',
      estadoActualItem: 'FALTANTE',
      idHabitacion: null,
    });
  });
  it('consulta el historial conservado de una unidad dada de baja', () => {
    const historial = [
      {
        idMovimiento: 12,
        usuario: 'gerente',
        estadoConservacion: 'DANADO',
        numeroOrigen: '201',
      },
    ];
    let respuesta: unknown;
    service.historialItem(5).subscribe((r) => (respuesta = r));
    const req = http.expectOne('/api/v1/items/5/historial');
    expect(req.request.method).toBe('GET');
    req.flush(historial);
    expect(respuesta).toEqual(historial);
  });
});
