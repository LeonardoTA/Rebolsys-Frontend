# Verificación de la entrega

Fecha: 8 de noviembre de 2026. Entorno local: Windows, Node 24, Java 25 compilando para Java 21, Maven, Angular 22 y Oracle real en `oracle-local`.

## Resultados automáticos

| Verificación | Resultado |
|---|---|
| Frontend — Vitest | 65 pruebas aprobadas en 8 archivos. |
| Frontend — compilación de producción | Correcta, sin advertencias; carga inicial aproximada de 316 kB. |
| Backend — Maven package | Correcto. |
| Backend — suite completa con Oracle | 126 casos: 110 aprobados, 16 omitidos del proveedor opcional de facturación, sin fallos ni errores. |
| Modelo y DDL Oracle | Coinciden: 47 tablas y 288 columnas. |
| Pruebas nuevas de archivos de imagen | 6 aprobadas: persistencia en carpeta, reinicio del servicio, rutas seguras, archivo inválido, tamaño/dimensiones y eliminación sin borrar el registro. |

El esquema `PropuestaHospedajeRB` y sus catálogos se crearon con autorización explícita del usuario. Los esquemas de sus otras pruebas no se modificaron. Las pruebas de dominio revierten sus datos; la prueba HTTP de aceptación conserva registros de demostración para inspección.

## Flujos HTTP contra la API real

Se comprobaron registro, consulta, edición y retiro de habitaciones; asignación, conservación, baja e historial de mobiliario; alta, ajuste de existencias, edición y retiro de productos. También se verificaron carga y consulta de una fotografía real, rechazo de un archivo que no es imagen, conservación de la foto anterior y eliminación de foto sin eliminar el producto.

Las claves repetidas de conservación y ajuste de stock no duplicaron movimientos. La habitación retirada conservó su identificador y su fotografía. El mobiliario dado de baja conservó su condición final y tres movimientos de historial. El producto retirado conservó sus existencias y movimientos.

## Comandos reproducibles

Frontend, desde `rebolsysFrontend-main`:

```powershell
npm test -- --watch=false
npm run build
```

El runner está limitado a un proceso para reducir el consumo de memoria.

Backend, desde `rebolsysBackend-iteracion1`, con la conexión privada configurada:

```powershell
$env:RUN_ORACLE_TESTS = 'true'
.\mvnw.cmd -B -ntp package
```

La emisión electrónica y las simulaciones externas no se habilitaron para esta entrega. No se afirma haberlas probado.

## Revisión desde el navegador

Se registró la habitación 901 desde el formulario y se retiró mediante la confirmación de mantenimiento. Se creó el producto «Jabón de demostración» con existencias iniciales cero, se cargó una imagen mediante el selector de archivos y se ajustó su stock a 10 con responsable y motivo. El historial mostró una entrada de 10 unidades. La imagen de demostración se quitó después mediante la API.

Se revisaron las tres secciones en escritorio y su adaptación a 390 × 844 píxeles. Habitaciones, productos e inmobiliario mantuvieron el ancho de página en 390 píxeles; las tablas amplias se desplazan dentro de su contenedor. Se verificó la apertura del menú móvil y se corrigió su tamaño para evitar que cubriera el contenido estando cerrado. La consola final de habitaciones no mostró errores.

Capturas de la versión compilada:

- [Habitaciones](capturas/habitaciones.png) y [vista móvil](capturas/habitaciones-movil.png).
- [Productos](capturas/productos.png) y [vista móvil](capturas/productos-movil.png).
- [Inmobiliario](capturas/inmobiliario.png).

El resultado detallado de los 17 controles HTTP y sus 36 solicitudes está en [VERIFICACION-API.json](VERIFICACION-API.json). Los datos de demostración conservados pertenecen al esquema local autorizado.
