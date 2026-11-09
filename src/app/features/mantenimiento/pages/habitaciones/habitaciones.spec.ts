import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { HabitacionMantenimiento } from './habitaciones';
import { MantenimientoService } from '../../services/mantenimiento-service';
import { NotificacionService } from '../../../../core/services/notificacion.service';
import { HabitacionConfiguracion, TipoHabitacion } from '../../models/mantenimiento.model';
import { Pagina } from '../../../../core/models/pagina-response';

describe('HabitacionMantenimiento - CU_21', () => {
  let component: HabitacionMantenimiento;
  let mantenimientoServiceMock: any;
  let notificacionServiceMock: any;

  const mockTipos: TipoHabitacion[] = [
    { idTipoHabitacion: 1, nombreTipo: 'Simple', capacidadMax: 1, precioBase: 60.0 },
    { idTipoHabitacion: 2, nombreTipo: 'Doble', capacidadMax: 2, precioBase: 100.0 },
    { idTipoHabitacion: 3, nombreTipo: 'Familiar', capacidadMax: 4, precioBase: 180.0 },
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

  it.each([404, 500])('muestra el error %s de consulta y permite reintentar con datos actuales', (status) => {
    mantenimientoServiceMock.habitacion.mockReturnValue(throwError(() => new HttpErrorResponse({ status, error: { message: 'No se pudo consultar la habitación' } })));
    component.abrirDetalle(mockPagina.contenido[0]);
    expect(component.detalleVisible()).toBe(true);
    expect(component.detalleCargando()).toBe(false);
    expect(component.detalleError()).toContain('No se pudo consultar');
    mantenimientoServiceMock.habitacion.mockReturnValue(of(mockPagina.contenido[0]));
    component.cargarDetalle();
    expect(component.detalleError()).toBe('');
    expect(component.habitacionDetalle()?.idHabitacion).toBe(101);
  });

  beforeEach(() => {
    mantenimientoServiceMock = {
      habitaciones: vi.fn().mockReturnValue(of(mockPagina)),
      tiposHabitacion: vi.fn().mockReturnValue(of(mockTipos)),
      habitacion: vi.fn().mockReturnValue(of(mockPagina.contenido[0])),
      guardarHabitacion: vi.fn().mockReturnValue(of(mockPagina.contenido[0])),
      cambiarEstadoHabitacion: vi.fn().mockReturnValue(of(mockPagina.contenido[0])),
      guardarTipoHabitacion: vi.fn().mockReturnValue(of(mockTipos[0])),
      eliminarTipoHabitacion: vi.fn().mockReturnValue(of(undefined)),
    };

    notificacionServiceMock = {
      mostrar: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        HabitacionMantenimiento,
        { provide: MantenimientoService, useValue: mantenimientoServiceMock },
        { provide: NotificacionService, useValue: notificacionServiceMock },
      ],
    });

    component = TestBed.inject(HabitacionMantenimiento);
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
      expect(mantenimientoServiceMock.cambiarEstadoHabitacion).toHaveBeenCalledWith(
        roomDisponible.idHabitacion,
        'MANTENIMIENTO',
      );

      // En ningún momento debe llamarse a una eliminación física
      expect(component.retirandoVisible()).toBe(false);
      expect(notificacionServiceMock.mostrar).toHaveBeenCalledWith(
        expect.stringContaining('retirada de nuevas reservas (estado: Mantenimiento)'),
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

    it('al editar una ocupada conserva OCUPADO y bloquea cambio de estado', () => {
      const roomOcupado = mockPagina.contenido[1]; // OCUPADO
      component.abrirEditar(roomOcupado);

      expect(component.modoEdicion()).toBe(true);
      expect(component.esOcupado()).toBe(true);
      expect(component.formEstado()).toBe('OCUPADO');

      component.guardarHabitacion();

      expect(mantenimientoServiceMock.guardarHabitacion).toHaveBeenCalledWith(
        roomOcupado.idHabitacion,
        expect.objectContaining({
          estadoHabitacion: 'OCUPADO',
        }),
      );
    });
  });

  describe('3. Validación de capacidad, plazas y menores sin cama', () => {
    it('al elegir un tipo al crear, inicia capacidad y plazas con su máximo y menores en 0', () => {
      component.abrirCrear();
      // Tipo 2 es "Doble" con capacidadMax = 2
      component.onTipoChange(2);

      expect(component.formCapacidad()).toBe(2);
      expect(component.formPlazasCama()).toBe(2);
      expect(component.formMenoresSinCama()).toBe(0);
      expect(component.precioBaseTipo()).toBe(100.0);
    });

    it('invalida el formulario si la capacidad supera el máximo del tipo seleccionado', () => {
      component.abrirCrear();
      component.formNumero.set('201');
      component.onTipoChange(2); // Doble, máx 2

      // Forzar capacidad mayor al tipo
      component.formCapacidad.set(3);
      expect(component.formValido()).toBe(false);
    });

    it('invalida el formulario si las plazas de cama superan la capacidad', () => {
      component.abrirCrear();
      component.formNumero.set('201');
      component.onTipoChange(3); // Familiar, máx 4
      component.formCapacidad.set(3);
      component.formPlazasCama.set(4); // 4 plazas > 3 capacidad

      expect(component.formValido()).toBe(false);
    });

    it('invalida el formulario si los menores sin cama superan o igualan la capacidad (rango 0..capacidad-1)', () => {
      component.abrirCrear();
      component.formNumero.set('201');
      component.onTipoChange(2); // Doble, máx 2
      component.formCapacidad.set(2);
      component.formPlazasCama.set(2);

      // Para capacidad 2, el máximo de menores sin cama es 1 (2 - 1 = 1)
      component.formMenoresSinCama.set(2); // Invalido: 2 no es <= capacidad-1
      expect(component.formValido()).toBe(false);

      component.formMenoresSinCama.set(1); // Válido
      expect(component.formValido()).toBe(true);
    });

    it('invalida el formulario si el número de cuarto excede 10 caracteres', () => {
      component.abrirCrear();
      component.formNumero.set('12345678901'); // 11 caracteres
      component.onTipoChange(1);
      expect(component.formValido()).toBe(false);
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
    it('muestra el conflicto 409 del servidor al guardar habitación sin cerrar el modal ni perder datos', () => {
      component.abrirCrear();
      component.formNumero.set('101');
      component.onTipoChange(1);

      const error409 = new HttpErrorResponse({
        status: 409,
        statusText: 'Conflict',
        error: { message: 'Ya existe una habitación con ese número' },
      });
      mantenimientoServiceMock.guardarHabitacion.mockReturnValue(throwError(() => error409));

      component.guardarHabitacion();

      // El modal debe permanecer abierto
      expect(component.formVisible()).toBe(true);
      expect(component.formOcupado()).toBe(false);
      expect(component.formError()).toBe('Ya existe una habitación con ese número');
      // Los datos ingresados se conservan intactos
      expect(component.formNumero()).toBe('101');
      expect(component.formIdTipo()).toBe(1);
    });

    it('muestra el conflicto 409 al eliminar tipo referenciado conservando el modal abierto', () => {
      component.abrirTiposModal();
      const tipoPorBorrar = mockTipos[0];
      component.solicitarEliminarTipo(tipoPorBorrar);

      const error409 = new HttpErrorResponse({
        status: 409,
        statusText: 'Conflict',
        error: { message: 'El tipo tiene habitaciones asociadas' },
      });
      mantenimientoServiceMock.eliminarTipoHabitacion.mockReturnValue(throwError(() => error409));

      component.confirmarEliminarTipo();

      // El modal de tipos debe seguir visible
      expect(component.tiposModalVisible()).toBe(true);
      expect(component.tipoFormOcupado()).toBe(false);
      expect(component.tipoFormError()).toBe('El tipo tiene habitaciones asociadas');
    });
  });

  describe('6. Integración de fotografía con ImagenUpload', () => {
    it('onImagenCambiada actualiza formImagenRuta y refresca la imagen en el listado y detalle', () => {
      const room = mockPagina.contenido[0];
      component.abrirEditar(room);
      expect(component.formImagenRuta()).toBeNull();

      component.onImagenCambiada('https://cdn.example.com/habitacion-101.png');

      expect(component.formImagenRuta()).toBe('https://cdn.example.com/habitacion-101.png');
      const actualizada = component.respuesta()?.contenido.find((h) => h.idHabitacion === room.idHabitacion);
      expect(actualizada?.imagenRuta).toBe('https://cdn.example.com/habitacion-101.png');
    });

    it('onImagenCambiada con null quita la fotografía del registro en el listado', () => {
      const room = mockPagina.contenido[0];
      component.abrirEditar(room);
      component.onImagenCambiada(null);

      expect(component.formImagenRuta()).toBeNull();
      const actualizada = component.respuesta()?.contenido.find((h) => h.idHabitacion === room.idHabitacion);
      expect(actualizada?.imagenRuta).toBeNull();
    });
  });
});
