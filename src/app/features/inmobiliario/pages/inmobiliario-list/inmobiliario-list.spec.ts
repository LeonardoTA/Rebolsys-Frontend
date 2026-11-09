import { HttpErrorResponse } from '@angular/common/http';
import '@angular/compiler';
import {
  createEnvironmentInjector,
  runInInjectionContext,
} from '@angular/core';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CatalogoService } from '../../../../core/services/catalogo-service';
import { NotificacionService } from '../../../../core/services/notificacion.service';
import { HabitacionConfiguracion } from '../../../habitaciones/models/habitacion.model';
import { HabitacionService } from '../../../habitaciones/services/habitacion-service';
import { TipoItem } from '../../../tipos-inmobiliario/models/tipo-item.model';
import { TipoItemService } from '../../../tipos-inmobiliario/services/tipo-item-service';
import { Item, ItemHistorial } from '../../models/inmobiliario.model';
import { InmobiliarioService } from '../../services/inmobiliario-service';
import { InmobiliarioList } from './inmobiliario-list';
describe('InmobiliarioList - CU_22', () => {
  const routerMock = { navigate: vi.fn().mockResolvedValue(true) };
  let component: InmobiliarioList;

  let mantenimientoMock: any;

  let avisosMock: { mostrar: ReturnType<typeof vi.fn> };

  const itemAsignado: Item = {
    idItem: 10,
    nombreItem: 'Cama individual 01',
    idTipoItem: 1,
    estadoItem: 'En habitacion',
    idDetalleHabitacion: 100,
    idHabitacion: 201,
    estadoActualItem: 'BUENO',
    nombreTipo: 'Cama',
    numeroCuarto: '201',
  };

  const itemAlmacen: Item = {
    idItem: 20,
    nombreItem: 'Silla ergonómica',
    idTipoItem: 2,
    estadoItem: 'Activo',
    idDetalleHabitacion: null,
    idHabitacion: null,
    estadoActualItem: 'BUENO',
    nombreTipo: 'Silla',
    numeroCuarto: null,
  };

  const tiposEjemplo: TipoItem[] = [
    { idTipoItem: 1, nombreItem: 'Cama' },
    { idTipoItem: 2, nombreItem: 'Silla' },
  ];

  const operadoresEjemplo = [
    { id: 1, nombre: 'Juan Recepcionista' },
    { id: 2, nombre: 'Ana Administradora' },
  ];

  beforeEach(() => {
    routerMock.navigate.mockClear();
    avisosMock = { mostrar: vi.fn() };
    mantenimientoMock = {
      habitacionesTodas: vi.fn().mockReturnValue(of([])),
      tiposItem: vi.fn().mockReturnValue(of(tiposEjemplo)),
      operadores: vi.fn().mockReturnValue(of({ usuarios: operadoresEjemplo })),
      items: vi.fn().mockReturnValue(
        of({
          contenido: [itemAsignado, itemAlmacen],
          totalElementos: 2,
          totalPaginas: 1,
          pagina: 0,
          tamanio: 10,
          ultima: true,
        }),
      ),
      asignarItem: vi.fn().mockReturnValue(of(itemAsignado)),
      desactivarItem: vi.fn().mockReturnValue(of(undefined)),
      guardarItem: vi.fn().mockReturnValue(of({ ...itemAlmacen, idItem: 30 })),
      guardarTipoItem: vi
        .fn()
        .mockReturnValue(of({ idTipoItem: 5, nombreItem: 'Frigobar' })),
      historialItem: vi.fn().mockReturnValue(of([])),
      conservarItem: vi.fn().mockReturnValue(of(itemAsignado)),
    };

    const injector = createEnvironmentInjector(
      [
        { provide: InmobiliarioService, useValue: mantenimientoMock },
        { provide: HabitacionService, useValue: mantenimientoMock },
        { provide: TipoItemService, useValue: mantenimientoMock },
        { provide: CatalogoService, useValue: mantenimientoMock },
        { provide: Router, useValue: routerMock },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap({}) } },
        },
        { provide: NotificacionService, useValue: avisosMock },
      ],
      {
        get: (token: any, notFoundValue?: any) => notFoundValue,
      } as any,
    );

    runInInjectionContext(injector, () => {
      component = new InmobiliarioList();
    });
    component.ngOnInit();
  });

  it('inicializa catálogos y lista desde los servicios reales', () => {
    expect(component.tiposItem()).toEqual(tiposEjemplo);
    expect(component.operadores()).toEqual(operadoresEjemplo);
    expect(component.respuesta()?.contenido.length).toBe(2);
    expect(component.cargando()).toBe(false);
  });

  describe('Baja por daño o pérdida', () => {
    it('ejecuta proceso en 2 etapas para unidad asignada (PUT /asignacion y DELETE /items)', () => {
      component.abrirBaja(itemAsignado);
      component.bajaCondicionFinal = 'DANADO';
      component.bajaIdUsuario = 1;
      component.bajaObservacion = 'Pata rota irreparable';

      const claveUsada = component.bajaClaveOperacion;
      expect(claveUsada).toBeTruthy();

      component.ejecutarBaja();

      // Etapa 1: Retiro de habitación con idHabitacion: null y condición DANADO
      expect(mantenimientoMock.asignarItem).toHaveBeenCalledWith(10, {
        claveOperacion: claveUsada,
        idUsuario: 1,
        idHabitacion: null,
        estadoActualItem: 'DANADO',
        observacion: 'Pata rota irreparable',
      });

      // Etapa 2: Desactivación física
      expect(mantenimientoMock.desactivarItem).toHaveBeenCalledWith(10);
      expect(avisosMock.mostrar).toHaveBeenCalledWith(
        'Artículo retirado de la habitación y dado de baja correctamente. Su historial se conserva.',
      );
      expect(component.modalBaja()).toBe(false);
    });

    it('maneja fallo parcial en etapa 2: comunica retiro exitoso, no afirma baja completa y permite reintentar desactivación', () => {
      // Simular fallo en etapa 2
      mantenimientoMock.desactivarItem = vi.fn().mockReturnValue(
        throwError(
          () =>
            new HttpErrorResponse({
              status: 500,
              statusText: 'Internal Server Error',
            }),
        ),
      );

      component.abrirBaja(itemAsignado);
      component.bajaCondicionFinal = 'FALTANTE';
      component.bajaIdUsuario = 2;
      component.bajaObservacion =
        'No se encuentra en la habitación durante checkout';

      component.ejecutarBaja();

      // Etapa 1 se ejecutó con éxito
      expect(mantenimientoMock.asignarItem).toHaveBeenCalled();
      expect(component.bajaRetiradoExitoso()).toBe(true);

      // Etapa 2 falló
      expect(component.bajaPendienteDesactivacion()).toBe(true);
      expect(component.modalBaja()).toBe(true);
      expect(component.bajaError()).toContain('fue retirada de la habitación');
      expect(component.bajaError()).toContain('Falta desactivar');

      // Reintento: solo debe llamar a desactivarItem, sin duplicar asignarItem
      mantenimientoMock.asignarItem.mockClear();
      mantenimientoMock.desactivarItem = vi.fn().mockReturnValue(of(undefined));

      component.ejecutarBaja();

      expect(mantenimientoMock.asignarItem).not.toHaveBeenCalled();
      expect(mantenimientoMock.desactivarItem).toHaveBeenCalledWith(10);
      expect(component.modalBaja()).toBe(false);
    });

    it('ejecuta desactivación directa en unidad de almacén sin inventar persistencia de condición no admitida', () => {
      component.abrirBaja(itemAlmacen);
      component.ejecutarBaja();

      expect(mantenimientoMock.asignarItem).not.toHaveBeenCalled();
      expect(mantenimientoMock.desactivarItem).toHaveBeenCalledWith(20);
      expect(avisosMock.mostrar).toHaveBeenCalledWith(
        'Unidad desactivada correctamente. Su historial se conserva.',
      );
    });
  });

  describe('Idempotencia y reutilización de claveOperacion', () => {
    it('reutiliza claveOperacion al reintentar con mismos datos y genera nueva clave si cambian los datos', () => {
      component.abrirBaja(itemAsignado);
      component.bajaCondicionFinal = 'DANADO';
      component.bajaIdUsuario = 1;
      component.bajaObservacion = 'Observación original';

      // Simular error en etapa 1
      mantenimientoMock.asignarItem = vi.fn().mockReturnValue(
        throwError(
          () =>
            new HttpErrorResponse({
              status: 504,
              statusText: 'Gateway Timeout',
            }),
        ),
      );

      const clave1 = component.bajaClaveOperacion;
      component.ejecutarBaja();
      expect(component.bajaError()).toBeTruthy();

      // Reintento con los mismos datos -> conserva clave1
      mantenimientoMock.asignarItem = vi.fn().mockReturnValue(of(itemAsignado));
      component.ejecutarBaja();
      expect(component.bajaClaveOperacion).toBe(clave1);

      // Ahora cambiar un dato (condición a FALTANTE) -> genera nueva clave
      component.abrirBaja(itemAsignado);
      component.bajaCondicionFinal = 'DANADO';
      component.bajaIdUsuario = 1;
      component.bajaObservacion = 'Observación inicial';
      const claveInicial = component.bajaClaveOperacion;

      mantenimientoMock.asignarItem = vi
        .fn()
        .mockReturnValue(
          throwError(
            () => new HttpErrorResponse({ status: 500, statusText: 'Error' }),
          ),
        );
      component.ejecutarBaja();

      // El usuario edita la observación
      component.bajaObservacion = 'Observación corregida con más detalles';
      mantenimientoMock.asignarItem = vi.fn().mockReturnValue(of(itemAsignado));
      component.ejecutarBaja();

      expect(component.bajaClaveOperacion).not.toBe(claveInicial);
    });
  });

  describe('Consulta de detalle e historial de unidad', () => {
    it('muestra FALTANTE como Perdido/faltante y carga historial completo de movimientos', () => {
      const itemFaltante: Item = {
        ...itemAsignado,
        idItem: 55,
        estadoActualItem: 'FALTANTE',
        estadoItem: 'Inactivo',
      };

      const historialMock: ItemHistorial[] = [
        {
          idMovimiento: 1,
          accion: 'RETIRO',
          idUsuario: 1,
          usuario: 'juan',
          fechaMovimiento: '2026-11-08T10:00:00',
          idHabitacionOrigen: 201,
          numeroOrigen: '201',
          idHabitacionDestino: null,
          numeroDestino: null,
          estadoConservacion: 'FALTANTE',
          observacion: 'Desaparición en checkout',
        },
      ];

      mantenimientoMock.historialItem = vi
        .fn()
        .mockReturnValue(of(historialMock));

      component.abrirDetalle(itemFaltante);

      expect(component.modalDetalle()).toBe(true);
      expect(component.textoCondicion(itemFaltante.estadoActualItem)).toBe(
        'Perdido/faltante',
      );
      expect(mantenimientoMock.historialItem).toHaveBeenCalledWith(55);
      expect(component.historial()).toEqual(historialMock);
      expect(component.cargandoHistorial()).toBe(false);
    });
  });

  describe('Operaciones de asignación, traslado y retiro', () => {
    it('asigna una unidad de almacén a una habitación con su condición y operador', () => {
      component.abrirAsignacion(itemAlmacen, 'asignar');
      component.asigIdHabitacion = 102;
      component.asigIdUsuario = 1;
      component.asigEstadoActualItem = 'BUENO';
      component.asigObservacion = 'Asignación inicial habitación 102';

      component.guardarAsignacion();

      expect(mantenimientoMock.asignarItem).toHaveBeenCalledWith(
        20,
        expect.objectContaining({
          idHabitacion: 102,
          idUsuario: 1,
          estadoActualItem: 'BUENO',
          observacion: 'Asignación inicial habitación 102',
        }),
      );
      expect(avisosMock.mostrar).toHaveBeenCalledWith(
        'Artículo asignado a la habitación exitosamente.',
      );
      expect(component.modalAsignacion()).toBe(false);
    });

    it('impide traslado a la misma habitación que ya tiene asignada', () => {
      component.abrirAsignacion(itemAsignado, 'trasladar');
      component.asigIdHabitacion = 201; // misma habitación
      component.asigIdUsuario = 1;
      component.asigObservacion = 'Intento de traslado';

      component.guardarAsignacion();

      expect(component.asigError()).toContain('diferente a la actual');
      expect(mantenimientoMock.asignarItem).not.toHaveBeenCalled();
    });

    it('retira unidad hacia almacén enviando idHabitacion null', () => {
      component.abrirAsignacion(itemAsignado, 'retirar');
      component.asigIdUsuario = 2;
      component.asigEstadoActualItem = 'BUENO';
      component.asigObservacion = 'Retiro por renovación de habitación';

      component.guardarAsignacion();

      expect(mantenimientoMock.asignarItem).toHaveBeenCalledWith(
        10,
        expect.objectContaining({
          idHabitacion: null,
          idUsuario: 2,
          observacion: 'Retiro por renovación de habitación',
        }),
      );
      expect(avisosMock.mostrar).toHaveBeenCalledWith(
        'Artículo retirado de la habitación hacia almacén.',
      );
      expect(component.modalAsignacion()).toBe(false);
    });
  });

  describe('Actualización de estado de conservación', () => {
    it('registra cambio de conservación en unidad asignada', () => {
      component.abrirConservacion(itemAsignado);
      component.consEstadoActualItem = 'EN_REPARACION';
      component.consIdUsuario = 1;
      component.consObservacion = 'Enviado a taller de carpintería';

      component.guardarConservacion();

      expect(mantenimientoMock.conservarItem).toHaveBeenCalledWith(
        10,
        expect.objectContaining({
          idUsuario: 1,
          estadoActualItem: 'EN_REPARACION',
          observacion: 'Enviado a taller de carpintería',
        }),
      );
      expect(avisosMock.mostrar).toHaveBeenCalledWith(
        'Estado de conservación actualizado exitosamente.',
      );
      expect(component.modalConservacion()).toBe(false);
    });

    it('exige observación obligatoria con límite de 180 caracteres', () => {
      component.abrirConservacion(itemAsignado);
      component.consIdUsuario = 1;
      component.consObservacion = '';
      component.guardarConservacion();
      expect(component.consError()).toContain('obligatoria');

      component.consObservacion = 'X'.repeat(181);
      component.guardarConservacion();
      expect(component.consError()).toContain('180 caracteres');
      expect(mantenimientoMock.conservarItem).not.toHaveBeenCalled();
    });
  });

  describe('Filtros y navegación contextual', () => {
    it('filtra por habitación específica y actualiza resumen', () => {
      const hab101: HabitacionConfiguracion = {
        idHabitacion: 101,
        numeroCuarto: '101',
        idTipoHabitacion: 1,
        nombreTipo: 'Simple',
        estadoHabitacion: 'DISPONIBLE',
        capacidadPersonas: 1,
        plazasCama: 1,
        maxMenoresSinCama: 0,
        precioBase: 80,
      };
      component.habitaciones.set([hab101]);

      component.cambiarHabitacion('101');

      expect(component.filtroHabitacion).toBe(101);
      expect(component.habitacionSeleccionada()).toEqual(hab101);
      expect(mantenimientoMock.items).toHaveBeenCalledWith(
        expect.objectContaining({
          idHabitacion: 101,
          pagina: 0,
        }),
      );
    });

    it('filtra por unidades sin asignar (almacén)', () => {
      component.cambiarHabitacion('sin_asignar');

      expect(component.filtroHabitacion).toBe('sin_asignar');
      expect(component.habitacionSeleccionada()).toBeNull();
      expect(mantenimientoMock.items).toHaveBeenCalledWith(
        expect.objectContaining({
          sinAsignar: true,
          pagina: 0,
        }),
      );
    });

    it('gestiona paginación anterior y siguiente', () => {
      mantenimientoMock.items = vi.fn().mockReturnValue(
        of({
          contenido: [itemAsignado],
          totalElementos: 20,
          totalPaginas: 2,
          pagina: 0,
          tamanio: 10,
          ultima: false,
        }),
      );

      component.pagina.set(1);
      component.paginaAnterior();
      expect(component.pagina()).toBe(0);

      component.paginaSiguiente();
      expect(component.pagina()).toBe(1);
    });
  });
});
