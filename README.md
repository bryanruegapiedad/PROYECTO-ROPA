# PROYECTO TIENDA DE ROPA (NOVA STUDIO)

Sistema de gestión de ventas y comercio electrónico de moda con arquitectura de microservicios e inferencia lógica.

---

## Estructura del Proyecto

```text
├── frontend/          <-- Aplicación web SPA en Angular 21 (HTML, SCSS, TypeScript)
├── backend-node/      <-- API REST en Node.js / Express con conexión a SQL Server
├── backend-python/    <-- Orquestador e Integrador Flask (puerto 8083)
├── logic-prolog/      <-- Base de conocimiento y reglas de inferencia Prolog (.pl)
└── backend-scala/     <-- Motor de procesamiento analítico y catálogo en Scala (build.sbt)
```

---

## Puertos y Servicios Activos

| Componente | Carpeta | Puerto | Función Principal |
|---|---|:---:|---|
| **Frontend Web** | `frontend/` | `4200` | Catálogo de prendas, carrito, checkout y detalle de producto |
| **Backend Node.js** | `backend-node/` | `8082` | Gestión transaccional de órdenes, usuarios y SQL Server |
| **Integrador Python** | `backend-python/` | `8083` | Orquestador de inferencia lógica de tallas y estilos |
| **Lógica Prolog** | `logic-prolog/` | N/A | Reglas de compatibilidad de prendas y corte |

---

## Flujo de Compra Real y Persistencia

1. **Validación:** El cliente completa sus datos en el checkout (nombre, teléfono, dirección, pago).
2. **Recomendación Inteligente:** El panel interactivo consulta sugerencias automáticas de tallas y estilo basadas en reglas de inferencia.
3. **Transacción en SQL Server:** Al confirmar la compra:
   - Se crea el registro en la tabla `dbo.pedidos`.
   - Se insertan las líneas en `dbo.pedido_detalle`.
   - Se descuenta automáticamente el stock en `dbo.producto_variantes` y `dbo.productos`.
4. **Confirmación:** La pantalla muestra el número de orden generado, los detalles de entrega y vacía automáticamente el carrito.
