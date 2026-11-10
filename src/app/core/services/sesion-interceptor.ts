import { inject } from "@angular/core";
import { HttpInterceptorFn } from "@angular/common/http";
import { switchMap } from "rxjs";
import { environment } from "../../../environments/environment";
import { SesionService } from "./sesion-service";
export const sesionInterceptor: HttpInterceptorFn = (req, next) => {
  const base = environment.apiUrl;
  if (
    !["POST", "PUT", "PATCH", "DELETE"].includes(req.method) ||
    !req.url.startsWith(base + "/")
  )
    return next(req);
  const ruta = req.url.slice(base.length);
  if (
    !/^\/(reservas|ventas|gastos|habitaciones|productos|items|categorias|clientes|tipos-habitacion|tipos-item|comprobantes)(\/|$)/.test(
      ruta,
    )
  )
    return next(req);
  return inject(SesionService)
    .cargar()
    .pipe(
      switchMap((s) => {
        const body =
          req.body && typeof req.body === "object" && !Array.isArray(req.body)
            ? { ...(req.body as object), idUsuario: s.idUsuario }
            : req.body == null && req.method !== "DELETE"
              ? { idUsuario: s.idUsuario }
              : req.body;
        return next(req.clone({ body }));
      }),
    );
};
