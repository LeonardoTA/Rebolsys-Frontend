import { Routes } from '@angular/router';
export const PRODUCTOS_ROUTES: Routes = [
  {
    path: '',
    data: { permisos: ["PRODUCTOS:VER"] },
    loadComponent: () =>
      import('./pages/producto-list/producto-list').then((m) => m.ProductoList),
  },
  {
    path: 'nuevo',
    data: { permisos: ["PRODUCTOS:CREAR"] },
    loadComponent: () =>
      import('./pages/producto-form/producto-form').then((m) => m.ProductoForm),
  },
  {
    path: ':id/editar',
    data: { permisos: ["PRODUCTOS:EDITAR"] },
    loadComponent: () =>
      import('./pages/producto-form/producto-form').then((m) => m.ProductoForm),
  },
];
