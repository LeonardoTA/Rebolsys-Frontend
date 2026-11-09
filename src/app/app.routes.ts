import { Routes } from '@angular/router';
import { MainLayout } from './layout/main-layout/main-layout';

export const routes: Routes = [
  {
    path: '',
    component: MainLayout,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'inicio' },
      {
        path: 'inicio',
        title: 'Inicio · REBOLSYS',
        loadComponent: () =>
          import('./features/inicio/inicio').then((m) => m.Inicio),
      },
      {
        path: 'habitaciones',
        title: 'Estado de habitaciones · REBOLSYS',
        loadChildren: () =>
          import('./features/habitaciones/habitaciones.routes').then(
            (m) => m.HABITACIONES_ROUTES,
          ),
      },
      {
        path: 'reservas',
        title: 'Reservas · REBOLSYS',
        loadChildren: () =>
          import('./features/reservas/reservas.routes').then(
            (m) => m.RESERVAS_ROUTES,
          ),
      },
      {
        path: 'ventas',
        title: 'Ventas · REBOLSYS',
        loadChildren: () =>
          import('./features/ventas/ventas.routes').then(
            (m) => m.VENTAS_ROUTES,
          ),
      },
      {
        path: 'productos',
        title: 'Productos · REBOLSYS',
        loadChildren: () =>
          import('./features/productos/productos.routes').then(
            (m) => m.PRODUCTOS_ROUTES,
          ),
      },
      {
        path: '**',
        loadComponent: () =>
          import('./shared/pages/no-encontrado/no-encontrado').then(
            (m) => m.NoEncontrado,
          ),
      },
    ],
  },
];
