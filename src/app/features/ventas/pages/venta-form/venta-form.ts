import { VentaCarrito } from "../../components/venta-carrito/venta-carrito";
import { PermisosUi } from "../../../../core/services/permisos-ui";
import {
  Component,
  DestroyRef,
  inject,
  signal,
  computed,
  input,
} from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { FormsModule } from "@angular/forms";
import { CurrencyPipe, DatePipe } from "@angular/common";
import { RouterLink, Router } from "@angular/router";
import { catchError, forkJoin, of } from "rxjs";
import { ProductoService } from "../../../productos/services/producto-service";
import { CategoriaService } from "../../../categorias/services/categoria-service";
import { VentaService } from "../../services/venta-service";
import { Producto } from "../../../productos/models/producto.model";
import { Categoria } from "../../../categorias/models/categoria.model";
import { Venta, VentaRequest, ReservaVenta } from "../../models/venta.model";
import {
  CobroReserva,
  CuentaReserva,
} from "../../../reservas/models/reserva-api.model";
import { ReservaService } from "../../../reservas/services/reserva-service";
import { coincideReserva } from "../../utils/buscar-reserva";
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
    DatePipe,
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
  readonly acceso = inject(PermisosUi);
  id = input<string>();
  original = signal<Venta | null>(null);
  private router = inject(Router);
  private productoService = inject(ProductoService);
  private categoriaService = inject(CategoriaService);
  private ventaService = inject(VentaService);
  private reservaService = inject(ReservaService);
  private destroy = inject(DestroyRef);
  productos = signal<Producto[]>([]);
  categorias = signal<Categoria[]>([]);
  reservas = signal<ReservaVenta[]>([]);
  carrito = signal<{ producto: Producto; cantidad: number }[]>([]);
  cargando = signal(true);
  error = signal("");
  errorReservas = signal("");
  cuentaReserva = signal<CuentaReserva | null>(null);
  cargandoCuenta = signal(false);
  errorCuenta = signal("");
  ingresoAbierto = signal<ReservaVenta | null>(null);
  errorIngreso = signal("");
  private consultaCuenta = 0;
  errorCatalogo = signal(false);
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
  solicitudFijada = signal(false);
  pendiente = computed(() => this.ventaService.pendiente?.() ?? null);
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
    this.reservas().filter((r) => coincideReserva(r, this.buscarHabitacion())),
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
    this.errorReservas.set("");
    this.errorCatalogo.set(false);
    forkJoin({
      productos: this.productoService.catalogo(),
      categorias: this.categoriaService.listar(),
      reservas: this.ventaService.reservas().pipe(
        catchError((e) => {
          this.errorReservas.set(mensajeError(e));
          return of([] as ReservaVenta[]);
        }),
      ),
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
              stock: p.stock,
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
                stock:
                  this.productos().find((p) => p.idProducto === d.idProducto)
                    ?.stock ?? 0,
              },
            })),
          );
        }
        this.cargando.set(false);
      },
      error: (e) => {
        this.errorCatalogo.set(true);
        this.error.set(mensajeError(e));
        this.cargando.set(false);
      },
    });
  }
  cambiarComprador(tipo: "EXTERNO" | "HOSPEDAJE") {
    if (this.guardando() || this.solicitudFijada() || this.pendiente()) return;
    this.tipoComprador.set(tipo);
    this.reservaId.set(null);
    this.compradorNombre.set("");
    this.modoVenta.set(tipo === "EXTERNO" ? "SEPARADA" : "CARGO_RESERVA");
    this.buscarHabitacion.set("");
    this.consultarCuenta();
  }
  elegirReserva(id: number | null) {
    if (this.guardando() || this.solicitudFijada() || this.pendiente()) return;
    this.reservaId.set(id);
    this.compradorNombre.set(this.seleccionada()?.clienteNombre || "");
    this.modoVenta.set("CARGO_RESERVA");
    this.consultarCuenta();
  }
  consultarCuenta() {
    const consulta = ++this.consultaCuenta;
    const r = this.seleccionada();
    this.cuentaReserva.set(null);
    this.errorCuenta.set("");
    this.cargandoCuenta.set(!!r);
    if (!r) return;
    this.reservaService
      .cuenta(r.idReserva)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (cuenta) => {
          if (consulta !== this.consultaCuenta) return;
          this.cuentaReserva.set(cuenta);
          this.cargandoCuenta.set(false);
          if (!cuenta.admiteConsumosConsolidados)
            this.modoVenta.set("SEPARADA");
        },
        error: (e) => {
          if (consulta !== this.consultaCuenta) return;
          this.errorCuenta.set(mensajeError(e));
          this.cargandoCuenta.set(false);
        },
      });
  }
  abrirIngreso() {
    const r = this.seleccionada();
    if (
      !r ||
      r.estadoDetalle !== "CONFIRMADA" ||
      this.guardando() ||
      this.solicitudFijada() ||
      this.pendiente()
    )
      return;
    this.errorIngreso.set("");
    this.ingresoAbierto.set(r);
  }
  cerrarIngreso() {
    if (!this.guardando()) this.ingresoAbierto.set(null);
  }
  registrarIngreso() {
    const r = this.ingresoAbierto();
    if (!r || this.guardando()) return;
    this.guardando.set(true);
    this.errorIngreso.set("");
    this.reservaService
      .ingresar(r.idDetalleReserva)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (detalle) => {
          this.reservas.update((lista) =>
            lista.map((actual) =>
              actual.idDetalleReserva === detalle.idDetalleReserva
                ? {
                    ...actual,
                    estadoDetalle: detalle.estadoDetalle,
                    fechaIngreso: detalle.fechaIngreso,
                    fechaSalida: detalle.fechaSalida,
                    huespedes: detalle.ocupantes.map((o) => o.nombre),
                  }
                : actual,
            ),
          );
          this.guardando.set(false);
          this.ingresoAbierto.set(null);
          this.error.set("");
          this.consultarCuenta();
        },
        error: (e) => {
          this.guardando.set(false);
          this.errorIngreso.set(mensajeError(e));
        },
      });
  }
  cantidad(id: number) {
    return (
      this.carrito().find((l) => l.producto.idProducto === id)?.cantidad || 0
    );
  }
  agregar(p: Producto) {
    if (
      this.guardando() ||
      this.solicitudFijada() ||
      this.pendiente() ||
      this.cantidad(p.idProducto) >= p.stock
    )
      return;
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
    if (this.guardando() || this.solicitudFijada() || this.pendiente()) return;
    this.carrito.update((items) =>
      items
        .map((l) =>
          l.producto.idProducto === id ? { ...l, cantidad: l.cantidad - 1 } : l,
        )
        .filter((l) => l.cantidad > 0),
    );
  }
  quitar(id: number) {
    if (this.guardando() || this.solicitudFijada() || this.pendiente()) return;
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
    if (this.guardando()) return;
    if (this.solicitudFijada() && this.solicitud) {
      this.registrar(this.solicitud.efectivoRecibido, this.solicitud.cobro);
      return;
    }
    if (this.pendiente()) {
      this.error.set("Recupera la venta pendiente antes de registrar otra.");
      return;
    }
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
    if (!this.id() && this.tipoComprador() === "HOSPEDAJE") {
      if (this.seleccionada()?.estadoDetalle !== "EN_CURSO") {
        this.error.set(
          "Registra primero el ingreso de esta habitación para añadir consumos a la reserva o cobrarle una venta aparte.",
        );
        return;
      }
      if (this.cargandoCuenta() || !this.cuentaReserva()) {
        this.error.set(
          "Consulta la cuenta de la reserva antes de confirmar la venta.",
        );
        return;
      }
      if (
        this.modoVenta() === "CARGO_RESERVA" &&
        !this.cuentaReserva()!.admiteConsumosConsolidados
      ) {
        this.error.set(
          "La cuenta de la reserva ya está pagada o emitida. Selecciona cobrar aparte.",
        );
        return;
      }
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
      idDetalleReserva: r?.idDetalleReserva ?? null,
      idCliente:
        r && this.compradorNombre().trim() === r.clienteNombre
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
  registrar(recibido: number | null, cobro?: CobroReserva) {
    if (!this.solicitud || this.guardando()) return;
    this.guardando.set(true);
    if (!this.solicitudFijada())
      this.solicitud = {
        ...this.solicitud,
        efectivoRecibido: recibido,
        ...(cobro ? { cobro } : {}),
      };
    this.solicitudFijada.set(true);
    this.errorPago.set("");
    this.ventaService.registrar(this.solicitud).subscribe({
      next: (v) => {
        this.guardando.set(false);
        this.pagoAbierto.set(false);
        this.venta.set(v);
        this.carrito.set([]);
        this.clave = crypto.randomUUID();
        this.solicitud = null;
        this.solicitudFijada.set(false);
        this.productoService
          .catalogo()
          .subscribe({ next: (p) => this.productos.set(p) });
      },
      error: (e) => {
        this.guardando.set(false);
        if (e.status >= 400 && e.status < 500 && !this.pendiente()?.idVenta) {
          this.solicitudFijada.set(false);
        }
        const mensaje =
          e instanceof Error && !("status" in e) ? e.message : mensajeError(e);
        if (this.pagoAbierto()) this.errorPago.set(mensaje);
        else this.error.set(mensaje);
      },
    });
  }
  cerrarPago() {
    if (this.solicitudFijada()) {
      this.errorPago.set(
        "Recupera la confirmación de la misma venta antes de cerrar.",
      );
      return;
    }
    this.pagoAbierto.set(false);
  }
  recuperarVenta() {
    if (this.guardando()) return;
    this.guardando.set(true);
    this.error.set("");
    this.ventaService.recuperar().subscribe({
      next: (v) => {
        this.guardando.set(false);
        this.solicitudFijada.set(false);
        this.solicitud = null;
        this.pagoAbierto.set(false);
        this.venta.set(v);
        this.carrito.set([]);
        this.clave = crypto.randomUUID();
        this.cargar();
      },
      error: (e) => {
        this.guardando.set(false);
        this.error.set(
          e instanceof Error && !("status" in e) ? e.message : mensajeError(e),
        );
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
