import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Icon } from '../../shared/components/icono/icono';
import { PermisosUi } from '../../core/services/permisos-ui';

@Component({
  selector: 'app-mantenimiento',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, Icon],
  template: `
    <nav class="maintenance-tabs" aria-label="Secciones de mantenimiento">
      @if (acceso.permite('HABITACIONES:VER')) {
        <a routerLink="habitaciones" routerLinkActive="active" ariaCurrentWhenActive="page"
          ><app-icon name="bed" />Habitaciones</a
        >
      }
      @if (acceso.permite('PRODUCTOS:VER')) {
        <a routerLink="productos" routerLinkActive="active" ariaCurrentWhenActive="page"
          ><app-icon name="box" />Productos</a
        >
      }
      @if (acceso.permite('MOBILIARIO:VER')) {
        <a routerLink="mobiliario" routerLinkActive="active" ariaCurrentWhenActive="page"
          ><app-icon name="grid" />Mobiliario</a
        >
      }
    </nav>
    <router-outlet />
  `,
  styles: `
    .maintenance-tabs {
      display: flex;
      gap: 4px;
      padding: 6px;
      background: var(--paper);
      border-radius: 9px;
      margin-bottom: 24px;
    }
    a {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 9px;
      padding: 11px 24px;
      border-radius: 7px;
      color: var(--muted);
    }
    a.active {
      background: var(--azul);
      color: white;
    }
    a:hover {
      background: var(--lavanda);
      color: var(--ink);
    }
    @media (max-width: 640px) {
      a {
        flex: 1;
        padding: 10px 6px;
        font-size: 13px;
        gap: 5px;
      }
    }
  `,
})
export class Mantenimiento {
  protected readonly acceso = inject(PermisosUi);
}
