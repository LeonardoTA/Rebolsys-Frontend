import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TipoItemService } from './tipo-item-service';

describe('TipoItemService: contrato de la API', () => {
  let service: TipoItemService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(TipoItemService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('crea tipos de mobiliario con nombreItem, como exige el contrato', () => {
    service.crearTipoItem('Televisor').subscribe();
    const req = http.expectOne('/api/v1/tipos-item');
    expect(req.request.body).toEqual({ nombreItem: 'Televisor' });
    req.flush({ idTipoItem: 3, nombreItem: 'Televisor' });
  });
});
