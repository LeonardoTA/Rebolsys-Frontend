import { Component, input, output, computed } from "@angular/core";
import { CurrencyPipe } from "@angular/common";
import { Producto } from "../../../productos/models/producto.model";
import { Icon } from "../../../../shared/components/icono/icono";
@Component({
  selector: "app-venta-carrito",
  imports: [CurrencyPipe, Icon],
  templateUrl: "./venta-carrito.html",
  styleUrl: "./venta-carrito.css",
})
export class VentaCarrito {
  carrito = input.required<{ producto: Producto; cantidad: number }[]>();
  guardando = input(false);
  editando = input(false);
  modoVenta = input<"SEPARADA" | "CARGO_RESERVA">("SEPARADA");
  agregar = output<Producto>();
  restar = output<number>();
  quitar = output<number>();
  confirmar = output<void>();
  total = computed(
    () =>
      this.carrito().reduce(
        (sum, l) =>
          sum + Math.round(l.producto.precioActual * 100) * l.cantidad,
        0,
      ) / 100,
  );
  unidades = computed(() =>
    this.carrito().reduce((sum, l) => sum + l.cantidad, 0),
  );
}
