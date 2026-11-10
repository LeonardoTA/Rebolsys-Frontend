import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { forkJoin, of } from 'rxjs';
import { MantenimientoService } from '../../services/mantenimiento-service';
import {
  EstadoConservacion,
  EstadoHabitacion,
  EstadoItem,
  FiltrosConfiguracion,
  HabitacionConfiguracion,
  Item,
  ItemHistorial,
  TipoItem,
} from '../../models/mantenimiento.model';
import { SesionService } from '../../../../core/services/sesion-service';
import { Pagina } from '../../../../core/models/pagina-response';
import { NotificacionService } from '../../../../core/services/notificacion.service';
import { mensajeError } from '../../../../core/utils/http-error';
import { Icon } from '../../../../shared/components/icono/icono';
import { DialogFocus } from '../../../../shared/directives/dialog-focus';

export function generarClaveOperacion(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'op-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

@Component({
  selector: 'app-inmobiliario-mantenimiento',
  imports: [FormsModule, DatePipe, Icon, DialogFocus],
  templateUrl: './inmobiliario.html',
  styleUrl: './inmobiliario.css',
})
export class InmobiliarioMantenimiento implements OnInit {
  protected readonly sesion = inject(SesionService);
  private readonly mantenimiento = inject(MantenimientoService);
  private readonly avisos = inject(NotificacionService);

  // Catálogos y datos
  habitaciones = signal<HabitacionConfiguracion[]>([]);
  tiposItem = signal<TipoItem[]>([]);
  respuesta = signal<Pagina<Item> | null>(null);

  // Estados de vista
  cargando = signal(true);
  error = signal('');
  habitacionSeleccionada = signal<HabitacionConfiguracion | null>(null);

  // Filtros y paginación
  buscar = '';
  filtroTipo: number | null = null;
  filtroCondicion: EstadoConservacion | '' = '';
  filtroEstado: EstadoItem | '' = '';
  filtroHabitacion: number | 'todas' | 'sin_asignar' = 'todas';
  pagina = signal(0);
  tamanio = signal(10);

  // Modal 1: Registrar / Editar unidad física
  modalRegistro = signal(false);
  modoEdicion = signal(false);
  itemEnEdicion = signal<Item | null>(null);
  creadoIdItem = signal<number | null>(null);
  registroOcupado = signal(false);
  registroError = signal('');
  registroExitoParcial = signal('');
  asignacionClaveOperacion = '';
  lastAsignacionPayload = '';
  formNombreItem = '';
  formIdTipoItem: number | null = null;
  formDestino: 'almacen' | 'habitacion' = 'almacen';
  formIdHabitacion: number | null = null;
  formEstadoActualItem: EstadoConservacion = 'BUENO';

  formObservacion = '';

  // Modal 2: Crear Tipo de Mobiliario (TipoItem)
  modalNuevoTipo = signal(false);
  nuevoTipoNombre = '';
  nuevoTipoError = signal('');
  nuevoTipoOcupado = signal(false);

  // Modal 3: Asignar / Trasladar / Retirar
  modalAsignacion = signal(false);
  itemParaAsignar = signal<Item | null>(null);
  tipoOperacionAsignacion = signal<'asignar' | 'trasladar' | 'retirar'>('asignar');
  asigIdHabitacion: number | null = null;
  asigEstadoActualItem: EstadoConservacion = 'BUENO';

  asigObservacion = '';
  asigClaveOperacion = '';
  lastAsigPayload = '';
  asigError = signal('');
  asigOcupado = signal(false);

  // Modal 4: Actualizar conservación
  modalConservacion = signal(false);
  itemParaConservar = signal<Item | null>(null);
  consEstadoActualItem: EstadoConservacion = 'BUENO';

  consObservacion = '';
  consClaveOperacion = '';
  lastConsPayload = '';
  consError = signal('');
  consOcupado = signal(false);

  // Modal 5: Baja por daño o pérdida
  modalBaja = signal(false);
  itemParaBaja = signal<Item | null>(null);
  bajaCondicionFinal: 'DANADO' | 'FALTANTE' = 'DANADO';

  bajaObservacion = '';
  bajaClaveOperacion = '';
  lastBajaPayload = '';
  bajaRetiradoExitoso = signal(false);
  bajaPendienteDesactivacion = signal(false);
  bajaError = signal('');
  bajaOcupado = signal(false);

  // Modal 6: Consultar Detalle e Historial
  modalDetalle = signal(false);
  itemDetalle = signal<Item | null>(null);
  historial = signal<ItemHistorial[]>([]);
  cargandoHistorial = signal(false);
  errorHistorial = signal('');

  ngOnInit(): void {
    this.cargarCatalogosYDatos();
  }

  cargarCatalogosYDatos(): void {
    this.cargando.set(true);
    this.error.set('');

    forkJoin({
      habitaciones: this.sesion.permite('HABITACIONES:VER', 'MOBILIARIO:ASIGNAR')
        ? this.mantenimiento.habitacionesTodas()
        : of([]),
      tipos: this.mantenimiento.tiposItem(),
    }).subscribe({
      next: (res) => {
        this.habitaciones.set(res.habitaciones || []);
        this.tiposItem.set(res.tipos || []);
        this.cargar();
      },
      error: (e) => {
        this.cargando.set(false);
        this.error.set(mensajeError(e));
      },
    });
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set('');

    const filtros: FiltrosConfiguracion = {
      pagina: this.pagina(),
      tamanio: this.tamanio(),
      buscar: this.buscar.trim() || undefined,
      idTipoItem: this.filtroTipo || undefined,
      estadoConservacion: this.filtroCondicion || undefined,
      estado: this.filtroEstado || undefined,
    };

    if (this.filtroHabitacion === 'sin_asignar') {
      filtros['sinAsignar'] = true;
      this.habitacionSeleccionada.set(null);
    } else if (typeof this.filtroHabitacion === 'number') {
      filtros['idHabitacion'] = this.filtroHabitacion;
      const hab = this.habitaciones().find((h) => h.idHabitacion === this.filtroHabitacion) || null;
      this.habitacionSeleccionada.set(hab);
    } else {
      this.habitacionSeleccionada.set(null);
    }

    this.mantenimiento.items(filtros).subscribe({
      next: (page) => {
        this.respuesta.set(page);
        this.cargando.set(false);
      },
      error: (e) => {
        this.error.set(mensajeError(e));
        this.cargando.set(false);
      },
    });
  }

  filtrar(): void {
    this.pagina.set(0);
    this.cargar();
  }

  cambiarHabitacion(valor: string): void {
    if (valor === 'todas') {
      this.filtroHabitacion = 'todas';
    } else if (valor === 'sin_asignar') {
      this.filtroHabitacion = 'sin_asignar';
    } else {
      this.filtroHabitacion = Number(valor);
    }
    this.filtrar();
  }

  paginaAnterior(): void {
    if (this.pagina() > 0) {
      this.pagina.update((p) => p - 1);
      this.cargar();
    }
  }

  paginaSiguiente(): void {
    const page = this.respuesta();
    if (page && !page.ultima) {
      this.pagina.update((p) => p + 1);
      this.cargar();
    }
  }

  // --- Modal 1: Registro y Edición Básica ---
  abrirRegistrar(): void {
    this.formNombreItem = '';
    this.formIdTipoItem = this.filtroTipo || (this.tiposItem()[0]?.idTipoItem ?? null);
    if (typeof this.filtroHabitacion === 'number' && this.sesion.permite('MOBILIARIO:ASIGNAR')) {
      this.formDestino = 'habitacion';
      this.formIdHabitacion = this.filtroHabitacion;
    } else {
      this.formDestino = 'almacen';
      this.formIdHabitacion = this.habitaciones()[0]?.idHabitacion ?? null;
    }
    this.formEstadoActualItem = 'BUENO';
    this.formObservacion = '';
    this.creadoIdItem.set(null);
    this.registroExitoParcial.set('');
    this.registroError.set('');
    this.asignacionClaveOperacion = generarClaveOperacion();
    this.lastAsignacionPayload = '';
    this.modoEdicion.set(false);
    this.itemEnEdicion.set(null);
    this.modalRegistro.set(true);
  }

  abrirEditar(item: Item): void {
    this.itemEnEdicion.set(item);
    this.formNombreItem = item.nombreItem;
    this.formIdTipoItem = item.idTipoItem;
    this.creadoIdItem.set(null);
    this.registroExitoParcial.set('');
    this.registroError.set('');
    this.modoEdicion.set(true);
    this.modalRegistro.set(true);
  }

  cerrarModalRegistro(): void {
    if (this.registroOcupado()) return;
    this.modalRegistro.set(false);
    this.itemEnEdicion.set(null);
    this.creadoIdItem.set(null);
    this.registroError.set('');
    this.registroExitoParcial.set('');
  }

  guardarRegistro(): void {
    if (this.registroOcupado()) return;

    if (!this.formNombreItem.trim()) {
      this.registroError.set('El nombre del artículo es obligatorio.');
      return;
    }
    if (this.formNombreItem.trim().length > 100) {
      this.registroError.set('El nombre del artículo no puede exceder 100 caracteres.');
      return;
    }
    if (!this.formIdTipoItem) {
      this.registroError.set('Selecciona un tipo de artículo.');
      return;
    }

    if (this.modoEdicion()) {
      const item = this.itemEnEdicion()!;
      this.registroOcupado.set(true);
      this.registroError.set('');
      this.mantenimiento
        .guardarItem(item.idItem, {
          nombreItem: this.formNombreItem.trim(),
          idTipoItem: this.formIdTipoItem,
          estadoItem: item.estadoItem,
        })
        .subscribe({
          next: () => {
            this.registroOcupado.set(false);
            this.cerrarModalRegistro();
            this.avisos.mostrar('Artículo actualizado correctamente.');
            this.cargar();
          },
          error: (e) => {
            this.registroOcupado.set(false);
            this.registroError.set(mensajeError(e));
          },
        });
      return;
    }

    // Creación nueva
    if (this.formDestino === 'habitacion') {
      if (!this.formIdHabitacion) {
        this.registroError.set('Selecciona la habitación a la que se asignará el artículo.');
        return;
      }
      if (!this.sesion.actual()?.idUsuario) {
        this.registroError.set('Inicia sesión para registrar la asignación.');
        return;
      }
      if (!this.formObservacion.trim()) {
        this.registroError.set('La observación es obligatoria al asignar una habitación.');
        return;
      }
      if (this.formObservacion.trim().length > 180) {
        this.registroError.set('La observación no puede exceder 180 caracteres.');
        return;
      }
    }

    this.registroOcupado.set(true);
    this.registroError.set('');

    // Si ya se creó en un intento anterior y falló la etapa de asignación:
    if (this.creadoIdItem() !== null) {
      this.ejecutarEtapaAsignacionPostAlta(this.creadoIdItem()!);
      return;
    }

    // Etapa 1: Crear unidad en estado Activo
    this.mantenimiento
      .guardarItem(null, {
        nombreItem: this.formNombreItem.trim(),
        idTipoItem: this.formIdTipoItem,
        estadoItem: 'Activo',
      })
      .subscribe({
        next: (nuevoItem) => {
          if (this.formDestino === 'almacen' || !this.formIdHabitacion) {
            this.registroOcupado.set(false);
            this.cerrarModalRegistro();
            this.avisos.mostrar('Artículo registrado correctamente en almacén.');
            this.cargar();
          } else {
            this.creadoIdItem.set(nuevoItem.idItem);
            this.registroExitoParcial.set(
              `Artículo #${nuevoItem.idItem} registrado con éxito en el sistema. Asignando a la habitación...`,
            );
            this.ejecutarEtapaAsignacionPostAlta(nuevoItem.idItem);
          }
        },
        error: (e) => {
          this.registroOcupado.set(false);
          this.registroError.set(mensajeError(e));
        },
      });
  }

  private ejecutarEtapaAsignacionPostAlta(idItem: number): void {
    const firmaPayload = JSON.stringify({
      idItem,
      h: this.formIdHabitacion,
      u: this.sesion.actual()?.idUsuario,
      c: this.formEstadoActualItem,
      o: this.formObservacion.trim(),
    });

    if (this.lastAsignacionPayload && this.lastAsignacionPayload !== firmaPayload) {
      this.asignacionClaveOperacion = generarClaveOperacion();
    }
    this.lastAsignacionPayload = firmaPayload;

    this.mantenimiento
      .asignarItem(idItem, {
        claveOperacion: this.asignacionClaveOperacion,
        idUsuario: this.sesion.actual()!.idUsuario,
        idHabitacion: this.formIdHabitacion,
        estadoActualItem: this.formEstadoActualItem,
        observacion: this.formObservacion.trim(),
      })
      .subscribe({
        next: () => {
          this.registroOcupado.set(false);
          this.cerrarModalRegistro();
          this.avisos.mostrar('Artículo registrado y asignado a la habitación exitosamente.');
          this.cargar();
        },
        error: (e) => {
          this.registroOcupado.set(false);
          this.registroExitoParcial.set(
            `El artículo fue creado con éxito en el inventario (ID: #${idItem}), pero ocurrió un error al asignarlo a la habitación.`,
          );
          this.registroError.set(
            `Error en la asignación: ${mensajeError(e)}. Puedes reintentar la asignación sin volver a crear la unidad.`,
          );
        },
      });
  }

  // --- Modal 2: Crear Tipo de Mobiliario ---
  abrirNuevoTipo(): void {
    this.nuevoTipoNombre = '';
    this.nuevoTipoError.set('');
    this.modalNuevoTipo.set(true);
  }

  cerrarModalNuevoTipo(): void {
    if (this.nuevoTipoOcupado()) return;
    this.modalNuevoTipo.set(false);
  }

  guardarNuevoTipo(): void {
    if (this.nuevoTipoOcupado()) return;
    const nombre = this.nuevoTipoNombre.trim();
    if (!nombre) {
      this.nuevoTipoError.set('El nombre del tipo es obligatorio.');
      return;
    }
    if (nombre.length > 30) {
      this.nuevoTipoError.set('El nombre del tipo no puede exceder 30 caracteres.');
      return;
    }

    this.nuevoTipoOcupado.set(true);
    this.nuevoTipoError.set('');
    this.mantenimiento.crearTipoItem(nombre).subscribe({
      next: (tipoCreado) => {
        this.nuevoTipoOcupado.set(false);
        this.cerrarModalNuevoTipo();
        this.avisos.mostrar(`Tipo "${tipoCreado.nombreItem}" creado exitosamente.`);
        this.mantenimiento.tiposItem().subscribe((tipos) => {
          this.tiposItem.set(tipos || []);
          this.formIdTipoItem = tipoCreado.idTipoItem;
        });
      },
      error: (e) => {
        this.nuevoTipoOcupado.set(false);
        this.nuevoTipoError.set(mensajeError(e));
      },
    });
  }

  // --- Modal 3: Asignar / Trasladar / Retirar ---
  abrirAsignacion(item: Item, tipo: 'asignar' | 'trasladar' | 'retirar'): void {
    this.itemParaAsignar.set(item);
    this.tipoOperacionAsignacion.set(tipo);
    this.asigIdHabitacion =
      tipo === 'retirar' ? null : item.idHabitacion || this.habitaciones()[0]?.idHabitacion || null;
    this.asigEstadoActualItem = item.estadoActualItem || 'BUENO';
    this.asigObservacion = '';
    this.asigClaveOperacion = generarClaveOperacion();
    this.lastAsigPayload = '';
    this.asigError.set('');
    this.modalAsignacion.set(true);
  }

  cerrarModalAsignacion(): void {
    if (this.asigOcupado()) return;
    this.modalAsignacion.set(false);
    this.itemParaAsignar.set(null);
  }

  guardarAsignacion(): void {
    const item = this.itemParaAsignar();
    if (!item || this.asigOcupado()) return;

    const tipo = this.tipoOperacionAsignacion();
    const destHab = tipo === 'retirar' ? null : this.asigIdHabitacion;

    if (tipo !== 'retirar' && !destHab) {
      this.asigError.set('Selecciona una habitación destino.');
      return;
    }
    if (tipo === 'trasladar' && destHab === item.idHabitacion) {
      this.asigError.set(
        'Selecciona una habitación diferente a la actual para realizar un traslado.',
      );
      return;
    }
    if (!this.sesion.actual()?.idUsuario) {
      this.asigError.set('Inicia sesión para registrar la operación.');
      return;
    }
    if (!this.asigObservacion.trim()) {
      this.asigError.set('La observación es obligatoria.');
      return;
    }
    if (this.asigObservacion.trim().length > 180) {
      this.asigError.set('La observación no puede exceder 180 caracteres.');
      return;
    }

    const firmaPayload = JSON.stringify({
      id: item.idItem,
      h: destHab,
      u: this.sesion.actual()?.idUsuario,
      c: this.asigEstadoActualItem,
      o: this.asigObservacion.trim(),
    });
    if (this.lastAsigPayload && this.lastAsigPayload !== firmaPayload) {
      this.asigClaveOperacion = generarClaveOperacion();
    }
    this.lastAsigPayload = firmaPayload;

    this.asigOcupado.set(true);
    this.asigError.set('');

    this.mantenimiento
      .asignarItem(item.idItem, {
        claveOperacion: this.asigClaveOperacion,
        idUsuario: this.sesion.actual()!.idUsuario,
        idHabitacion: destHab,
        estadoActualItem: this.asigEstadoActualItem,
        observacion: this.asigObservacion.trim(),
      })
      .subscribe({
        next: () => {
          this.asigOcupado.set(false);
          this.cerrarModalAsignacion();
          const mensajeExito =
            tipo === 'retirar'
              ? 'Artículo retirado de la habitación hacia almacén.'
              : tipo === 'trasladar'
                ? 'Artículo trasladado de habitación correctamente.'
                : 'Artículo asignado a la habitación exitosamente.';
          this.avisos.mostrar(mensajeExito);
          this.cargar();
        },
        error: (e) => {
          this.asigOcupado.set(false);
          this.asigError.set(mensajeError(e));
        },
      });
  }

  // --- Modal 4: Actualizar Conservación ---
  abrirConservacion(item: Item): void {
    this.itemParaConservar.set(item);
    this.consEstadoActualItem = item.estadoActualItem || 'BUENO';
    this.consObservacion = '';
    this.consClaveOperacion = generarClaveOperacion();
    this.lastConsPayload = '';
    this.consError.set('');
    this.modalConservacion.set(true);
  }

  cerrarModalConservacion(): void {
    if (this.consOcupado()) return;
    this.modalConservacion.set(false);
    this.itemParaConservar.set(null);
  }

  guardarConservacion(): void {
    const item = this.itemParaConservar();
    if (!item || this.consOcupado()) return;

    if (!this.sesion.actual()?.idUsuario) {
      this.consError.set('Inicia sesión para registrar el estado de conservación.');
      return;
    }
    if (!this.consObservacion.trim()) {
      this.consError.set('La observación es obligatoria.');
      return;
    }
    if (this.consObservacion.trim().length > 180) {
      this.consError.set('La observación no puede exceder 180 caracteres.');
      return;
    }

    const firmaPayload = JSON.stringify({
      id: item.idItem,
      u: this.sesion.actual()?.idUsuario,
      c: this.consEstadoActualItem,
      o: this.consObservacion.trim(),
    });
    if (this.lastConsPayload && this.lastConsPayload !== firmaPayload) {
      this.consClaveOperacion = generarClaveOperacion();
    }
    this.lastConsPayload = firmaPayload;

    this.consOcupado.set(true);
    this.consError.set('');

    this.mantenimiento
      .conservarItem(item.idItem, {
        claveOperacion: this.consClaveOperacion,
        idUsuario: this.sesion.actual()!.idUsuario,
        estadoActualItem: this.consEstadoActualItem,
        observacion: this.consObservacion.trim(),
      })
      .subscribe({
        next: () => {
          this.consOcupado.set(false);
          this.cerrarModalConservacion();
          this.avisos.mostrar('Estado de conservación actualizado exitosamente.');
          this.cargar();
        },
        error: (e) => {
          this.consOcupado.set(false);
          this.consError.set(mensajeError(e));
        },
      });
  }

  // --- Modal 5: Baja por Daño o Pérdida ---
  abrirBaja(item: Item): void {
    this.itemParaBaja.set(item);
    this.bajaCondicionFinal = item.estadoActualItem === 'FALTANTE' ? 'FALTANTE' : 'DANADO';
    this.bajaObservacion = '';
    this.bajaClaveOperacion = generarClaveOperacion();
    this.lastBajaPayload = '';
    this.bajaRetiradoExitoso.set(false);
    this.bajaPendienteDesactivacion.set(false);
    this.bajaError.set('');
    this.modalBaja.set(true);
  }

  cerrarModalBaja(): void {
    if (this.bajaOcupado()) return;
    this.modalBaja.set(false);
    this.itemParaBaja.set(null);
    this.bajaRetiradoExitoso.set(false);
    this.bajaPendienteDesactivacion.set(false);
  }

  ejecutarBaja(): void {
    const item = this.itemParaBaja();
    if (!item || this.bajaOcupado()) return;

    if (this.bajaPendienteDesactivacion()) {
      this.ejecutarEtapa2Desactivacion(item.idItem);
      return;
    }

    if (item.estadoItem === 'En habitacion') {
      if (!this.sesion.actual()?.idUsuario) {
        this.bajaError.set('Inicia sesión para registrar la baja.');
        return;
      }
      if (!this.bajaObservacion.trim()) {
        this.bajaError.set('La observación es obligatoria (máximo 180 caracteres).');
        return;
      }
      if (this.bajaObservacion.trim().length > 180) {
        this.bajaError.set('La observación no puede exceder 180 caracteres.');
        return;
      }

      const firmaPayload = JSON.stringify({
        id: item.idItem,
        u: this.sesion.actual()?.idUsuario,
        c: this.bajaCondicionFinal,
        o: this.bajaObservacion.trim(),
      });
      if (this.lastBajaPayload && this.lastBajaPayload !== firmaPayload) {
        this.bajaClaveOperacion = generarClaveOperacion();
      }
      this.lastBajaPayload = firmaPayload;

      this.bajaOcupado.set(true);
      this.bajaError.set('');

      if (this.bajaRetiradoExitoso()) {
        this.ejecutarEtapa2Desactivacion(item.idItem);
        return;
      }

      // Etapa 1: Retiro de la habitación con condición final
      this.mantenimiento
        .asignarItem(item.idItem, {
          claveOperacion: this.bajaClaveOperacion,
          idUsuario: this.sesion.actual()!.idUsuario,
          idHabitacion: null,
          estadoActualItem: this.bajaCondicionFinal,
          observacion: this.bajaObservacion.trim(),
        })
        .subscribe({
          next: () => {
            this.bajaRetiradoExitoso.set(true);
            this.ejecutarEtapa2Desactivacion(item.idItem);
          },
          error: (e) => {
            this.bajaOcupado.set(false);
            this.bajaError.set(mensajeError(e));
          },
        });
    } else {
      // Unidad en almacén / sin asignar: desactivación directa
      this.bajaOcupado.set(true);
      this.bajaError.set('');
      this.mantenimiento.desactivarItem(item.idItem).subscribe({
        next: () => {
          this.bajaOcupado.set(false);
          this.cerrarModalBaja();
          this.avisos.mostrar('Unidad desactivada correctamente. Su historial se conserva.');
          this.cargar();
        },
        error: (e) => {
          this.bajaOcupado.set(false);
          this.bajaError.set(mensajeError(e));
        },
      });
    }
  }

  ejecutarEtapa2Desactivacion(idItem: number): void {
    this.bajaOcupado.set(true);
    this.bajaError.set('');

    this.mantenimiento.desactivarItem(idItem).subscribe({
      next: () => {
        this.bajaOcupado.set(false);
        this.cerrarModalBaja();
        this.avisos.mostrar(
          'Artículo retirado de la habitación y dado de baja correctamente. Su historial se conserva.',
        );
        this.cargar();
      },
      error: (e) => {
        this.bajaOcupado.set(false);
        this.bajaPendienteDesactivacion.set(true);
        this.bajaError.set(
          `La unidad fue retirada de la habitación con condición "${this.textoCondicion(this.bajaCondicionFinal)}", pero ocurrió un error al desactivarla: ${mensajeError(e)}. Falta desactivar. Puedes reintentar la desactivación sin duplicar el retiro.`,
        );
      },
    });
  }

  // --- Modal 6: Consultar Detalle e Historial ---
  abrirDetalle(item: Item): void {
    this.itemDetalle.set(item);
    this.historial.set([]);
    this.cargandoHistorial.set(true);
    this.errorHistorial.set('');
    this.modalDetalle.set(true);
    if (!this.sesion.permite('MOBILIARIO:VER_HISTORIAL')) {
      this.cargandoHistorial.set(false);
      return;
    }

    this.mantenimiento.historialItem(item.idItem).subscribe({
      next: (movimientos) => {
        this.historial.set(movimientos || []);
        this.cargandoHistorial.set(false);
      },
      error: (e) => {
        this.errorHistorial.set(mensajeError(e));
        this.cargandoHistorial.set(false);
      },
    });
  }

  cerrarModalDetalle(): void {
    this.modalDetalle.set(false);
    this.itemDetalle.set(null);
  }

  abrirEditarDesdeDetalle(): void {
    const item = this.itemDetalle();
    this.cerrarModalDetalle();
    if (item) this.abrirEditar(item);
  }

  // --- Helpers de visualización ---
  textoCondicion(condicion: EstadoConservacion | null | undefined): string {
    switch (condicion) {
      case 'BUENO':
        return 'Bueno';
      case 'DANADO':
        return 'Dañado';
      case 'FALTANTE':
        return 'Perdido/faltante';
      case 'EN_REPARACION':
        return 'En reparación';
      default:
        return 'No registrada';
    }
  }

  claseCondicion(condicion: EstadoConservacion | null | undefined): string {
    switch (condicion) {
      case 'BUENO':
        return 'badge-bueno';
      case 'DANADO':
        return 'badge-danado';
      case 'FALTANTE':
        return 'badge-faltante';
      case 'EN_REPARACION':
        return 'badge-reparacion';
      default:
        return 'badge-default';
    }
  }

  textoSituacion(item: Item): string {
    if (item.estadoItem === 'Inactivo') return 'Dado de baja (Inactivo)';
    if (item.estadoItem === 'En habitacion') {
      return item.numeroCuarto ? `Habitación ${item.numeroCuarto}` : 'En habitación';
    }
    return 'En almacén (Sin asignar)';
  }

  claseEstadoHabitacion(estado: EstadoHabitacion): string {
    switch (estado) {
      case 'DISPONIBLE':
        return 'disponible';
      case 'OCUPADO':
        return 'en_curso';
      case 'LIMPIEZA':
        return 'limpieza';
      case 'MANTENIMIENTO':
        return 'mantenimiento';
      default:
        return '';
    }
  }

  textoAccionHistorial(accion: string): string {
    switch (accion) {
      case 'ASIGNACION':
        return 'Asignación';
      case 'TRASLADO':
        return 'Traslado';
      case 'RETIRO':
        return 'Retiro';
      case 'CONSERVACION':
        return 'Conservación';
      default:
        return accion;
    }
  }

  claseAccionHistorial(accion: string): string {
    switch (accion) {
      case 'ASIGNACION':
        return 'badge-asignacion';
      case 'TRASLADO':
        return 'badge-traslado';
      case 'RETIRO':
        return 'badge-retiro';
      case 'CONSERVACION':
        return 'badge-conservacion';
      default:
        return 'badge-default';
    }
  }
}
