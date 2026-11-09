import { Routes } from '@angular/router';
export const PRODUCTOS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/producto-list/producto-list').then((m) => m.ProductoList),
  },
  {
    path: 'nuevo',
    loadComponent: () =>
      import('./pages/producto-form/producto-form').then((m) => m.ProductoForm),
  },
  {
    path: ':id/editar',
    loadComponent: () =>
      import('./pages/producto-form/producto-form').then((m) => m.ProductoForm),
  },
];
