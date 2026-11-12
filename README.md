# PROYECTO TIENDA DE ROPA (NOVA STUDIO)

Sistema de gestión de ventas y comercio electrónico de moda boutique con arquitectura de microservicios, persistencia transaccional en SQL Server e inferencia lógica.

---

## 📁 Estructura del Proyecto

```text
├── database/          <-- Scripts de inicialización SQL Server (init.sql) y guía
├── frontend/          <-- Aplicación web SPA en Angular 21 (HTML, SCSS, TypeScript)
├── backend-node/      <-- API REST en Node.js / Express con conexión a SQL Server
├── backend-python/    <-- Orquestador e Integrador Flask (puerto 8083)
├── logic-prolog/      <-- Base de conocimiento y reglas de inferencia Prolog (.pl)
├── backend-scala/     <-- Motor de procesamiento analítico y catálogo en Scala (build.sbt)
└── TiendaRopa.sql     <-- Script SQL maestro en la raíz para ejecución inmediata
```

---

## 🗄️ Inicialización de la Base de Datos (SQL Server)

Para clonar y poner a funcionar el proyecto rápidamente:

1. **Ejecuta el script SQL maestro:**
   - Abre **SQL Server Management Studio (SSMS)**, **Azure Data Studio** o **VS Code** con la extensión `mssql`.
   - Abre el archivo `TiendaRopa.sql` (en la raíz) o `database/init.sql`.
   - Ejecuta el script (**F5**). Creará automáticamente la base de datos `TiendaRopa`, todas sus tablas, restricciones, índices, catálogo con fotos reales, usuarios y pedidos iniciales para el dashboard.
   - *Alternativa por consola:*
     ```powershell
     sqlcmd -S localhost -E -i TiendaRopa.sql
     ```

2. **Configura la conexión del Backend (`backend-node/.env`):**
   ```ini
   PORT=8082
   JWT_SECRET=clave-secreta-local-ventaropa
   DB_WINDOWS_AUTH=true
   DB_SERVER=localhost
   DB_NAME=TiendaRopa
   DB_TRUST_SERVER_CERTIFICATE=true
   DB_CONNECTION_STRING=Driver={ODBC Driver 18 for SQL Server};Server=localhost;Database=TiendaRopa;Trusted_Connection=Yes;TrustServerCertificate=Yes
   ```

3. Más detalles y diagramas en la [Guía de Base de Datos](file:///d:/CURSOS%20UNIVERSIDAD/cursos%208tavo/lenguaje%20de%20programacion/Proyecto-GestionVentas/PROYECTO-ROPA/database/README.md).

---

## 🔑 Credenciales de Acceso

| Usuario / Correo | Contraseña | Rol | Redirección Inicial |
|---|---|---|---|
| `admin` o `admin@nova.com` | `1234` | `administrador` | **Panel de Métricas y Ventas** (`/dashboard`) |
| `cliente` o `cliente@nova.com` | `1234` | `cliente` | **Catálogo Boutique** (`/tienda`) |

---

## 🚀 Puertos y Servicios Activos

| Componente | Carpeta | Puerto | Comando de Inicio | Función Principal |
|---|---|:---:|---|---|
| **Frontend Web** | `frontend/` | `4200` | `npm start` | Catálogo de prendas, carrito, checkout y administración |
| **Backend Node.js** | `backend-node/` | `8082` | `node server.js` | API REST, métricas de ventas y persistencia SQL Server |
| **Integrador Python** | `backend-python/` | `8083` | `py -3 main.py` | Orquestador de inferencia lógica de tallas y estilos |
| **Lógica Prolog** | `logic-prolog/` | N/A | N/A | Reglas de compatibilidad de prendas y corte |

---

## 🛍️ Flujo de Compra Real y Persistencia

1. **Validación:** El cliente completa sus datos en el checkout (nombre, teléfono, dirección, método de pago).
2. **Recomendación Inteligente:** El panel interactivo consulta sugerencias automáticas de tallas y estilo basadas en reglas de inferencia.
3. **Transacción en SQL Server:** Al confirmar la compra:
   - Se crea el registro en la tabla `dbo.pedidos`.
   - Se insertan las líneas en `dbo.pedido_detalle`.
   - Se descuenta automáticamente el stock en `dbo.producto_variantes` y `dbo.productos`.
4. **Confirmación:** La pantalla muestra el número de orden generado, los detalles de entrega y vacía automáticamente el carrito.
