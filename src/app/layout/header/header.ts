import { Component, computed, inject, input, output } from "@angular/core";
import { NavigationEnd, Router } from "@angular/router";
import { toSignal } from "@angular/core/rxjs-interop";
import { filter, map } from "rxjs";
import { Icon } from "../../shared/components/icono/icono";
import { SesionService } from "../../core/services/sesion-service";

@Component({
  selector: "app-header",
  imports: [Icon],
  templateUrl: "./header.html",
  styleUrl: "./header.css",
})
export class Header {
  readonly sesion = inject(SesionService);
  constructor() {
    this.sesion.cargar().subscribe({ error: () => {} });
  }
  reintentarSesion() {
    this.sesion.cargar().subscribe({ error: () => {} });
  }
  cerrarSesion() {
    this.sesion.cerrar().subscribe({
      next: () => void this.router.navigateByUrl("/login"),
      error: () => this.sesion.error.set("No se pudo cerrar la sesión."),
    });
  }
  readonly menuAbierto = input(false);
  readonly toggleMenu = output<void>();
  private readonly router = inject(Router);
  private readonly ruta = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.router.url),
    ),
    { initialValue: this.router.url },
  );
  protected readonly titulo = computed(() => {
    const ruta = this.ruta();
    if (ruta.startsWith("/caja")) return "CAJA";
    if (ruta.includes("/limpieza")) return "LIMPIEZA Y MANTENIMIENTO";
    if (ruta.includes("/seguridad")) return "EMPLEADOS, USUARIOS Y ACCESOS";
    if (ruta.includes("/configuraciones/habitaciones"))
      return "CONFIGURACIÓN DE HABITACIONES";
    if (ruta.includes("/configuraciones/mobiliario"))
      return "CONFIGURACIÓN DE MOBILIARIO";
    if (ruta.includes("/productos/nuevo")) return "AGREGAR PRODUCTO";
    if (ruta.includes("/productos") && ruta.includes("/editar"))
      return "EDITAR PRODUCTO";
    if (ruta.includes("/productos")) return "PRODUCTOS";
    if (ruta.includes("/ventas/historial")) return "HISTORIAL DE VENTAS";
    if (ruta.includes("/ventas")) return "VENTA DE PRODUCTOS";
    if (ruta.includes("/habitaciones")) return "HABITACIONES";
    if (ruta.includes("/reservas/nueva")) return "REGISTRAR RESERVA";
    if (ruta.includes("/editar")) return "EDITAR RESERVA";
    if (ruta.includes("/reservas")) return "Lista de Reservas";
    return "BIENVENIDO A “REAL BOLOGNESI MANAGEMENT SUITE”";
  });
}
