import { Routes } from "@angular/router";
import { MainLayout } from "./layout/main-layout/main-layout";
import { sesionGuard } from "./core/services/sesion-guard";

export const routes: Routes = [
  { path: "login", title: "Iniciar sesión · REBOLSYS", loadComponent: () =>
    import("./features/seguridad/acceso").then(m => m.Acceso) },
  { path: "cambiar-contrasena", title: "Cambiar contraseña · REBOLSYS", data: { cambio: true },
    loadComponent: () => import("./features/seguridad/acceso").then(m => m.Acceso) },
  {
    path: "",
    component: MainLayout,
    canActivateChild: [sesionGuard],
    children: [
      { path: "", pathMatch: "full", redirectTo: "inicio" },
      {
        path: "inicio",
        title: "Inicio · REBOLSYS",
        loadComponent: () =>
          import("./features/inicio/inicio").then((m) => m.Inicio),
      },
      {
        path: "habitaciones",
        data: { permisos: ["HABITACIONES:VER"] },
        title: "Estado de habitaciones · REBOLSYS",
        loadChildren: () =>
          import("./features/habitaciones/habitaciones.routes").then(
            (m) => m.HABITACIONES_ROUTES,
          ),
      },
      {
        path: "reservas",
        title: "Reservas · REBOLSYS",
        loadChildren: () =>
          import("./features/reservas/reservas.routes").then(
            (m) => m.RESERVAS_ROUTES,
          ),
      },
      {
        path: "ventas",
        title: "Ventas · REBOLSYS",
        loadChildren: () =>
          import("./features/ventas/ventas.routes").then(
            (m) => m.VENTAS_ROUTES,
          ),
      },
      {
        path: "configuraciones",
        title: "Configuraciones · REBOLSYS",
        loadChildren: () =>
          import("./features/configuraciones/configuraciones.routes").then(
            (m) => m.CONFIGURACIONES_ROUTES,
          ),
      },
      {
        path: "limpieza",
        title: "Informes y habitaciones · REBOLSYS",
        data: { permisos: ["LIMPIEZA:VER_INICIO", "LIMPIEZA:VER_HABITACIONES", "LIMPIEZA:VER_INFORMES", "LIMPIEZA:VER_TICKETS"] },
        loadComponent: () => import("./features/limpieza/limpieza-panel").then(m => m.LimpiezaPanel),
      },
      {
        path: "caja",
        title: "Caja · REBOLSYS",
        data: { permisos: ["CAJA:VER", "CAJA:CERRAR", "CAJA:REGISTRAR_INGRESO", "GASTOS:CREAR"] },
        loadComponent: () => import("./features/caja/caja-panel").then(m => m.CajaPanel),
      },
      {
        path: "seguridad",
        title: "Seguridad · REBOLSYS",
        data: { soloActiva: true, permisos: ["EMPLEADOS:VER", "EMPLEADOS:CREAR", "USUARIOS:VER", "ROLES:VER"] },
        loadComponent: () => import("./features/seguridad/gestion-seguridad").then(m => m.GestionSeguridad),
      },
      {
        path: "productos",
        pathMatch: "full",
        redirectTo: "configuraciones/productos",
      },
      {
        path: "productos/nuevo",
        redirectTo: "configuraciones/productos/nuevo",
      },
      {
        path: "productos/:id/editar",
        redirectTo: "configuraciones/productos/:id/editar",
      },
      {
        path: "**",
        loadComponent: () =>
          import("./shared/pages/no-encontrado/no-encontrado").then(
            (m) => m.NoEncontrado,
          ),
      },
    ],
  },
];
