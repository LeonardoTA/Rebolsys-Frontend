# Revisión de mantenimiento — James Tequen

Fecha: 8 de noviembre de 2026. Alcance confirmado: CU_21, CU_22 y CU_23 de la imagen de requisitos. Las vistas suministradas estaban diseñadas en Figma y requerían implementación en Angular.

## Cobertura funcional

| Caso | Requisito | Implementación |
|---|---|---|
| CU_21 | Registrar características de una habitación | Número, tipo, capacidad, plazas de cama, menores sin cama y estado; tarifa obtenida del tipo. |
| CU_21 | Consultar el detalle | Catálogo con filtros/paginación y consulta actualizada del detalle, con carga, error y reintento. |
| CU_21 | Actualizar las características | Formulario validado, límites por tipo y conservación de las restricciones de ocupación del backend. |
| CU_21 | Retirar de nuevas reservas sin borrar historial | `PATCH /habitaciones/{id}/estado` con `MANTENIMIENTO`. No se elimina la habitación. |
| CU_22 | Registrar inmobiliario por habitación | Registro de cada unidad física y asignación a una habitación con condición, responsable y observación. |
| CU_22 | Consultar artículos asignados | Filtros por habitación, tipo, condición y situación; consulta del detalle e historial. |
| CU_22 | Actualizar el listado y sus datos | Edición de unidad, asignación, traslado, retiro y actualización de conservación por operaciones específicas. |
| CU_22 | Dar de baja por daño o pérdida | Retiro con condición final `DANADO` o `FALTANTE`, seguido de desactivación. Conserva historial y permite recuperar un fallo entre ambas etapas. |
| CU_23 | Registrar productos para venta | Alta con categoría, nombre, precio, mínimo y stock inicial cero, conforme al contrato existente. |
| CU_23 | Consultar el catálogo | Búsqueda, categorías, estado, stock bajo y paginación; detalle con movimientos. |
| CU_23 | Actualizar productos | Edición de datos; ajuste de existencias separado con responsable, motivo, saldo observado y clave de operación. |
| CU_23 | Retirar productos de venta | Desactivación mediante `DELETE /productos/{id}`; se conservan ventas y movimientos. |

## Diferencias encontradas y decisiones aplicadas

1. **Oferta y estado físico:** Figma los muestra separados; la API no tiene un indicador independiente de oferta. Se acordó usar `MANTENIMIENTO` para el retiro. Una habitación ocupada no se retira desde configuración ni se simula su salida.
2. **Fotografías:** no existía una subida funcional. Se incorporó almacenamiento en la carpeta de la instancia y asociación por identificador. No se guardan binarios ni se añaden columnas a Oracle. La ruta del archivo de instancia se calcula al consultar.
3. **Descripción de habitaciones:** el usuario decidió dejarla para otra iteración porque el contrato actual no la persiste.
4. **Existencias:** el formulario previo permitía introducir stock al registrar; la API exige cero y un ajuste posterior. Se separaron ambos flujos y sus mensajes.
5. **Pérdida de mobiliario:** la API usa `FALTANTE`. La interfaz lo presenta como “Perdido/faltante” y conserva ese valor en las solicitudes.
6. **Recursos globales:** se mantuvieron el layout, la tipografía, los colores, los iconos, las notificaciones y los diálogos del equipo por encima de las diferencias visuales de Figma. No se añadió un framework de estilos.
7. **Documentación histórica:** algunas notas del backend mencionan 46 tablas y 265 columnas. El DDL y el modelo actuales se verificaron con 47 tablas y 288 columnas; la funcionalidad de imágenes no modifica esas cifras.

## Integración con el login del equipo

| Apartado | Actor previsto | Pendiente de integración |
|---|---|---|
| Habitaciones | Gerente | Permisos en navegación, rutas y endpoints. |
| Inmobiliario | Gerente | Permisos y responsable obtenido desde la sesión. |
| Productos | Recepcionista | Permisos y responsable obtenido desde la sesión. |
| Imágenes | Actor del mantenimiento correspondiente | Aplicar los mismos permisos a subida y eliminación. |

Por decisión del usuario, esta entrega mantiene la etapa actual sin autenticación. Elegir un responsable de movimiento no equivale a iniciar sesión.

Ver [pruebas y evidencias](PRUEBAS.md) y [ejecución del proyecto](../README.md).
