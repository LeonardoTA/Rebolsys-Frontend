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

La conexión con el backend actual incluye **Estado de habitaciones**, **Reservas hasta el cobro y comprobante** y **Configuraciones**. Se conservan los colores y el diseño existente, con ajustes para pantallas pequeñas.

La aplicación solicita inicio de sesión en `/login` y el cambio obligatorio de
la contraseña temporal. El menú y las acciones se adaptan a los permisos de la
cuenta. Desde **Seguridad**, el gerente registra empleados, crea usuarios y
selecciona roles o funciones individuales. El backend valida cada operación y
registra la actividad en `AUDITORIA_GENERAL`.

**Informes y habitaciones** (`/limpieza`) reúne el resumen del turno, las habitaciones
por limpiar, los informes y los tickets. La interfaz adapta los marcos del
[BUC02 de Figma](https://www.figma.com/design/D0sb4PLEvBp0HRs0mvaYST/Real-Bolognesi-Hospedaje?node-id=514-13905)
a los componentes y permisos de REBOLSYS.

El menú se oculta correctamente en móvil y se puede abrir y cerrar; el calendario desplaza sus días dentro de su propio contenedor. Se verificaron pantallas de 320 a 1920 píxeles en la etapa anterior, incluyendo formularios y diálogos de reserva. Están cargadas las 20 habitaciones reales de los pisos 2 al 5 y sus 26 camas, incluyendo las tres camas matrimoniales de la 303. Cada habitación utiliza el precio de la última imagen proporcionada por el usuario, con impuesto incluido, y está habilitada para preparar reservas según disponibilidad. Las habitaciones sin precio siguen mostrando **Tarifa pendiente**. Los registros de pruebas identificados se retiraron el 03/11/2026, con respaldo privado previo en el backend.

- Calendario por semana y piso, estados físicos y reservas del período.
- Inicio de una reserva desde los detalles de una habitación.
- Titular natural o empresa, varias habitaciones, fechas e importes con impuesto incluido.
- Huéspedes opcionales al reservar; los menores necesitan un adulto responsable en la misma habitación. Se respetan capacidad, plazas de cama y menores de siete años sin plaza propia.
- Las 20 habitaciones admiten hasta un menor de 7 años adicional que comparta cama. Se puede desmarcar su plaza propia; desde el cumpleaños número siete se exige cama. El menor sigue contando en el máximo total, configurado como las plazas originales más ese cupo adicional. Dos adultos y un menor sin cama usan dos plazas, y no se admite un segundo menor sin cama.
- Selección del recepcionista. Cada pago requiere un turno abierto de ese usuario y una forma de pago del catálogo.
- Pago total, abonos o reserva pendiente. El efectivo recibido se usa para calcular el vuelto; solo el abono se envía a caja.
- Lista con total, pagado, saldo e historial de abonos. Se consulta la cuenta principal antes de cobrar; los consumos separados se muestran como cuentas separadas.
- Recuperación de reservas y pagos pendientes de confirmación tras errores de conexión. Se conserva la solicitud y su clave en la sesión de esta pestaña; se reintenta el mismo movimiento. No se deben iniciar otro registro o abono mientras exista una confirmación pendiente.

El check-in permite saldo y el check-out exige pago completo según el backend. Las acciones de check-in, check-out y edición posterior se conectarán en las siguientes etapas. El registro de un pago abre la pantalla de comprobantes; la emisión requiere elegir y confirmar boleta o factura.

### Boletas y facturas

Al terminar una reserva nueva se abre la pantalla de comprobantes. También está disponible desde **Reservas → Boleta / Factura** y desde el detalle. Permite seleccionar la cuenta principal o un consumo separado, usar al titular u otro receptor y generar el comprobante interno sin registrar otro cobro. Las facturas exigen RUC; si hay saldo se solicitan cuotas que sumen exactamente lo pendiente antes de preparar la emisión electrónica.

Después de generar el comprobante interno se puede preparar la emisión, revisar la tasa y dirección fiscal, **Enviar a APIsPerú beta**, consultar una respuesta incierta y descargar XML, CDR y PDF según su disponibilidad. Se muestran por separado el número interno y el electrónico. Los precios ya incluyen impuesto; no se añade otra vez al total. Una respuesta incierta se consulta antes de permitir otro envío. Los documentos de esta configuración beta no tienen validez tributaria de producción.

### Configuraciones

El menú desplegable **Configuraciones** agrupa **Habitaciones**, **Mobiliario** y **Productos**. Habitaciones permite crear y editar número, tipo, estado físico, tarifa y límites de ocupación; Mobiliario administra las unidades, asignaciones, traslados, retiros y conservación con responsable y motivo. Los tipos se crean dentro de cada pantalla.

Productos permite registrar descripción opcional de hasta 500 caracteres y existencias iniciales al crear. Con stock inicial mayor a cero se selecciona responsable y el backend genera automáticamente la entrada de inventario; no hay que abrir otro ajuste. Al editar se conserva el stock. Las reposiciones, mermas y correcciones posteriores usan «Ajustar existencias», con responsable, motivo y control del stock observado. El motivo queda en el historial de inventario. Las rutas antiguas `/productos` redirigen al nuevo apartado.

El botón superior **Crear categoría** abre un modal desde el listado y el
formulario. Permite agregar varias categorías, consultar las registradas y
actualizar las opciones sin perder los datos del producto. Desde el formulario
queda seleccionada la categoría recién creada. Las descripciones también se
muestran en el catálogo de Ventas.

Los filtros del listado recorren las páginas de reservas porque la API actual solo ofrece paginación. Las cuentas se consultan para la página mostrada. Para historiales grandes conviene trasladar la búsqueda al backend.

Ventas adapta su registro al contrato actual: confirma con usuario y modalidad,
consulta la cuenta y registra el pago en su turno, con claves estables por fase.
Si se pierde la confirmación se conserva la operación en la sesión de la pestaña
y aparece **Recuperar venta pendiente**, también después de recargar. Un consumo
separado conserva su referencia de reserva. La constancia de pago no se presenta
como una boleta o factura emitida sin los datos de su receptor.
La carga de productos ya consulta las estancias desde la ruta vigente `/reservas`,
recorre sus páginas y muestra habitaciones EN_CURSO. Una consulta de estancias
fallida no oculta el catálogo para compradores externos. Los fallos del catálogo
se muestran con reintento y se distinguen de un listado vacío.

## Comprobación local

La verificación incluye 81 pruebas locales y tres verificaciones HTTP opcionales
(dos de comprobantes y la carga de Ventas) contra una simulación Postman. Estas últimas no se ejecutan con
`npm test` normal. Para repetirlos, iniciar una instancia nueva de la simulación
en una terminal:

```powershell
postman simulation run postman/simulations/reservas.sim.yaml --port 4932 --no-history
```

En otra terminal:

```powershell
$env:REBOLSYS_SIMULATION='http://127.0.0.1:4932/rebolsys/api/v1'
npm test -- --watch=false
Remove-Item Env:REBOLSYS_SIMULATION
```

El estado de esta simulación solo vive en memoria. Sus archivos fiscales son
marcadores; verifica la integración HTTP del cliente, sin emitir en APIsPerú ni
crear datos en Oracle. La revisión visual de las nuevas pantallas quedó pendiente
porque el control del navegador estaba deshabilitado en la aplicación.

```powershell
npm test -- --watch=false
npm run build
```

Se probaron además en el navegador reservas de persona natural y empresa, abono y pago total, menores con responsable y recuperación de una respuesta de pago perdida mediante una simulación local de Postman. La simulación almacena datos ficticios en memoria y no usa Oracle, SUNAT ni credenciales externas. Los detalles y archivos de apoyo están en `docs/RESERVAS-FRONTEND.md` y `postman/` de esta copia local.

La consulta real de habitaciones y catálogos fue comprobada contra el backend local. La creación de reservas y abonos en Oracle está pendiente de autorización explícita para esos registros de prueba.

## Avance preexistente

- Inicio y navegación lateral.
- Estado de habitaciones, calendario por piso y configuración de ocupación.
- Reservas con varias habitaciones, cliente natural o empresa y huéspedes por habitación.
- Menores con responsable adulto en la misma habitación y uso de plaza según los límites configurados.
- Edición de huéspedes y menores a cargo durante la preparación de la reserva.
- Cobro en efectivo, abonos y saldo pendiente.
- Venta de productos a personas externas o del hospedaje, con cobro separado o cargo a una reserva.
- Edición de productos y cantidades de ventas pendientes sin cobros ni comprobante.
- Mantenimiento de productos y categorías, precio, stock y ruta de imagen.

Los datos provienen de Oracle a través de la API. Los mensajes de validación del backend se presentan en los formularios. Las consultas de DNI/RUC se realizan desde el backend; el navegador no recibe el token de APIs Perú.

## Organización

`app.config.ts` configura los proveedores y `app.routes.ts` carga las rutas por funcionalidad. `layout` contiene la estructura principal; cada módulo en `features` separa `models`, `services`, `pages` y sus componentes. Cada pantalla conserva sus archivos TypeScript, HTML y CSS. `core` agrupa servicios y utilidades; `shared` reúne componentes y directivas comunes.

La autenticación, pasarela de pagos, carga de imágenes y paso de facturación a producción se implementarán posteriormente. La versión está destinada al desarrollo local y a la facturación beta.

Este repositorio contiene los archivos del sistema. Documentación de trabajo, Postman, pruebas, capturas, compilaciones y dependencias instaladas se mantienen fuera de Git.
