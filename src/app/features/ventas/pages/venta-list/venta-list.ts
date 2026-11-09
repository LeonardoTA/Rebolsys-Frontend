import { Component, inject, signal } from "@angular/core";
import { CurrencyPipe, DatePipe } from "@angular/common";
import { RouterLink } from "@angular/router";
import { VentaService } from "../../services/venta-service";
import { Venta } from "../../models/venta.model";
import { Pagina } from "../../../../core/models/pagina-response";
import { mensajeError } from "../../../../core/utils/http-error";
import { Icon } from "../../../../shared/components/icono/icono";
@Component({
  selector: "app-venta-list",
  imports: [CurrencyPipe, DatePipe, RouterLink, Icon],
  templateUrl: "./venta-list.html",
  styleUrl: "./venta-list.css",
})
export class VentaList {
  private servicio = inject(VentaService);
  respuesta = signal<Pagina<Venta> | null>(null);
  error = signal("");
  cargando = signal(true);
  pagina = 0;
  tamanio = 10;
  ngOnInit() {
    this.cargar();
  }
  cargar() {
    this.error.set("");
    this.cargando.set(true);
    this.servicio.listar(this.pagina, this.tamanio).subscribe({
      next: (r) => {
        this.respuesta.set(r);
        this.cargando.set(false);
      },
      error: (e) => {
        this.error.set(mensajeError(e));
        this.cargando.set(false);
      },
    });
  }
}
