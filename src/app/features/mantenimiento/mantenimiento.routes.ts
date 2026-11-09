import { Routes } from '@angular/router';
import { Mantenimiento } from './mantenimiento';

export const MANTENIMIENTO_ROUTES: Routes = [{
  path: '',
  component: Mantenimiento,
  children: [
    { path: '', pathMatch: 'full', redirectTo: 'habitaciones' },
    {
      path: 'habitaciones',
      loadComponent: () => import('./pages/habitaciones/habitaciones').then(m => m.HabitacionMantenimiento),
    },
    {
      path: 'inmobiliario',
      loadComponent: () => import('./pages/inmobiliario/inmobiliario').then(m => m.InmobiliarioMantenimiento),
    },
    {
      path: 'productos',
      loadChildren: () => import('../productos/productos.routes').then(m => m.PRODUCTOS_ROUTES),
    },
  ],
}];
