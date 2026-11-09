# Estructura del frontend según PharmaFrontEnd

Reorganización del aporte de mantenimiento, 9 de noviembre de 2026. Referencia local inspeccionada: `C:\Users\graci\IDE-Class\Trabajos_Clase\PharmaClass\PharmaFrontEnd`.

Se adopta el mismo patrón de organización por entidad de la referencia. Los nombres de entidades, contratos y operaciones corresponden a hotelería y a la API de Rebolsys.

```text
src/app/
├── core/
│   ├── models/        # Paginación, catálogos y filtros compartidos
│   ├── services/      # Catálogos comunes y notificaciones
│   └── utils/         # Errores HTTP, parámetros y claves de operación
├── features/
│   ├── habitaciones/
│   │   ├── models/habitacion.model.ts
│   │   ├── services/habitacion-service.ts
│   │   ├── pages/habitacion-list/          # Vista operativa existente
│   │   ├── pages/habitacion-config-list/   # Catálogo de configuración
│   │   ├── pages/habitacion-form/          # Alta y edición
│   │   └── habitaciones.routes.ts
│   ├── inmobiliario/
│   │   ├── models/inmobiliario.model.ts
│   │   ├── services/inmobiliario-service.ts
│   │   ├── pages/inmobiliario-list/
│   │   ├── pages/inmobiliario-form/
│   │   └── inmobiliario.routes.ts
│   ├── productos/                         # Patrón list/form existente
│   ├── tipos-habitacion/{models,services}/
│   ├── tipos-inmobiliario/{models,services}/
│   └── mantenimiento/                     # Contenedor y rutas de navegación
├── layout/
└── shared/{components,directives,pages}/
```

Cada página nueva tiene sus propios archivos `.ts`, `.html`, `.css` y `.spec.ts`. Las pruebas HTTP están junto a sus servicios. Se retiraron el servicio HTTP agregado y el archivo de modelos central de mantenimiento; los componentes consumen los servicios de cada entidad.

## Correspondencia con Pharma

| Patrón de Pharma | Aplicación en Rebolsys |
|---|---|
| `features/productos/models` y `services` | Habitaciones, inmobiliario y productos separan sus contratos y acceso HTTP. |
| `pages/producto-list` y `producto-form` | Habitaciones e inmobiliario tienen páginas independientes de listado y formulario. |
| `productos.routes.ts` | Cada entidad define sus rutas; el contenedor delega con `loadChildren`. |
| `core` para recursos generales | Catálogos, filtros, parámetros HTTP y claves de operación compartidos. |
| `shared` para interfaz reutilizable | Iconos, fotografías y directivas de diálogo. |

Habitaciones tiene dos conjuntos de rutas en su archivo porque el equipo ya contaba con una vista operativa de disponibilidad. Esa vista permanece separada del catálogo de configuración. Los catálogos de tipos tienen contratos y servicios propios; sus pequeños formularios siguen siendo diálogos relacionados con el flujo de mantenimiento.

## Navegación

- `/mantenimiento/habitaciones`: listado de configuración.
- `/mantenimiento/habitaciones/nuevo` y `/mantenimiento/habitaciones/:id/editar`: formulario.
- `/mantenimiento/inmobiliario`: listado de unidades físicas.
- `/mantenimiento/inmobiliario/nuevo` y `/mantenimiento/inmobiliario/:id/editar`: formulario.
- `/mantenimiento/productos`: módulo existente de productos y sus formularios.

El listado de mobiliario conserva detalle, historial, asignación, traslado, conservación y baja como acciones específicas. El formulario conserva el identificador de una unidad ya creada si falla su asignación posterior, permitiendo reintentar sin duplicarla. El formulario de habitación consulta datos actuales al entrar por ID y conserva el estado OCUPADO.

La integración de login y permisos continúa pendiente según el alcance acordado con el equipo. La reorganización no sustituye los DTO ni las reglas de Rebolsys por los de Pharma.

Validación: 71 pruebas frontend aprobadas en 13 archivos y compilación de producción sin advertencias. Ver [PRUEBAS.md](PRUEBAS.md).
