import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import {
  EMPTY,
  Observable,
  catchError,
  concatMap,
  expand,
  forkJoin,
  map,
  of,
  reduce,
  throwError,
  tap,
} from "rxjs";
import { environment } from "../../../../environments/environment";
import { Pagina } from "../../../core/models/pagina-response";
import { ClienteDatos } from "../../clientes/models/cliente.model";
import { ClienteService } from "../../clientes/services/cliente-service";
import { Registro } from "../models/reserva.model";
import { claveDocumento, errorIdentidadesReserva } from "../utils/identidad-reserva";
import { SesionService } from '../../../core/services/sesion-service';
import { pendienteOperacion } from "../../../core/services/pendiente-operacion";
import {
  CobroReserva,
  CuentaReserva,
  DetalleReserva,
  RegistroReservaApi,
  ReservaApi,
  estadoReserva,
} from "../models/reserva-api.model";

export type ReservaResumen = ReservaApi & { cuenta: CuentaReserva };
export interface PagoPendiente {
  idReserva: number;
  claveOperacion: string;
  monto: number;
  cobro: CobroReserva;
}

@Injectable({ providedIn: "root" })
export class ReservaService {
  private readonly http = inject(HttpClient);
  private readonly clientes = inject(ClienteService);
  private readonly sesion = inject(SesionService);
  private readonly base = environment.apiUrl + "/reservas";
  readonly registroPendiente = pendienteOperacion<RegistroReservaApi | null>(this.sesion, "reservas.registro", null);
  readonly pagosPendientes = pendienteOperacion<PagoPendiente[]>(this.sesion, "reservas.pagos", []);
  private quitarPago(clave: string) {
    this.pagosPendientes.update((pagos) =>
      pagos.filter((p) => p.claveOperacion !== clave),
    );
  }

  listar(pagina = 0, tamanio = 10, buscar = "", estado = "") {
    // La API pagina sin filtros. Solo una búsqueda explícita recorre las páginas;
    // las cuentas se consultan únicamente para las filas que se van a mostrar.
    const paginaApi = (numero: number, size: number) =>
      this.http.get<Pagina<ReservaApi>>(this.base, {
        params: { pagina: numero, tamanio: size },
      });
    const datos =
      buscar.trim() || estado
        ? paginaApi(0, 100).pipe(
            expand((p) => (p.ultima ? EMPTY : paginaApi(p.pagina + 1, 100))),
            reduce(
              (lista, p) => [...lista, ...p.contenido],
              [] as ReservaApi[],
            ),
            map((lista): Pagina<ReservaApi> => {
              const texto = buscar.trim().toLocaleLowerCase("es");
              const filtradas = lista.filter(
                (r) =>
                  (!estado || estadoReserva(r) === estado) &&
                  (!texto ||
                    [
                      r.titular,
                      "R" + r.idReserva,
                      ...r.detalles.map((d) => d.numeroCuarto),
                    ].some((valor) =>
                      valor.toLocaleLowerCase("es").includes(texto),
                    )),
              );
              return {
                contenido: filtradas.slice(
                  pagina * tamanio,
                  (pagina + 1) * tamanio,
                ),
                pagina,
                tamanio,
                totalElementos: filtradas.length,
                totalPaginas: Math.ceil(filtradas.length / tamanio),
                ultima: (pagina + 1) * tamanio >= filtradas.length,
              };
            }),
          )
        : paginaApi(pagina, tamanio);
    return datos.pipe(
      concatMap((p) =>
        p.contenido.length
          ? forkJoin(
              p.contenido.map((r) =>
                this.cuenta(r.idReserva).pipe(
                  map((cuenta) => ({ ...r, cuenta })),
                ),
              ),
            ).pipe(
              map((contenido): Pagina<ReservaResumen> => ({ ...p, contenido })),
            )
          : of({ ...p, contenido: [] } as Pagina<ReservaResumen>),
      ),
    );
  }

  obtener(id: number) {
    return this.http.get<ReservaApi>(`${this.base}/${id}`);
  }
  cuenta(id: number) {
    return this.http.get<CuentaReserva>(`${this.base}/${id}/cuenta`);
  }
  ingresar(idDetalleReserva: number) {
    return this.sesion.cargar().pipe(concatMap(s => this.http.post<DetalleReserva>(
      `${this.base}/detalles/${idDetalleReserva}/ingreso`, { idUsuario: s.idUsuario },
    )));
  }
  crear(datos: RegistroReservaApi) {
    if (
      this.registroPendiente() &&
      this.registroPendiente()!.claveRegistro !== datos.claveRegistro
    )
      return throwError(
        () =>
          new Error(
            "Recupera primero la reserva pendiente desde la lista de reservas.",
          ),
      );
    this.registroPendiente.set(datos);
    return this.http.post<ReservaApi>(this.base, datos).pipe(
      tap(() => {
        this.registroPendiente.set(null);
      }),
      catchError((e) => {
        if (e.status >= 400 && e.status < 500) {
          this.registroPendiente.set(null);
        }
        return throwError(() => e);
      }),
    );
  }

  pagar(
    id: number,
    claveOperacion: string,
    monto: number,
    cobro: CobroReserva,
  ) {
    const pendiente = this.pagosPendientes().find((p) => p.idReserva === id);
    if (pendiente && pendiente.claveOperacion !== claveOperacion)
      return throwError(
        () =>
          new Error(
            "Recupera la confirmación del pago pendiente antes de registrar otro abono.",
          ),
      );
    if (!pendiente) {
      this.pagosPendientes.update((pagos) => [
        ...pagos,
        { idReserva: id, claveOperacion, monto, cobro: structuredClone(cobro) },
      ]);
    }
    return this.http
      .post<CuentaReserva>(`${this.base}/${id}/pagos`, {
        claveOperacion,
        monto,
        ...cobro,
      })
      .pipe(
        tap(() => this.quitarPago(claveOperacion)),
        catchError((e) => {
          if (e.status >= 400 && e.status < 500)
            this.quitarPago(claveOperacion);
          return throwError(() => e);
        }),
      );
  }

  prepararRegistro(
    datos: Registro,
    idUsuario: number,
  ): Observable<RegistroReservaApi> {
    const huespedes = datos.habitaciones.flatMap((h) => h.huespedes.map((g) => g.persona));
    const error = errorIdentidadesReserva(datos.cliente, huespedes);
    if (error) return throwError(() => new Error(error));

    const personas = new Map<string, ClienteDatos>([[claveDocumento(datos.cliente), datos.cliente]]);
    for (const persona of huespedes) {
      const clave = claveDocumento(persona);
      const titular = personas.get(clave);
      personas.set(clave, titular ? { ...titular, telefono: titular.telefono || persona.telefono } : persona);
    }
    const ids = new Map<string, number>();
    // Una identidad compartida por titular y huésped se resuelve una vez.
    return of(...personas.entries()).pipe(
      concatMap(([documento, persona]) =>
        this.clientes
          .buscarPorDocumento(persona.idTipoDocumento!, persona.numeroDocumento)
          .pipe(
            catchError((error) =>
              error.status === 404 ? of(null) : throwError(() => error),
            ),
            concatMap((existente) => {
              if (existente && existente.datos.empresa !== persona.empresa)
                return throwError(() => new Error('El documento ya corresponde a otro tipo de persona.'));
              if (existente?.idCliente && !existente.datos.empresa && !existente.datos.fechaNacimiento)
                return this.clientes.completarNacimiento(existente.idCliente, persona.fechaNacimiento!);
              if (
                existente?.idCliente &&
                (existente.datos.empresa || existente.datos.fechaNacimiento)
              ) {
                if (
                  existente.datos.empresa !== persona.empresa ||
                  (!persona.empresa &&
                    existente.datos.fechaNacimiento !== persona.fechaNacimiento)
                )
                  return throwError(
                    () =>
                      new Error(
                        "El tipo de persona o la fecha de nacimiento no coincide con el cliente registrado. Busca su documento y revisa los datos.",
                      ),
                  );
                return of({ idCliente: existente.idCliente });
              }
              return this.clientes.registrar(persona);
            }),
            map((cliente) => {
              ids.set(documento, cliente.idCliente);
              return cliente;
            }),
          ),
      ),
      reduce((cantidad) => cantidad + 1, 0),
      map(() => ({
        claveRegistro: datos.claveRegistro,
        idCliente: ids.get(claveDocumento(datos.cliente))!,
        idUsuario,
        detalles: datos.habitaciones.map((h) => ({
          idHabitacion: h.idHabitacion,
          fechaIngreso: h.fechaIngreso,
          fechaSalida: h.fechaSalida,
          costoEstadia: h.costoEstadia!,
          ocupantes: h.huespedes.map((g) => ({
            idCliente: ids.get(claveDocumento(g.persona))!,
            ocupaPlazaCama: g.ocupaPlazaCama !== false,
            idClienteResponsable: g.responsable
              ? ids.get(claveDocumento(g.responsable))!
              : null,
            parentescoResponsable: g.responsable?.parentesco ?? null,
          })),
        })),
      })),
    );
  }
}
