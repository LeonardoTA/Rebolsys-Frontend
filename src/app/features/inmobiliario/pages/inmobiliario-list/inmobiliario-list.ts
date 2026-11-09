import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { Catalogo } from '../../../../core/models/catalogo.model';
import { FiltrosConsulta } from '../../../../core/models/filtros-consulta';
import { Pagina } from '../../../../core/models/pagina-response';
import { CatalogoService } from '../../../../core/services/catalogo-service';
import { NotificacionService } from '../../../../core/services/notificacion.service';
import { generarClaveOperacion } from '../../../../core/utils/clave-operacion';
import { mensajeError } from '../../../../core/utils/http-error';
import { Icon } from '../../../../shared/components/icono/icono';
import { DialogFocus } from '../../../../shared/directives/dialog-focus';
import {
  EstadoHabitacion,
  HabitacionConfiguracion,
} from '../../../habitaciones/models/habitacion.model';
import { HabitacionService } from '../../../habitaciones/services/habitacion-service';
import { TipoItem } from '../../../tipos-inmobiliario/models/tipo-item.model';
import { TipoItemService } from '../../../tipos-inmobiliario/services/tipo-item-service';
import {
  EstadoConservacion,
  EstadoItem,
  Item,
  ItemHistorial,
} from '../../models/inmobiliario.model';
import { InmobiliarioService } from '../../services/inmobiliario-service';
@Component({
  selector: 'app-inmobiliario-list',
  imports: [FormsModule, DatePipe, Icon, DialogFocus],
  templateUrl: './inmobiliario-list.html',
  styleUrl: './inmobiliario-list.css',
})
export class InmobiliarioList implements OnInit {
  private readonly inmobiliarioService = inject(InmobiliarioService);
  private readonly habitacionesService = inject(HabitacionService);
  private readonly tiposService = inject(TipoItemService);
  private readonly catalogos = inject(CatalogoService);
  private readonly avisos = inject(NotificacionService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  habitaciones = signal<HabitacionConfiguracion[]>([]);

  tiposItem = signal<TipoItem[]>([]);

  operadores = signal<Catalogo[]>([]);

  respuesta = signal<Pagina<Item> | null>(null);

  cargando = signal(true);

  error = signal('');

  habitacionSeleccionada = signal<HabitacionConfiguracion | null>(null);

  buscar = '';

  filtroTipo: number | null = null;

  filtroCondicion: EstadoConservacion | '' = '';

  filtroEstado: EstadoItem | '' = '';

  filtroHabitacion: number | 'todas' | 'sin_asignar' = 'todas';

  pagina = signal(0);

  tamanio = signal(10);

  modalAsignacion = signal(false);

  itemParaAsignar = signal<Item | null>(null);

  tipoOperacionAsignacion = signal<'asignar' | 'trasladar' | 'retirar'>(
    'asignar',
  );

  asigIdHabitacion: number | null = null;

  asigEstadoActualItem: EstadoConservacion = 'BUENO';

  asigIdUsuario: number | null = null;

  asigObservacion = '';

  asigClaveOperacion = '';

  lastAsigPayload = '';

  asigError = signal('');

  asigOcupado = signal(false);

  modalConservacion = signal(false);

  itemParaConservar = signal<Item | null>(null);

  consEstadoActualItem: EstadoConservacion = 'BUENO';

  consIdUsuario: number | null = null;

  consObservacion = '';

  consClaveOperacion = '';

  lastConsPayload = '';

  consError = signal('');

  consOcupado = signal(false);

  modalBaja = signal(false);

  itemParaBaja = signal<Item | null>(null);

  bajaCondicionFinal: 'DANADO' | 'FALTANTE' = 'DANADO';

  bajaIdUsuario: number | null = null;

  bajaObservacion = '';

  bajaClaveOperacion = '';

  lastBajaPayload = '';

  bajaRetiradoExitoso = signal(false);

  bajaPendienteDesactivacion = signal(false);

  bajaError = signal('');

  bajaOcupado = signal(false);

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
      habitaciones: this.habitacionesService.habitacionesTodas(),
      tipos: this.tiposService.tiposItem(),
      operadores: this.catalogos.operadores(),
    }).subscribe({
      next: (res) => {
        this.habitaciones.set(res.habitaciones || []);
        this.tiposItem.set(res.tipos || []);
        this.operadores.set(res.operadores?.usuarios || []);
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

    const filtros: FiltrosConsulta = {
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
      const hab =
        this.habitaciones().find(
          (h) => h.idHabitacion === this.filtroHabitacion,
        ) || null;
      this.habitacionSeleccionada.set(hab);
    } else {
      this.habitacionSeleccionada.set(null);
    }

    this.inmobiliarioService.items(filtros).subscribe({
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

  abrirAsignacion(item: Item, tipo: 'asignar' | 'trasladar' | 'retirar'): void {
    this.itemParaAsignar.set(item);
    this.tipoOperacionAsignacion.set(tipo);
    this.asigIdHabitacion =
      tipo === 'retirar'
        ? null
        : item.idHabitacion || this.habitaciones()[0]?.idHabitacion || null;
    this.asigEstadoActualItem = item.estadoActualItem || 'BUENO';
    this.asigIdUsuario = this.operadores()[0]?.id ?? null;
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
    if (!this.asigIdUsuario) {
      this.asigError.set('Selecciona el operador responsable de la operación.');
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
      u: this.asigIdUsuario,
      c: this.asigEstadoActualItem,
      o: this.asigObservacion.trim(),
    });
    if (this.lastAsigPayload && this.lastAsigPayload !== firmaPayload) {
      this.asigClaveOperacion = generarClaveOperacion();
    }
    this.lastAsigPayload = firmaPayload;

    this.asigOcupado.set(true);
    this.asigError.set('');

    this.inmobiliarioService
      .asignarItem(item.idItem, {
        claveOperacion: this.asigClaveOperacion,
        idUsuario: this.asigIdUsuario!,
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

  abrirConservacion(item: Item): void {
    this.itemParaConservar.set(item);
    this.consEstadoActualItem = item.estadoActualItem || 'BUENO';
    this.consIdUsuario = this.operadores()[0]?.id ?? null;
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

    if (!this.consIdUsuario) {
      this.consError.set(
        'Selecciona el operador responsable del registro de conservación.',
      );
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
      u: this.consIdUsuario,
      c: this.consEstadoActualItem,
      o: this.consObservacion.trim(),
    });
    if (this.lastConsPayload && this.lastConsPayload !== firmaPayload) {
      this.consClaveOperacion = generarClaveOperacion();
    }
    this.lastConsPayload = firmaPayload;

    this.consOcupado.set(true);
    this.consError.set('');

    this.inmobiliarioService
      .conservarItem(item.idItem, {
        claveOperacion: this.consClaveOperacion,
        idUsuario: this.consIdUsuario!,
        estadoActualItem: this.consEstadoActualItem,
        observacion: this.consObservacion.trim(),
      })
      .subscribe({
        next: () => {
          this.consOcupado.set(false);
          this.cerrarModalConservacion();
          this.avisos.mostrar(
            'Estado de conservación actualizado exitosamente.',
          );
          this.cargar();
        },
        error: (e) => {
          this.consOcupado.set(false);
          this.consError.set(mensajeError(e));
        },
      });
  }

  abrirBaja(item: Item): void {
    this.itemParaBaja.set(item);
    this.bajaCondicionFinal =
      item.estadoActualItem === 'FALTANTE' ? 'FALTANTE' : 'DANADO';
    this.bajaIdUsuario = this.operadores()[0]?.id ?? null;
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
      if (!this.bajaIdUsuario) {
        this.bajaError.set('Selecciona el operador responsable de la baja.');
        return;
      }
      if (!this.bajaObservacion.trim()) {
        this.bajaError.set(
          'La observación es obligatoria (máximo 180 caracteres).',
        );
        return;
      }
      if (this.bajaObservacion.trim().length > 180) {
        this.bajaError.set('La observación no puede exceder 180 caracteres.');
        return;
      }

      const firmaPayload = JSON.stringify({
        id: item.idItem,
        u: this.bajaIdUsuario,
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
      this.inmobiliarioService
        .asignarItem(item.idItem, {
          claveOperacion: this.bajaClaveOperacion,
          idUsuario: this.bajaIdUsuario!,
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
      this.inmobiliarioService.desactivarItem(item.idItem).subscribe({
        next: () => {
          this.bajaOcupado.set(false);
          this.cerrarModalBaja();
          this.avisos.mostrar(
            'Unidad desactivada correctamente. Su historial se conserva.',
          );
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

    this.inmobiliarioService.desactivarItem(idItem).subscribe({
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

  abrirDetalle(item: Item): void {
    this.itemDetalle.set(item);
    this.historial.set([]);
    this.cargandoHistorial.set(true);
    this.errorHistorial.set('');
    this.modalDetalle.set(true);

    this.inmobiliarioService.historialItem(item.idItem).subscribe({
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
      return item.numeroCuarto
        ? `Habitación ${item.numeroCuarto}`
        : 'En habitación';
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
  abrirRegistrar(): void {
    void this.router.navigate(['nuevo'], {
      relativeTo: this.route,
      queryParams: {
        idHabitacion:
          typeof this.filtroHabitacion === 'number'
            ? this.filtroHabitacion
            : null,
        idTipoItem: this.filtroTipo,
      },
    });
  }
  abrirEditar(item: Item): void {
    void this.router.navigate([item.idItem, 'editar'], {
      relativeTo: this.route,
    });
  }
}
