# AGENTS.md - recibo_app

This Electron + React app generates receipts (recibos) for paper/cardboard waste purchasing.
Below is the minimal guidance to avoid common pitfalls and ramp up quickly.

---

## Quick commands

| Command | Description |
|---------|-------------|
| `npm install` | Install dependencies |
| `npm run dev` | Start Electron in dev mode (electron-vite) |
| `npm run build` | Build the Electron app |
| `npm run build:win` | Build Windows installer |
| `npm run build:mac` | Build macOS app |
| `npm run build:linux` | Build Linux installer |
| `npm run lint` | Run ESLint |
| `npm run format` | Run Prettier |

---

## Database (better-sqlite3)

- **DB path**: `is.dev ? 'recibos.db' (cwd) : app.getPath('userData') + '/recibos.db'`
  - In development, the DB lives at `C:\Users\rodri\Desktop\recibo_app\recibos.db`
  - In production, it moves to the user's data directory
- **Tables**: `Proveedor`, `Compra`, `CompraDetalle`, `Articulo`
- **Precarga**: 7 artículos estándar se insertan automáticamente si la tabla Articulo está vacía: Cartón, Papel Blanco, Papel Color, Botella Blanca, Botella Verde, Film, Soplado
- **Date format**: All dates in the DB are stored as `DD/MM/AAAA`. Queries use `SUBSTR(fecha, 4, 2)` for month and `SUBSTR(fecha, 7, 4)` for year — **do not change this format**.
- **Import from Excel**: The `importarComprasMasivas` handler expects columns: `fecha`, `dni`, `nombre`, `apellido`, `domicilio`, `articulo`, `cantidad`, `precio_unitario`. It normalizes dates manually to avoid JS Date DD/MM ↔ MM/DD inversion.

---

## IPC handlers (main process)

Agents should not call these directly; they are wired from the React UI. Key handlers:

- `crear-recibo` — creates a receipt with items
- `obtener-proveedor` / `obtener-articulos` — list lookup
- `total-del-dia` — sum of `total_general` for a given date `DD/MM/AAAA`
- `obtener-informe-compras-mensuales` — takes `{ mes, anio }`, uses `SUBSTR(C.fecha, 4, 2)` and `SUBSTR(C.fecha, 7, 4)` for filtering
- `obtener-informe-contable` — same date-substr filtering
- `generar-pdf-informe-compras` — saves PDF via dialog
- `generar-archivos-iva-reciclados` — returns formatted text rows for IVA digital export
- `importar-excel` — triggers file picker + `importarComprasMasivas`
- `generar-archivo-bienes-usados` — placeholder handler

---

## PDF generation

- `formHelper.jsx` generates receipt PDFs using `jspdf` and `jspdf-autotable`
- Two copies (original + duplicado) are generated per receipt
- Saves as `recibo_${reciboId}.pdf` in the Downloads folder
- The `generarInformeContablePDF` function generates a monthly account report PDF (landscape)

---

## IVA Digital export (fixed-width text)

The `exportHelper.js` and `ExportarIvaReciclados.jsx` implement a very specific fixed-width format for the "Libro IVA Digital" regime. Key quirks:

- Dates in the DB are `DD/MM/YYYY` and are reversed to `YYYY/MM/DD` for range filtering
- Output consists of two `.txt` files: `LIBRO_IVA_DIGITAL_COMPRAS_CBTE.txt` and `LIBRO_IVA_DIGITAL_COMPRAS_ALICUOTAS.txt`
- Fields are padded to exact widths (e.g., Campo 4: Nro Cbte is 20 chars right-padded with zeros)
- `formatAmount` removes the decimal point and left-pads with zeros
- DNI/CUIT detection: 11 digits → code `80` (CUIT), otherwise code `96` (DNI)
- **Do not change the field order or widths** — they match a specific government format

---

## Form validation

- Uses `Yup` for schema validation
- Date regex: `/^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/` (DD/MM/AAAA)
- DNI regex: `/^(\d{7,8}|\d{11})$/` — auto-prepends `0` if length is 7
- Article IDs in the form are strings; the map from `obtenerArticulos` uses integer IDs

---

## Window management

- Secondary windows (nuevo-recibo, nuevo-proveedor, modificar-proveedor, informes) are created with `parent: mainWindow` and `modal: true`
- Each window tracks its own reference (`reciboWindow`, `provWindow`, etc.) and closes → sets to `null`
- On `activate` (macOS), if no windows are open, recreates the main window

---

## Auto-updater

- `autoUpdater.checkForUpdatesAndNotify()` runs on app startup
- Listens for `update-downloaded` and sends `update_downloaded` to the main window
- UI can listen for `restart_app` to install the update

---

## Conventions to preserve

- Date format: always `DD/MM/AAAA` in the database and UI
- Article list is pre-seeded from `src/main/database.js` — do not delete the precarga logic
- IPC channel names match those in `src/main/index.js` — renaming them breaks the UI
- IVA rate is hardcoded as 21% in `importarComprasMasivas` and `exportHelper.js`
- The `recibos.db` file at repo root is used in development only
