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
import { HabitacionService } from '../../../habitaciones/services/habitacion-service';
import { TipoItem } from '../../../tipos-inmobiliario/models/tipo-item.model';
import { TipoItemService } from '../../../tipos-inmobiliario/services/tipo-item-service';
import { Item } from '../../models/inmobiliario.model';
import { InmobiliarioService } from '../../services/inmobiliario-service';
import { InmobiliarioForm } from './inmobiliario-form';
describe('InmobiliarioForm - CU_22', () => {
  const routerMock = { navigate: vi.fn().mockResolvedValue(true) };
  let component: InmobiliarioForm;

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
      component = new InmobiliarioForm();
    });
    component.ngOnInit();
  });

  describe('Registro de unidad física con asignación posterior', () => {
    it('conserva el id obtenido si falla la asignación posterior y ofrece reintentar sin duplicar alta', () => {
      component.abrirRegistrar();
      component.formNombreItem = 'Nuevo Televisor';
      component.formIdTipoItem = 1;
      component.formDestino = 'habitacion';
      component.formIdHabitacion = 101;
      component.formIdUsuario = 1;
      component.formObservacion = 'Asignación al inaugurar habitación';

      // Etapa 1 (guardarItem) retorna nuevo item con id 99
      mantenimientoMock.guardarItem = vi
        .fn()
        .mockReturnValue(
          of({ ...itemAlmacen, idItem: 99, nombreItem: 'Nuevo Televisor' }),
        );
      // Etapa 2 (asignarItem) falla
      mantenimientoMock.asignarItem = vi
        .fn()
        .mockReturnValue(
          throwError(
            () =>
              new HttpErrorResponse({ status: 409, statusText: 'Conflict' }),
          ),
        );

      component.guardarRegistro();

      // Etapa 1 exitosa, ID conservado
      expect(component.creadoIdItem()).toBe(99);
      expect(component.registroExitoParcial()).toContain('ID: #99');
      expect(component.registroError()).toContain('Error en la asignación');

      // Reintento de la asignación: NO debe volver a llamar a guardarItem
      mantenimientoMock.guardarItem.mockClear();
      mantenimientoMock.asignarItem = vi
        .fn()
        .mockReturnValue(of({ ...itemAsignado, idItem: 99 }));

      component.guardarRegistro();

      expect(mantenimientoMock.guardarItem).not.toHaveBeenCalled();
      expect(mantenimientoMock.asignarItem).toHaveBeenCalledWith(
        99,
        expect.objectContaining({
          idHabitacion: 101,
          idUsuario: 1,
        }),
      );
      expect(avisosMock.mostrar).toHaveBeenCalledWith(
        'Artículo registrado y asignado a la habitación exitosamente.',
      );
    });
  });

  describe('Creación de tipo de mobiliario con endpoint real', () => {
    it('utiliza nombreItem para guardarTipoItem y actualiza el catálogo', () => {
      component.abrirNuevoTipo();
      component.nuevoTipoNombre = 'Frigobar';

      component.guardarNuevoTipo();

      expect(mantenimientoMock.guardarTipoItem).toHaveBeenCalledWith(
        null,
        'Frigobar',
      );
      expect(avisosMock.mostrar).toHaveBeenCalledWith(
        'Tipo "Frigobar" creado exitosamente.',
      );
      expect(component.modalNuevoTipo()).toBe(false);
    });

    it('valida que el nombre del tipo sea obligatorio y no exceda 30 caracteres', () => {
      component.abrirNuevoTipo();
      component.nuevoTipoNombre = '';
      component.guardarNuevoTipo();
      expect(component.nuevoTipoError()).toContain('obligatorio');
      expect(mantenimientoMock.guardarTipoItem).not.toHaveBeenCalled();

      component.nuevoTipoNombre = 'A'.repeat(31);
      component.guardarNuevoTipo();
      expect(component.nuevoTipoError()).toContain('30 caracteres');
      expect(mantenimientoMock.guardarTipoItem).not.toHaveBeenCalled();
    });
  });

  describe('Edición de datos básicos de la unidad física', () => {
    it('actualiza nombre y tipo preservando estadoItem sin alterarlo desde el CRUD', () => {
      component.abrirEditar(itemAsignado);
      component.formNombreItem = 'Cama individual 01 Renombrada';
      component.formIdTipoItem = 1;

      component.guardarRegistro();

      expect(mantenimientoMock.guardarItem).toHaveBeenCalledWith(10, {
        nombreItem: 'Cama individual 01 Renombrada',
        idTipoItem: 1,
        estadoItem: 'En habitacion',
      });
      expect(avisosMock.mostrar).toHaveBeenCalledWith(
        'Artículo actualizado correctamente.',
      );
      expect(routerMock.navigate).toHaveBeenCalledWith([
        '/mantenimiento/inmobiliario',
      ]);
    });
  });
});
