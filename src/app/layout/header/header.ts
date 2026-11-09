import { Component, computed, inject, output } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { Icon } from '../../shared/components/icono/icono';

@Component({
  selector: 'app-header',
  imports: [Icon],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header {
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
    if (ruta.includes('/productos/nuevo')) return 'AGREGAR PRODUCTO';
    if (ruta.includes('/productos') && ruta.includes('/editar'))
      return 'EDITAR PRODUCTO';
    if (ruta.includes('/productos')) return 'PRODUCTOS';
    if (ruta.includes('/ventas/historial')) return 'HISTORIAL DE VENTAS';
    if (ruta.includes('/ventas')) return 'REGISTRAR VENTA';
    if (ruta.includes('/habitaciones')) return 'HABITACIONES';
    if (ruta.includes('/reservas/nueva')) return 'REGISTRAR RESERVA';
    if (ruta.includes('/editar')) return 'EDITAR RESERVA';
    if (ruta.includes('/reservas')) return 'Lista de Reservas';
    return 'BIENVENIDO A “REAL BOLOGNESI MANAGEMENT SUITE”';
  });
}
