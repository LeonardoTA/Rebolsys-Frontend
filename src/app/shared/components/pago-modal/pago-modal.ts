import { DialogFocus } from '../../directives/dialog-focus';
import { Icon } from '../icono/icono';

import { Component, input, output, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CurrencyPipe } from '@angular/common';

@Component({
  selector: 'app-pago-modal',
  imports: [FormsModule, CurrencyPipe, Icon, DialogFocus],
  templateUrl: './pago-modal.html',
  styleUrl: './pago-modal.css',
})
export class PagoModal {
  total = input.required<number>();
  esNueva = input(true);
  permiteParcial = input(true);
  ocupado = input(false);
  error = input('');
  cerrar = output<void>();
  confirmar = output<{
    forma: 'EFECTIVO' | 'PENDIENTE';
    recibido: number | null;
    monto?: number | null;
  }>();
  recibido = signal<number | null>(null);
  parcial = signal(false);
  montoParcial = signal<number | null>(null);
  monto = computed(() => (this.parcial() ? this.montoParcial() : this.total()));
  valido = computed(() => {
    const monto = this.monto(),
      efectivo = this.recibido();
    const dinero = (n: number) =>
      Number.isFinite(n) &&
      n <= 99999999.99 &&
      Math.abs(n * 100 - Math.round(n * 100)) < 0.000001;
    return (
      monto !== null &&
      dinero(monto) &&
      monto > 0 &&
      monto <= this.total() &&
      efectivo !== null &&
      dinero(efectivo) &&
      efectivo >= monto
    );
  });
  saldo = computed(() => Math.max(0, this.total() - (this.monto() || 0)));
  vuelto = computed(() =>
    Math.max(0, (this.recibido() || 0) - (this.monto() || 0)),
  );
}
