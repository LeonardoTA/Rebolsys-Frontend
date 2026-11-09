# REBOLSYS Frontend

Aplicación Angular para las reservas y la tienda del hospedaje Real Bolognesi.

## Ejecutar

Requiere una versión de Node.js compatible con Angular 22 y npm. Desde esta carpeta:

```powershell
npm ci
npm start
```

Abrir `http://localhost:4200`. Iniciar también [rebolsysBackend](https://github.com/branpachman-lang/rebolsysBackend). `proxy.conf.json` reenvía `/api` al backend local en el puerto 8080. Si cambia ese puerto, actualizar el proxy y reiniciar el frontend.

```powershell
npm run build
```

La aplicación compilada queda en `dist/rebolsys-frontend/browser`. El servidor web debe redirigir las rutas Angular a `index.html` y reenviar `/api` al backend.

## Funcionalidades

- Inicio y navegación lateral.
- Estado de habitaciones, calendario por piso y configuración de ocupación.
- Reservas con varias habitaciones, cliente natural o empresa y huéspedes por habitación.
- Menores con responsable adulto en la misma habitación y uso de plaza según los límites configurados.
- Edición del cliente, huéspedes y menores a cargo.
- Cobro en efectivo, abonos, saldo pendiente y comprobantes internos imprimibles.
- Venta de productos a personas externas o del hospedaje, con cobro separado o cargo a una reserva.
- Edición de productos y cantidades de ventas pendientes sin cobros ni comprobante.
- Mantenimiento de productos y categorías, precio, stock y ruta de imagen.

Los datos provienen de Oracle a través de la API. Los mensajes de validación del backend se presentan en los formularios. Las consultas de DNI/RUC se realizan desde el backend; el navegador no recibe el token de APIs Perú.

## Organización

`app.config.ts` configura los proveedores y `app.routes.ts` carga las rutas por funcionalidad. `layout` contiene la estructura principal; cada módulo en `features` separa `models`, `services`, `pages` y sus componentes. Cada pantalla conserva sus archivos TypeScript, HTML y CSS. `core` agrupa servicios y utilidades; `shared` reúne componentes y directivas comunes.

La autenticación, pasarela de pagos, carga de imágenes y emisión tributaria se implementarán posteriormente. Los comprobantes actuales son internos y la versión está destinada al desarrollo local.

Este repositorio contiene los archivos del sistema. Documentación de trabajo, Postman, pruebas, capturas, compilaciones y dependencias instaladas se mantienen fuera de Git.