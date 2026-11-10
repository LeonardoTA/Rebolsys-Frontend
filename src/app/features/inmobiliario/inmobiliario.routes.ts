import { Routes } from '@angular/router';
export const INMOBILIARIO_ROUTES: Routes = [
  {
    path: '',
    data: { permisos: ['MOBILIARIO:VER'] },
    loadComponent: () =>
      import('./pages/inmobiliario-list/inmobiliario-list').then(
        (m) => m.InmobiliarioList,
      ),
  },
  {
    path: 'nuevo',
    data: { permisos: ['MOBILIARIO:CREAR'] },
    loadComponent: () =>
      import('./pages/inmobiliario-form/inmobiliario-form').then(
        (m) => m.InmobiliarioForm,
      ),
  },
  {
    path: ':id/editar',
    data: { permisos: ['MOBILIARIO:EDITAR'] },
    loadComponent: () =>
      import('./pages/inmobiliario-form/inmobiliario-form').then(
        (m) => m.InmobiliarioForm,
      ),
  },
];
