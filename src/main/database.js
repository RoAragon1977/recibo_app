import Database from 'better-sqlite3'

const db = new Database('recibos.db', { verbose: console.log })

// Crear tabla si no existe
db.exec(`
  CREATE TABLE IF NOT EXISTS facturas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    proveedor TEXT,
    dni TEXT,
    domicilio TEXT,
    articulo TEXT,
    cantidad INTEGER,
    precio_unitario REAL,
    importe REAL,
    subtotal REAL,
    iva REAL,
    total REAL
  )
`)

export default db
