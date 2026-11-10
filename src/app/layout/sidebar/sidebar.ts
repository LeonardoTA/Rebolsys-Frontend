import { Component, computed, output, signal, inject } from "@angular/core";
import {
  RouterLink,
  RouterLinkActive,
  Router,
  NavigationEnd,
} from "@angular/router";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { filter } from "rxjs";
import { MENU, MenuItem } from "../../core/config/menu";
import { SesionService } from "../../core/services/sesion-service";
import { Icon } from "../../shared/components/icono/icono";

@Component({
  selector: "app-sidebar",
  imports: [RouterLink, RouterLinkActive, Icon],
  templateUrl: "./sidebar.html",
  styleUrl: "./sidebar.css",
})
export class Sidebar {
  private readonly sesion = inject(SesionService);
  protected readonly menu = computed(() => MENU.flatMap(item => {
    if (!item.hijos) {
      if (!this.visible(item)) return [];
      if (item.ruta === "/ventas" && !this.sesion.permite("VENTAS:CREAR_Y_CONFIRMAR"))
        return [{ ...item, ruta: "/ventas/historial" }];
      if (item.ruta === "/reservas" && !this.sesion.permite("RESERVAS:VER"))
        return [{ ...item, ruta: "/reservas/nueva" }];
      return [item];
    }
    const hijos = item.hijos.filter(hijo => this.visible(hijo));
    return hijos.length ? [{ ...item, hijos }] : [];
  }));
  readonly navegar = output<void>();
  private router = inject(Router);
  configuracionAbierta = signal(this.router.url.startsWith("/configuraciones"));
  alternarConfiguracion() {
    this.configuracionAbierta.update((v) => !v);
  }
  private visible(item: MenuItem) {
    return (!item.soloActiva || this.sesion.actual()?.modo === "ACTIVA")
      && (!item.permisos || this.sesion.permite(...item.permisos));
  }
  constructor() {
    this.router.events
      .pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        if (this.router.url.startsWith("/configuraciones"))
          this.configuracionAbierta.set(true);
      });
  }
}
