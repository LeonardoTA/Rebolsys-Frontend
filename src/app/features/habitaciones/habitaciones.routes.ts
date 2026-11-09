import { Routes } from '@angular/router';
import { HabitacionList } from './pages/habitacion-list/habitacion-list';

export const HABITACIONES_ROUTES: Routes = [
  { path: '', component: HabitacionList },
];

export const HABITACIONES_CONFIGURACION_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/habitacion-config-list/habitacion-config-list').then(
        (m) => m.HabitacionConfigList,
      ),
  },
  {
    path: 'nuevo',
    loadComponent: () =>
      import('./pages/habitacion-form/habitacion-form').then(
        (m) => m.HabitacionForm,
      ),
  },
  {
    path: ':id/editar',
    loadComponent: () =>
      import('./pages/habitacion-form/habitacion-form').then(
        (m) => m.HabitacionForm,
      ),
  },
];
