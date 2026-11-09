export interface MenuItem {
  etiqueta: string;
  ruta: string;
  icono: string;
}

export const MENU: MenuItem[] = [
  { etiqueta: 'Inicio', ruta: '/inicio', icono: 'home' },
  {
    etiqueta: 'Estado de las habitaciones',
    ruta: '/habitaciones',
    icono: 'grid',
  },
  { etiqueta: 'Registrar reserva', ruta: '/reservas', icono: 'calendar' },
  { etiqueta: 'Registrar venta producto', ruta: '/ventas', icono: 'cart' },
  { etiqueta: 'Productos', ruta: '/productos', icono: 'box' },
];
