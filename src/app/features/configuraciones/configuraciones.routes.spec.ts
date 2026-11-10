import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import {
  Router,
  provideRouter,
  withComponentInputBinding,
} from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Observable, of } from 'rxjs';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { CONFIGURACIONES_ROUTES } from './configuraciones.routes';
import { PermisosUi } from '../../core/services/permisos-ui';
import {
  SesionActual,
  SesionService,
} from '../../core/services/sesion-service';
import { sesionGuard } from '../../core/services/sesion-guard';
import { HabitacionForm } from '../habitaciones/pages/habitacion-form/habitacion-form';
import { HabitacionConfigList } from '../habitaciones/pages/habitacion-config-list/habitacion-config-list';
import { InmobiliarioForm } from '../inmobiliario/pages/inmobiliario-form/inmobiliario-form';
import { InmobiliarioList } from '../inmobiliario/pages/inmobiliario-list/inmobiliario-list';
import { HabitacionConfiguracion } from '../habitaciones/models/habitacion.model';
import { Item } from '../inmobiliario/models/inmobiliario.model';

@Component({ template: 'Destino de acceso' })
class Destino {}
const tipos = [
  {
    idTipoHabitacion: 2,
    nombreTipo: 'Doble',
    capacidadMax: 4,
    precioBase: 120,
  },
];
const room: HabitacionConfiguracion = {
  idHabitacion: 8,
  numeroCuarto: '208',
  idTipoHabitacion: 2,
  nombreTipo: 'Doble',
  estadoHabitacion: 'DISPONIBLE',
  capacidadPersonas: 4,
  plazasCama: 3,
  maxMenoresSinCama: 1,
  precioBase: 99,
  precioPorNoche: 99,
};
const item: Item = {
  idItem: 9,
  nombreItem: 'Cama 208',
  idTipoItem: 1,
  estadoItem: 'En habitacion',
  idHabitacion: 8,
  estadoActualItem: 'BUENO',
  nombreTipo: 'Cama',
  numeroCuarto: '208',
};

describe('Reorganización sobre iteración 2: rutas, permisos y contratos', () => {
  let http: HttpTestingController;
  let acceso: PermisosUi;
  let sesion: {
    actual: PermisosUi['actual'];
    permite: (...p: string[]) => boolean;
    cargar: () => Observable<SesionActual>;
  };
  function permisos(...p: string[]) {
    acceso.actual.set({
      idUsuario: 42,
      usuario: 'operador42',
      modo: 'ACTIVA',
      idTurno: 1,
      idFormaPagoEfectivo: 1,
      gerente: false,
      permisos: p,
    });
  }
  beforeEach(() => {
    acceso = new PermisosUi();
    permisos(
      'HABITACIONES:VER',
      'HABITACIONES:CREAR',
      'HABITACIONES:EDITAR',
      'HABITACIONES:CAMBIAR_ESTADO',
      'MOBILIARIO:VER',
      'MOBILIARIO:CREAR',
      'MOBILIARIO:EDITAR',
      'MOBILIARIO:ASIGNAR',
    );
    sesion = {
      actual: acceso.actual,
      permite: (...p) => acceso.permite(...p),
      cargar: () => of(acceso.actual()!),
    };
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PermisosUi, useValue: acceso },
        { provide: SesionService, useValue: sesion },
        provideRouter(
          [
            { path: 'inicio', component: Destino },
            { path: 'login', component: Destino },
            { path: 'cambiar-contrasena', component: Destino },
            {
              path: 'configuraciones',
              canActivateChild: [sesionGuard],
              children: CONFIGURACIONES_ROUTES,
            },
          ],
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
  const crear = <T>(clase: new () => T) =>
    TestBed.runInInjectionContext(() => new clase());

  it.each([
    ['/configuraciones/habitaciones/nuevo', 'HABITACIONES:VER'],
    ['/configuraciones/habitaciones/8/editar', 'HABITACIONES:VER'],
    ['/configuraciones/mobiliario/nuevo', 'MOBILIARIO:VER'],
    ['/configuraciones/mobiliario/9/editar', 'MOBILIARIO:VER'],
  ])(
    'no permite acceder a %s con solo permiso de lectura',
    async (url, lectura) => {
      permisos(lectura);
      const h = await RouterTestingHarness.create(url);
      expect(TestBed.inject(Router).url).toBe('/inicio');
      expect(h.routeNativeElement?.textContent).toContain('Destino de acceso');
    },
  );

  it('mantiene el cambio obligatorio de contraseña antes de acceder al módulo', async () => {
    acceso.actual.update((s) => ({ ...s!, requiereCambio: true }));
    await RouterTestingHarness.create('/configuraciones/habitaciones/nuevo');
    expect(TestBed.inject(Router).url).toBe('/cambiar-contrasena');
  });

  it('abre el alta de habitación como página y prepara sus capacidades', async () => {
    const h = await RouterTestingHarness.create(
      '/configuraciones/habitaciones/nuevo',
    );
    http.expectOne('/api/v1/tipos-habitacion').flush(tipos);
    h.detectChanges();
    await h.fixture.whenStable();
    expect(
      h.routeNativeElement?.querySelector<HTMLInputElement>(
        '[name="capacidadPersonas"]',
      )?.value,
    ).toBe('4');
    expect(h.routeNativeElement?.querySelector('[role="dialog"]')).toBeNull();
  });

  it('carga por ID la tarifa propia y conserva el bloqueo visual de OCUPADO', async () => {
    const h = await RouterTestingHarness.create(
      '/configuraciones/habitaciones/8/editar',
    );
    http.expectOne('/api/v1/tipos-habitacion').flush(tipos);
    http
      .expectOne('/api/v1/habitaciones/8')
      .flush({ ...room, estadoHabitacion: 'OCUPADO' });
    h.detectChanges();
    await h.fixture.whenStable();
    expect(
      h.routeNativeElement?.querySelector<HTMLInputElement>(
        '[name="numeroCuarto"]',
      )?.value,
    ).toBe('208');
    expect(
      h.routeNativeElement?.querySelector<HTMLInputElement>(
        'input[value^="Ocupado"]',
      )?.disabled,
    ).toBe(true);
    expect(h.routeNativeElement?.querySelector('form')).not.toBeNull();
  });

  it('carga por ID un artículo usando el contrato nuevo sin idDetalleHabitacion', async () => {
    const h = await RouterTestingHarness.create(
      '/configuraciones/mobiliario/9/editar',
    );
    http.expectOne('/api/v1/habitaciones/configuracion').flush([room]);
    http
      .expectOne('/api/v1/tipos-item')
      .flush([{ idTipoItem: 1, nombreItem: 'Cama' }]);
    http.expectOne('/api/v1/items/9').flush(item);
    h.detectChanges();
    await h.fixture.whenStable();
    expect(
      h.routeNativeElement?.querySelector<HTMLInputElement>(
        '[name="nombreItem"]',
      )?.value,
    ).toBe('Cama 208');
    expect(h.routeNativeElement?.querySelector('[role="dialog"]')).toBeNull();
  });

  it('no consulta habitaciones si el operador de mobiliario no tiene permiso para verlas ni asignar', async () => {
    permisos('MOBILIARIO:VER', 'MOBILIARIO:CREAR');
    const h = await RouterTestingHarness.create(
      '/configuraciones/mobiliario/nuevo',
    );
    http.expectNone('/api/v1/habitaciones/configuracion');
    http
      .expectOne('/api/v1/tipos-item')
      .flush([{ idTipoItem: 1, nombreItem: 'Cama' }]);
    h.detectChanges();
    expect(
      h.routeNativeElement?.querySelector('[name="idHabitacion"]'),
    ).toBeNull();
  });

  it.each(['habitaciones', 'mobiliario'])(
    'rechaza un ID inválido al editar %s',
    async (area) => {
      const h = await RouterTestingHarness.create(
        `/configuraciones/${area}/abc/editar`,
      );
      h.detectChanges();
      expect(h.routeNativeElement?.textContent).toContain('no válido');
      expect(h.routeNativeElement?.querySelector('form')).toBeNull();
    },
  );

  it('muestra el 404 y vuelve a consultar al reintentar la edición', async () => {
    const h = await RouterTestingHarness.create(
      '/configuraciones/habitaciones/8/editar',
    );
    http.expectOne('/api/v1/tipos-habitacion').flush(tipos);
    http
      .expectOne('/api/v1/habitaciones/8')
      .flush(
        { message: 'Habitación no encontrada' },
        { status: 404, statusText: 'Not Found' },
      );
    h.detectChanges();
    expect(h.routeNativeElement?.textContent).toContain(
      'Habitación no encontrada',
    );
    Array.from(h.routeNativeElement!.querySelectorAll('button'))
      .find((b) => b.textContent?.includes('Reintentar'))!
      .click();
    http.expectOne('/api/v1/tipos-habitacion').flush(tipos);
    http.expectOne('/api/v1/habitaciones/8').flush(room);
    h.detectChanges();
    expect(h.routeNativeElement?.querySelector('form')).not.toBeNull();
  });

  it('navega desde el listado al formulario y vuelve al listado al cancelar', async () => {
    const pagina = {
      contenido: [room],
      pagina: 0,
      tamanio: 12,
      totalElementos: 1,
      totalPaginas: 1,
      ultima: true,
    };
    const h = await RouterTestingHarness.create(
      '/configuraciones/habitaciones',
    );
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
        '/configuraciones/habitaciones/nuevo',
      ),
    );
    http.expectOne('/api/v1/tipos-habitacion').flush(tipos);
    h.detectChanges();
    await h.fixture.whenStable();
    Array.from(h.routeNativeElement!.querySelectorAll('button'))
      .find((b) => b.textContent?.trim() === 'Cancelar')!
      .click();
    await vi.waitFor(() =>
      expect(TestBed.inject(Router).url).toBe('/configuraciones/habitaciones'),
    );
    http
      .expectOne((r) => r.url === '/api/v1/habitaciones/configuracion/pagina')
      .flush(pagina);
    http.expectOne('/api/v1/tipos-habitacion').flush(tipos);
  });

  it('conserva OCUPADO, tarifa propia y datos del formulario ante un conflicto al guardar', () => {
    const f = crear(HabitacionForm);
    f.tipos.set(tipos);
    f.abrirEditar({ ...room, estadoHabitacion: 'OCUPADO' });
    f.formEstado.set('DISPONIBLE');
    f.guardarHabitacion();
    const req = http.expectOne('/api/v1/habitaciones/8');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body.estadoHabitacion).toBe('OCUPADO');
    expect(req.request.body.precioPorNoche).toBe(99);
    req.flush(
      { message: 'Conflicto de configuración' },
      { status: 409, statusText: 'Conflict' },
    );
    expect(f.formNumero()).toBe('208');
    expect(f.formError()).toContain('Conflicto');
    expect(f.formOcupado()).toBe(false);
  });

  it.each([2, -1, 0.5])(
    'rechaza %s menores sin cama según la regla de iteración 2',
    (menores) => {
      const f = crear(HabitacionForm);
      f.tipos.set(tipos);
      f.abrirEditar(room);
      f.formMenoresSinCama.set(menores);
      expect(f.formValido()).toBe(false);
    },
  );
  it('limita a cero menores adicionales cuando todas las plazas ya ocupan la capacidad', () => {
    const f = crear(HabitacionForm);
    f.tipos.set(tipos);
    f.abrirEditar(room);
    f.onPlazasChange(4);
    expect(f.formMenoresSinCama()).toBe(0);
    expect(f.maximoMenoresSinCama()).toBe(0);
  });
  it.each([1.234, -1, 100000000])(
    'rechaza una tarifa propia inválida: %s',
    (tarifa) => {
      const f = crear(HabitacionForm);
      f.tipos.set(tipos);
      f.abrirEditar(room);
      f.formPrecioPorNoche.set(tarifa);
      expect(f.formValido()).toBe(false);
    },
  );
  it('bloquea el retiro de una habitación ocupada sin enviar peticiones', () => {
    const f = crear(HabitacionConfigList);
    f.abrirRetiro({ ...room, estadoHabitacion: 'OCUPADO' });
    expect(f.retirandoVisible()).toBe(false);
  });
  it('retira con PATCH MANTENIMIENTO y mantiene el diálogo si el servidor rechaza el cambio', () => {
    const f = crear(HabitacionConfigList);
    f.abrirRetiro(room);
    f.confirmarRetiro();
    const r = http.expectOne('/api/v1/habitaciones/8/estado');
    expect(r.request.method).toBe('PATCH');
    expect(r.request.body.estadoHabitacion).toBe('MANTENIMIENTO');
    r.flush(
      { message: 'Hay una estancia activa' },
      { status: 409, statusText: 'Conflict' },
    );
    expect(f.retirandoVisible()).toBe(true);
  });

  it('reintenta la asignación sin duplicar el alta y usa al responsable de la sesión', () => {
    const f = crear(InmobiliarioForm);
    f.tiposItem.set([{ idTipoItem: 1, nombreItem: 'Cama' }]);
    f.abrirRegistrar();
    f.formNombreItem = 'Cama nueva';
    f.formDestino = 'habitacion';
    f.formIdHabitacion = 8;
    f.formObservacion = 'Asignación de prueba';
    f.guardarRegistro();
    const alta = http.expectOne('/api/v1/items');
    expect(alta.request.method).toBe('POST');
    alta.flush({ ...item, idItem: 99 });
    const asignacion = http.expectOne('/api/v1/items/99/asignacion');
    expect(asignacion.request.body.idUsuario).toBe(42);
    const clave = asignacion.request.body.claveOperacion;
    asignacion.flush(
      { message: 'Reintentar' },
      { status: 409, statusText: 'Conflict' },
    );
    expect(f.creadoIdItem()).toBe(99);
    f.guardarRegistro();
    http.expectNone('/api/v1/items');
    const retry = http.expectOne('/api/v1/items/99/asignacion');
    expect(retry.request.body.claveOperacion).toBe(clave);
    retry.flush(
      { message: 'Temporal' },
      { status: 503, statusText: 'Unavailable' },
    );
    expect(f.registroError()).toContain('asignación');
  });

  it('en una baja parcial reintenta solo DELETE, conservando el retiro previo', () => {
    const f = crear(InmobiliarioList);
    f.abrirBaja(item);
    f.bajaObservacion = 'Daño irreparable';
    f.ejecutarBaja();
    const retiro = http.expectOne('/api/v1/items/9/asignacion');
    expect(retiro.request.body.idUsuario).toBe(42);
    expect(retiro.request.body.idHabitacion).toBeNull();
    retiro.flush({ ...item, idHabitacion: null, estadoItem: 'Activo' });
    http
      .expectOne('/api/v1/items/9')
      .flush({ message: 'Temporal' }, { status: 500, statusText: 'Error' });
    expect(f.bajaPendienteDesactivacion()).toBe(true);
    f.ejecutarBaja();
    http.expectNone('/api/v1/items/9/asignacion');
    const retry = http.expectOne('/api/v1/items/9');
    expect(retry.request.method).toBe('DELETE');
    retry.flush({ message: 'Temporal' }, { status: 500, statusText: 'Error' });
  });
});
