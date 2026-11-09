import { VentaCarrito } from "../../components/venta-carrito/venta-carrito";
import { Component, inject, signal, computed, input } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { CurrencyPipe } from "@angular/common";
import { RouterLink, Router } from "@angular/router";
import { forkJoin, of } from "rxjs";
import { ProductoService } from "../../../productos/services/producto-service";
import { CategoriaService } from "../../../categorias/services/categoria-service";
import { VentaService } from "../../services/venta-service";
import { Producto } from "../../../productos/models/producto.model";
import { Categoria } from "../../../categorias/models/categoria.model";
import { Venta, VentaRequest, ReservaVenta } from "../../models/venta.model";
import { mensajeError } from "../../../../core/utils/http-error";
import { Icon } from "../../../../shared/components/icono/icono";
import { PagoModal } from "../../../../shared/components/pago-modal/pago-modal";
import { DialogFocus } from "../../../../shared/directives/dialog-focus";
import { VentaTicket } from "../../components/venta-ticket/venta-ticket";
@Component({
  selector: "app-venta-form",
  imports: [
    FormsModule,
    CurrencyPipe,
    RouterLink,
    Icon,
    PagoModal,
    DialogFocus,
    VentaTicket,
    VentaCarrito,
  ],
  templateUrl: "./venta-form.html",
  styleUrl: "./venta-form.css",
})
export class VentaForm {
  id = input<string>();
  original = signal<Venta | null>(null);
  private router = inject(Router);
  private productoService = inject(ProductoService);
  private categoriaService = inject(CategoriaService);
  private ventaService = inject(VentaService);
  productos = signal<Producto[]>([]);
  categorias = signal<Categoria[]>([]);
  reservas = signal<ReservaVenta[]>([]);
  carrito = signal<{ producto: Producto; cantidad: number }[]>([]);
  cargando = signal(true);
  error = signal("");
  guardando = signal(false);
  errorPago = signal("");
  pagoAbierto = signal(false);
  venta = signal<Venta | null>(null);
  fallidas = signal(new Set<number>());
  buscar = signal("");
  categoria = signal<number | null>(null);
  tipoComprador = signal<"EXTERNO" | "HOSPEDAJE">("EXTERNO");
  modoVenta = signal<"SEPARADA" | "CARGO_RESERVA">("SEPARADA");
  reservaId = signal<number | null>(null);
  buscarHabitacion = signal("");
  compradorNombre = signal("");
  private clave = crypto.randomUUID();
  private solicitud: VentaRequest | null = null;
  seleccionada = computed(
    () =>
      this.reservas().find((r) => r.idDetalleReserva === this.reservaId()) ||
      null,
  );
  visibles = computed(() =>
    this.productos().filter(
      (p) =>
        (this.categoria() === null || p.idCategoria === this.categoria()) &&
        p.nombreProducto
          .toLocaleLowerCase("es")
          .includes(this.buscar().trim().toLocaleLowerCase("es")),
    ),
  );
  reservasVisibles = computed(() =>
    this.reservas().filter((r) =>
      (
        r.habitacion +
        " " +
        r.numero +
        " " +
        r.clienteNombre +
        " " +
        r.huespedes.join(" ")
      )
        .toLocaleLowerCase("es")
        .includes(this.buscarHabitacion().trim().toLocaleLowerCase("es")),
    ),
  );
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
  ngOnInit() {
    this.cargar();
  }
  cargar() {
    this.cargando.set(true);
    this.error.set("");
    forkJoin({
      productos: this.productoService.catalogo(),
      categorias: this.categoriaService.listar(),
      reservas: this.ventaService.reservas(),
      original: this.id() ? this.ventaService.obtener(this.id()!) : of(null),
    }).subscribe({
      next: (r) => {
        this.productos.set(r.productos);
        this.categorias.set(r.categorias);
        this.reservas.set(r.reservas);
        if (r.original) {
          if (!r.original.editable) {
            this.error.set(
              "Esta venta ya tiene cobro o comprobante, o su reserva no está activa. No se puede editar.",
            );
            this.cargando.set(false);
            return;
          }
          this.original.set(r.original);
          this.tipoComprador.set("HOSPEDAJE");
          this.modoVenta.set("CARGO_RESERVA");
          this.reservaId.set(r.original.idDetalleReserva);
          this.compradorNombre.set(r.original.compradorNombre);
          const anteriores = new Map(
            r.original.detalles.map((d) => [d.idProducto, d]),
          );
          this.productos.set(
            r.productos.map((p) => ({
              ...p,
              stock: p.stock + (anteriores.get(p.idProducto)?.cantidad || 0),
              precioActual:
                anteriores.get(p.idProducto)?.precioUnitario ?? p.precioActual,
            })),
          );
          this.carrito.set(
            r.original.detalles.map((d) => ({
              cantidad: d.cantidad,
              producto: {
                ...(this.productos().find(
                  (p) => p.idProducto === d.idProducto,
                ) || {
                  idProducto: d.idProducto,
                  idCategoria: 0,
                  categoriaNombre: "",
                  stockMinimo: 0,
                  estadoProducto: "INACTIVO" as const,
                  imagenRuta: d.imagenRuta,
                }),
                nombreProducto: d.nombreProducto,
                precioActual: d.precioUnitario,
                stock: d.stockRestante + d.cantidad,
              },
            })),
          );
        }
        this.cargando.set(false);
      },
      error: (e) => {
        this.error.set(mensajeError(e));
        this.cargando.set(false);
      },
    });
  }
  cambiarComprador(tipo: "EXTERNO" | "HOSPEDAJE") {
    this.tipoComprador.set(tipo);
    this.reservaId.set(null);
    this.compradorNombre.set("");
    this.modoVenta.set(tipo === "EXTERNO" ? "SEPARADA" : "CARGO_RESERVA");
  }
  elegirReserva(id: number | null) {
    this.reservaId.set(id);
    this.compradorNombre.set(this.seleccionada()?.clienteNombre || "");
  }
  cantidad(id: number) {
    return (
      this.carrito().find((l) => l.producto.idProducto === id)?.cantidad || 0
    );
  }
  agregar(p: Producto) {
    if (this.guardando() || this.cantidad(p.idProducto) >= p.stock) return;
    const original = this.original()?.detalles.find(
      (d) => d.idProducto === p.idProducto,
    );
    if (
      p.estadoProducto !== "ACTIVO" &&
      this.cantidad(p.idProducto) >= (original?.cantidad ?? 0)
    )
      return;
    this.error.set("");
    const existe = this.carrito().some(
      (l) => l.producto.idProducto === p.idProducto,
    );
    this.carrito.update((items) =>
      existe
        ? items.map((l) =>
            l.producto.idProducto === p.idProducto
              ? { ...l, cantidad: l.cantidad + 1 }
              : l,
          )
        : [...items, { producto: p, cantidad: 1 }],
    );
  }
  restar(id: number) {
    this.carrito.update((items) =>
      items
        .map((l) =>
          l.producto.idProducto === id ? { ...l, cantidad: l.cantidad - 1 } : l,
        )
        .filter((l) => l.cantidad > 0),
    );
  }
  quitar(id: number) {
    this.carrito.update((items) =>
      items.filter((l) => l.producto.idProducto !== id),
    );
  }
  imagen(p: Producto) {
    return p.imagenRuta && !this.fallidas().has(p.idProducto)
      ? p.imagenRuta
      : "/imagenes/productos/sin-imagen.svg";
  }
  errorImagen(id: number) {
    this.fallidas.update((actual) => new Set([...actual, id]));
  }
  confirmarVenta() {
    this.error.set("");
    if (!this.carrito().length) {
      this.error.set("Agrega al menos un producto al carrito.");
      return;
    }
    if (
      !this.id() &&
      this.tipoComprador() === "HOSPEDAJE" &&
      !this.seleccionada()
    ) {
      this.error.set("Selecciona la habitación y reserva del comprador.");
      return;
    }
    if (this.compradorNombre().trim().length > 200) {
      this.error.set("El nombre del comprador admite hasta 200 caracteres.");
      return;
    }
    if (this.id()) {
      if (!this.original()?.editable || this.guardando()) return;
      this.guardando.set(true);
      this.ventaService
        .actualizar(this.id()!, {
          compradorNombre: this.compradorNombre().trim() || null,
          detalles: this.carrito().map((l) => ({
            idProducto: l.producto.idProducto,
            cantidad: l.cantidad,
            precioEsperado: l.producto.precioActual,
          })),
        })
        .subscribe({
          next: (v) => {
            this.guardando.set(false);
            void this.router.navigate(["/ventas", v.idVenta]);
          },
          error: (e) => {
            this.guardando.set(false);
            this.error.set(mensajeError(e));
          },
        });
      return;
    }
    const cargo =
      this.tipoComprador() === "HOSPEDAJE" &&
      this.modoVenta() === "CARGO_RESERVA";
    const r = this.seleccionada();
    this.solicitud = {
      claveRegistro: this.clave,
      modoVenta: cargo ? "CARGO_RESERVA" : "SEPARADA",
      idDetalleReserva: cargo ? r!.idDetalleReserva : null,
      idCliente:
        !cargo && r && this.compradorNombre().trim() === r.clienteNombre
          ? r.idCliente
          : null,
      compradorNombre: this.compradorNombre().trim() || null,
      detalles: this.carrito().map((l) => ({
        idProducto: l.producto.idProducto,
        cantidad: l.cantidad,
        precioEsperado: l.producto.precioActual,
      })),
      efectivoRecibido: null,
    };
    if (cargo) this.registrar(null);
    else if (this.total() === 0) this.registrar(0);
    else {
      this.errorPago.set("");
      this.pagoAbierto.set(true);
    }
  }
  registrar(recibido: number | null) {
    if (!this.solicitud || this.guardando()) return;
    this.guardando.set(true);
    this.errorPago.set("");
    this.ventaService
      .registrar({ ...this.solicitud, efectivoRecibido: recibido })
      .subscribe({
        next: (v) => {
          this.guardando.set(false);
          this.pagoAbierto.set(false);
          this.venta.set(v);
          this.carrito.set([]);
          this.clave = crypto.randomUUID();
          this.solicitud = null;
          this.productoService
            .catalogo()
            .subscribe({ next: (p) => this.productos.set(p) });
        },
        error: (e) => {
          this.guardando.set(false);
          if (this.pagoAbierto()) this.errorPago.set(mensajeError(e));
          else this.error.set(mensajeError(e));
        },
      });
  }
  nuevaVenta() {
    this.venta.set(null);
    this.compradorNombre.set("");
    this.reservaId.set(null);
    this.error.set("");
  }
  imprimir() {
    window.print();
  }
}
