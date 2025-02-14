import Database from 'better-sqlite3'

const db = new Database('recibos.db', { verbose: console.log })

// Crear tabla Proveedor
db.exec(`
  CREATE TABLE IF NOT EXISTS Proveedor (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    proveedor TEXT,
    dni TEXT UNIQUE,
    domicilio TEXT
  )
`)

// Crear tabla Compra
db.exec(`
  CREATE TABLE IF NOT EXISTS Compra (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    proveedor_id INTEGER,
    articulo TEXT,
    cantidad INTEGER,
    precio_unitario REAL,
    importe REAL,
    iva REAL,
    total REAL,
    fecha TEXT DEFAULT (strftime('%d/%m/%Y', 'now', 'localtime')),
    FOREIGN KEY (proveedor_id) REFERENCES Proveedor(id)
  )
`)

export default db
