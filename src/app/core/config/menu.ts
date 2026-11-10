export interface MenuItem {
  etiqueta: string;
  ruta: string;
  icono: string;
  hijos?: MenuItem[];
  permisos?: string[];
  soloActiva?: boolean;
}

export const MENU: MenuItem[] = [
  { etiqueta: "Inicio", ruta: "/inicio", icono: "home" },
  {
    etiqueta: "Estado de las habitaciones",
    ruta: "/habitaciones",
    icono: "grid",
    permisos: ["HABITACIONES:VER"],
  },
  { etiqueta: "Reservas", ruta: "/reservas", icono: "calendar", permisos: ["RESERVAS:VER", "RESERVAS:CREAR"] },
  { etiqueta: "Venta de productos", ruta: "/ventas", icono: "cart", permisos: ["VENTAS:CREAR_Y_CONFIRMAR", "VENTAS:VER"] },
  { etiqueta: "Caja", ruta: "/caja", icono: "wallet",
    permisos: ["CAJA:VER", "CAJA:CERRAR", "CAJA:REGISTRAR_INGRESO", "GASTOS:CREAR"] },
  {
    etiqueta: "Configuraciones",
    ruta: "/configuraciones",
    icono: "settings",
    hijos: [
      {
        etiqueta: "Habitaciones",
        ruta: "/configuraciones/habitaciones",
        icono: "bed",
        permisos: ["HABITACIONES:VER"],
      },
      {
        etiqueta: "Mobiliario",
        ruta: "/configuraciones/mobiliario",
        icono: "grid",
        permisos: ["MOBILIARIO:VER"],
      },
      {
        etiqueta: "Productos",
        ruta: "/configuraciones/productos",
        icono: "box",
        permisos: ["PRODUCTOS:VER"],
      },
    ],
  },
  { etiqueta: "Informes y habitaciones", ruta: "/limpieza", icono: "receipt",
    permisos: ["LIMPIEZA:VER_INICIO", "LIMPIEZA:VER_HABITACIONES", "LIMPIEZA:VER_INFORMES", "LIMPIEZA:VER_TICKETS"] },
  { etiqueta: "Seguridad", ruta: "/seguridad", icono: "settings", soloActiva: true,
    permisos: ["EMPLEADOS:VER", "EMPLEADOS:CREAR", "USUARIOS:VER", "ROLES:VER"] },
];
