import { Routes } from '@angular/router';
export const INMOBILIARIO_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/inmobiliario-list/inmobiliario-list').then(
        (m) => m.InmobiliarioList,
      ),
  },
  {
    path: 'nuevo',
    loadComponent: () =>
      import('./pages/inmobiliario-form/inmobiliario-form').then(
        (m) => m.InmobiliarioForm,
      ),
  },
  {
    path: ':id/editar',
    loadComponent: () =>
      import('./pages/inmobiliario-form/inmobiliario-form').then(
        (m) => m.InmobiliarioForm,
      ),
  },
];
