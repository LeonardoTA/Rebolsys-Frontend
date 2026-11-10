import { CurrencyPipe } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { finalize, map, of, switchMap } from 'rxjs';
import { Pagina } from '../../core/models/pagina-response';
import { NotificacionService } from '../../core/services/notificacion.service';
import { SesionService } from '../../core/services/sesion-service';
import { mensajeError } from '../../core/utils/http-error';
import { DialogFocus } from '../../shared/directives/dialog-focus';
import { ArqueoCaja, CajaApi, DatosMovimiento, MovimientoCaja, TurnoCaja } from './caja-api';

@Component({
  imports: [CurrencyPipe, FormsModule, DialogFocus],
  templateUrl: './caja-panel.html',
  styleUrl: './caja-panel.css',
})
export class CajaPanel {
  private readonly api = inject(CajaApi);
  private readonly destroy = inject(DestroyRef);
  private readonly avisos = inject(NotificacionService);
  private readonly sesion = inject(SesionService);
  readonly turno = signal<TurnoCaja | null>(null);
  readonly historial = signal<Pagina<MovimientoCaja> | null>(null);
  readonly cargando = signal(false);
  readonly ocupado = signal(false);
  readonly errorCarga = signal(false);
  readonly editorMovimiento = signal<-1 | 1 | null>(null);
  readonly tiposMovimiento = computed(() => this.turno()?.tipos.filter(t => t.signo === this.editorMovimiento()) ?? []);
  readonly pendienteMovimiento = signal(false);
  readonly cierre = signal<'conteo' | 'resumen' | null>(null);
  readonly cierreIncierto = signal(false);
  readonly puedeIngresar = computed(() => this.sesion.permite('CAJA:REGISTRAR_INGRESO'));
  readonly puedeGastar = computed(() => this.sesion.permite('GASTOS:CREAR'));
  readonly puedeCerrar = computed(() => this.sesion.permite('CAJA:CERRAR'));
  readonly declaraciones = signal<Record<number, number | null>>({});
  readonly declaracionesValidas = computed(() => {
    const turno = this.turno();
    return !!turno?.revision && turno.arqueos.every(a => this.importeValido(this.declaraciones()[a.idFormaPago], 99999999.99));
  });
  readonly hayDiferencias = computed(() => this.turno()?.arqueos.some(a => (this.diferencia(a) ?? 0) !== 0) ?? false);
  tipoId: number | null = null;
  concepto = '';
  monto: number | null = null;
  archivo: File | null = null;
  archivoInvalido = false;
  private claveRegistro = '';

  constructor() { this.cargar(); }

  cargar(pagina = 0, id?: number) {
    if (this.cargando()) return;
    this.cargando.set(true);
    this.errorCarga.set(false);
    (id === undefined ? this.api.actual() : this.api.turno(id)).pipe(
      switchMap(turno => turno ? this.api.movimientos(turno.idTurno, pagina).pipe(map(historial => ({ turno, historial })))
        : of({ turno: null, historial: null })),
      takeUntilDestroyed(this.destroy),
      finalize(() => this.cargando.set(false)),
    ).subscribe({
      next: ({ turno, historial }) => { this.turno.set(turno); this.historial.set(historial); },
      error: error => {
        this.errorCarga.set(true);
        this.avisos.mostrar(mensajeError(error), true);
      },
    });
  }

  abrirMovimiento(signo: -1 | 1) {
    this.editorMovimiento.set(signo);
    const tipos = this.tiposMovimiento();
    this.tipoId = tipos.length === 1 ? tipos[0].idTipoMovimiento : null;
    this.concepto = '';
    this.monto = null;
    this.archivo = null;
    this.archivoInvalido = false;
    this.claveRegistro = crypto.randomUUID();
    this.pendienteMovimiento.set(false);
  }

  adjuntar(evento: Event) {
    const input = evento.target as HTMLInputElement;
    const archivo = input.files?.item(0) ?? null;
    if (archivo && (!['image/jpeg', 'image/png'].includes(archivo.type) || archivo.size > 5 * 1024 * 1024)) {
      this.archivo = null;
      this.archivoInvalido = true;
      this.avisos.mostrar('Selecciona una foto JPG o PNG de hasta 5 MB.', true);
      return;
    }
    this.archivo = archivo;
    this.archivoInvalido = false;
  }

  quitarAdjunto(entrada: HTMLInputElement) {
    entrada.value = '';
    this.archivo = null;
    this.archivoInvalido = false;
  }

  guardarMovimiento() {
    const turno = this.turno();
    if (!turno?.abierto || this.ocupado() || this.archivoInvalido) return;
    if (!this.tipoId || !this.concepto.trim() || !this.importeValido(this.monto, 9999999999.99) || this.monto === 0) {
      this.avisos.mostrar('Selecciona una categoría e ingresa un concepto y un monto mayor a cero, con hasta dos decimales.', true);
      return;
    }
    const datos: DatosMovimiento = { idTipoMovimiento: this.tipoId, concepto: this.concepto.trim(), monto: this.monto!, claveRegistro: this.claveRegistro };
    this.ocupado.set(true);
    this.api.registrar(turno.idTurno, datos, this.archivo).pipe(takeUntilDestroyed(this.destroy),
      finalize(() => this.ocupado.set(false))).subscribe({
      next: () => {
        this.pendienteMovimiento.set(false);
        this.editorMovimiento.set(null);
        this.avisos.mostrar('Movimiento registrado en el turno.');
        this.cargar();
      },
      error: error => {
        const incierto = !error.status || error.status >= 500;
        this.pendienteMovimiento.set(incierto);
        this.avisos.mostrar(mensajeError(error) + (incierto ? ' Reintenta el mismo registro para confirmar el resultado.' : ''), true);
      },
    });
  }

  abrirCierre() {
    if (!this.turno()?.revision) return;
    this.declaraciones.set({});
    this.cierreIncierto.set(false);
    this.cierre.set('conteo');
  }

  declarar(id: number, monto: number | null) {
    this.declaraciones.update(actual => ({ ...actual, [id]: monto }));
  }

  diferencia(arqueo: ArqueoCaja) {
    const declarado = this.declaraciones()[arqueo.idFormaPago];
    if (declarado == null) return null;
    return (Math.round(declarado * 100) - Math.round(arqueo.montoCalculado * 100)) / 100;
  }

  confirmarCierre() {
    const turno = this.turno();
    if (!turno || this.ocupado()) return;
    if (this.cierreIncierto()) { this.consultarCierre(turno.idTurno); return; }
    if (!turno.revision || !this.declaracionesValidas()) return;
    this.ocupado.set(true);
    const arqueos = turno.arqueos.map(a => ({ idFormaPago: a.idFormaPago, montoDeclarado: this.declaraciones()[a.idFormaPago]! }));
    this.api.cerrar(turno.idTurno, turno.revision, arqueos).pipe(takeUntilDestroyed(this.destroy)).subscribe({
      next: cerrado => {
        this.ocupado.set(false);
        this.mostrarCierre(cerrado, 'Turno cerrado y arqueo guardado.');
      },
      error: error => {
        this.ocupado.set(false);
        if (error.status === 409 || !error.status || error.status >= 500) {
          this.consultarCierre(turno.idTurno, error.status === 409 ? mensajeError(error) : undefined);
        } else this.avisos.mostrar(mensajeError(error), true);
      },
    });
  }

  cerrarDialogo() {
    if (this.ocupado() || this.pendienteMovimiento()) return;
    this.editorMovimiento.set(null);
    this.cierre.set(null);
  }

  fecha(valor: string | null) { return valor ? valor.slice(0, 16).replace('T', ' · ') : '—'; }

  importeValido(monto: number | null | undefined, maximo: number) {
    return monto != null && monto >= 0 && monto <= maximo && /^\d+(\.\d{1,2})?$/.test(String(monto));
  }

  private consultarCierre(id: number, mensaje?: string) {
    this.ocupado.set(true);
    this.cierreIncierto.set(true);
    this.api.turno(id).pipe(takeUntilDestroyed(this.destroy), finalize(() => this.ocupado.set(false))).subscribe({
      next: turno => {
        this.cierreIncierto.set(false);
        if (!turno.abierto) this.mostrarCierre(turno, 'El turno figura cerrado. Revisa el arqueo guardado.');
        else {
          this.turno.set(turno);
          this.cierre.set('conteo');
          this.avisos.mostrar(turno.bloqueoCierre || mensaje || 'El turno sigue abierto. Revisa los importes actualizados antes de confirmar.', true);
        }
      },
      error: () => this.avisos.mostrar('No se pudo confirmar el estado. Consulta el turno antes de volver a enviar el cierre.', true),
    });
  }

  private mostrarCierre(turno: TurnoCaja, mensaje: string) {
    this.turno.set(turno);
    this.cierre.set(null);
    this.avisos.mostrar(mensaje);
    this.cargar(0, turno.idTurno);
    this.sesion.cargar(true).pipe(takeUntilDestroyed(this.destroy)).subscribe({ error: () => {} });
  }
}
