import { Routes } from "@angular/router";
export const VENTAS_ROUTES: Routes = [
  {
    path: "",
    data: { permisos: ["VENTAS:CREAR_Y_CONFIRMAR"] },
    loadComponent: () =>
      import("./pages/venta-form/venta-form").then((m) => m.VentaForm),
  },
  {
    path: "historial",
    data: { permisos: ["VENTAS:VER"] },
    loadComponent: () =>
      import("./pages/venta-list/venta-list").then((m) => m.VentaList),
  },
  {
    path: ":id/editar",
    data: { permisos: ["VENTAS:EDITAR"] },
    loadComponent: () =>
      import("./pages/venta-form/venta-form").then((m) => m.VentaForm),
  },
  {
    path: ":id",
    data: { permisos: ["VENTAS:VER"] },
    loadComponent: () =>
      import("./pages/venta-detalle/venta-detalle").then((m) => m.VentaDetalle),
  },
];
