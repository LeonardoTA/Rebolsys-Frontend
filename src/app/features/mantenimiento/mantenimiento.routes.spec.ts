import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import {
  Router,
  provideRouter,
  withComponentInputBinding,
} from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MANTENIMIENTO_ROUTES } from './mantenimiento.routes';

const tipos = [
  {
    idTipoHabitacion: 2,
    nombreTipo: 'Doble',
    capacidadMax: 4,
    precioBase: 120,
  },
];
const habitacion = {
  idHabitacion: 8,
  numeroCuarto: '208',
  idTipoHabitacion: 2,
  nombreTipo: 'Doble',
  estadoHabitacion: 'OCUPADO',
  capacidadPersonas: 3,
  plazasCama: 2,
  maxMenoresSinCama: 1,
  precioBase: 120,
  imagenRuta: '/api/v1/imagenes/habitaciones/8.png',
};

describe('Navegación de mantenimiento con páginas independientes', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter(
          [{ path: 'mantenimiento', children: MANTENIMIENTO_ROUTES }],
          withComponentInputBinding(),
        ),
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => {
    http.verify();
    TestBed.resetTestingModule();
  });

  it('abre directamente una edición de habitación, consulta datos actuales y conserva OCUPADO', async () => {
    const h = await RouterTestingHarness.create(
      '/mantenimiento/habitaciones/8/editar',
    );
    http.expectOne('/api/v1/tipos-habitacion').flush(tipos);
    http.expectOne('/api/v1/habitaciones/8').flush(habitacion);
    h.detectChanges();
    await h.fixture.whenStable();
    expect(
      h.routeNativeElement?.querySelector<HTMLInputElement>(
        '[name="numeroCuarto"]',
      )?.value,
    ).toBe('208');
    const estadoOcupado = h.routeNativeElement?.querySelector<HTMLInputElement>(
      'input[value^="Ocupado"]',
    );
    expect(estadoOcupado?.disabled).toBe(true);
    expect(
      h.routeNativeElement?.querySelector('app-imagen-upload'),
    ).not.toBeNull();
    expect(h.routeNativeElement?.querySelector('[role="dialog"]')).toBeNull();
  });

  it('abre el alta de habitación sin consultar un ID y prepara capacidad según el tipo', async () => {
    const h = await RouterTestingHarness.create(
      '/mantenimiento/habitaciones/nuevo',
    );
    http.expectOne('/api/v1/tipos-habitacion').flush(tipos);
    http.expectNone('/api/v1/habitaciones/nuevo');
    h.detectChanges();
    await h.fixture.whenStable();
    expect(
      h.routeNativeElement?.querySelector<HTMLInputElement>(
        '[name="capacidadPersonas"]',
      )?.value,
    ).toBe('4');
    expect(h.routeNativeElement?.textContent).toContain('Registrar habitación');
  });

  it('mantiene el error de carga al entrar por un ID inexistente y permite reintentar', async () => {
    const h = await RouterTestingHarness.create(
      '/mantenimiento/habitaciones/999/editar',
    );
    http.expectOne('/api/v1/tipos-habitacion').flush(tipos);
    http
      .expectOne('/api/v1/habitaciones/999')
      .flush(
        { message: 'Habitación no encontrada' },
        { status: 404, statusText: 'Not Found' },
      );
    h.detectChanges();
    expect(h.routeNativeElement?.textContent).toContain(
      'Habitación no encontrada',
    );
    const retry = Array.from(
      h.routeNativeElement!.querySelectorAll('button'),
    ).find((b) => b.textContent?.includes('Reintentar'))!;
    retry.click();
    http.expectOne('/api/v1/tipos-habitacion').flush(tipos);
    http
      .expectOne('/api/v1/habitaciones/999')
      .flush({ ...habitacion, idHabitacion: 999 });
    h.detectChanges();
    await h.fixture.whenStable();
    expect(h.routeNativeElement?.querySelector('form')).not.toBeNull();
  });

  it('abre directamente la edición de mobiliario con el estado y los datos de la API', async () => {
    const h = await RouterTestingHarness.create(
      '/mantenimiento/inmobiliario/9/editar',
    );
    http.expectOne('/api/v1/habitaciones/configuracion').flush([habitacion]);
    http
      .expectOne('/api/v1/tipos-item')
      .flush([{ idTipoItem: 1, nombreItem: 'Cama' }]);
    http
      .expectOne('/api/v1/recepcion/catalogos')
      .flush({ usuarios: [{ id: 1, nombre: 'Operador' }] });
    http.expectOne('/api/v1/items/9').flush({
      idItem: 9,
      nombreItem: 'Cama 208',
      idTipoItem: 1,
      estadoItem: 'En habitacion',
      idHabitacion: 8,
      estadoActualItem: 'BUENO',
      nombreTipo: 'Cama',
      numeroCuarto: '208',
      idDetalleHabitacion: 10,
    });
    h.detectChanges();
    await h.fixture.whenStable();
    expect(
      h.routeNativeElement?.querySelector<HTMLInputElement>(
        '[name="nombreItem"]',
      )?.value,
    ).toBe('Cama 208');
    expect(h.routeNativeElement?.textContent).toContain('Editar artículo #9');
    expect(h.routeNativeElement?.querySelector('[role="dialog"]')).toBeNull();
  });

  it('navega desde el listado al alta y vuelve al cancelar, recargando la lista', async () => {
    const h = await RouterTestingHarness.create('/mantenimiento/habitaciones');
    const pagina = {
      contenido: [habitacion],
      pagina: 0,
      tamanio: 12,
      totalElementos: 1,
      totalPaginas: 1,
      ultima: true,
    };
    http
      .expectOne((r) => r.url === '/api/v1/habitaciones/configuracion/pagina')
      .flush(pagina);
    http.expectOne('/api/v1/tipos-habitacion').flush(tipos);
    h.detectChanges();
    Array.from(h.routeNativeElement!.querySelectorAll('button'))
      .find((b) => b.textContent?.includes('Registrar habitación'))!
      .click();
    await vi.waitFor(() =>
      expect(TestBed.inject(Router).url).toBe(
        '/mantenimiento/habitaciones/nuevo',
      ),
    );
    http.expectOne('/api/v1/tipos-habitacion').flush(tipos);
    h.detectChanges();
    await h.fixture.whenStable();
    Array.from(h.routeNativeElement!.querySelectorAll('button'))
      .find((b) => b.textContent?.trim() === 'Cancelar')!
      .click();
    await vi.waitFor(() =>
      expect(TestBed.inject(Router).url).toBe('/mantenimiento/habitaciones'),
    );
    http
      .expectOne((r) => r.url === '/api/v1/habitaciones/configuracion/pagina')
      .flush(pagina);
    http.expectOne('/api/v1/tipos-habitacion').flush(tipos);
    h.detectChanges();
    expect(h.routeNativeElement?.textContent).toContain(
      'Catálogo de habitaciones',
    );
  });

  it('rechaza IDs inválidos antes de consultar o mostrar un formulario de edición', async () => {
    const h = await RouterTestingHarness.create(
      '/mantenimiento/inmobiliario/abc/editar',
    );
    http.expectNone('/api/v1/items/NaN');
    h.detectChanges();
    expect(h.routeNativeElement?.textContent).toContain(
      'Identificador de artículo no válido',
    );
    expect(h.routeNativeElement?.querySelector('form')).toBeNull();
  });
});
