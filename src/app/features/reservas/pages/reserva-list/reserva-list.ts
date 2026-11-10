import { PermisosUi } from "../../../../core/services/permisos-ui";
import { Component, DestroyRef, inject, signal } from "@angular/core";
import { CurrencyPipe, DatePipe } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { RouterLink,Router,ActivatedRoute } from "@angular/router";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { forkJoin } from "rxjs";
import { DialogFocus } from "../../../../shared/directives/dialog-focus";
import { NotificacionService } from "../../../../core/services/notificacion.service";
import { CatalogoService } from "../../../../core/services/catalogo-service";
import { Catalogos } from "../../../../core/models/catalogo.model";
import { Pagina } from "../../../../core/models/pagina-response";
import { mensajeError } from "../../../../core/utils/http-error";
import { Icon } from "../../../../shared/components/icono/icono";
import { PagoModal } from "../../../../shared/components/pago-modal/pago-modal";
import { ComprobanteDialog } from '../../components/comprobante-dialog/comprobante-dialog';
import {
  ReservaService,
  ReservaResumen,
  PagoPendiente,
} from "../../services/reserva-service";
import {
  ConfirmacionPago,
  CuentaReserva,
  DetalleReserva,
  estadoReserva,
} from "../../models/reserva-api.model";

@Component({
  selector: "app-reservas",
  imports: [
    CurrencyPipe,
    DatePipe,
    FormsModule,
    RouterLink,
    Icon,
    PagoModal,
    DialogFocus,
    ComprobanteDialog,
  ],
  templateUrl: "./reserva-list.html",
  styleUrl: "./reserva-list.css",
})
export class ReservaList {
  readonly acceso = inject(PermisosUi);
  private readonly servicio = inject(ReservaService);
  private readonly catalogoService = inject(CatalogoService);
  private readonly avisos = inject(NotificacionService);
  private readonly destroy = inject(DestroyRef);
  private readonly ruta=inject(ActivatedRoute);
  private readonly router=inject(Router);
  private comprobanteInicial=Number(this.ruta.snapshot.queryParamMap.get('comprobante'));
  respuesta = signal<Pagina<ReservaResumen> | null>(null);
  catalogos = signal<Catalogos | null>(null);
  cargando = signal(true);
  error = signal("");
  pagina = 0;
  tamanio = 10;
  busqueda = "";
  estado = "";
  pagando = signal<ReservaResumen | null>(null);
  detalle = signal<ReservaResumen | null>(null);
  comprobante = signal<ReservaResumen|null>(null);
  abrirComprobante(r:ReservaResumen){this.detalle.set(null);this.comprobante.set(r);}
  ocupado = signal(false);
  modalError = signal("");
  pagoFijado = signal(false);
  private clavePago = "";
  private solicitudPago: ConfirmacionPago | null = null;
  private searchTimer?: ReturnType<typeof setTimeout>;
  private requestId = 0;
  private detalleId = 0;
  estadoReserva = estadoReserva;
  pagosPendientes = this.servicio.pagosPendientes;
  registroPendiente = this.servicio.registroPendiente;

  constructor() {
    this.cargar();
  }
  ngOnDestroy() {
    clearTimeout(this.searchTimer);
  }
  cargar() {
    const id = ++this.requestId;
    this.error.set("");
    this.cargando.set(true);
    forkJoin({
      pagina: this.servicio.listar(
        this.pagina,
        this.tamanio,
        this.busqueda,
        this.estado,
      ),
      catalogos: this.catalogoService.listar(),
    })
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: ({ pagina, catalogos }) => {
          if (id !== this.requestId) return;
          this.respuesta.set(pagina);
          this.catalogos.set(catalogos);
          this.cargando.set(false);
          if(Number.isInteger(this.comprobanteInicial)&&this.comprobanteInicial>0){
            const reservaId=this.comprobanteInicial;this.comprobanteInicial=0;
            void this.router.navigate([],{relativeTo:this.ruta,queryParams:{comprobante:null},queryParamsHandling:'merge',replaceUrl:true});
            forkJoin({reserva:this.servicio.obtener(reservaId),cuenta:this.servicio.cuenta(reservaId)})
              .pipe(takeUntilDestroyed(this.destroy)).subscribe({next:({reserva,cuenta})=>this.abrirComprobante({...reserva,cuenta}),error:e=>this.avisos.mostrar(mensajeError(e),true)});
          }
        },
        error: (e) => {
          if (id === this.requestId) {
            this.error.set(mensajeError(e));
            this.cargando.set(false);
          }
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
  numeroHuespedes(r: ReservaResumen) {
    return r.detalles.reduce((n, h) => n + h.ocupantes.length, 0);
  }
  estadoTexto(s: string) {
    return (
      (
        {
          CONFIRMADA: "Confirmada",
          EN_CURSO: "En curso",
          CANCELADA: "Cancelada",
          FINALIZADA: "Finalizada",
        } as Record<string, string>
      )[s] || s
    );
  }
  estadoCobro(cuenta: CuentaReserva) {
    return cuenta.saldoPendiente === 0
      ? "PAGADO"
      : cuenta.totalPagado > 0
        ? "PARCIAL"
        : "PENDIENTE";
  }
  saldoPrincipal(cuenta: CuentaReserva) {
    return cuenta.cuentas.find((c) => c.idVenta === null)?.saldo ?? 0;
  }
  formaPago(id: number) {
    return (
      this.catalogos()?.pagos.find((p) => p.id === id)?.nombre ??
      "Forma de pago #" + id
    );
  }
  tienePagos(cuenta: CuentaReserva) {
    return cuenta.cuentas.some((c) => c.pagos.length > 0);
  }
  responsable(habitacion: DetalleReserva, id: number) {
    return (
      habitacion.ocupantes.find((g) => g.idReservaOcupante === id)?.nombre ??
      "Responsable registrado"
    );
  }
  verDetalle(r: ReservaResumen) {
    const id = ++this.detalleId;
    this.servicio
      .cuenta(r.idReserva)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (cuenta) => {
          if (id === this.detalleId) this.detalle.set({ ...r, cuenta });
        },
        error: (e) => this.avisos.mostrar(mensajeError(e), true),
      });
  }
  abrirPago(r: ReservaResumen) {
    const pendiente = this.pagosPendientes().find(
      (p) => p.idReserva === r.idReserva,
    );
    if (pendiente) {
      this.recuperarPago(pendiente);
      return;
    }
    this.detalle.set(null);
    this.modalError.set("");
    // Actualizar catálogos y saldo antes de cobrar: el turno o la cuenta pudieron cambiar.
    forkJoin({
      cuenta: this.servicio.cuenta(r.idReserva),
      catalogos: this.catalogoService.listar(),
    })
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: ({ cuenta, catalogos }) => {
          if (this.pagando()) return;
          this.catalogos.set(catalogos);
          if (this.saldoPrincipal(cuenta) <= 0) {
            this.avisos.mostrar("El alojamiento ya está pagado.");
            this.cargar();
            return;
          }
          this.clavePago = crypto.randomUUID();
          this.solicitudPago = null;
          this.pagoFijado.set(false);
          this.pagando.set({ ...r, cuenta });
        },
        error: (e) => this.avisos.mostrar(mensajeError(e), true),
      });
  }
  pagar(pago: ConfirmacionPago) {
    const r = this.pagando();
    if (!r || !pago.cobro || !pago.monto || this.ocupado()) return;
    this.solicitudPago ??= structuredClone(pago);
    this.pagoFijado.set(true);
    this.ocupado.set(true);
    this.modalError.set("");
    const solicitud = this.solicitudPago;
    this.servicio
      .pagar(r.idReserva, this.clavePago, solicitud.monto!, solicitud.cobro!)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (cuenta) => {
          this.ocupado.set(false);
          this.pagando.set(null);
          this.pagoFijado.set(false);
          const vuelto = Math.max(
            0,
            (solicitud.recibido ?? solicitud.monto!) - solicitud.monto!,
          );
          this.avisos.mostrar(
            `Pago registrado. Saldo: S/ ${cuenta.saldoPendiente.toFixed(2)}. Vuelto: S/ ${vuelto.toFixed(2)}`,
          );
          this.comprobante.set({ ...r, cuenta });
          this.cargar();
        },
        error: (e) => {
          this.ocupado.set(false);
          if (e.status >= 400 && e.status < 500) {
            this.solicitudPago = null;
            this.clavePago = crypto.randomUUID();
            this.pagoFijado.set(false);
          }
          this.modalError.set(
            mensajeError(e) +
              (this.pagoFijado()
                ? " Reintenta el mismo pago para recuperar la confirmación sin duplicar el abono."
                : ""),
          );
        },
      });
  }
  cerrarPago() {
    if (this.pagoFijado()) {
      this.modalError.set(
        "El pago está pendiente de confirmar. Reinténtalo con los mismos datos antes de registrar otro abono.",
      );
      return;
    }
    this.pagando.set(null);
  }

  recuperarPago(pago: PagoPendiente) {
    if (this.ocupado()) return;
    this.ocupado.set(true);
    this.servicio
      .pagar(pago.idReserva, pago.claveOperacion, pago.monto, pago.cobro)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: () => {
          this.ocupado.set(false);
          this.avisos.mostrar("Confirmación recuperada sin duplicar el pago.");
          this.cargar();
        },
        error: (e) => {
          this.ocupado.set(false);
          this.avisos.mostrar(mensajeError(e), true);
        },
      });
  }
  recuperarRegistro() {
    const solicitud = this.registroPendiente();
    if (!solicitud || this.ocupado()) return;
    this.ocupado.set(true);
    this.servicio
      .crear(solicitud)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (r) => {
          this.ocupado.set(false);
          this.avisos.mostrar(
            "Reserva R" +
              r.idReserva +
              " recuperada. Revisa su saldo antes de cobrar.",
          );
          this.cargar();
        },
        error: (e) => {
          this.ocupado.set(false);
          this.avisos.mostrar(mensajeError(e), true);
        },
      });
  }
}
