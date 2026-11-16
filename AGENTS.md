# AGENTS.md - recibo_app

Esta es una app Electron + React que genera recibos para la compra de desperdicio de papel y cartón.

## Comandos rápidos

| Comando | Descripción |
|---------|-------------|
| `npm install` | Instalar dependencias |
| `npm run dev` | Iniciar en modo desarrollo (electron-vite) |
| `npm run build` | Compilar la app |
| `npm run build:win` | Compilar para Windows |
| `npm run build:mac` | Compilar para macOS |
| `npm run build:linux` | Compilar para Linux |
| `npm run lint` | Ejecutar ESLint |
| `npm run format` | Ejecutar Prettier |

## Base de datos (better-sqlite3)

- **Ruta DB**: `is.dev ? recibos.db (cwd) : app.getPath(userData) + /recibos.db`
  - En desarrollo: la DB está en `C:\Users\rodri\Desktop\recibo_app\recibos.db`
  - En producción: está en la carpeta de datos del usuario
- **Tablas**: `Proveedor`, `Compra`, `CompraDetalle`, `Articulo`
- **Precarga**: 7 artículos estándar se crean automáticamente: Cartón, Papel Blanco, Papel Color, Botella Blanca, Botella Verde, Film, Soplado
- **Formato de fecha**: Las fechas en la BD se guardan como `DD/MM/AAAA`. Las consultas usan `SUBSTR(fecha, 4, 2)` para el mes y `SUBSTR(fecha, 7, 4)` para el año — **no cambies este formato**.
- **Importar Excel**: La función `importarComprasMasivas` espera las columnas: `fecha`, `dni`, `nombre`, `apellido`, `domicilio`, `articulo`, `cantidad`, `precio_unitario`. Normaliza las fechas manualmente para evitar el problema de conversión DD/MM ↔ MM/DD de JavaScript Date.

## IPC handlers (proceso principal)

**Whitelist obligatoria**: `src/preload/index.js` restringe los canales IPC (`INVOKE_CHANNELS`, `SEND_CHANNELS`, `ON_CHANNELS`). Si agregás un handler en `src/main/index.js`, **debés sumarlo a la whitelist** o el renderer lo rechazará. Tanto `window.api` como `window.electron` pasan por la whitelist.

**Validación y normalización en backend**: `database.js` valida todos los inputs (DNI, fechas DD/MM/AAAA, mes 1-12, IDs numéricos). `introRecibo` recalcula importe/IVA/total — no confía en los montos del renderer. El DNI se normaliza solo en inserts nuevos (7 dígitos → pad a 8; CUIT de 11 intacto). `nombre`/`apellido`/`domicilio` se guardan SIEMPRE normalizados: mayúsculas, sin acentos, solo letras/números/espacios (función `normalizarTexto`, aplica a alta, edición e importación Excel).

Handlers:

- `crear-recibo` — crea un recibo con items
- `obtener-proveedor` / `obtener-articulos` — búsqueda de listados
- `total-del-dia` — suma de `total_general` para una fecha `DD/MM/AAAA`
- `obtener-informe-compras-mensuales` — recibe `{ mes, anio }`, usa `SUBSTR(C.fecha, 4, 2)` y `SUBSTR(C.fecha, 7, 4)` para filtrar
- `obtener-informe-contable` — mismo filtrado por substr de fecha
- `generar-pdf-informe-compras` — guarda PDF mediante diálogo
- `generar-archivos-iva-reciclados` — devuelve filas formateadas para exportación IVA digital
- `importar-excel` — activa el selector de archivos + `importarComprasMasivas`
- `generar-archivo-bienes-usados` — manejador placeholder

## Generación de PDF

- `formHelper.jsx` genera PDFs de recibos con `jspdf` y `jspdf-autotable`
- Se generan dos copias (original + duplicado) por recibo
- Se guarda como `recibo_.pdf` en la carpeta de Descargas
- La función `generarInformeContablePDF` genera un PDF mensual en formato horizontal

## Exportación IVA Digital (formato fijo)

Los archivos `exportHelper.js` y `ExportarIvaReciclados.jsx` implementan un formato de ancho fijo para el régimen de IVA Digital:

- Las fechas se almacenan como `DD/MM/YYYY` y se invierten a `YYYY/MM/DD` para el filtrado por rango
- Se generan dos archivos: `LIBRO_IVA_DIGITAL_COMPRAS_CBTE.txt` y `LIBRO_IVA_DIGITAL_COMPRAS_ALICUOTAS.txt`
- Los campos tienen ancho exacto (ej: Campo 4: Nro Cbte es de 20 caracteres con ceros a la izquierda)
- `formatAmount` elimina el punto decimal y rellena con ceros a la izquierda
- Detección DNI/CUIT: 11 dígitos → código `80` (CUIT), si no → código `96` (DNI)
- **No cambies el orden ni los anchos de los campos** — deben coincidir con el formato del gobierno

## Validación de formularios

- Se usa `Yup` para validación
- Regex de fecha: `/^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/` (DD/MM/AAAA)
- Regex de DNI: `/^(\d{7,8}|\d{11})$/` — agrega un `0` al principio si la longitud es 7
- Nombre/Apellido/Domicilio aceptan solo letras y números (Yup permite acentos; el backend los normaliza a mayúsculas sin acentos)
- IDs de artículos son strings; el mapeo de `obtenerArticulos` usa IDs enteros
- **Selector de proveedores**: usar el componente `src/renderer/src/components/SearchableSelect.jsx` (búsqueda con filtro dinámico). No volver a `<select>` nativo para proveedores.

## Gestión de ventanas

- Las ventanas secundarias (nuevo-recibo, nuevo-proveedor, modificar-proveedor, informes) se crean con `parent: mainWindow` y `modal: true`
- `sandbox: false` es requerido porque el preload usa ESM; la seguridad la da la whitelist del preload. No activar sandbox sin migrar el preload a CJS.
- Cada ventana mantiene su propia referencia (`reciboWindow`, `provWindow`, etc.) y al cerrarla se establece a `null`
- En macOS, si no hay ventanas abiertas, recrea la ventana principal al activar

## Auto-updater

- `autoUpdater.checkForUpdatesAndNotify()` se ejecuta al iniciar la app
- Escucha el evento `update-downloaded` y envía `update_downloaded` a la ventana principal
- La UI puede escuchar `restart_app` para instalar la actualización

## Convenciones a preservar

- El formato de fecha debe ser siempre `DD/MM/AAAA` en la BD y la UI
- La lista de artículos viene de la precarga en `src/main/database.js` — no elimines la lógica de precarga
- Los canales IPC requieren whitelist en `src/preload/index.js` (ver sección IPC)
- El IVA está hardcodeado como 21% en `importarComprasMasivas` y `introRecibo` (el backend recalcula)
- El archivo `recibos.db` en el repo root se usa solo en desarrollo
- Siempre rsponde en Español