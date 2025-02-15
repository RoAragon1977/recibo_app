import Database from 'better-sqlite3'

const db = new Database('recibos.db', { verbose: console.log })

// Crear tablas si no existen
db.exec(`
  CREATE TABLE IF NOT EXISTS Proveedor (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    proveedor TEXT,
    dni TEXT UNIQUE,
    domicilio TEXT
  );

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
  );
`)

// Función para obtener el último ID de compra
export const obtenerUltimoId = () => {
  const row = db.prepare('SELECT MAX(id) as lastId FROM Compra').get()
  return row.lastId ? row.lastId + 1 : 1
}

// Función para insertar o actualizar un proveedor
export const insertarProveedor = (proveedor, dni, domicilio) => {
  const insertProveedor = db.prepare(`
    INSERT INTO Proveedor (proveedor, dni, domicilio)
    VALUES (?, ?, ?)
    ON CONFLICT(dni) DO UPDATE SET
      proveedor = excluded.proveedor,
      domicilio = excluded.domicilio
  `)
  insertProveedor.run(proveedor, dni, domicilio)

  return db.prepare('SELECT id FROM Proveedor WHERE dni = ?').get(dni).id
}

// Función para insertar una compra
export const insertarCompra = (
  proveedorId,
  articulo,
  cantidad,
  precioUnitario,
  importe,
  iva,
  total,
  fecha
) => {
  const insertCompra = db.prepare(`
    INSERT INTO Compra (proveedor_id, articulo, cantidad, precio_unitario, importe, iva, total, fecha)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const result = insertCompra.run(
    proveedorId,
    articulo,
    cantidad,
    precioUnitario,
    importe,
    iva,
    total,
    fecha
  )
  return result.lastInsertRowid
}

export default db
