import { Routes } from '@angular/router';
import { Mantenimiento } from './mantenimiento';

export const MANTENIMIENTO_ROUTES: Routes = [
  {
    path: '',
    component: Mantenimiento,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'habitaciones' },
      {
        path: 'habitaciones',
        loadChildren: () =>
          import('../habitaciones/habitaciones.routes').then(
            (m) => m.HABITACIONES_CONFIGURACION_ROUTES,
          ),
      },
      {
        path: 'inmobiliario',
        loadChildren: () =>
          import('../inmobiliario/inmobiliario.routes').then(
            (m) => m.INMOBILIARIO_ROUTES,
          ),
      },
      {
        path: 'productos',
        loadChildren: () =>
          import('../productos/productos.routes').then(
            (m) => m.PRODUCTOS_ROUTES,
          ),
      },
    ],
  },
];
