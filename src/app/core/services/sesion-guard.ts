import { inject } from "@angular/core";
import { ActivatedRouteSnapshot, CanActivateChildFn, Router } from "@angular/router";
import { catchError, map, of } from "rxjs";
import { SesionService } from "./sesion-service";

export const sesionGuard: CanActivateChildFn = (ruta: ActivatedRouteSnapshot) => {
  const sesion = inject(SesionService);
  const router = inject(Router);
  return sesion.cargar(true).pipe(
    map(s => {
      if (s.requiereCambio) return router.parseUrl("/cambiar-contrasena");
      const permisos = ruta.data["permisos"] as string[] | undefined;
      if ((ruta.data["soloActiva"] && s.modo !== "ACTIVA") || (permisos?.length && !sesion.permite(...permisos))) {
        return router.parseUrl("/inicio");
      }
      return true;
    }),
    catchError(() => of(router.parseUrl("/login"))),
  );
};
