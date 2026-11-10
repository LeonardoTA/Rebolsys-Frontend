import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { environment } from "../../../environments/environment";
import { Catalogos, CatalogosApi } from "../models/catalogo.model";
import { map, switchMap } from "rxjs";
import { SesionService } from "./sesion-service";

@Injectable({ providedIn: "root" })
export class CatalogoService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;
  private sesion = inject(SesionService);

  listar() {
    return this.sesion.cargar().pipe(
      switchMap((sesion) =>
        this.http.get<CatalogosApi>(`${this.base}/recepcion/catalogos`).pipe(
          map((datos): Catalogos => ({
            documentos: datos.tiposDocumento,
            pagos: datos.formasPago,
            ocupantes: [],
            usuarios: datos.usuarios.filter((u) => u.id === sesion.idUsuario),
            turnosAbiertos: datos.turnosAbiertos.filter(
              (t) =>
                t.idUsuario === sesion.idUsuario &&
                t.idTurno === sesion.idTurno,
            ),
          })),
        ),
      ),
    );
  }
}
