import { Routes } from '@angular/router';
import { ReservaList } from './pages/reserva-list/reserva-list';
import { ReservaForm } from './pages/reserva-form/reserva-form';

export const RESERVAS_ROUTES: Routes = [
  { path: '', component: ReservaList },
  { path: 'nueva', component: ReservaForm },
  { path: ':ref/editar', component: ReservaForm },
];
