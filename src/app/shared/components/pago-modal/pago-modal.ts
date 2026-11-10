import { DialogFocus } from "../../directives/dialog-focus";
import { Icon } from "../icono/icono";

import { Component, input, output, signal, computed } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { CurrencyPipe } from "@angular/common";
import { Catalogos } from "../../../core/models/catalogo.model";
import { ConfirmacionPago } from "../../../features/reservas/models/reserva-api.model";

@Component({
  selector: "app-pago-modal",
  imports: [FormsModule, CurrencyPipe, Icon, DialogFocus],
  templateUrl: "./pago-modal.html",
  styleUrl: "./pago-modal.css",
})
export class PagoModal {
  total = input.required<number>();
  esNueva = input(true);
  permiteParcial = input(true);
  ocupado = input(false);
  error = input("");
  catalogos = input<Catalogos | null>(null);
  idUsuario = input<number | null>(null);
  solicitudFijada = input(false);
  puedePosponer = input(true);
  usuarioElegido = signal<number | null>(null);
  turnoElegido = signal<number | null>(null);
  formaElegida = signal<number | null>(null);
  numeroOperacion = signal("");
  usuario = computed(
    () =>
      this.idUsuario() ??
      this.usuarioElegido() ??
      this.catalogos()?.usuarios?.[0]?.id ??
      null,
  );
  turnos = computed(
    () =>
      this.catalogos()?.turnosAbiertos?.filter(
        (t) => t.idUsuario === this.usuario(),
      ) ?? [],
  );
  turno = computed(() =>
    this.turnos().some((t) => t.idTurno === this.turnoElegido())
      ? this.turnoElegido()
      : (this.turnos()[0]?.idTurno ?? null),
  );
  formaPago = computed(
    () =>
      this.catalogos()?.pagos.find((p) => p.id === this.formaElegida()) ??
      this.catalogos()?.pagos[0],
  );
  efectivo = computed(
    () =>
      !this.catalogos() ||
      this.formaPago()?.nombre.trim().toLocaleUpperCase("es") === "EFECTIVO",
  );
  cerrar = output<void>();
  confirmar = output<ConfirmacionPago>();
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
      (!this.catalogos() ||
        (!!this.usuario() && !!this.turno() && !!this.formaPago())) &&
      (!this.efectivo() ||
        (efectivo !== null && dinero(efectivo) && efectivo >= monto))
    );
  });
  saldo = computed(() => Math.max(0, this.total() - (this.monto() || 0)));
  vuelto = computed(() =>
    this.efectivo()
      ? Math.max(0, (this.recibido() || 0) - (this.monto() || 0))
      : 0,
  );

  enviar() {
    if (!this.valido() || this.ocupado()) return;
    const pago: ConfirmacionPago = {
      forma: "EFECTIVO",
      recibido: this.efectivo() ? this.recibido() : this.monto(),
      monto: this.monto(),
    };
    if (this.catalogos())
      pago.cobro = {
        idUsuario: this.usuario()!,
        idTurno: this.turno()!,
        idFormaPago: this.formaPago()!.id,
        numeroOperacion: this.efectivo()
          ? null
          : this.numeroOperacion().trim() || null,
      };
    this.confirmar.emit(pago);
  }
}
