import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { environment } from "../../../../environments/environment";
import { Pagina } from "../../../core/models/pagina-response";
import { Venta, VentaRequest, ReservaVenta } from "../models/venta.model";
import { VentaActualizar } from "../models/venta.model";
import {
  EMPTY,
  expand,
  map,
  reduce,
  of,
  forkJoin,
  concatMap,
  tap,
  catchError,
  throwError,
} from "rxjs";
import { ReservaApi } from "../../reservas/models/reserva-api.model";
import { CuentaDocumento } from "../../reservas/models/reserva-api.model";
import { SesionService } from "../../../core/services/sesion-service";
import { VentaApi } from "../models/venta-api.model";
import { Producto } from "../../productos/models/producto.model";
import { pendienteOperacion } from "../../../core/services/pendiente-operacion";
import { coincideReserva } from "../utils/buscar-reserva";

export interface VentaPendiente {
  datos: VentaRequest;
  idUsuario?: number;
  idVenta?: number;
  pago?: {
    claveOperacion: string;
    idUsuario: number;
    idTurno: number;
    idFormaPago: number;
    monto: number;
    numeroOperacion: string | null;
  };
}
@Injectable({ providedIn: "root" })
export class VentaService {
  private http = inject(HttpClient);
  private base = environment.apiUrl + "/ventas";
  private sesion = inject(SesionService);
  pendiente = pendienteOperacion<VentaPendiente | null>(this.sesion, "venta.pendiente", null);
  private conservar(v: VentaPendiente | null) {
    this.pendiente.set(v ? { ...v } : null);
  }
  registrar(data: VentaRequest) {
    const previo = this.pendiente();
    if (previo && JSON.stringify(previo.datos) !== JSON.stringify(data))
      return throwError(
        () => new Error("Recupera la venta pendiente antes de registrar otra."),
      );
    const trabajo = previo ?? { datos: structuredClone(data) };
    this.conservar(trabajo);
    return this.sesion.cargar().pipe(
      concatMap((s) => {
        if (trabajo.idUsuario && trabajo.idUsuario !== s.idUsuario)
          throw Error("La venta pendiente corresponde a otro usuario.");
        if (!s.idTurno)
          throw Error(
            "El usuario actual necesita un único turno de caja abierto.",
          );
        if (
          data.modoVenta === "SEPARADA" &&
          data.detalles.some((d) => (d.precioEsperado ?? 0) > 0) &&
          !data.cobro &&
          !s.idFormaPagoEfectivo
        )
          throw Error(
            "Configura la forma de pago en efectivo antes de registrar la venta.",
          );
        trabajo.idUsuario = s.idUsuario;
        this.conservar(trabajo);
        const solicitud = {
          claveRegistro: data.claveRegistro,
          idUsuario: s.idUsuario,
          idClienteComprador: data.idCliente,
          compradorNombreLibre: data.idCliente ? null : data.compradorNombre,
          modalidadCobro:
            data.modoVenta === "CARGO_RESERVA" ? "RESERVA" : "SEPARADA",
          idDetalleReserva: data.idDetalleReserva,
          detalles: data.detalles,
        };
        return this.http
          .post<VentaApi>(this.base + "/confirmadas", solicitud)
          .pipe(
            concatMap((v) => {
              trabajo.idVenta = v.idVenta;
              this.conservar(trabajo);
              if (v.modalidadCobro === "RESERVA")
                return this.presentar(v, data);
              return this.http
                .get<CuentaDocumento>(`${this.base}/${v.idVenta}/cuenta`)
                .pipe(
                  concatMap((c) => {
                    if (!trabajo.pago && c.saldo > 0) {
                      const recibido = data.efectivoRecibido;
                      const forma =
                        data.cobro?.idFormaPago ?? s.idFormaPagoEfectivo;
                      if (!forma)
                        throw Error(
                          "No hay una forma de pago disponible para este cobro.",
                        );
                      if (
                        (!data.cobro ||
                          data.cobro.idFormaPago === s.idFormaPagoEfectivo) &&
                        (recibido === null ||
                          !Number.isFinite(recibido) ||
                          recibido < c.saldo ||
                          Math.abs(
                            recibido * 100 - Math.round(recibido * 100),
                          ) > 1e-6)
                      )
                        throw Error(
                          "El efectivo recibido no cubre el saldo de la venta o tiene un importe inválido.",
                        );
                      trabajo.pago = {
                        claveOperacion: data.claveRegistro + ":pago",
                        idUsuario: s.idUsuario,
                        idTurno: s.idTurno!,
                        idFormaPago: forma,
                        monto: c.saldo,
                        numeroOperacion: data.cobro?.numeroOperacion ?? null,
                      };
                      this.conservar(trabajo);
                    }
                    const pagar = trabajo.pago
                      ? this.http.post<CuentaDocumento>(
                          `${this.base}/${v.idVenta}/pagos`,
                          trabajo.pago,
                        )
                      : of(c);
                    return pagar.pipe(
                      concatMap((cuenta) => this.presentar(v, data, cuenta)),
                    );
                  }),
                );
            }),
          );
      }),
      tap(() => this.conservar(null)),
      catchError((e) => {
        if (e.status >= 400 && e.status < 500 && !trabajo.idVenta)
          this.conservar(null);
        return throwError(() => e);
      }),
    );
  }
  recuperar() {
    const p = this.pendiente();
    return p
      ? this.registrar(p.datos)
      : throwError(() => new Error("No hay una venta pendiente."));
  }
  obtener(id: number | string) {
    return this.http
      .get<VentaApi>(this.base + "/" + id)
      .pipe(concatMap((v) => this.presentar(v)));
  }
  actualizar(id: number | string, datos: VentaActualizar) {
    return this.sesion.cargar().pipe(
      concatMap((s) =>
        this.http.put<VentaApi>(this.base + "/" + id, {
          idUsuario: s.idUsuario,
          idClienteComprador: null,
          compradorNombreLibre: datos.compradorNombre,
          detalles: datos.detalles,
        }),
      ),
      concatMap((v) => this.presentar(v)),
    );
  }
  listar(pagina = 0, tamanio = 10) {
    return this.http
      .get<Pagina<VentaApi>>(this.base, {
        params: { pagina, tamanio },
      })
      .pipe(
        concatMap((p) =>
          p.contenido.length
            ? forkJoin(p.contenido.map((v) => this.presentar(v))).pipe(
                map((contenido) => ({ ...p, contenido })),
              )
            : of({ ...p, contenido: [] as Venta[] }),
        ),
      );
  }
  private presentar(
    v: VentaApi,
    solicitud?: VentaRequest,
    cuenta?: CuentaDocumento,
  ) {
    return forkJoin({
      productos: this.http.get<Producto[]>(
        environment.apiUrl + "/productos/catalogo",
      ),
      estancias: v.idDetalleReserva
        ? this.reservas("", true)
        : of([] as ReservaVenta[]),
      cuenta: cuenta
        ? of(cuenta)
        : v.modalidadCobro === "SEPARADA" && v.estadoVenta === "CONFIRMADA"
          ? this.http.get<CuentaDocumento>(`${this.base}/${v.idVenta}/cuenta`)
          : of(null),
      cliente: v.idClienteComprador
        ? this.http.get<{
            persona: {
              empresa: boolean;
              razonSocial: string | null;
              nombres: string | null;
              apellidos: string | null;
            };
          }>(environment.apiUrl + "/clientes/" + v.idClienteComprador)
        : of(null),
    }).pipe(
      map(({ productos, estancias, cuenta, cliente }): Venta => {
        const r = estancias.find(
            (r) => r.idDetalleReserva === v.idDetalleReserva,
          ),
          p = cliente?.persona;
        const nombre = p
          ? p.empresa
            ? p.razonSocial
            : [p.nombres, p.apellidos].filter(Boolean).join(" ")
          : null;
        const total = v.total,
          pagado = cuenta?.pagado ?? 0,
          saldo = cuenta?.saldo ?? total;
        return {
          idVenta: v.idVenta,
          numero: String(v.idVenta),
          idUsuario: v.idUsuario,
          idReserva: r?.idReserva ?? null,
          fechaVenta: v.fechaRegistro,
          estadoVenta: v.estadoVenta,
          modoVenta:
            v.modalidadCobro === "RESERVA" ? "CARGO_RESERVA" : "SEPARADA",
          compradorNombre:
            nombre ||
            v.compradorNombreLibre ||
            solicitud?.compradorNombre ||
            "Venta al público",
          idDetalleReserva: v.idDetalleReserva,
          referenciaReserva: r?.referencia ?? null,
          habitacion: r?.habitacion ?? null,
          estadoCobro:
            v.estadoVenta === "ANULADA"
              ? "ANULADO"
              : saldo === 0
                ? "PAGADO"
                : "PENDIENTE",
          editable: v.estadoVenta === "BORRADOR",
          subtotal: v.detalles.reduce((s, d) => s + d.subtotal, 0),
          igv: v.detalles.reduce((s, d) => s + d.igv, 0),
          total,
          pagado,
          saldo,
          vuelto:
            solicitud?.efectivoRecibido == null
              ? 0
              : Math.max(
                  0,
                  solicitud.efectivoRecibido -
                    (this.pendiente()?.pago?.monto ?? total),
                ),
          detalles: v.detalles.map((d) => ({
            idConsumo: d.idDetalleVenta,
            idProducto: d.idProducto,
            nombreProducto: d.descripcion,
            cantidad: d.cantidad,
            precioUnitario: d.valorUnitario,
            total: d.total,
            stockRestante:
              productos.find((p) => p.idProducto === d.idProducto)?.stock ?? 0,
            imagenRuta:
              productos.find((p) => p.idProducto === d.idProducto)
                ?.imagenRuta ?? null,
          })),
          comprobante:
            cuenta?.estado === "EMITIDO"
              ? {
                  numero: cuenta.serie + "-" + cuenta.numero,
                  fecha: cuenta.fechaEmision ?? v.fechaRegistro,
                  receptor:
                    cuenta.receptorNombre ??
                    nombre ??
                    v.compradorNombreLibre ??
                    "Venta al público",
                  documento: cuenta.receptorNumeroDoc ?? "",
                  lineas: (cuenta.lineas ?? []).map((l) => ({
                    descripcion: l.descripcion,
                    cantidad: l.cantidad,
                    valorUnitario: l.cantidad ? l.total / l.cantidad : 0,
                    total: l.total,
                  })),
                  total: cuenta.total,
                  pagado: cuenta.pagado,
                  devuelto: 0,
                  estado: cuenta.estado,
                  pagos: cuenta.pagos.map((p) => ({
                    idPago: p.idPago,
                    fecha: p.fechaPago,
                    monto: p.monto,
                    devuelto: 0,
                  })),
                }
              : null,
        };
      }),
    );
  }
  reservas(buscar = "", incluirFinalizadas = false) {
    const pagina = (numero: number) =>
      this.http.get<Pagina<ReservaApi>>(environment.apiUrl + "/reservas", {
        params: { pagina: numero, tamanio: 100 },
      });
    return pagina(0).pipe(
      expand((p) => (p.ultima ? EMPTY : pagina(p.pagina + 1))),
      reduce((todos, p) => [...todos, ...p.contenido], [] as ReservaApi[]),
      map((reservas) =>
        reservas.flatMap((r) =>
          r.detalles
            .filter(
              (d) =>
                incluirFinalizadas ||
                d.estadoDetalle === "EN_CURSO" ||
                d.estadoDetalle === "CONFIRMADA",
            )
            .map((d): ReservaVenta => ({
              idReserva: r.idReserva,
              idDetalleReserva: d.idDetalleReserva,
              referencia: "R" + r.idReserva,
              numero: String(r.idReserva),
              habitacion: d.numeroCuarto,
              clienteNombre: r.titular,
              idCliente: r.idCliente,
              huespedes: d.ocupantes.map((o) => o.nombre),
              estadoDetalle: d.estadoDetalle,
              fechaIngreso: d.fechaIngreso,
              fechaSalida: d.fechaSalida,
            })),
        ),
      ),
      map((reservas) => reservas.filter((r) => coincideReserva(r, buscar))),
    );
  }
}
