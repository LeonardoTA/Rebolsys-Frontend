import { Component, OnInit, OnDestroy, computed, inject, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, Subscription } from 'rxjs';
import {
  EstadoHabitacion,
  HabitacionConfiguracion,
  HabitacionConfiguracionRequest,
  TipoHabitacion,
  TipoHabitacionRequest,
} from '../../models/mantenimiento.model';
import { MantenimientoService } from '../../services/mantenimiento-service';
import { Pagina } from '../../../../core/models/pagina-response';
import { NotificacionService } from '../../../../core/services/notificacion.service';
import { mensajeError } from '../../../../core/utils/http-error';
import { Icon } from '../../../../shared/components/icono/icono';
import { DialogFocus } from '../../../../shared/directives/dialog-focus';
import { PermisosUi } from '../../../../core/services/permisos-ui';

@Component({
  selector: 'app-habitaciones-mantenimiento',
  standalone: true,
  imports: [CommonModule, FormsModule, DecimalPipe, Icon, DialogFocus],
  templateUrl: './habitaciones.html',
  styleUrl: './habitaciones.css',
})
export class HabitacionMantenimiento implements OnInit, OnDestroy {
  protected readonly acceso = inject(PermisosUi);
  private readonly mantenimientoService = inject(MantenimientoService);
  private readonly notificacionService = inject(NotificacionService);

  // --- Catálogo y filtros ---
  respuesta = signal<Pagina<HabitacionConfiguracion> | null>(null);
  tipos = signal<TipoHabitacion[]>([]);
  cargando = signal(true);
  error = signal('');

  buscar = signal('');
  filtroTipo = signal<number | null>(null);
  filtroEstado = signal<string>('');
  pagina = signal(0);
  tamanio = signal(12);

  // --- Modal Consulta / Detalle ---
  detalleVisible = signal(false);
  habitacionDetalle = signal<HabitacionConfiguracion | null>(null);
  detalleCargando = signal(false);
  detalleError = signal('');
  private detallePeticion?: Subscription;

  // --- Modal Formulario Habitación ---
  formVisible = signal(false);
  formOcupado = signal(false);
  formError = signal('');
  modoEdicion = signal(false);
  idHabitacionEditando = signal<number | null>(null);

  formNumero = signal('');
  formIdTipo = signal<number | null>(null);
  formCapacidad = signal(1);
  formPlazasCama = signal(1);
  formMenoresSinCama = signal(0);
  formEstado = signal<EstadoHabitacion>('DISPONIBLE');
  estadoOriginal = signal<EstadoHabitacion>('DISPONIBLE');
  formPrecioPorNoche = signal<number | null>(null);

  tipoSeleccionado = computed(() => {
    const id = this.formIdTipo();
    return this.tipos().find((t) => t.idTipoHabitacion === id) ?? null;
  });

  esOcupado = computed(() => {
    return this.modoEdicion() && this.estadoOriginal() === 'OCUPADO';
  });

  capacidadMaximaTipo = computed(() => {
    return this.tipoSeleccionado()?.capacidadMax ?? 99;
  });

  precioBaseTipo = computed(() => {
    return this.tipoSeleccionado()?.precioBase ?? 0;
  });

  // --- Modal Retiro de Habitación ---
  retirandoVisible = signal(false);
  habitacionARetirar = signal<HabitacionConfiguracion | null>(null);
  retiroOcupado = signal(false);
  retiroError = signal('');

  // --- Modal Gestión de Tipos de Habitación ---
  tiposModalVisible = signal(false);
  tipoEditandoId = signal<number | null>(null);
  tipoNombre = signal('');
  tipoCapacidadMax = signal(1);
  tipoPrecioBase = signal(0);
  tipoFormError = signal('');
  tipoFormOcupado = signal(false);
  tipoPorEliminar = signal<TipoHabitacion | null>(null);

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set('');
    forkJoin({
      page: this.mantenimientoService.habitaciones({
        buscar: this.buscar().trim(),
        idTipoHabitacion: this.filtroTipo(),
        estado: this.filtroEstado() || null,
        pagina: this.pagina(),
        tamanio: this.tamanio(),
      }),
      tipos: this.mantenimientoService.tiposHabitacion(),
    }).subscribe({
      next: ({ page, tipos }) => {
        this.respuesta.set(page);
        this.tipos.set(tipos);
        this.cargando.set(false);
      },
      error: (err) => {
        this.error.set(mensajeError(err));
        this.cargando.set(false);
      },
    });
  }

  filtrar(): void {
    this.pagina.set(0);
    this.cargar();
  }

  cambiarPagina(nuevaPagina: number): void {
    this.pagina.set(nuevaPagina);
    this.cargar();
  }

  // --- Métodos de evaluación de estado y acciones ---
  puedeRetirar(room: HabitacionConfiguracion): boolean {
    if (room.estadoHabitacion === 'OCUPADO') return false;
    if (room.estadoHabitacion === 'MANTENIMIENTO') return false;
    return true;
  }

  motivoBloqueoRetiro(room: HabitacionConfiguracion): string {
    if (room.estadoHabitacion === 'OCUPADO') {
      return 'No se puede retirar una habitación que se encuentra ocupada por una estancia activa.';
    }
    if (room.estadoHabitacion === 'MANTENIMIENTO') {
      return 'La habitación ya se encuentra en mantenimiento (retirada de nuevas reservas).';
    }
    return '';
  }

  obtenerClaseBadge(estado: EstadoHabitacion): string {
    switch (estado) {
      case 'DISPONIBLE':
        return 'badge disponible';
      case 'OCUPADO':
        return 'badge en_curso';
      case 'LIMPIEZA':
        return 'badge limpieza';
      case 'MANTENIMIENTO':
        return 'badge mantenimiento';
      default:
        return 'badge';
    }
  }

  obtenerTextoEstado(estado: EstadoHabitacion): string {
    switch (estado) {
      case 'DISPONIBLE':
        return 'Disponible';
      case 'OCUPADO':
        return 'Ocupada';
      case 'LIMPIEZA':
        return 'Limpieza';
      case 'MANTENIMIENTO':
        return 'Mantenimiento';
      default:
        return estado;
    }
  }

  // --- Consultar Detalle ---
  abrirDetalle(room: HabitacionConfiguracion): void {
    this.habitacionDetalle.set(room);
    this.detalleVisible.set(true);
    this.cargarDetalle();
  }

  cargarDetalle(): void {
    const room = this.habitacionDetalle();
    if (!room) return;
    this.detallePeticion?.unsubscribe();
    this.detalleCargando.set(true);
    this.detalleError.set('');
    this.detallePeticion = this.mantenimientoService.habitacion(room.idHabitacion).subscribe({
      next: (h) => {
        this.habitacionDetalle.set(h);
        this.detalleCargando.set(false);
      },
      error: (e) => {
        this.detalleError.set(mensajeError(e));
        this.detalleCargando.set(false);
      },
    });
  }

  cerrarDetalle(): void {
    this.detallePeticion?.unsubscribe();
    this.detalleVisible.set(false);
    this.habitacionDetalle.set(null);
    this.detalleCargando.set(false);
    this.detalleError.set('');
  }

  ngOnDestroy(): void {
    this.detallePeticion?.unsubscribe();
  }

  // --- Modal Formulario Habitación ---
  abrirCrear(): void {
    this.modoEdicion.set(false);
    this.idHabitacionEditando.set(null);
    this.formNumero.set('');
    const primerTipo = this.tipos()[0] ?? null;
    this.formIdTipo.set(primerTipo ? primerTipo.idTipoHabitacion : null);
    this.formCapacidad.set(primerTipo ? primerTipo.capacidadMax : 1);
    this.formPlazasCama.set(primerTipo ? primerTipo.capacidadMax : 1);
    this.formMenoresSinCama.set(0);
    this.formEstado.set('DISPONIBLE');
    this.estadoOriginal.set('DISPONIBLE');
    this.formPrecioPorNoche.set(null);
    this.formError.set('');
    this.formVisible.set(true);
  }

  abrirEditar(room: HabitacionConfiguracion): void {
    this.modoEdicion.set(true);
    this.idHabitacionEditando.set(room.idHabitacion);
    this.formNumero.set(room.numeroCuarto);
    this.formIdTipo.set(room.idTipoHabitacion);
    this.formCapacidad.set(room.capacidadPersonas);
    this.formPlazasCama.set(room.plazasCama);
    this.formMenoresSinCama.set(room.maxMenoresSinCama);
    this.formEstado.set(room.estadoHabitacion);
    this.estadoOriginal.set(room.estadoHabitacion);
    this.formPrecioPorNoche.set(room.precioPorNoche ?? null);
    this.formError.set('');
    this.formVisible.set(true);
  }

  onTipoChange(nuevoId: number | null): void {
    this.formIdTipo.set(nuevoId);
    const tipo = this.tipos().find((t) => t.idTipoHabitacion === nuevoId);
    if (tipo) {
      if (!this.modoEdicion()) {
        // Al crear, iniciar capacidad y plazas con el máximo del tipo y menores en 0
        this.formCapacidad.set(tipo.capacidadMax);
        this.formPlazasCama.set(tipo.capacidadMax);
        this.formMenoresSinCama.set(0);
      } else {
        if (this.formCapacidad() > tipo.capacidadMax) {
          this.formCapacidad.set(tipo.capacidadMax);
        }
        if (this.formPlazasCama() > this.formCapacidad()) {
          this.formPlazasCama.set(this.formCapacidad());
        }
        const maxMenores = this.maximoMenoresSinCama();
        if (this.formMenoresSinCama() > maxMenores) {
          this.formMenoresSinCama.set(maxMenores);
        }
      }
    }
  }

  onCapacidadChange(valor: number): void {
    const tipo = this.tipoSeleccionado();
    const max = tipo ? tipo.capacidadMax : 99;
    let cap = Number(valor);
    if (cap > max) cap = max;
    if (!Number.isInteger(cap) || cap < 1) cap = 1;
    this.formCapacidad.set(cap);

    if (this.formPlazasCama() > cap) {
      this.formPlazasCama.set(cap);
    }
    const maxMenores = this.maximoMenoresSinCama();
    if (this.formMenoresSinCama() > maxMenores) {
      this.formMenoresSinCama.set(maxMenores);
    }
  }

  onPlazasChange(valor: number): void {
    let plazas = Number(valor);
    const cap = this.formCapacidad();
    if (plazas > cap) plazas = cap;
    if (plazas < 1) plazas = 1;
    this.formPlazasCama.set(plazas);
    this.formMenoresSinCama.update((menores) => Math.min(menores, this.maximoMenoresSinCama()));
  }

  maximoMenoresSinCama(): number {
    return Math.min(1, Math.max(0, this.formCapacidad() - this.formPlazasCama()));
  }

  formValido(): boolean {
    const num = this.formNumero().trim();
    if (!num || num.length > 10) return false;
    const idTipo = this.formIdTipo();
    if (!idTipo) return false;
    const tipo = this.tipoSeleccionado();
    if (!tipo) return false;
    const cap = this.formCapacidad();
    if (!Number.isInteger(cap) || cap < 1 || cap > tipo.capacidadMax) return false;
    const plazas = this.formPlazasCama();
    if (!Number.isInteger(plazas) || plazas < 1 || plazas > cap) return false;
    const menores = this.formMenoresSinCama();
    if (!Number.isInteger(menores) || menores < 0 || menores > this.maximoMenoresSinCama())
      return false;
    const tarifa = this.formPrecioPorNoche();
    if (tarifa !== null && (!/^\d+(\.\d{1,2})?$/.test(String(tarifa)) || tarifa > 99999999.99))
      return false;
    if (!this.formEstado()) return false;
    return true;
  }

  guardarHabitacion(): void {
    if (!this.formValido() || this.formOcupado()) return;
    this.formOcupado.set(true);
    this.formError.set('');

    const req: HabitacionConfiguracionRequest = {
      numeroCuarto: this.formNumero().trim(),
      idTipoHabitacion: this.formIdTipo()!,
      estadoHabitacion: this.esOcupado() ? 'OCUPADO' : this.formEstado(),
      capacidadPersonas: this.formCapacidad(),
      plazasCama: this.formPlazasCama(),
      maxMenoresSinCama: this.formMenoresSinCama(),
      precioPorNoche: this.formPrecioPorNoche(),
    };

    const id = this.modoEdicion() ? this.idHabitacionEditando() : null;
    this.mantenimientoService.guardarHabitacion(id, req).subscribe({
      next: () => {
        this.formOcupado.set(false);
        this.formVisible.set(false);
        this.notificacionService.mostrar(
          id
            ? `Habitación ${req.numeroCuarto} actualizada con éxito.`
            : `Habitación ${req.numeroCuarto} registrada con éxito.`,
        );
        this.cargar();
      },
      error: (err) => {
        this.formOcupado.set(false);
        this.formError.set(mensajeError(err));
        // No cerrar modal en error ni perder los datos ingresados
      },
    });
  }

  cerrarFormModal(): void {
    if (this.formOcupado()) return;
    this.formVisible.set(false);
  }

  // --- Modal Retiro de Habitación ---
  abrirRetiro(room: HabitacionConfiguracion): void {
    if (!this.puedeRetirar(room)) return;
    this.habitacionARetirar.set(room);
    this.retiroError.set('');
    this.retirandoVisible.set(true);
  }

  cerrarRetiro(): void {
    if (this.retiroOcupado()) return;
    this.retirandoVisible.set(false);
    this.habitacionARetirar.set(null);
  }

  confirmarRetiro(): void {
    const room = this.habitacionARetirar();
    if (!room || this.retiroOcupado()) return;

    this.retiroOcupado.set(true);
    this.retiroError.set('');

    // PATCH a /habitaciones/{id}/estado con MANTENIMIENTO, NUNCA DELETE
    this.mantenimientoService
      .cambiarEstadoHabitacion(room.idHabitacion, 'MANTENIMIENTO')
      .subscribe({
        next: () => {
          this.retiroOcupado.set(false);
          this.retirandoVisible.set(false);
          this.habitacionARetirar.set(null);
          this.notificacionService.mostrar(
            `Habitación ${room.numeroCuarto} retirada de nuevas reservas (estado: Mantenimiento). Su historial se conserva.`,
          );
          this.cargar();
        },
        error: (err) => {
          this.retiroOcupado.set(false);
          this.retiroError.set(mensajeError(err));
        },
      });
  }

  // --- Modal Tipos de Habitación ---
  abrirTiposModal(): void {
    this.tipoFormError.set('');
    this.cancelarEdicionTipo();
    this.tipoPorEliminar.set(null);
    this.tiposModalVisible.set(true);
    this.cargarTipos();
  }

  cerrarTiposModal(): void {
    if (this.tipoFormOcupado()) return;
    this.tiposModalVisible.set(false);
  }

  cargarTipos(): void {
    this.mantenimientoService.tiposHabitacion().subscribe({
      next: (t) => this.tipos.set(t),
      error: (err) => this.tipoFormError.set(mensajeError(err)),
    });
  }

  iniciarEdicionTipo(t: TipoHabitacion): void {
    this.tipoEditandoId.set(t.idTipoHabitacion);
    this.tipoNombre.set(t.nombreTipo);
    this.tipoCapacidadMax.set(t.capacidadMax);
    this.tipoPrecioBase.set(t.precioBase);
    this.tipoFormError.set('');
  }

  cancelarEdicionTipo(): void {
    this.tipoEditandoId.set(null);
    this.tipoNombre.set('');
    this.tipoCapacidadMax.set(1);
    this.tipoPrecioBase.set(0);
    this.tipoFormError.set('');
  }

  tipoValido(): boolean {
    const nom = this.tipoNombre().trim();
    if (!nom || nom.length > 30) return false;
    const cap = this.tipoCapacidadMax();
    if (cap < 1 || cap > 99) return false;
    const precio = this.tipoPrecioBase();
    if (precio === null || precio === undefined || precio < 0) return false;
    return true;
  }

  guardarTipo(): void {
    if (!this.tipoValido() || this.tipoFormOcupado()) return;
    this.tipoFormOcupado.set(true);
    this.tipoFormError.set('');

    const req: TipoHabitacionRequest = {
      nombreTipo: this.tipoNombre().trim(),
      capacidadMax: Number(this.tipoCapacidadMax()),
      precioBase: Number(this.tipoPrecioBase()),
    };

    const id = this.tipoEditandoId();
    this.mantenimientoService.guardarTipoHabitacion(id, req).subscribe({
      next: () => {
        this.tipoFormOcupado.set(false);
        this.cancelarEdicionTipo();
        this.notificacionService.mostrar(
          id ? `Tipo ${req.nombreTipo} actualizado.` : `Tipo ${req.nombreTipo} registrado.`,
        );
        this.cargarTipos();
        this.cargar();
      },
      error: (err) => {
        this.tipoFormOcupado.set(false);
        this.tipoFormError.set(mensajeError(err));
      },
    });
  }

  solicitarEliminarTipo(t: TipoHabitacion): void {
    this.tipoFormError.set('');
    this.tipoPorEliminar.set(t);
  }

  confirmarEliminarTipo(): void {
    const t = this.tipoPorEliminar();
    if (!t || this.tipoFormOcupado()) return;

    this.tipoFormOcupado.set(true);
    this.tipoFormError.set('');

    this.mantenimientoService.eliminarTipoHabitacion(t.idTipoHabitacion).subscribe({
      next: () => {
        this.tipoFormOcupado.set(false);
        this.tipoPorEliminar.set(null);
        this.notificacionService.mostrar(`Tipo ${t.nombreTipo} eliminado.`);
        this.cargarTipos();
        this.cargar();
      },
      error: (err) => {
        this.tipoFormOcupado.set(false);
        // Mostrar conflicto 409 o error del servidor sin cerrar el modal
        this.tipoFormError.set(mensajeError(err));
      },
    });
  }
}
