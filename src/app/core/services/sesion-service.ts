import { Injectable, inject, signal } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable, catchError, shareReplay, tap, throwError } from "rxjs";
import { environment } from "../../../environments/environment";
import { PermisosUi } from "./permisos-ui";
export interface SesionActual {
  idUsuario: number;
  usuario: string;
  modo: "PRUEBA" | "ACTIVA";
  idTurno: number | null;
  idFormaPagoEfectivo: number | null;
  requiereCambio?: boolean;
  gerente?: boolean;
  permisos?: string[];
  roles?: string[];
}
@Injectable({ providedIn: "root" })
export class SesionService {
  private http = inject(HttpClient);
  private acceso = inject(PermisosUi);
  private peticion?: Observable<SesionActual>;
  readonly actual = this.acceso.actual;
  readonly versionPendientes = signal(0);
  error = signal("");
  cargar(forzar = false) {
    if (forzar) this.peticion = undefined;
    return (this.peticion ??= this.http
      .get<SesionActual>(environment.apiUrl + "/sesion/actual")
      .pipe(
        tap((s) => {
          this.recordar(s);
        }),
        catchError((e) => {
          this.peticion = undefined;
          this.actual.set(null);
          this.error.set("No se pudo obtener la sesión de operación.");
          return throwError(() => e);
        }),
        shareReplay({ bufferSize: 1, refCount: false }),
      ));
  }

  iniciar(usuario: string, contrasena: string) {
    return this.http.post<SesionActual>(environment.apiUrl + "/sesion/iniciar", { usuario, contrasena })
      .pipe(tap(s => { this.limpiarPendientes(); this.peticion = undefined; this.recordar(s); }));
  }

  cambiar(actual: string, nueva: string) {
    return this.http.post<SesionActual>(environment.apiUrl + "/sesion/contrasena", { actual, nueva })
      .pipe(tap(s => { this.peticion = undefined; this.recordar(s); }));
  }

  cerrar() {
    return this.http.post<void>(environment.apiUrl + "/sesion/cerrar", {}).pipe(tap(() => this.limpiar()));
  }

  permite(...permisos: string[]) {
    return this.acceso.permite(...permisos);
  }

  limpiar() {
    this.limpiarPendientes();
    this.peticion = undefined;
    this.actual.set(null);
    this.error.set("");
  }

  private limpiarPendientes() {
    try {
      for (let i = sessionStorage.length - 1; i >= 0; i--) {
        const clave = sessionStorage.key(i);
        if (clave && /^(rebolsys\.cuenta\.|rebolsys\.reservas\.|rebolsys\.venta\.pendiente$)/.test(clave)) {
          sessionStorage.removeItem(clave);
        }
      }
    } catch {
      // El navegador puede bloquear el almacenamiento de la pestaña.
    } finally {
      this.versionPendientes.update(version => version + 1);
    }
  }

  private recordar(s: SesionActual) {
    this.actual.set(s);
    this.error.set("");
  }
}
