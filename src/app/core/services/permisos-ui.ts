import { Injectable, signal } from "@angular/core";
import type { SesionActual } from "./sesion-service";

@Injectable({ providedIn: "root" })
export class PermisosUi {
  readonly actual = signal<SesionActual | null>(null);

  permite(...permisos: string[]) {
    const s = this.actual();
    return !!s && !s.requiereCambio && (s.gerente || s.modo === "PRUEBA" ||
      permisos.some(permiso => s.permisos?.includes(permiso)));
  }
}
