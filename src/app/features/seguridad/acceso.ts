import { Component, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";
import { finalize } from "rxjs";
import { SesionService } from "../../core/services/sesion-service";
import { mensajeError } from "../../core/utils/http-error";
import { Icon } from "../../shared/components/icono/icono";

const USUARIO_RECORDADO = "rebolsys.acceso.usuario";

@Component({
  imports: [FormsModule, Icon],
  templateUrl: "./acceso.html",
  styleUrl: "./acceso.css",
})
export class Acceso {
  private readonly sesion = inject(SesionService);
  private readonly router = inject(Router);
  readonly cambio = !!inject(ActivatedRoute).snapshot.data["cambio"];
  readonly error = signal("");
  readonly cargando = signal(false);
  readonly ayuda = signal(false);
  readonly conexionHttps = globalThis.location?.protocol === "https:";
  readonly temporal = () => this.sesion.actual()?.requiereCambio === true;
  readonly mostrarActual = signal(false);
  readonly mostrarNueva = signal(false);
  readonly mostrarConfirmacion = signal(false);
  usuario = this.leerUsuario();
  recordar = !!this.usuario;
  contrasena = "";
  nueva = "";
  confirmar = "";
  private readonly codificador = new TextEncoder();

  constructor() {
    if (this.cambio) {
      this.sesion.cargar().subscribe({ error: () => void this.router.navigateByUrl("/login") });
    }
  }

  get longitudValida() {
    return !!this.nueva.trim() && Array.from(this.nueva).length >= 15;
  }

  get bytesValidos() {
    return !!this.nueva && this.codificador.encode(this.nueva).length <= 72;
  }

  get coinciden() {
    return !!this.nueva && this.nueva === this.confirmar;
  }

  cambiarAyuda(abierta: boolean) {
    this.error.set("");
    if (abierta) {
      this.contrasena = "";
      this.mostrarActual.set(false);
    }
    this.ayuda.set(abierta);
  }

  enviar() {
    if (this.cargando()) return;
    this.error.set("");
    if (this.cambio && (!this.longitudValida || !this.bytesValidos || !this.coinciden)) {
      this.error.set("Revisa los requisitos de la contraseña y su confirmación.");
      return;
    }
    const usuario = this.usuario.trim();
    if (!this.contrasena || (!this.cambio && !usuario)) {
      this.error.set("Ingresa tu usuario y tu contraseña.");
      return;
    }
    this.cargando.set(true);
    const solicitud = this.cambio ? this.sesion.cambiar(this.contrasena, this.nueva)
      : this.sesion.iniciar(usuario, this.contrasena);
    solicitud.pipe(finalize(() => this.cargando.set(false))).subscribe({
      next: s => {
        if (!this.cambio) this.guardarUsuario(this.recordar ? usuario : "");
        void this.router.navigateByUrl(s.requiereCambio ? "/cambiar-contrasena" : "/inicio");
      },
      error: e => this.error.set(e.status === 401
        ? (this.cambio ? "Revisa tu contraseña actual o vuelve a iniciar sesión." : "El usuario o la contraseña son incorrectos o la credencial venció.")
        : mensajeError(e)),
    });
  }

  salir() {
    if (this.cargando()) return;
    this.cargando.set(true);
    this.sesion.cerrar().pipe(finalize(() => this.cargando.set(false))).subscribe({
      next: () => void this.router.navigateByUrl("/login"),
      error: () => this.error.set("No se pudo cerrar la sesión."),
    });
  }

  cambiarRecordatorio(recordar: boolean) {
    this.recordar = recordar;
    if (!recordar) this.guardarUsuario("");
  }

  private leerUsuario(): string {
    try {
      return localStorage.getItem(USUARIO_RECORDADO) ?? "";
    } catch {
      return "";
    }
  }

  private guardarUsuario(usuario: string) {
    try {
      if (usuario) localStorage.setItem(USUARIO_RECORDADO, usuario);
      else localStorage.removeItem(USUARIO_RECORDADO);
    } catch {
      // La opción es prescindible si el navegador bloquea el almacenamiento.
    }
  }
}
