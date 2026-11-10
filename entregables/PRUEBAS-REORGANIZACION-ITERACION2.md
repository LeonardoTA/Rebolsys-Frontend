# Verificación de la reorganización sobre iteración 2

Fecha: 10 de noviembre de 2026. Base frontend: `68caecb` del equipo.

## Resultados

- `npm test -- --watch=false`: 33 pruebas aprobadas en 5 archivos, sin fallos.
- `npm run build`: compilación de producción correcta.
- Se conserva el límite de memoria del runner: un proceso de pruebas.
- No se ejecutó ni modificó el backend ni la base Oracle en esta validación.

## Cobertura

Las 25 pruebas nuevas de integración y componentes cubren:

- Rutas de alta y edición protegidas por sus permisos, incluyendo rechazo de usuarios que solo pueden leer.
- Cambio obligatorio de contraseña antes de entrar al módulo.
- Entrada directa por ID, errores 404 con reintento y rechazo de ID inválido.
- Navegación listado → alta → cancelar → listado con recarga de datos.
- Tarifa individual, límite de un menor adicional y relación entre capacidad y plazas de cama.
- Conservación de OCUPADO y de los datos del formulario ante un error 409.
- Consulta de habitaciones de mobiliario condicionada por los permisos de la sesión.
- Asignación en dos etapas con responsable de sesión y reintento sin duplicar el alta.
- Baja parcial con reintento exclusivo de la desactivación.

Se recuperaron además 8 pruebas anteriores compatibles con la nueva base: contratos HTTP de habitaciones, mobiliario y tipos, y gestión de diálogos. La suite anterior de 71 pruebas correspondía a otra base; este resultado de 33 casos se refiere a la adaptación actual y no afirma haber ejecutado aquella suite completa sobre iteración 2.

## Avisos de compilación existentes

El límite de advertencia de CSS por componente sigue siendo 4 kB. La compilación avisa en estos archivos de la iteración 2 que este aporte no modifica:

- `features/habitaciones/pages/habitacion-list/habitacion-list.css`: 4,38 kB.
- `features/reservas/pages/reserva-form/reserva-form.css`: 4,04 kB.
- `features/ventas/pages/venta-form/venta-form.css`: 4,13 kB.

No son errores de compilación ni avisos de los formularios extraídos en esta reorganización.
