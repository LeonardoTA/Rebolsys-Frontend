import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Icon } from '../../shared/components/icono/icono';

@Component({
  selector: 'app-mantenimiento',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, Icon],
  template: `
    <nav class="maintenance-tabs" aria-label="Secciones de mantenimiento">
      <a routerLink="habitaciones" routerLinkActive="active"><app-icon name="bed" />Habitaciones</a>
      <a routerLink="productos" routerLinkActive="active"><app-icon name="box" />Productos</a>
      <a routerLink="inmobiliario" routerLinkActive="active"><app-icon name="grid" />Inmobiliario</a>
    </nav>
    <router-outlet />
  `,
  styles: `
    .maintenance-tabs { display:flex; gap:4px; padding:6px; background:var(--paper); border-radius:9px; margin-bottom:24px; }
    a { display:flex; justify-content:center; align-items:center; gap:9px; padding:11px 24px; border-radius:7px; color:var(--muted); }
    a.active { background:var(--azul); color:white; }
    a:hover { background:var(--lavanda); color:var(--ink); }
    @media(max-width:640px) { a { flex:1; padding:10px 6px; font-size:13px; gap:5px; } }
  `,
})
export class Mantenimiento {}
