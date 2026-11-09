import { DialogFocus } from '../../../../shared/directives/dialog-focus';
import { NotificacionService } from '../../../../core/services/notificacion.service';
import { Reserva } from '../../models/reserva.model';
import { Pagina } from '../../../../core/models/pagina-response';
import { Comprobante } from '../../models/comprobante.model';
import { nombre } from '../../../../core/utils/texto';
import { mensajeError } from '../../../../core/utils/http-error';
import { Icon } from '../../../../shared/components/icono/icono';
import { PagoModal } from '../../../../shared/components/pago-modal/pago-modal';
import { ReservaService } from '../../services/reserva-service';

import { Component, inject, signal, computed } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-reservas',
  imports: [
    CurrencyPipe,
    DatePipe,
    FormsModule,
    RouterLink,
    Icon,
    PagoModal,
    DialogFocus,
  ],
  templateUrl: './reserva-list.html',
  styleUrl: './reserva-list.css',
})
export class ReservaList {
  private readonly reservaService = inject(ReservaService);
  private avisos = inject(NotificacionService);
  nombre = nombre;
  respuesta = signal<Pagina<Reserva> | null>(null);
  cargando = signal(true);
  error = signal('');
  pagina = 0;
  tamanio = 10;
  busqueda = '';
  estado = '';
  cancelando = signal<Reserva | null>(null);
  pagando = signal<Reserva | null>(null);
  detalle = signal<Reserva | null>(null);
  recibo = signal<Comprobante | null>(null);
  reservaComprobante = signal<Reserva | null>(null);
  ocupado = signal(false);
  modalError = signal('');
  private clavePago = '';
  motivoCancelacion = '';
  confirmarDevolucion = false;
  private searchTimer?: ReturnType<typeof setTimeout>;
  private requestId = 0;
  constructor() {
    this.cargar();
  }
  ngOnDestroy() {
    clearTimeout(this.searchTimer);
  }
  cargar() {
    const id = ++this.requestId;
    this.error.set('');
    this.cargando.set(true);
    this.reservaService
      .listar(this.pagina, this.tamanio, this.busqueda, this.estado)
      .subscribe({
        next: (r) => {
          if (id !== this.requestId) return;
          this.respuesta.set(r);
          this.cargando.set(false);
        },
        error: (e) => {
          if (id !== this.requestId) return;
          this.error.set(mensajeError(e));
          this.cargando.set(false);
        },
      });
  }
  buscar() {
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.pagina = 0;
      this.cargar();
    }, 300);
  }
  editable(r: Reserva) {
    return r.estado === 'CONFIRMADA';
  }
  numeroHuespedes(r: Reserva) {
    return r.habitaciones.reduce((n, h) => n + h.huespedes.length, 0);
  }
  estadoTexto(s: string) {
    return (
      (
        {
          CONFIRMADA: 'Confirmada',
          EN_CURSO: 'En curso',
          CANCELADA: 'Cancelada',
          FINALIZADA: 'Finalizada',
        } as Record<string, string>
      )[s] || s
    );
  }
  abrirCancelacion(r: Reserva) {
    this.motivoCancelacion = '';
    this.confirmarDevolucion = false;
    this.modalError.set('');
    this.cancelando.set(r);
  }
  cancelar(r: Reserva) {
    if (this.ocupado()) return;
    if (
      !this.motivoCancelacion.trim() ||
      (r.pagado > 0 && !this.confirmarDevolucion)
    ) {
      this.modalError.set(
        'Escribe el motivo y confirma la devolución si existen pagos.',
      );
      return;
    }
    this.ocupado.set(true);
    this.modalError.set('');
    this.reservaService
      .cancelar(r.referencia, this.motivoCancelacion, this.confirmarDevolucion)
      .subscribe({
        next: (resultado) => {
          this.ocupado.set(false);
          this.cancelando.set(null);
          this.avisos.mostrar(
            'Reserva cancelada. Habitaciones liberadas.' +
              (resultado.devuelto > 0
                ? ` Devolución registrada: S/ ${resultado.devuelto.toFixed(2)}.`
                : ''),
          );
          this.cargar();
        },
        error: (e) => {
          this.ocupado.set(false);
          this.modalError.set(mensajeError(e));
        },
      });
  }
  abrirPago(r: Reserva) {
    this.clavePago = crypto.randomUUID();
    this.modalError.set('');
    this.pagando.set(r);
  }
  pagar(recibido: number | null, monto?: number | null) {
    const r = this.pagando();
    if (!r || recibido === null || this.ocupado()) return;
    this.ocupado.set(true);
    this.modalError.set('');
    this.reservaService
      .pagar(r.referencia, this.clavePago, recibido, monto)
      .subscribe({
        next: (res) => {
          this.ocupado.set(false);
          this.pagando.set(null);
          this.avisos.mostrar(
            `Pago registrado. Saldo: S/ ${res.saldo.toFixed(2)}. Vuelto: S/ ${res.vuelto.toFixed(2)}`,
          );
          this.cargar();
          this.verComprobante(res);
        },
        error: (e) => {
          this.ocupado.set(false);
          this.modalError.set(mensajeError(e));
        },
      });
  }
  verComprobante(r: Reserva, idComprobante?: number) {
    this.reservaComprobante.set(r);
    this.reservaService.comprobante(r.referencia, idComprobante).subscribe({
      next: (c) => this.recibo.set(c),
      error: (e) => this.avisos.mostrar(mensajeError(e), true),
    });
  }
  imprimir() {
    window.print();
  }
}
