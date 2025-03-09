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
    articulo_id INTEGER,
    cantidad INTEGER,
    precio_unitario REAL,
    importe REAL,
    iva REAL,
    total REAL,
    fecha TEXT DEFAULT (strftime('%d/%m/%Y', 'now', 'localtime')),
    FOREIGN KEY (proveedor_id) REFERENCES Proveedor(id),
    FOREIGN KEY (articulo_id) REFERENCES Articulo(id)
  );

  CREATE TABLE IF NOT EXISTS Articulo (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT UNIQUE
  );
`)

// Precarga de artículos
// Verificar si la tabla tiene datos antes de insertar
const verificarArticulos = db.prepare('SELECT COUNT(*) as count FROM Articulo').get()

if (verificarArticulos.count === 0) {
  const insertArticulo = db.prepare('INSERT INTO Articulo (nombre) VALUES (?)')
  const insertMany = db.transaction((articulos) => {
    for (const articulo of articulos) insertArticulo.run(articulo)
  })
  insertMany(articulos)
}

// Función para obtener el último ID de compra
const obtenerUltimoId = () => {
  const row = db.prepare('SELECT MAX(id) as lastId FROM Compra').get()
  return row.lastId ? row.lastId + 1 : 1
}

export const ultimoIdCompra = async () => {
  try {
    return obtenerUltimoId()
  } catch (error) {
    console.error('Error al obtener el último ID:', error)
    throw error
  }
}

// Función para insertar o actualizar un proveedor
const insertarProveedor = (nombre, apellido, dni, domicilio) => {
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

export const introProveedor = async (_, proveedor) => {
  try {
    const proveedorId = insertarProveedor(
      proveedor.nombre,
      proveedor.apellido,
      proveedor.dni,
      proveedor.domicilio
    )
    return { id: proveedorId }
  } catch (error) {
    console.error('Error al crear proveedor:', error)
    throw error
  }
}

// Función para insertar una compra
const insertarRecibo = (
  proveedorId,
  articuloId,
  cantidad,
  precioUnitario,
  importe,
  iva,
  total,
  fecha
) => {
  const insertarRecibo = db.prepare(`
    INSERT INTO Compra (proveedor_id, articulo_id, cantidad, precio_unitario, importe, iva, total, fecha)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const result = insertarRecibo.run(
    proveedorId,
    articuloId,
    cantidad,
    precioUnitario,
    importe,
    iva,
    total,
    fecha
  )
  return result.lastInsertRowid
}

export const introRecibo = async (_, recibo) => {
  try {
    const reciboId = insertarRecibo(
      recibo.proveedorId,
      recibo.articulo,
      recibo.cantidad,
      recibo.precio_unitario,
      recibo.importe,
      recibo.iva,
      recibo.total,
      recibo.fecha
    )
    return { id: reciboId }
  } catch (error) {
    console.error('Error al crear recibo', error)
    throw error
  }
}

// Función para obtener la lista de proveedores
export const obtenerProveedor = async () => {
  try {
    const proveedores = db
      .prepare('SELECT id, nombre, apellido, dni FROM Proveedor ORDER BY apellido ASC')
      .all()
    return proveedores
  } catch (error) {
    console.error('Error al obtener los proveedores:', error)
    throw error
  }
}

// Función para obtener los Artículos
export const obtenerArticulos = async () => {
  try {
    const articulos = db.prepare('SELECT id, nombre FROM Articulo ORDER BY nombre ASC').all()
    return articulos
  } catch (error) {
    console.error('Error al obtener los Artículos:', error)
    throw error
  }
}

// Función para obtener la suma de los totales diarios
const obtenerTotalesDiarios = (fecha) => {
  const row = db.prepare('SELECT SUM(total) as totalDelDia FROM Compra WHERE fecha = ?').get(fecha)
  return row ? row.totalDelDia : 0
}

export const totalDelDia = async (_, fecha) => {
  try {
    return obtenerTotalesDiarios(fecha)
  } catch (error) {
    console.error('Error al obtener el total del día:', error)
    throw error
  }
}

export default db
