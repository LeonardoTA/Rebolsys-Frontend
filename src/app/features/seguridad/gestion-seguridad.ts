import { HttpClient, HttpErrorResponse } from "@angular/common/http";
import { Component, computed, inject, signal } from "@angular/core";
import { FormsModule, NgForm } from "@angular/forms";
import { Observable, finalize } from "rxjs";
import { environment } from "../../../environments/environment";
import { SesionService } from "../../core/services/sesion-service";
import { mensajeError } from "../../core/utils/http-error";
import { DialogFocus } from "../../shared/directives/dialog-focus";
import { Icon } from "../../shared/components/icono/icono";

type Empleado = {
  idEmpleado: number; idTipoDocumento: number; numeroDocumento: string;
  nombres: string; apellidos: string; correo: string | null; telefono: string | null;
  fechaNacimiento: string | null; fechaContratacion: string; fechaCese: string | null;
  tieneUsuario: boolean; protegido: boolean;
};
type Usuario = { idUsuario: number; idEmpleado: number; usuario: string; estado: string; gerente: boolean;
  roles: number[]; nombresRoles: string[]; permisosIndividuales: string[] };
type Rol = { idRol: number; nombre: string; permisos: string[]; protegido: boolean; usuariosAsignados: number };
type Funcion = { codigo: string; modulo: string; accion: string };
type Temporal = { contrasenaTemporal: string; vence: string };
type Modo = "usuario" | "editarUsuario" | "rol" | "empleado";
type Confirmacion = { titulo: string; texto: string; ejecutar: () => void };

@Component({
  imports: [FormsModule, DialogFocus, Icon],
  templateUrl: "./gestion-seguridad.html",
  styleUrl: "./gestion-seguridad.css",
})
export class GestionSeguridad {
  private readonly http = inject(HttpClient);
  readonly sesion = inject(SesionService);
  private readonly base = environment.apiUrl + "/seguridad";
  readonly empleados = signal<Empleado[]>([]);
  readonly usuarios = signal<Usuario[]>([]);
  readonly roles = signal<Rol[]>([]);
  readonly funciones = signal<Funcion[]>([]);
  readonly tiposDocumento = signal<{ id: number; nombre: string }[]>([]);
  readonly temporal = signal<Temporal | null>(null);
  readonly confirmacion = signal<Confirmacion | null>(null);
  readonly modo = signal<Modo | null>(null);
  readonly error = signal("");
  readonly aviso = signal("");
  readonly ocupado = signal(false);
  readonly seleccionRoles = signal<number[]>([]);
  readonly seleccionPermisos = signal<string[]>([]);
  readonly modulos = computed(() => [...new Set(this.funciones().map(f => f.modulo))]
    .map(modulo => ({ modulo, funciones: this.funciones().filter(f => f.modulo === modulo) })));
  readonly disponibles = computed(() => this.empleados().filter(e => !e.tieneUsuario && !e.fechaCese));
  readonly empleadosPorId = computed(() => new Map(this.empleados().map(e => [e.idEmpleado, e])));
  readonly documentosPorId = computed(() => new Map(this.tiposDocumento().map(t => [t.id, t.nombre])));
  empleado = this.empleadoVacio();
  idEmpleado: number | null = null;
  nombre = "";
  idEdicion: number | null = null;

  constructor() {
    this.cargar();
    if (this.sesion.permite("EMPLEADOS:CREAR")) {
      this.http.get<{ tiposDocumento: { id: number; nombre: string }[] }>(environment.apiUrl + "/recepcion/catalogos")
        .subscribe({ next: datos => this.tiposDocumento.set(datos.tiposDocumento), error: e => this.fallo(e) });
    }
    if (this.sesion.actual()?.gerente) {
      this.http.get<Funcion[]>(this.base + "/funcionalidades")
        .subscribe({ next: datos => this.funciones.set(datos), error: e => this.fallo(e) });
    }
  }

  abrirEmpleado(empleado?: Empleado) {
    this.editar("empleado");
    this.idEdicion = empleado?.idEmpleado ?? null;
    this.empleado = empleado ? {
      idTipoDocumento: empleado.idTipoDocumento, numeroDocumento: empleado.numeroDocumento,
      nombres: empleado.nombres, apellidos: empleado.apellidos, correo: empleado.correo ?? "",
      telefono: empleado.telefono ?? "", fechaNacimiento: empleado.fechaNacimiento ?? "",
      fechaContratacion: empleado.fechaContratacion,
    } : this.empleadoVacio();
  }

  guardarEmpleado(formulario: NgForm) {
    if (formulario.invalid) {
      const campos: Record<string, string> = { tipo: "tipo de documento", numero: "número de documento",
        nombres: "nombres", apellidos: "apellidos", correo: "correo válido", contratacion: "fecha de contratación" };
      const pendientes = Object.entries(formulario.controls).filter(([, campo]) => campo.invalid)
        .map(([nombre]) => campos[nombre] ?? nombre);
      this.error.set("Revisa los siguientes datos del empleado: " + pendientes.join(", ") + ".");
      formulario.control.markAllAsTouched();
      return;
    }
    const { idTipoDocumento, numeroDocumento, ...campos } = this.empleado;
    const datos = { ...campos, fechaNacimiento: campos.fechaNacimiento || null,
      telefono: campos.telefono.trim() || null, correo: campos.correo.trim() || null };
    const id = this.idEdicion;
    const solicitud = id === null
      ? this.http.post<Empleado>(this.base + "/empleados", { ...datos, idTipoDocumento, numeroDocumento })
      : this.http.put<Empleado>(this.base + "/empleados/" + id, datos);
    this.ejecutar(solicitud, e => {
      this.empleados.update(lista => id === null ? [e, ...lista] : lista.map(fila => fila.idEmpleado === id ? e : fila));
      this.modo.set(null);
      this.aviso.set(id === null ? "Empleado registrado. Ya puedes crear su usuario." : "Empleado actualizado.");
    });
  }

  nuevoUsuario(empleado?: Empleado) {
    this.editar("usuario");
    this.idEmpleado = empleado?.idEmpleado ?? null;
    this.nombre = empleado?.correo && empleado.correo.length <= 50 ? empleado.correo : "";
  }

  editar(modo: Modo, cuenta?: Usuario, rol?: Rol) {
    this.modo.set(modo);
    this.temporal.set(null);
    this.error.set("");
    this.idEdicion = cuenta?.idUsuario ?? rol?.idRol ?? null;
    this.nombre = cuenta?.usuario ?? rol?.nombre ?? "";
    this.idEmpleado = null;
    this.seleccionRoles.set(cuenta?.roles ?? []);
    this.seleccionPermisos.set(cuenta?.permisosIndividuales ?? rol?.permisos ?? []);
  }

  cerrarEditor() {
    if (this.ocupado()) return;
    this.modo.set(null);
    this.error.set("");
  }

  elegirRol(id: number) {
    this.seleccionRoles.update(lista => lista.includes(id) ? lista.filter(x => x !== id) : [...lista, id]);
  }

  elegirPermiso(codigo: string) {
    this.seleccionPermisos.update(lista => lista.includes(codigo) ? lista.filter(x => x !== codigo) : [...lista, codigo]);
  }

  guardar() {
    const permisos = this.seleccionPermisos();
    const accesos = { permisos, roles: this.seleccionRoles() };
    switch (this.modo()) {
      case "usuario":
        this.ejecutar(this.http.post<{ credencial: Temporal }>(this.base + "/usuarios", {
          idEmpleado: this.idEmpleado, usuario: this.nombre.trim(), accesos,
        }), dato => { this.temporal.set(dato.credencial); this.modo.set(null); this.cargar(); });
        break;
      case "editarUsuario":
        this.ejecutar(this.http.put(this.base + "/usuarios/" + this.idEdicion, { usuario: this.nombre.trim(), accesos }),
          () => { this.modo.set(null); this.aviso.set("Usuario actualizado."); this.cargar(); });
        break;
      case "rol": {
        const datos = { nombre: this.nombre.trim(), permisos };
        const solicitud = this.idEdicion === null ? this.http.post(this.base + "/roles", datos)
          : this.http.put(this.base + "/roles/" + this.idEdicion, datos);
        this.ejecutar(solicitud, () => { this.modo.set(null); this.aviso.set("Rol guardado."); this.cargar(); });
        break;
      }
    }
  }

  renovar(usuario: Usuario) {
    this.ejecutar(this.http.post<Temporal>(this.base + "/usuarios/" + usuario.idUsuario + "/credencial-temporal", {}),
      datos => this.temporal.set(datos));
  }

  cambiarEstado(usuario: Usuario) {
    const estado = usuario.estado === "ACTIVO" ? "INACTIVO" : "ACTIVO";
    const ejecutar = () => this.ejecutar(this.http.put(this.base + "/usuarios/" + usuario.idUsuario + "/estado", { estado }), () => {
      this.aviso.set(estado === "ACTIVO" ? "Usuario reactivado. Genera una contraseña temporal para que pueda ingresar." : "Usuario desactivado.");
      this.cargar();
    });
    if (estado === "ACTIVO") ejecutar();
    else this.confirmacion.set({ titulo: "Desactivar usuario", texto: "Se cerrará el acceso de " + usuario.usuario + ". Su historial seguirá disponible.", ejecutar });
  }

  cambiarEstadoEmpleado(empleado: Empleado) {
    const activo = !!empleado.fechaCese;
    const ejecutar = () => this.ejecutar(this.http.put(this.base + "/empleados/" + empleado.idEmpleado + "/estado", { activo }), () => {
      this.aviso.set(activo ? "Empleado reactivado." : "Baja del empleado registrada.");
      this.cargar();
    });
    if (activo) ejecutar();
    else this.confirmacion.set({ titulo: "Dar de baja al empleado", texto: "Se conservará su historial y se desactivará su usuario si tiene uno.", ejecutar });
  }

  eliminarRol(rol: Rol) {
    this.confirmacion.set({ titulo: "Eliminar rol", texto: "Se eliminará el rol " + rol.nombre + " y su configuración de permisos.",
      ejecutar: () => this.ejecutar(this.http.delete(this.base + "/roles/" + rol.idRol), () => {
        this.aviso.set("Rol eliminado.");
        this.cargar();
      }),
    });
  }

  confirmarAccion() {
    const confirmacion = this.confirmacion();
    this.confirmacion.set(null);
    confirmacion?.ejecutar();
  }

  private cargar() {
    if (this.sesion.permite("EMPLEADOS:VER")) this.http.get<Empleado[]>(this.base + "/empleados")
      .subscribe({ next: datos => this.empleados.set(datos), error: e => this.fallo(e) });
    if (this.sesion.permite("USUARIOS:VER")) this.http.get<Usuario[]>(this.base + "/usuarios")
      .subscribe({ next: datos => this.usuarios.set(datos), error: e => this.fallo(e) });
    if (this.sesion.permite("ROLES:VER")) this.http.get<Rol[]>(this.base + "/roles")
      .subscribe({ next: datos => this.roles.set(datos), error: e => this.fallo(e) });
  }

  private ejecutar<T>(solicitud: Observable<T>, exito: (datos: T) => void) {
    if (this.ocupado()) return;
    this.ocupado.set(true);
    this.error.set("");
    this.aviso.set("");
    solicitud.pipe(finalize(() => this.ocupado.set(false)))
      .subscribe({ next: exito, error: e => this.fallo(e) });
  }

  private fallo(e: HttpErrorResponse) {
    this.error.set(mensajeError(e));
  }

  private empleadoVacio() {
    return { idTipoDocumento: null as number | null, numeroDocumento: "", nombres: "", apellidos: "", correo: "",
      telefono: "", fechaNacimiento: "", fechaContratacion: new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Lima", year: "numeric", month: "2-digit", day: "2-digit",
      }).format(new Date()) };
  }
}
