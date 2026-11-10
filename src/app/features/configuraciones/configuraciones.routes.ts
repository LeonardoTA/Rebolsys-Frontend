import { Routes } from "@angular/router";
export const CONFIGURACIONES_ROUTES: Routes = [
  {
    path: "",
    loadComponent: () => import("../mantenimiento/mantenimiento").then((m) => m.Mantenimiento),
    children: [
      { path: "", pathMatch: "full", redirectTo: "habitaciones" },
      {
        path: "habitaciones",
        data: { permisos: ["HABITACIONES:VER"] },
        loadComponent: () => import("../mantenimiento/pages/habitaciones/habitaciones").then((m) => m.HabitacionMantenimiento),
      },
      {
        path: "mobiliario",
        data: { permisos: ["MOBILIARIO:VER"] },
        loadComponent: () => import("../mantenimiento/pages/inmobiliario/inmobiliario").then((m) => m.InmobiliarioMantenimiento),
      },
      {
        path: "productos",
        loadChildren: () => import("../productos/productos.routes").then((m) => m.PRODUCTOS_ROUTES),
      },
    ],
  },
];
