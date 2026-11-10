import { Component, DestroyRef, computed, inject, signal } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { CurrencyPipe } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { Observable, Subscription, finalize, map, switchMap, tap } from "rxjs";
import { Pagina } from "../../core/models/pagina-response";
import { PermisosUi } from "../../core/services/permisos-ui";
import { mensajeError } from "../../core/utils/http-error";
import { Icon } from "../../shared/components/icono/icono";
import { DialogFocus } from "../../shared/directives/dialog-focus";
import {
  AccionTicket, Borrador, EntradaItem, EstadoItem, Evidencia, Habitacion, HabitacionDetalle, Informe,
  InformeDetalle, InicioLimpieza, ItemInforme, LimpiezaApi, Ticket, TicketDetalle, TipoAccion,
} from "./limpieza-api";

type Vista = "inicio" | "habitaciones" | "informes" | "tickets";
type Resultado =
  | { vista: "inicio"; datos: InicioLimpieza }
  | { vista: "habitaciones"; datos: Habitacion[] }
  | { vista: "informes"; datos: Pagina<Informe> }
  | { vista: "tickets"; datos: Pagina<Ticket> };
type Panel =
  | { tipo: "habitacion"; datos: HabitacionDetalle }
  | { tipo: "informe"; datos: InformeDetalle }
  | { tipo: "ticket"; datos: TicketDetalle }
  | { tipo: "nuevoInforme"; datos: Borrador }
  | { tipo: "editarInforme"; datos: InformeDetalle }
  | { tipo: "nuevoTicket"; informe: InformeDetalle; item: ItemInforme }
  | { tipo: "editarTicket"; datos: TicketDetalle };
type Fila = Omit<EntradaItem, "estadoEncontrado"> & {
  item: string; estadoEncontrado: EstadoItem | ""; estadoFijo: boolean;
};
type Confirmacion = { titulo: string; texto: string; ejecutar: () => void };

const ETIQUETAS: Record<string, string> = {
  DISPONIBLE: "Disponible", OCUPADO: "Ocupada", MANTENIMIENTO: "En mantenimiento", POR_LIMPIAR: "Por limpiar",
  EN_LIMPIEZA: "En limpieza", POR_APROBAR: "Por aprobar", APROBADO: "Aprobado", INVALIDADO: "Invalidado",
  BUENO: "Óptimo", DANADO: "Dañado",
  FALTANTE: "Faltante", EN_REPARACION: "En reparación", SIN_REGISTRAR: "Sin registrar", SIN_INFORME: "Sin informe",
  SIN_TICKET: "Sin ticket", CON_TICKETS: "Con tickets", REPARACION: "Reparación", REPOSICION: "Reposición",
  RESUELTO: "Resuelto", PENDIENTE: "Pendiente", CANCELADO: "Cancelado", EN_PROCESO: "En proceso", ASIGNADO: "Asignado",
  ACCESO_RESTRINGIDO: "Acceso restringido",
};

@Component({
  imports: [FormsModule, CurrencyPipe, Icon, DialogFocus],
  templateUrl: "./limpieza-panel.html",
  styleUrl: "./limpieza-panel.css",
})
export class LimpiezaPanel {
  private readonly api = inject(LimpiezaApi);
  private readonly acceso = inject(PermisosUi);
  private readonly destroy = inject(DestroyRef);
  private consulta?: Subscription;
  readonly vistas = [
    { id: "inicio", nombre: "Inicio", permiso: "VER_INICIO", icono: "home" },
    { id: "habitaciones", nombre: "Habitaciones", permiso: "VER_HABITACIONES", icono: "bed" },
    { id: "informes", nombre: "Informes", permiso: "VER_INFORMES", icono: "receipt" },
    { id: "tickets", nombre: "Tickets", permiso: "VER_TICKETS", icono: "settings" },
  ] as const;
  readonly vista = signal<Vista>("inicio");
  readonly resultado = signal<Resultado | null>(null);
  readonly panel = signal<Panel | null>(null);
  readonly confirmacion = signal<Confirmacion | null>(null);
  readonly cargando = signal(false);
  readonly ocupado = signal(false);
  readonly error = signal("");
  readonly aviso = signal("");
  readonly tipos = signal<{ id: number; nombre: string }[]>([]);
  readonly pagina = signal(0);
  readonly estadosHabitacion = ["DISPONIBLE", "OCUPADO", "MANTENIMIENTO", "POR_LIMPIAR", "EN_LIMPIEZA"];
  readonly estadosItem: EstadoItem[] = ["BUENO", "DANADO", "FALTANTE", "EN_REPARACION"];
  readonly acciones: TipoAccion[] = ["REPARACION", "REPOSICION"];
  readonly filas = signal<Fila[]>([]);
  readonly puedeGuardarInforme = computed(() =>
    this.filas().every(f => f.estadoEncontrado && (f.estadoEncontrado === "BUENO" || f.evidencia)));
  readonly evidenciaTicket = signal<Evidencia | null>(null);
  readonly filtrosHabitacion = { numeroHabitacion: "", idTipoHabitacion: "", estado: "", fechaSalida: "" };
  readonly filtrosInforme = { nombre: "", estado: "", fechaEmision: "", numeroHabitacion: "" };
  readonly filtrosTicket = { nombre: "", numeroHabitacion: "", tipoAccion: "", fechaEmision: "" };
  observaciones = "";
  readonly accion = signal<TipoAccion | "">("");
  observacionTecnica = "";
  costo: number | null = null;

  constructor() {
    const inicial = this.vistas.find(v => this.permite(v.permiso));
    if (inicial) this.seleccionar(inicial.id);
    if (this.permite("VER_HABITACIONES")) {
      this.api.tiposHabitacion().pipe(takeUntilDestroyed(this.destroy))
        .subscribe({ next: c => this.tipos.set(c.tiposHabitacion), error: () => {} });
    }
  }

  permite(accion: string) { return this.acceso.permite("LIMPIEZA:" + accion); }
  texto(estado: string | null) { return estado ? (ETIQUETAS[estado] ?? estado) : "—"; }
  fecha(valor: string | null) { return valor ? valor.slice(0, 16).replace("T", " · ") : "—"; }
  foto(evidencia: Evidencia | null) {
    return this.permite("VER_EVIDENCIA") && evidencia &&
      /^\/api\/v1\/limpieza\/evidencias\/[a-f0-9]{64}\.(png|jpg)$/.test(evidencia.evidenciaRuta)
      ? evidencia.evidenciaRuta : null;
  }

  seleccionar(vista: Vista) {
    if (this.ocupado()) return;
    this.vista.set(vista);
    this.panel.set(null);
    this.confirmacion.set(null);
    this.aviso.set("");
    this.filtrar();
  }

  verInformesPorAtender() {
    Object.assign(this.filtrosInforme, { nombre: "", estado: "POR_APROBAR", fechaEmision: "", numeroHabitacion: "" });
    this.seleccionar("informes");
  }

  accionHabitacion(habitacion: Habitacion) {
    if (habitacion.puedeRetomarBorrador) return "Retomar limpieza";
    return habitacion.estado === "DISPONIBLE" && habitacion.puedeIniciarLimpieza
      ? "Iniciar revisión" : "Iniciar limpieza";
  }

  filtrar() { this.pagina.set(0); this.cargar(); }

  cambiarPagina(diferencia: number) { this.pagina.update(p => Math.max(0, p + diferencia)); this.cargar(); }

  cargar() {
    this.consulta?.unsubscribe();
    this.error.set("");
    this.cargando.set(true);
    const vista = this.vista();
    let peticion: Observable<Resultado>;
    switch (vista) {
      case "inicio":
        peticion = this.api.inicio().pipe(map(datos => ({ vista, datos })));
        break;
      case "habitaciones":
        peticion = this.api.habitaciones(this.filtrosHabitacion).pipe(map(datos => ({ vista, datos })));
        break;
      case "informes":
        peticion = this.api.informes(this.filtrosInforme, this.pagina()).pipe(map(datos => ({ vista, datos })));
        break;
      case "tickets":
        peticion = this.api.tickets(this.filtrosTicket, this.pagina()).pipe(map(datos => ({ vista, datos })));
        break;
    }
    this.resultado.set(null);
    this.consulta = peticion.pipe(takeUntilDestroyed(this.destroy), finalize(() => this.cargando.set(false)))
      .subscribe({ next: datos => this.resultado.set(datos), error: e => this.error.set(mensajeError(e)) });
  }

  verHabitacion(id: number) { this.ejecutar(this.api.habitacion(id), datos => this.panel.set({ tipo: "habitacion", datos })); }
  verInforme(id: number) { this.ejecutar(this.api.informe(id), datos => this.panel.set({ tipo: "informe", datos })); }
  verTicket(id: number) { this.ejecutar(this.api.ticket(id), datos => this.panel.set({ tipo: "ticket", datos })); }

  iniciar(habitacion: Habitacion) {
    this.ejecutar(this.api.iniciar(habitacion.idHabitacion), datos => {
      this.observaciones = "";
      this.filas.set(datos.items.map(i => ({
        idItem: i.idItem, item: i.item, estadoEncontrado: "",
        observaciones: "", evidencia: null, estadoFijo: false,
      })));
      this.panel.set({ tipo: "nuevoInforme", datos });
    });
  }

  abrirEditarInforme(id: number) {
    this.ejecutar(this.api.informe(id), datos => {
      this.filas.set(datos.items.map(i => ({
        idItem: i.idItem, item: i.item, estadoEncontrado: i.estadoEncontrado,
        observaciones: i.observaciones ?? "", evidencia: i.evidencia, estadoFijo: i.idTicket !== null,
      })));
      this.panel.set({ tipo: "editarInforme", datos });
    });
  }

  editarFila(id: number, cambios: Partial<Fila>) {
    this.filas.update(filas => filas.map(f => f.idItem === id ? { ...f, ...cambios } : f));
  }

  guardarInforme() {
    const panel = this.panel();
    if (!this.puedeGuardarInforme() || (panel?.tipo !== "nuevoInforme" && panel?.tipo !== "editarInforme")) return;
    const items = this.filas().map(f => ({
      idItem: f.idItem, estadoEncontrado: f.estadoEncontrado as EstadoItem,
      observaciones: f.observaciones, evidencia: f.evidencia,
    }));
    const peticion = panel.tipo === "nuevoInforme"
      ? this.api.enviar(panel.datos.idInformeRevision, items, this.observaciones)
      : this.api.editarInforme(panel.datos.informe.idInformeRevision, items);
    this.ejecutar(peticion, datos => {
      this.aviso.set(panel.tipo === "nuevoInforme" ? "Informe enviado para aprobación." : "Informe actualizado.");
      if (this.permite("VER_INFORMES")) this.panel.set({ tipo: "informe", datos });
      else this.cerrarPanel();
    });
  }

  aprobar(id: number) {
    this.ejecutar(this.api.aprobar(id), datos => {
      this.panel.set({ tipo: "informe", datos });
      this.aviso.set("Informe aprobado. La habitación está disponible.");
    });
  }

  abrirNuevoTicket(informe: InformeDetalle, item: ItemInforme) {
    this.accion.set(""); this.observacionTecnica = ""; this.costo = null;
    this.evidenciaTicket.set(null);
    this.error.set("");
    this.panel.set({ tipo: "nuevoTicket", informe, item });
  }

  abrirEditarTicket(id: number) {
    this.ejecutar(this.api.ticket(id), datos => {
      this.accion.set(datos.ticket.tipoAccion);
      this.observacionTecnica = datos.observacionTecnica ?? "";
      this.costo = datos.costoReparacion;
      this.evidenciaTicket.set(datos.evidencia);
      this.panel.set({ tipo: "editarTicket", datos });
    });
  }

  cambiarAccion(accion: TipoAccion | "") { this.accion.set(accion); if (accion !== "REPARACION") this.costo = null; }

  guardarTicket() {
    const panel = this.panel();
    const evidencia = this.evidenciaTicket();
    const accion = this.accion();
    if (!accion || (panel?.tipo !== "nuevoTicket" && panel?.tipo !== "editarTicket")) return;
    const datos: AccionTicket = {
      tipoAccion: accion, observacionTecnica: this.observacionTecnica,
      costoReparacion: accion === "REPARACION" ? this.costo : null,
    };
    if (panel.tipo === "nuevoTicket") {
      if (!evidencia) return;
      const id = panel.informe.informe.idInformeRevision;
      this.ejecutar(this.api.crearTicket(id, panel.item.idDetalleInforme, datos, evidencia).pipe(
        tap(() => {
          this.aviso.set("Ticket registrado. Se actualizó el estado del ítem.");
          this.panel.set({ tipo: "informe", datos: panel.informe });
        }),
        switchMap(() => this.api.informe(id)),
      ), datos => this.panel.set({ tipo: "informe", datos }));
    } else {
      this.ejecutar(this.api.editarTicket(panel.datos.ticket.idTicket, datos), ticket => {
        this.panel.set({ tipo: "ticket", datos: ticket });
        this.aviso.set("Ticket actualizado.");
      });
    }
  }

  cargarFoto(evento: Event, idDetalle?: number) {
    const control = evento.target as HTMLInputElement;
    const archivo = control.files?.[0];
    control.value = "";
    if (!archivo) return;
    if (archivo.size > 5 * 1024 * 1024) { this.error.set("La imagen debe pesar como máximo 5 MB."); return; }
    this.ejecutar(this.api.evidencia(archivo), evidencia => {
      if (idDetalle === undefined) this.evidenciaTicket.set(evidencia);
      else this.editarFila(idDetalle, { evidencia });
    });
  }

  confirmarEliminarInforme(informe: Informe) {
    this.confirmar("Eliminar informe", `Se eliminará ${informe.nombre} y se revertirán sus tickets asociados.`,
      () => this.ejecutar(this.api.eliminarInforme(informe.idInformeRevision), () => this.terminar("Informe eliminado.")));
  }

  confirmarEliminarTicket(ticket: Ticket) {
    this.confirmar("Eliminar ticket", `Se eliminará ${ticket.nombre} y se reabrirá la incidencia del ítem.`,
      () => this.ejecutar(this.api.eliminarTicket(ticket.idTicket), () => this.terminar("Ticket eliminado.")));
  }

  confirmarCancelarBorrador(id: number) {
    this.confirmar("Cancelar limpieza", "El borrador se descartará y la habitación quedará por limpiar.",
      () => this.ejecutar(this.api.cancelar(id), () => this.terminar("Borrador descartado.")));
  }

  cerrarPanel() {
    const actual = this.panel();
    this.error.set("");
    if (actual?.tipo === "nuevoTicket") this.panel.set({ tipo: "informe", datos: actual.informe });
    else if (actual?.tipo === "editarInforme") this.panel.set({ tipo: "informe", datos: actual.datos });
    else { this.panel.set(null); this.cargar(); }
  }

  private terminar(aviso: string) {
    this.aviso.set(aviso);
    this.panel.set(null);
    this.cargar();
  }

  private confirmar(titulo: string, texto: string, accion: () => void) {
    this.confirmacion.set({ titulo, texto, ejecutar: () => { this.confirmacion.set(null); accion(); } });
  }

  private ejecutar<T>(peticion: Observable<T>, siguiente: (datos: T) => void) {
    if (this.ocupado()) return;
    this.ocupado.set(true);
    this.error.set("");
    peticion.pipe(takeUntilDestroyed(this.destroy), finalize(() => this.ocupado.set(false)))
      .subscribe({ next: siguiente, error: e => this.error.set(mensajeError(e)) });
  }
}
