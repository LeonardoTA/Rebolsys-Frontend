import { Component, OnInit, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { NotificacionService } from '../../../../core/services/notificacion.service';
import { SesionService } from '../../../../core/services/sesion-service';
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
import { EstadoConservacion, Item } from '../../models/inmobiliario.model';
import { InmobiliarioService } from '../../services/inmobiliario-service';
@Component({
  selector: 'app-inmobiliario-form',
  imports: [FormsModule, Icon, DialogFocus],
  templateUrl: './inmobiliario-form.html',
  styleUrl: './inmobiliario-form.css',
})
export class InmobiliarioForm implements OnInit {
  private readonly inmobiliarioService = inject(InmobiliarioService);
  private readonly habitacionesService = inject(HabitacionService);
  private readonly tiposService = inject(TipoItemService);
  protected readonly sesion = inject(SesionService);
  private readonly avisos = inject(NotificacionService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
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

  modalNuevoTipo = signal(false);

  nuevoTipoNombre = '';

  nuevoTipoError = signal('');

  nuevoTipoOcupado = signal(false);

  abrirRegistrar(): void {
    this.formNombreItem = '';
    this.formIdTipoItem =
      Number(this.route.snapshot.queryParamMap.get('idTipoItem')) ||
      (this.tiposItem()[0]?.idTipoItem ?? null);
    if (
      this.habitacionInicial !== null &&
      this.sesion.permite('MOBILIARIO:ASIGNAR')
    ) {
      this.formDestino = 'habitacion';
      this.formIdHabitacion = this.habitacionInicial;
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
  }

  abrirEditar(item: Item): void {
    this.itemEnEdicion.set(item);
    this.formNombreItem = item.nombreItem;
    this.formIdTipoItem = item.idTipoItem;
    this.creadoIdItem.set(null);
    this.registroExitoParcial.set('');
    this.registroError.set('');
    this.modoEdicion.set(true);
  }

  guardarRegistro(): void {
    if (this.registroOcupado()) return;

    if (!this.formNombreItem.trim()) {
      this.registroError.set('El nombre del artículo es obligatorio.');
      return;
    }
    if (this.formNombreItem.trim().length > 100) {
      this.registroError.set(
        'El nombre del artículo no puede exceder 100 caracteres.',
      );
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
      this.inmobiliarioService
        .guardarItem(item.idItem, {
          nombreItem: this.formNombreItem.trim(),
          idTipoItem: this.formIdTipoItem,
          estadoItem: item.estadoItem,
        })
        .subscribe({
          next: () => {
            this.registroOcupado.set(false);
            this.cancelar();
            this.avisos.mostrar('Artículo actualizado correctamente.');
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
        this.registroError.set(
          'Selecciona la habitación a la que se asignará el artículo.',
        );
        return;
      }
      if (!this.sesion.actual()?.idUsuario) {
        this.registroError.set('Inicia sesión para registrar la asignación.');
        return;
      }
      if (!this.formObservacion.trim()) {
        this.registroError.set(
          'La observación es obligatoria al asignar una habitación.',
        );
        return;
      }
      if (this.formObservacion.trim().length > 180) {
        this.registroError.set(
          'La observación no puede exceder 180 caracteres.',
        );
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
    this.inmobiliarioService
      .guardarItem(null, {
        nombreItem: this.formNombreItem.trim(),
        idTipoItem: this.formIdTipoItem,
        estadoItem: 'Activo',
      })
      .subscribe({
        next: (nuevoItem) => {
          if (this.formDestino === 'almacen' || !this.formIdHabitacion) {
            this.registroOcupado.set(false);
            this.cancelar();
            this.avisos.mostrar(
              'Artículo registrado correctamente en almacén.',
            );
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

    if (
      this.lastAsignacionPayload &&
      this.lastAsignacionPayload !== firmaPayload
    ) {
      this.asignacionClaveOperacion = generarClaveOperacion();
    }
    this.lastAsignacionPayload = firmaPayload;

    this.inmobiliarioService
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
          this.cancelar();
          this.avisos.mostrar(
            'Artículo registrado y asignado a la habitación exitosamente.',
          );
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
      this.nuevoTipoError.set(
        'El nombre del tipo no puede exceder 30 caracteres.',
      );
      return;
    }

    this.nuevoTipoOcupado.set(true);
    this.nuevoTipoError.set('');
    this.tiposService.crearTipoItem(nombre).subscribe({
      next: (tipoCreado) => {
        this.nuevoTipoOcupado.set(false);
        this.cerrarModalNuevoTipo();
        this.avisos.mostrar(
          `Tipo "${tipoCreado.nombreItem}" creado exitosamente.`,
        );
        this.tiposService.tiposItem().subscribe((tipos) => {
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
  readonly id = input<string>();
  habitaciones = signal<HabitacionConfiguracion[]>([]);
  tiposItem = signal<TipoItem[]>([]);

  cargando = signal(true);
  error = signal('');
  private habitacionInicial: number | null = null;
  ngOnInit(): void {
    this.cargar();
  }
  cargar(): void {
    this.cargando.set(true);
    this.error.set('');
    const raw = this.id();
    const id = raw ? Number(raw) : null;
    if (raw && (!Number.isInteger(id) || id! <= 0)) {
      this.error.set('Identificador de artículo no válido.');
      this.cargando.set(false);
      return;
    }
    const hab = Number(this.route.snapshot.queryParamMap.get('idHabitacion'));
    this.habitacionInicial = Number.isInteger(hab) && hab > 0 ? hab : null;
    forkJoin({
      habitaciones: this.sesion.permite(
        'HABITACIONES:VER',
        'MOBILIARIO:ASIGNAR',
      )
        ? this.habitacionesService.habitacionesTodas()
        : of([]),
      tipos: this.tiposService.tiposItem(),
      item: id === null ? of(null) : this.inmobiliarioService.item(id),
    }).subscribe({
      next: (res) => {
        this.habitaciones.set(res.habitaciones);
        this.tiposItem.set(res.tipos);
        if (res.item) this.abrirEditar(res.item);
        else this.abrirRegistrar();
        this.cargando.set(false);
      },
      error: (e) => {
        this.error.set(mensajeError(e));
        this.cargando.set(false);
      },
    });
  }
  cancelar(): void {
    if (!this.registroOcupado())
      void this.router.navigate(['/configuraciones/mobiliario']);
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
}
