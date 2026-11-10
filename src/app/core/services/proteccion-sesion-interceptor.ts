import { HttpClient, HttpInterceptorFn } from "@angular/common/http";
import { inject } from "@angular/core";
import { Router } from "@angular/router";
import { catchError, switchMap, throwError } from "rxjs";
import { environment } from "../../../environments/environment";
import { SesionService } from "./sesion-service";

export const proteccionSesionInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.apiUrl + "/")) return next(req);
  const sesion = inject(SesionService);
  const router = inject(Router);
  const http = inject(HttpClient);
  const rutaSesion = req.url.startsWith(environment.apiUrl + "/sesion/");
  const modifica = ["POST", "PUT", "PATCH", "DELETE"].includes(req.method);
  const peticion = req.clone({ withCredentials: true });
  const envio = modifica && sesion.actual()?.modo !== "PRUEBA"
    ? http.get<{ token: string | null; cabecera: string | null }>(environment.apiUrl + "/sesion/csrf").pipe(
        switchMap(({ token, cabecera }) => next(token && cabecera
          ? peticion.clone({ setHeaders: { [cabecera]: token } })
          : peticion)),
      )
    : next(peticion);
  return envio.pipe(catchError(error => {
    if (!rutaSesion && error.status === 401) {
      sesion.limpiar();
      void router.navigateByUrl("/login");
    }
    return throwError(() => error);
  }));
};
