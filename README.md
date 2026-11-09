# REBOLSYS Frontend

Aplicación Angular para las reservas, la tienda y el mantenimiento del hospedaje Real Bolognesi.

Repositorio independiente: [Rebolsys-Frontend](https://github.com/LeonardoTA/Rebolsys-Frontend). La rama `main` conserva la base del equipo; `Dev-Tequen` contiene el aporte de mantenimiento de James Tequen. El backend de iteración 1 está en [otro repositorio](https://github.com/LeonardoTA/Rebolsys-Backend).

## Ejecutar

Requiere una versión de Node.js compatible con Angular 22 y npm. Con el backend iniciado en el puerto 8085, desde esta carpeta:

```powershell
.\iniciar-frontend.ps1
```

Abrir `http://127.0.0.1:4200/mantenimiento`. El script instala las dependencias si faltan y guarda cachés y temporales en `.work/` dentro de este repositorio. Para otro puerto de API: `.\iniciar-frontend.ps1 -PuertoApi 8080`.

También se puede ejecutar `npm ci` y `npm start -- --proxy-config proxy.local.conf.json`, que usa la API en 8085. El comando `npm start` sin ese argumento conserva el proxy original a 8080.

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
- CU_21: registro, detalle y edición de habitaciones, tipos y retiro de nuevas reservas mediante `MANTENIMIENTO`, conservando su historial.
- CU_22: mobiliario físico por habitación, asignación, traslado, conservación, baja por daño o pérdida e historial.
- CU_23: catálogo de productos y categorías, edición, retiro de venta y ajustes de existencias con responsable y motivo.
- Carga y eliminación de fotografías de habitaciones y productos mediante archivos de la instancia, sin binarios en Oracle.

Los datos provienen de Oracle a través de la API. Los mensajes de validación del backend se presentan en los formularios. Las consultas de DNI/RUC se realizan desde el backend; el navegador no recibe el token de APIs Perú.

## Organización

`app.config.ts` configura los proveedores y `app.routes.ts` carga las rutas por funcionalidad. `layout` contiene la estructura principal; cada módulo en `features` separa `models`, `services`, `pages` y sus componentes. Cada pantalla conserva sus archivos TypeScript, HTML y CSS. `core` agrupa servicios y utilidades; `shared` reúne componentes y directivas comunes.

Las pantallas reutilizan los estilos, iconos, formularios y layout globales del equipo, adaptando Figma al contrato actual de la API. La descripción de habitaciones queda para otra iteración.

La autenticación y los permisos se integrarán con el login del equipo: gerente para habitaciones e inmobiliario; recepcionista para productos. La pasarela de pagos y la emisión tributaria permanecen fuera de esta entrega; los comprobantes actuales son internos.

## Verificación y revisión

`npm test -- --watch=false`: 65 pruebas aprobadas en 8 archivos. `npm run build`: compilación de producción sin advertencias. Las pruebas forman parte del repositorio. El runner usa un proceso para reducir memoria.

La revisión del aporte se hace comparando `main...Dev-Tequen`. En `entregables/` se incluyen la matriz de los 12 requisitos, capturas y resultados de la integración con el backend y Oracle. Las credenciales, imágenes de la instancia, dependencias y compilaciones quedan excluidas de Git.
