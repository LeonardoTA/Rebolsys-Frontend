import { HttpClient, HttpParams } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { environment } from "../../../environments/environment";
import { Pagina } from "../../core/models/pagina-response";

export type EstadoItem = "BUENO" | "DANADO" | "FALTANTE" | "EN_REPARACION";
export type EstadoHabitacion = "DISPONIBLE" | "OCUPADO" | "MANTENIMIENTO" | "POR_LIMPIAR" | "EN_LIMPIEZA";
export type EstadoInforme = "POR_APROBAR" | "APROBADO";
export type TipoAccion = "REPARACION" | "REPOSICION";
export type Evidencia = { evidenciaRuta: string; evidenciaSha256: string };
export type Habitacion = {
  idHabitacion: number; numeroHabitacion: string; idTipoHabitacion: number; tipoHabitacion: string;
  fechaSalida: string | null; estado: EstadoHabitacion; responsable: { idUsuario: number; usuario: string } | null;
  puedeIniciarLimpieza: boolean; puedeRetomarBorrador: boolean;
};
export type ItemHabitacion = { idDetalleHabitacion: number; idItem: number; item: string; estado: string | null };
export type Informe = {
  idInformeRevision: number; nombre: string; idHabitacion: number; numeroHabitacion: string; fechaEnvio: string;
  estado: EstadoInforme; responsable: { usuario: string }; tieneIncidencias: boolean; incidenciasPendientes: number;
  tieneTickets: boolean; puedeAprobar: boolean; puedeEditar: boolean; puedeEliminar: boolean;
};
export type Ticket = {
  idTicket: number; nombre: string; idInformeRevision: number; idDetalleInforme: number; idHabitacion: number;
  numeroHabitacion: string; idItem: number; item: string; tipoAccion: TipoAccion; estado: string;
  fechaGeneracion: string; puedeEditar: boolean; puedeEliminar: boolean;
};
export type ItemInforme = {
  idDetalleInforme: number; idDetalleHabitacion: number; idItem: number; item: string;
  estadoEncontrado: EstadoItem; estadoActualItem: EstadoItem; observaciones: string | null;
  evidencia: Evidencia | null; idTicket: number | null; puedeCrearTicket: boolean;
};
export type InformeDetalle = { informe: Informe; observaciones: string; items: ItemInforme[]; tickets: Ticket[] };
export type HabitacionDetalle = {
  habitacion: Habitacion; items: ItemHabitacion[]; estadoInforme: string; ultimoInforme: InformeDetalle | null;
  estadoTickets: string; tickets: Ticket[];
};
export type TicketDetalle = {
  ticket: Ticket; fechaResolucion: string | null; observacionTecnica: string | null;
  costoReparacion: number | null; evidencia: Evidencia | null;
};
export type Borrador = { idInformeRevision: number; habitacion: Habitacion; items: ItemHabitacion[] };
export type InicioLimpieza = {
  idTurno: number | null; fechaApertura: string | null; informesEnviados: number; informesPorAprobar: number;
  informesAprobados: number; ticketsGenerados: number;
  alcance: "GENERAL" | "DIA" | "TURNO";
};
export type EntradaItem = { idDetalleHabitacion: number; estadoEncontrado: EstadoItem; observaciones: string; evidencia: Evidencia | null };
export type AccionTicket = { tipoAccion: TipoAccion; observacionTecnica: string; costoReparacion: number | null };

@Injectable({ providedIn: "root" })
export class LimpiezaApi {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl + "/limpieza";

  inicio() { return this.http.get<InicioLimpieza>(this.base + "/inicio"); }
  habitaciones(filtros: Record<string, string>) {
    return this.http.get<Habitacion[]>(this.base + "/habitaciones", { params: this.parametros(filtros) });
  }
  habitacion(id: number) { return this.http.get<HabitacionDetalle>(`${this.base}/habitaciones/${id}`); }
  iniciar(id: number) { return this.http.post<Borrador>(`${this.base}/habitaciones/${id}/iniciar`, {}); }
  cancelar(id: number) { return this.http.delete<void>(`${this.base}/borradores/${id}`); }
  enviar(id: number, items: EntradaItem[], observaciones: string) {
    return this.http.post<InformeDetalle>(`${this.base}/borradores/${id}/enviar`, { items, observaciones });
  }
  informes(filtros: Record<string, string>, pagina: number) {
    return this.http.get<Pagina<Informe>>(this.base + "/informes", { params: this.parametros(filtros, pagina) });
  }
  informe(id: number) { return this.http.get<InformeDetalle>(`${this.base}/informes/${id}`); }
  editarInforme(id: number, items: EntradaItem[]) {
    return this.http.patch<InformeDetalle>(`${this.base}/informes/${id}`, { items });
  }
  aprobar(id: number) { return this.http.post<InformeDetalle>(`${this.base}/informes/${id}/aprobar`, {}); }
  eliminarInforme(id: number) { return this.http.delete<void>(`${this.base}/informes/${id}`); }
  tickets(filtros: Record<string, string>, pagina: number) {
    return this.http.get<Pagina<Ticket>>(this.base + "/tickets", { params: this.parametros(filtros, pagina) });
  }
  ticket(id: number) { return this.http.get<TicketDetalle>(`${this.base}/tickets/${id}`); }
  crearTicket(informe: number, detalle: number, accion: AccionTicket, evidencia: Evidencia) {
    return this.http.post<TicketDetalle>(`${this.base}/informes/${informe}/items/${detalle}/ticket`, { accion, evidencia });
  }
  editarTicket(id: number, accion: AccionTicket) {
    return this.http.put<TicketDetalle>(`${this.base}/tickets/${id}`, accion);
  }
  eliminarTicket(id: number) { return this.http.delete<void>(`${this.base}/tickets/${id}`); }
  evidencia(archivo: File) {
    const datos = new FormData();
    datos.append("archivo", archivo);
    return this.http.post<Evidencia>(this.base + "/evidencias", datos);
  }
  tiposHabitacion() {
    return this.http.get<{ tiposHabitacion: { id: number; nombre: string }[] }>(environment.apiUrl + "/recepcion/catalogos");
  }

  private parametros(filtros: Record<string, string>, pagina?: number) {
    let params = new HttpParams();
    for (const [campo, valor] of Object.entries(filtros)) {
      const texto = String(valor ?? "").trim();
      if (texto) params = params.set(campo, texto);
    }
    if (pagina !== undefined) params = params.set("pagina", pagina).set("tamanio", 10);
    return params;
  }
}
