import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { HabitacionService } from './habitacion-service';

describe('HabitacionService: contrato de la API', () => {
  let service: HabitacionService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(HabitacionService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('retira de la oferta mediante MANTENIMIENTO sin eliminar la habitación', () => {
    service.cambiarEstadoHabitacion(8, 'MANTENIMIENTO').subscribe();
    const req = http.expectOne('/api/v1/habitaciones/8/estado');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ estadoHabitacion: 'MANTENIMIENTO' });
    req.flush({ idHabitacion: 8, estadoHabitacion: 'MANTENIMIENTO' });
  });
  it('propaga el conflicto de una habitación ocupada para mantener abierto el formulario', () => {
    let status: number | undefined;
    service
      .cambiarEstadoHabitacion(8, 'MANTENIMIENTO')
      .subscribe({ error: (e) => (status = e.status) });
    http
      .expectOne('/api/v1/habitaciones/8/estado')
      .flush(
        { mensaje: 'La habitación tiene una estancia en curso' },
        { status: 409, statusText: 'Conflict' },
      );
    expect(status).toBe(409);
  });
});
