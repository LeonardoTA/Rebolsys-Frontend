import {
  Component,
  DestroyRef,
  inject,
  input,
  output,
  signal,
  computed,
  OnInit,
} from "@angular/core";
import { FormsModule } from "@angular/forms";
import { CurrencyPipe, DatePipe } from "@angular/common";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { catchError, concatMap, forkJoin, of, throwError } from "rxjs";
import { Catalogos } from "../../../../core/models/catalogo.model";
import { mensajeError } from "../../../../core/utils/http-error";
import { fechaLocal } from "../../../../core/utils/fechas";
import { DialogFocus } from "../../../../shared/directives/dialog-focus";
import { Icon } from "../../../../shared/components/icono/icono";
import { ClienteService } from "../../../clientes/services/cliente-service";
import { ClienteDatos } from "../../../clientes/models/cliente.model";
import { CuentaDocumento } from "../../models/reserva-api.model";
import { Emision, PrepararEmision } from "../../models/emision.model";
import { ReservaResumen, ReservaService } from "../../services/reserva-service";
import { ComprobanteService } from "../../services/comprobante-service";

@Component({
  selector: "app-comprobante-dialog",
  imports: [FormsModule, CurrencyPipe, DatePipe, DialogFocus, Icon],
  templateUrl: "./comprobante-dialog.html",
  styleUrl: "./comprobante-dialog.css",
})
export class ComprobanteDialog implements OnInit {
  reserva = input.required<ReservaResumen>();
  catalogos = input.required<Catalogos>();
  cerrar = output<void>();
  actualizado = output<void>();
  private servicio = inject(ComprobanteService);
  private reservas = inject(ReservaService);
  private clientes = inject(ClienteService);
  private destroy = inject(DestroyRef);
  cuentas = signal<CuentaDocumento[]>([]);
  seleccion = signal(0);
  documento = signal<CuentaDocumento | null>(null);
  emision = signal<Emision | null>(null);
  ocupado = signal(false);
  cargando = signal(true);
  error = signal("");
  aviso = signal("");
  estadoConsultado = signal(false);
  configuracion = signal<{
    ambiente: string;
    habilitada: boolean;
    configuracionPendiente: string[];
  } | null>(null);
  usuario: number | null = null;
  turno: number | null = null;
  tipo = "BOLETA";
  idCliente: number | null = null;
  receptor: ClienteDatos = {
    idTipoDocumento: null,
    numeroDocumento: "",
    empresa: false,
    nombres: "",
    apellidos: "",
    fechaNacimiento: null,
    razonSocial: "",
    direccionFiscal: "",
    correo: null,
    telefono: null,
  };
  tasaIgv = 18;
  direccion = "";
  cuotas: { fechaPago: string; monto: number }[] = [];
  hoy = fechaLocal(new Date());
  private clave = crypto.randomUUID();
  private solicitudFiscal: PrepararEmision | null = null;
  fiscalFijada = signal(false);
  emisionFijada = signal(false);
  private solicitudInterna: {
    idUsuario: number;
    idTurno: number;
    tipo: string;
    idClienteReceptor: number;
    idVenta?: number;
  } | null = null;
  cuenta = computed(
    () =>
      this.cuentas().find((c) => (c.idVenta ?? 0) === this.seleccion()) ?? null,
  );
  turnos() {
    return (
      this.catalogos().turnosAbiertos?.filter(
        (t) => t.idUsuario === this.usuario,
      ) ?? []
    );
  }
  cambiarUsuario() {
    this.turno = this.turnos()[0]?.idTurno ?? null;
  }
  ngOnInit() {
    this.usuario = this.catalogos().usuarios?.[0]?.id ?? null;
    this.cambiarUsuario();
    this.cargar();
  }
  cargar() {
    this.cargando.set(true);
    this.error.set("");
    forkJoin({
      cuenta: this.reservas.cuenta(this.reserva().idReserva),
      cliente: this.clientes.obtener(this.reserva().idCliente),
      config: this.servicio.configuracion(),
    })
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: ({ cuenta, cliente, config }) => {
          this.cuentas.set(cuenta.cuentas);
          this.configuracion.set(config);
          this.receptor = { ...cliente.persona };
          this.idCliente = cliente.idCliente;
          this.direccion = cliente.persona.direccionFiscal ?? "";
          this.cargando.set(false);
          this.cambiarCuenta();
        },
        error: (e) => {
          this.cargando.set(false);
          this.error.set(mensajeError(e));
        },
      });
  }
  cambiarCuenta() {
    const cuenta = this.cuenta();
    this.documento.set(cuenta?.estado === "EMITIDO" ? cuenta : null);
    this.emision.set(null);
    this.estadoConsultado.set(false);
    this.error.set("");
    this.solicitudInterna = null;
    this.solicitudFiscal = null;
    this.emisionFijada.set(false);
    this.fiscalFijada.set(false);
    this.clave = crypto.randomUUID();
    if (cuenta?.estado === "EMITIDO" && cuenta.idCuenta)
      this.cargarEstado(cuenta.idCuenta);
  }
  buscar() {
    if (
      !this.receptor.idTipoDocumento ||
      !this.receptor.numeroDocumento.trim()
    ) {
      this.error.set("Selecciona el documento y escribe su número.");
      return;
    }
    this.ocupado.set(true);
    this.error.set("");
    const tipo = this.receptor.idTipoDocumento,
      numero = this.receptor.numeroDocumento.trim();
    this.clientes
      .buscarPorDocumento(tipo, numero)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (c) => {
          this.ocupado.set(false);
          this.receptor = { ...c.datos };
          this.idCliente = c.idCliente;
          this.direccion = c.datos.direccionFiscal ?? "";
          this.aviso.set("Receptor encontrado en el hospedaje.");
        },
        error: (e) => {
          this.ocupado.set(false);
          this.idCliente = null;
          this.error.set(
            e.status === 404
              ? "No existe un receptor con ese documento. Completa sus datos para registrarlo."
              : mensajeError(e),
          );
        },
      });
  }
  otroReceptor() {
    this.idCliente = null;
    this.receptor = {
      ...this.receptor,
      numeroDocumento: "",
      nombres: "",
      apellidos: "",
      razonSocial: "",
      direccionFiscal: "",
      fechaNacimiento: null,
      correo: null,
      telefono: null,
    };
    this.direccion = "";
    this.aviso.set(
      "Completa y busca el documento; si no existe, se registrará al emitir.",
    );
  }
  validarReceptor() {
    const d = this.catalogos().documentos.find(
      (d) => d.id === this.receptor.idTipoDocumento,
    );
    if (!d || !this.receptor.numeroDocumento.trim())
      return "Selecciona el documento del receptor.";
    if (
      (d.codigoSunat === "1" &&
        !/^\d{8}$/.test(this.receptor.numeroDocumento.trim())) ||
      (d.codigoSunat === "6" &&
        !/^\d{11}$/.test(this.receptor.numeroDocumento.trim()))
    )
      return "El DNI debe tener 8 dígitos y el RUC 11 dígitos.";
    if (
      this.tipo === "FACTURA" &&
      (d.codigoSunat !== "6" ||
        !/^\d{11}$/.test(this.receptor.numeroDocumento.trim()))
    )
      return "Para factura se requiere un receptor con RUC de 11 dígitos.";
    if (this.receptor.empresa && d.codigoSunat !== "6")
      return "Una empresa debe identificarse con RUC.";
    return this.receptor.empresa
      ? !this.receptor.razonSocial?.trim()
        ? "Completa la razón social."
        : ""
      : !this.receptor.nombres?.trim() || !this.receptor.apellidos?.trim()
        ? "Completa los nombres y apellidos."
        : "";
  }
  emitir() {
    if (this.ocupado()) return;
    const cuenta = this.cuenta();
    const error = this.validarReceptor();
    if (error) {
      this.error.set(error);
      return;
    }
    if (
      !cuenta ||
      !this.usuario ||
      !this.turnos().some((t) => t.idTurno === this.turno)
    ) {
      this.error.set("Selecciona un recepcionista y su turno abierto.");
      return;
    }
    this.ocupado.set(true);
    this.error.set("");
    const persona = {
      ...this.receptor,
      numeroDocumento: this.receptor.numeroDocumento.trim(),
      nombres: this.receptor.empresa
        ? null
        : (this.receptor.nombres?.trim() ?? null),
      apellidos: this.receptor.empresa
        ? null
        : (this.receptor.apellidos?.trim() ?? null),
      razonSocial: this.receptor.empresa
        ? (this.receptor.razonSocial?.trim() ?? null)
        : null,
      direccionFiscal: this.receptor.direccionFiscal?.trim() || null,
    };
    (this.idCliente
      ? of({ idCliente: this.idCliente })
      : this.clientes.registrar(persona)
    )
      .pipe(
        concatMap((cliente) => {
          this.idCliente = cliente.idCliente;
          this.solicitudInterna ??= {
            idUsuario: this.usuario!,
            idTurno: this.turno!,
            tipo: this.tipo,
            idClienteReceptor: cliente.idCliente,
            ...(cuenta.idVenta ? { idVenta: cuenta.idVenta } : {}),
          };
          this.emisionFijada.set(true);
          return this.servicio.emitir(
            this.reserva().idReserva,
            this.solicitudInterna,
          );
        }),
        takeUntilDestroyed(this.destroy),
      )
      .subscribe({
        next: (doc) => {
          this.ocupado.set(false);
          this.documento.set(doc);
          this.cuentas.update((cs) =>
            cs.map((c) => ((c.idVenta ?? 0) === this.seleccion() ? doc : c)),
          );
          this.aviso.set(
            "Comprobante interno generado. Puedes preparar y enviar su versión electrónica beta.",
          );
          this.actualizado.emit();
          this.cargarEstado(doc.idCuenta!);
        },
        error: (e) => {
          this.ocupado.set(false);
          if (e.status >= 400 && e.status < 500) {
            this.solicitudInterna = null;
            this.emisionFijada.set(false);
          }
          this.error.set(
            mensajeError(e) +
              (this.emisionFijada()
                ? " La confirmación puede haberse perdido; reintenta con el mismo tipo y receptor."
                : ""),
          );
        },
      });
  }
  cargarEstado(id: number) {
    this.estadoConsultado.set(false);
    this.servicio
      .estado(id)
      .pipe(
        catchError((e) => (e.status === 404 ? of(null) : throwError(() => e))),
        takeUntilDestroyed(this.destroy),
      )
      .subscribe({
        next: (e) => {
          this.emision.set(e);
          this.estadoConsultado.set(true);
        },
        error: (e) => this.error.set(mensajeError(e)),
      });
  }
  agregarCuota() {
    this.cuotas.push({ fechaPago: this.hoy, monto: 0 });
  }
  preparar() {
    const doc = this.documento();
    if (
      !doc?.idCuenta ||
      this.ocupado() ||
      !this.usuario ||
      !this.estadoConsultado() ||
      this.emision()
    )
      return;
    if (!this.solicitudFiscal) {
      if (
        !Number.isFinite(this.tasaIgv) ||
        this.tasaIgv <= 0 ||
        this.tasaIgv > 100 ||
        Math.abs(this.tasaIgv * 100 - Math.round(this.tasaIgv * 100)) > 1e-6
      ) {
        this.error.set(
          "Indica una tasa de impuesto válida, con hasta dos decimales.",
        );
        return;
      }
      if (doc.tipo === "FACTURA" && !this.direccion.trim()) {
        this.error.set(
          "Completa la dirección fiscal del receptor para preparar la factura.",
        );
        return;
      }
      if (
        doc.saldo > 0 &&
        (this.cuotas.length === 0 ||
          this.cuotas.some(
            (c) =>
              !c.fechaPago ||
              c.fechaPago < this.hoy ||
              !Number.isFinite(c.monto) ||
              c.monto <= 0 ||
              Math.abs(c.monto * 100 - Math.round(c.monto * 100)) > 1e-6,
          ) ||
          Math.round(this.cuotas.reduce((s, c) => s + c.monto, 0) * 100) !==
            Math.round(doc.saldo * 100))
      ) {
        this.error.set(
          "Las cuotas deben tener fecha válida y sumar exactamente el saldo del comprobante.",
        );
        return;
      }
      this.solicitudFiscal = {
        claveOperacion: this.clave,
        idUsuario: this.usuario,
        tasaIgv: this.tasaIgv,
        direccionReceptor: this.direccion.trim() || null,
        tratamientos: [],
        cuotas: doc.saldo > 0 ? structuredClone(this.cuotas) : [],
      };
    }
    this.ocupado.set(true);
    this.fiscalFijada.set(true);
    this.error.set("");
    this.servicio
      .preparar(doc.idCuenta, this.solicitudFiscal)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (e) => {
          this.emision.set(e);
          this.ocupado.set(false);
          this.actualizado.emit();
        },
        error: (e) => {
          this.ocupado.set(false);
          if (e.status >= 400 && e.status < 500) {
            this.solicitudFiscal = null;
            this.fiscalFijada.set(false);
            this.clave = crypto.randomUUID();
          }
          this.error.set(mensajeError(e));
          this.cargarEstado(doc.idCuenta!);
        },
      });
  }
  enviar() {
    this.operacion("enviar");
  }
  consultar() {
    this.operacion("consultar");
  }
  private operacion(accion: "enviar" | "consultar") {
    const id = this.documento()?.idCuenta;
    if (!id || !this.usuario || this.ocupado()) return;
    if (!this.estadoConsultado()) return;
    const estado = this.emision()?.estado;
    if (
      accion === "enviar" &&
      estado !== "PREPARADO" &&
      estado !== "ERROR_ENVIO"
    )
      return;
    if (
      accion === "consultar" &&
      estado !== "INCIERTO" &&
      estado !== "ENVIANDO"
    )
      return;
    this.ocupado.set(true);
    this.error.set("");
    const obs =
      accion === "enviar"
        ? this.servicio.enviar(id, this.usuario)
        : this.servicio.consultar(id, this.usuario);
    obs.pipe(takeUntilDestroyed(this.destroy)).subscribe({
      next: (e) => {
        this.emision.set(e);
        this.ocupado.set(false);
        this.actualizado.emit();
      },
      error: (e) => {
        this.ocupado.set(false);
        this.error.set(
          mensajeError(e) +
            " Actualiza el estado antes de intentar otra operación.",
        );
        this.cargarEstado(id);
      },
    });
  }
  descargar(tipo: "xml" | "cdr" | "pdf") {
    const doc = this.documento();
    if (!doc?.idCuenta || this.ocupado()) return;
    this.ocupado.set(true);
    this.error.set("");
    this.servicio
      .archivo(doc.idCuenta, tipo)
      .pipe(takeUntilDestroyed(this.destroy))
      .subscribe({
        next: (blob) => {
          const e = this.emision();
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `${e?.serie ?? doc.serie}-${e?.correlativo ?? doc.numero}.${tipo === "cdr" ? "zip" : tipo}`;
          a.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
          this.ocupado.set(false);
        },
        error: (e) => {
          this.ocupado.set(false);
          this.error.set("No se pudo descargar el archivo. " + mensajeError(e));
        },
      });
  }
  imprimir() {
    window.print();
  }
}
