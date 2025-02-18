import Database from 'better-sqlite3'

const db = new Database('recibos.db', { verbose: console.log })

// Crear tablas si no existen
db.exec(`
  CREATE TABLE IF NOT EXISTS Proveedor (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT,
    apellido TEXT,
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
export const insertarProveedor = (nombre, apellido, dni, domicilio) => {
  const insertProveedor = db.prepare(`
    INSERT INTO Proveedor (nombre, apellido, dni, domicilio)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(dni) DO UPDATE SET
      nombre = excluded.nombre,
      apellido = excluded.apellido,
      domicilio = excluded.domicilio
  `)
  insertProveedor.run(nombre, apellido, dni, domicilio)

  return db.prepare('SELECT id FROM Proveedor WHERE dni = ?').get(dni).id
}

// Función para insertar una recibo
export const insertarRecibo = (
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

  const result = insertarRecibo.run(
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

export const obtenerProveedor = async () => {
  try {
    const proveedores = db
      .prepare('SELECT id, nombre, apellido FROM Proveedor ORDER BY apellido ASC')
      .all()
    return proveedores
  } catch (error) {
    console.error('Error al obtener los proveedores:', error)
    throw error
  }
}

export default db
