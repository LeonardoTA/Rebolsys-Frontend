import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Pagina } from '../../../../core/models/pagina-response';
import { NotificacionService } from '../../../../core/services/notificacion.service';
import { TipoHabitacion } from '../../../tipos-habitacion/models/tipo-habitacion.model';
import { TipoHabitacionService } from '../../../tipos-habitacion/services/tipo-habitacion-service';
import { HabitacionConfiguracion } from '../../models/habitacion.model';
import { HabitacionService } from '../../services/habitacion-service';
import { HabitacionConfigList } from './habitacion-config-list';
describe('HabitacionConfigList - CU_21', () => {
  const routerMock = { navigate: vi.fn().mockResolvedValue(true) };
  let component: HabitacionConfigList;

  let mantenimientoServiceMock: any;

  let notificacionServiceMock: any;

  const mockTipos: TipoHabitacion[] = [
    {
      idTipoHabitacion: 1,
      nombreTipo: 'Simple',
      capacidadMax: 1,
      precioBase: 60.0,
    },
    {
      idTipoHabitacion: 2,
      nombreTipo: 'Doble',
      capacidadMax: 2,
      precioBase: 100.0,
    },
    {
      idTipoHabitacion: 3,
      nombreTipo: 'Familiar',
      capacidadMax: 4,
      precioBase: 180.0,
    },
  ];

  const mockPagina: Pagina<HabitacionConfiguracion> = {
    contenido: [
      {
        idHabitacion: 101,
        numeroCuarto: '101',
        idTipoHabitacion: 1,
        nombreTipo: 'Simple',
        estadoHabitacion: 'DISPONIBLE',
        capacidadPersonas: 1,
        plazasCama: 1,
        maxMenoresSinCama: 0,
        precioBase: 60.0,
      },
      {
        idHabitacion: 102,
        numeroCuarto: '102',
        idTipoHabitacion: 2,
        nombreTipo: 'Doble',
        estadoHabitacion: 'OCUPADO',
        capacidadPersonas: 2,
        plazasCama: 2,
        maxMenoresSinCama: 1,
        precioBase: 100.0,
      },
      {
        idHabitacion: 103,
        numeroCuarto: '103',
        idTipoHabitacion: 1,
        nombreTipo: 'Simple',
        estadoHabitacion: 'MANTENIMIENTO',
        capacidadPersonas: 1,
        plazasCama: 1,
        maxMenoresSinCama: 0,
        precioBase: 60.0,
      },
    ],
    pagina: 0,
    tamanio: 12,
    totalElementos: 3,
    totalPaginas: 1,
    ultima: true,
  };

  it.each([404, 500])(
    'muestra el error %s de consulta y permite reintentar con datos actuales',
    (status) => {
      mantenimientoServiceMock.habitacion.mockReturnValue(
        throwError(
          () =>
            new HttpErrorResponse({
              status,
              error: { message: 'No se pudo consultar la habitación' },
            }),
        ),
      );
      component.abrirDetalle(mockPagina.contenido[0]);
      expect(component.detalleVisible()).toBe(true);
      expect(component.detalleCargando()).toBe(false);
      expect(component.detalleError()).toContain('No se pudo consultar');
      mantenimientoServiceMock.habitacion.mockReturnValue(
        of(mockPagina.contenido[0]),
      );
      component.cargarDetalle();
      expect(component.detalleError()).toBe('');
      expect(component.habitacionDetalle()?.idHabitacion).toBe(101);
    },
  );

  beforeEach(() => {
    routerMock.navigate.mockClear();
    mantenimientoServiceMock = {
      habitaciones: vi.fn().mockReturnValue(of(mockPagina)),
      tiposHabitacion: vi.fn().mockReturnValue(of(mockTipos)),
      habitacion: vi.fn().mockReturnValue(of(mockPagina.contenido[0])),
      guardarHabitacion: vi.fn().mockReturnValue(of(mockPagina.contenido[0])),
      cambiarEstadoHabitacion: vi
        .fn()
        .mockReturnValue(of(mockPagina.contenido[0])),
      guardarTipoHabitacion: vi.fn().mockReturnValue(of(mockTipos[0])),
      eliminarTipoHabitacion: vi.fn().mockReturnValue(of(undefined)),
    };

    notificacionServiceMock = {
      mostrar: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        HabitacionConfigList,
        { provide: HabitacionService, useValue: mantenimientoServiceMock },
        { provide: TipoHabitacionService, useValue: mantenimientoServiceMock },
        { provide: Router, useValue: routerMock },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap({}) } },
        },
        { provide: NotificacionService, useValue: notificacionServiceMock },
      ],
    });

    component = TestBed.inject(HabitacionConfigList);
    component.ngOnInit();
  });

  describe('1. Retiro de habitación (MANTENIMIENTO vs DELETE)', () => {
    it('retiro usa PATCH MANTENIMIENTO y nunca DELETE de la habitación', () => {
      const roomDisponible = mockPagina.contenido[0];
      component.abrirRetiro(roomDisponible);

      expect(component.retirandoVisible()).toBe(true);
      expect(component.habitacionARetirar()).toBe(roomDisponible);

      component.confirmarRetiro();

      // Debe llamar a cambiarEstadoHabitacion con 'MANTENIMIENTO'
      expect(
        mantenimientoServiceMock.cambiarEstadoHabitacion,
      ).toHaveBeenCalledWith(roomDisponible.idHabitacion, 'MANTENIMIENTO');

      // En ningún momento debe llamarse a una eliminación física
      expect(component.retirandoVisible()).toBe(false);
      expect(notificacionServiceMock.mostrar).toHaveBeenCalledWith(
        expect.stringContaining(
          'retirada de nuevas reservas (estado: Mantenimiento)',
        ),
      );
    });
  });

  describe('2. Habitación ocupada bloqueada', () => {
    it('bloquea el retiro desde UI si la habitación está en estado OCUPADO y muestra el motivo', () => {
      const roomOcupado = mockPagina.contenido[1]; // OCUPADO

      expect(component.puedeRetirar(roomOcupado)).toBe(false);
      expect(component.motivoBloqueoRetiro(roomOcupado)).toBe(
        'No se puede retirar una habitación que se encuentra ocupada por una estancia activa.',
      );

      // Si se intenta abrir el retiro, debe quedar bloqueado
      component.abrirRetiro(roomOcupado);
      expect(component.retirandoVisible()).toBe(false);
      expect(component.habitacionARetirar()).toBeNull();
    });
  });

  describe('4. Filtros y paginación real del backend', () => {
    it('filtrar() reinicia la página a 0 y envía los parámetros de búsqueda y estado', () => {
      component.pagina.set(2);
      component.buscar.set('101');
      component.filtroTipo.set(1);
      component.filtroEstado.set('DISPONIBLE');

      component.filtrar();

      expect(component.pagina()).toBe(0);
      expect(mantenimientoServiceMock.habitaciones).toHaveBeenCalledWith({
        buscar: '101',
        idTipoHabitacion: 1,
        estado: 'DISPONIBLE',
        pagina: 0,
        tamanio: 12,
      });
    });

    it('cambiarPagina() solicita la página correspondiente al servicio', () => {
      component.cambiarPagina(1);
      expect(component.pagina()).toBe(1);
      expect(mantenimientoServiceMock.habitaciones).toHaveBeenCalledWith(
        expect.objectContaining({ pagina: 1 }),
      );
    });
  });

  describe('5. Manejo de error 409 y conservación del modal y datos', () => {
    it('muestra el conflicto 409 al eliminar tipo referenciado conservando el modal abierto', () => {
      component.abrirTiposModal();
      const tipoPorBorrar = mockTipos[0];
      component.solicitarEliminarTipo(tipoPorBorrar);

      const error409 = new HttpErrorResponse({
        status: 409,
        statusText: 'Conflict',
        error: { message: 'El tipo tiene habitaciones asociadas' },
      });
      mantenimientoServiceMock.eliminarTipoHabitacion.mockReturnValue(
        throwError(() => error409),
      );

      component.confirmarEliminarTipo();

      // El modal de tipos debe seguir visible
      expect(component.tiposModalVisible()).toBe(true);
      expect(component.tipoFormOcupado()).toBe(false);
      expect(component.tipoFormError()).toBe(
        'El tipo tiene habitaciones asociadas',
      );
    });
  });
});
