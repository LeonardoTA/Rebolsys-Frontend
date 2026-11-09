import { Component, inject, input, signal } from "@angular/core";
import { CurrencyPipe, DatePipe } from "@angular/common";
import { RouterLink } from "@angular/router";
import { VentaService } from "../../services/venta-service";
import { Venta } from "../../models/venta.model";
import { VentaTicket } from "../../components/venta-ticket/venta-ticket";
import { Icon } from "../../../../shared/components/icono/icono";
import { mensajeError } from "../../../../core/utils/http-error";
@Component({
  selector: "app-venta-detalle",
  imports: [CurrencyPipe, DatePipe, RouterLink, Icon, VentaTicket],
  templateUrl: "./venta-detalle.html",
  styleUrl: "./venta-detalle.css",
})
export class VentaDetalle {
  id = input.required<string>();
  private servicio = inject(VentaService);
  venta = signal<Venta | null>(null);
  error = signal("");
  ngOnInit() {
    this.cargar();
  }
  cargar() {
    this.servicio.obtener(this.id()).subscribe({
      next: (v) => this.venta.set(v),
      error: (e) => this.error.set(mensajeError(e)),
    });
  }
  imprimir() {
    window.print();
  }
}
