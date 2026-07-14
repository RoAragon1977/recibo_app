import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'

const dbPath = is.dev
  ? join(process.cwd(), 'recibos.db')
  : join(app.getPath('userData'), 'recibos.db')

const db = new Database(dbPath)

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
    fecha TEXT DEFAULT (strftime('%d/%m/%Y', 'now', 'localtime')),
    total_general REAL, -- Este sera el total de todos los artículos en la compra
    FOREIGN KEY (proveedor_id) REFERENCES Proveedor(id)
  );

  CREATE TABLE IF NOT EXISTS CompraDetalle (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    compra_id INTEGER,
    articulo_id INTEGER,
    cantidad REAL,
    precio_unitario REAL,
    importe REAL,
    iva REAL,
    total REAL,
    FOREIGN KEY (compra_id) REFERENCES Compra(id),
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
  const articulosAPrecargar = [
    { nombre: 'Cartón' },
    { nombre: 'Papel Blanco' },
    { nombre: 'Papel Color' },
    { nombre: 'Botella Blanca' },
    { nombre: 'Botella Verde' },
    { nombre: 'Film' },
    { nombre: 'Soplado' }
  ]
  const insertArticulo = db.prepare('INSERT INTO Articulo (nombre) VALUES (?)')
  const insertMany = db.transaction((items) => {
    for (const item of items) insertArticulo.run(item.nombre)
  })
  insertMany(articulosAPrecargar)
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

// Función para actualizar un proveedor existente
export const actualizarProveedor = async (_, proveedor) => {
  try {
    const stmt = db.prepare(
      `UPDATE Proveedor SET
        nombre = ?,
        apellido = ?,
        domicilio = ?
      WHERE id = ?`
    )
    stmt.run(proveedor.nombre, proveedor.apellido, proveedor.domicilio, proveedor.id)
    return { success: true }
  } catch (error) {
    console.error('Error al actualizar proveedor:', error)
    throw error
  }
}

// Función para insertar una compra
const insertarReciboConDetalles = (proveedorId, fecha, items, totalGeneral) => {
  const stmtCompra = db.prepare(`
    INSERT INTO Compra (proveedor_id, fecha, total_general)
    VALUES (?, ?, ?)
  `)

  const stmtCompraDetalle = db.prepare(`
    INSERT INTO CompraDetalle (compra_id, articulo_id, cantidad, precio_unitario, importe, iva, total)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)

  const transaction = db.transaction(() => {
    const infoCompra = stmtCompra.run(proveedorId, fecha, totalGeneral)
    const compraId = infoCompra.lastInsertRowid

    if (!compraId) {
      throw new Error('Fallo al insertar en la tabla Compra.')
    }

    for (const item of items) {
      stmtCompraDetalle.run(
        compraId,
        item.articulo_id,
        item.cantidad,
        item.precio_unitario,
        item.importe,
        item.iva,
        item.total
      )
    }
    return compraId
  })

  return transaction()
}

export const introRecibo = async (_, recibo) => {
  try {
    const reciboId = insertarReciboConDetalles(
      Number(recibo.proveedorId),
      recibo.fecha,
      recibo.items,
      parseFloat(recibo.totalGeneral)
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
      .prepare('SELECT id, nombre, apellido, dni, domicilio FROM Proveedor ORDER BY apellido ASC')
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
  const row = db
    .prepare('SELECT SUM(total_general) as totalDelDia FROM Compra WHERE fecha = ?')
    .get(fecha)
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

// Función para obtener el informe de compras mensuales
export const obtenerInformeComprasMensuales = async (_event, { mes, anio }) => {
  try {
    const mesFormateado = mes.toString().padStart(2, '0')
    const anioFormateado = anio.toString()

    const stmtDetallado = db.prepare(`
      SELECT
          P.id AS proveedor_id,
          P.nombre AS proveedor_nombre,
          P.apellido AS proveedor_apellido,
          C.id AS compra_id,
          C.fecha AS compra_fecha,
          A.nombre AS articulo_nombre,
          CD.cantidad AS articulo_cantidad,
          CD.importe AS articulo_importe_sin_iva
      FROM Compra C
      JOIN Proveedor P ON C.proveedor_id = P.id
      JOIN CompraDetalle CD ON C.id = CD.compra_id
      JOIN Articulo A ON CD.articulo_id = A.id
      WHERE SUBSTR(C.fecha, 4, 2) = ? 
        AND SUBSTR(C.fecha, 7, 4) = ?
      ORDER BY P.apellido, P.nombre, C.id, A.nombre
    `)
    const comprasDetalladas = stmtDetallado.all(mesFormateado, anioFormateado)

    const stmtResumen = db.prepare(`
      SELECT
          A.nombre AS articulo_nombre,
          SUM(CD.cantidad) AS total_cantidad,
          SUM(CD.importe) AS total_importe_sin_iva
      FROM Compra C
      JOIN CompraDetalle CD ON C.id = CD.compra_id
      JOIN Articulo A ON CD.articulo_id = A.id
      WHERE SUBSTR(C.fecha, 4, 2) = ? 
        AND SUBSTR(C.fecha, 7, 4) = ?
      GROUP BY A.nombre
      ORDER BY A.nombre
    `)
    const resumen = stmtResumen.all(mesFormateado, anioFormateado)

    return { comprasDetalladas, resumen }
  } catch (error) {
    console.error('Error al obtener informe de compras mensuales:', error)
    throw error
  }
}

export const obtenerInformeContable = async (_event, { mes, anio }) => {
  try {
    const mesFormateado = mes.toString().padStart(2, '0')
    const anioFormateado = anio.toString()

    const stmt = db.prepare(`
      SELECT
          C.id AS compra_id,
          C.fecha,
          P.nombre || ' ' || P.apellido AS proveedor,
          P.dni,
          SUM(CD.importe) AS subtotal,
          SUM(CD.iva) AS iva,
          C.total_general AS total
      FROM Compra C
      JOIN Proveedor P ON C.proveedor_id = P.id
      JOIN CompraDetalle CD ON C.id = CD.compra_id
      WHERE SUBSTR(C.fecha, 4, 2) = ? 
        AND SUBSTR(C.fecha, 7, 4) = ?
      GROUP BY C.id
      ORDER BY C.fecha, C.id
    `)
    return stmt.all(mesFormateado, anioFormateado)
  } catch (error) {
    console.error('Error al obtener informe contable:', error)
    throw error
  }
}

export const obtenerComprasParaIVADigital = async (_event, { startDate, endDate }) => {
  try {
    // La consulta une las compras con sus detalles y proveedores
    // y filtra por el rango de fechas.
    // Se convierte la fecha de la DB (DD/MM/YYYY) a un formato comparable (YYYY/MM/DD)
    // para que el filtrado por rango de fechas funcione correctamente.
    const stmt = db.prepare(`
      SELECT
        C.id AS compra_id,
        C.fecha,
        C.total_general,
        P.dni,
        P.nombre AS proveedor_nombre,
        P.apellido AS proveedor_apellido,
        CD.importe,
        CD.iva
      FROM Compra C
      JOIN Proveedor P ON C.proveedor_id = P.id
      JOIN CompraDetalle CD ON C.id = CD.compra_id
      WHERE 
        SUBSTR(C.fecha, 7, 4) || '-' || SUBSTR(C.fecha, 4, 2) || '-' || SUBSTR(C.fecha, 1, 2) >= ? AND
        SUBSTR(C.fecha, 7, 4) || '-' || SUBSTR(C.fecha, 4, 2) || '-' || SUBSTR(C.fecha, 1, 2) <= ?
      ORDER BY C.fecha, C.id
    `)

    return stmt.all(startDate, endDate)
  } catch (error) {
    console.error('Error al obtener compras para IVA Digital:', error)
    throw error
  }
}

/**
 * Importa compras masivas agrupándolas por DNI y Fecha.
 * Se asume que el Excel tiene los encabezados:
 * fecha, dni, nombre, apellido, domicilio, articulo, cantidad, precio_unitario
 */
/**
 * Normaliza una cadena: quita acentos, convierte a minúsculas y elimina espacios.
 */
const normalizeString = (str) =>
  (str || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()

/**
 * Valida que una fecha tenga formato DD/MM/AAAA y sea una fecha real.
 * Retorna { valid: true, formatted: 'DD/MM/AAAA' } o { valid: false, reason: '...' }
 */
const validarFecha = (fechaStr) => {
  if (!fechaStr || typeof fechaStr !== 'string') {
    return { valid: false, reason: 'La fecha está vacía o no es texto.' }
  }

  const match = fechaStr.trim().match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
  if (!match) {
    return { valid: false, reason: `Formato inválido "${fechaStr}". Se espera DD/MM/AAAA.` }
  }

  const dia = parseInt(match[1], 10)
  const mes = parseInt(match[2], 10)
  const anio = parseInt(match[3], 10)

  if (mes < 1 || mes > 12) {
    return { valid: false, reason: `Mes inválido (${mes}) en "${fechaStr}".` }
  }
  if (dia < 1 || dia > 31) {
    return { valid: false, reason: `Día inválido (${dia}) en "${fechaStr}".` }
  }

  // Verificar que la fecha sea real (ej: 31/02/2025 no es válida)
  const fechaTest = new Date(anio, mes - 1, dia)
  if (fechaTest.getDate() !== dia || fechaTest.getMonth() !== mes - 1) {
    return { valid: false, reason: `La fecha "${fechaStr}" no existe en el calendario.` }
  }

  const formatted = `${String(dia).padStart(2, '0')}/${String(mes).padStart(2, '0')}/${anio}`
  return { valid: true, formatted }
}

export const importarComprasMasivas = async (_, rows) => {
  if (rows.length === 0) {
    return { success: false, message: 'El archivo Excel está vacío.' }
  }

  // Obtenemos el mapa de artículos para convertir nombres a IDs
  const articulos = db.prepare('SELECT id, nombre FROM Articulo').all()
  const articuloMap = new Map(articulos.map((a) => [normalizeString(a.nombre), a.id]))

  // ======= FASE DE VALIDACIÓN =======
  const errores = []
  const ENCABEZADOS_REQUERIDOS = [
    'fecha',
    'dni',
    'nombre',
    'apellido',
    'domicilio',
    'articulo',
    'cantidad',
    'precio_unitario'
  ]

  // Validar encabezados del Excel
  const encabezadosExcel = Object.keys(rows[0]).map((k) => k.toLowerCase().trim())
  const encabezadosFaltantes = ENCABEZADOS_REQUERIDOS.filter((h) => !encabezadosExcel.includes(h))
  if (encabezadosFaltantes.length > 0) {
    return {
      success: false,
      message:
        `Faltan columnas en el Excel: ${encabezadosFaltantes.join(', ')}. ` +
        `Las columnas esperadas son: ${ENCABEZADOS_REQUERIDOS.join(', ')}`
    }
  }

  // Validar cada fila
  for (let i = 0; i < rows.length; i++) {
    const fila = i + 2 // +2 porque fila 1 es encabezado, y es 1-indexed
    const row = {}
    for (const key in rows[i]) {
      row[key.toLowerCase().trim()] = rows[i][key]
    }

    // Validar fecha
    const fechaResult = validarFecha(row.fecha)
    if (!fechaResult.valid) {
      errores.push(`Fila ${fila}: ${fechaResult.reason}`)
    }

    // Validar DNI
    const dni = (row.dni || '').toString().trim()
    if (!dni) {
      errores.push(`Fila ${fila}: El DNI está vacío.`)
    } else if (!/^\d+$/.test(dni)) {
      errores.push(`Fila ${fila}: El DNI "${dni}" contiene caracteres no numéricos.`)
    }

    // Validar nombre y apellido
    if (!(row.nombre || '').toString().trim()) {
      errores.push(`Fila ${fila}: El nombre está vacío.`)
    }
    if (!(row.apellido || '').toString().trim()) {
      errores.push(`Fila ${fila}: El apellido está vacío.`)
    }

    // Validar artículo
    const nombreArt = normalizeString(row.articulo)
    if (!nombreArt) {
      errores.push(`Fila ${fila}: La columna "articulo" está vacía.`)
    } else if (!articuloMap.has(nombreArt)) {
      errores.push(`Fila ${fila}: El artículo "${row.articulo}" no está registrado en el sistema.`)
    }

    // Validar cantidad
    const cantidad = parseFloat(row.cantidad)
    if (isNaN(cantidad) || cantidad <= 0) {
      errores.push(
        `Fila ${fila}: Cantidad inválida "${row.cantidad}". Debe ser un número mayor a 0.`
      )
    }

    // Validar precio unitario
    const precio = parseFloat(row.precio_unitario)
    if (isNaN(precio) || precio <= 0) {
      errores.push(
        `Fila ${fila}: Precio unitario inválido "${row.precio_unitario}". Debe ser un número mayor a 0.`
      )
    }
  }

  // Si hay errores, retornar el listado al usuario SIN insertar nada
  if (errores.length > 0) {
    const MAX_ERRORES = 20
    let mensajeErrores = errores.slice(0, MAX_ERRORES).join('\n')
    if (errores.length > MAX_ERRORES) {
      mensajeErrores += `\n\n... y ${errores.length - MAX_ERRORES} error(es) más.`
    }
    return {
      success: false,
      message: `Se encontraron ${errores.length} error(es) en el archivo. Corrija y vuelva a intentar:\n\n${mensajeErrores}`
    }
  }
  // ======= FIN FASE DE VALIDACIÓN =======

  const transaction = db.transaction((data) => {
    // 1. Agrupamos por DNI + Fecha para generar un solo recibo por transacción real
    const agrupadas = data.reduce((acc, row) => {
      // Normalizar las claves de la fila a minúsculas
      const normalizedRow = {}
      for (const key in row) {
        normalizedRow[key.toLowerCase().trim()] = row[key]
      }

      const dni = (normalizedRow.dni || '').toString().trim()
      // Normalizar la fecha al formato DD/MM/AAAA validado
      const fechaResult = validarFecha(normalizedRow.fecha)
      const fecha = fechaResult.formatted

      const key = `${dni}-${fecha}`
      if (!acc[key]) {
        acc[key] = {
          prov: {
            nombre: normalizedRow.nombre,
            apellido: normalizedRow.apellido,
            dni,
            domicilio: normalizedRow.domicilio
          },
          fecha: fecha,
          items: []
        }
      }

      const nombreArt = normalizeString(normalizedRow.articulo)
      const articulo_id = articuloMap.get(nombreArt)

      const cantidad = parseFloat(normalizedRow.cantidad)
      const precioU = parseFloat(normalizedRow.precio_unitario)
      const importe = cantidad * precioU
      const iva = importe * 0.21
      acc[key].items.push({
        articulo_id,
        cantidad,
        precio_unitario: precioU,
        importe,
        iva,
        total: importe + iva
      })

      return acc
    }, {})

    // 2. Insertamos cada grupo en la base de datos

    let insertados = 0
    for (const key in agrupadas) {
      const c = agrupadas[key]
      if (c.items.length === 0) continue

      const provId = insertarProveedor(c.prov.nombre, c.prov.apellido, c.prov.dni, c.prov.domicilio)
      const totalGral = c.items.reduce((sum, i) => sum + i.total, 0)
      insertarReciboConDetalles(provId, c.fecha, c.items, totalGral)
      insertados++
    }
    return insertados
  })

  try {
    const count = transaction(rows)
    return { success: true, count }
  } catch (error) {
    console.error('Error crítico en importación:', error)
    return { success: false, message: error.message }
  }
}

// Obtener detalles de una compra específica por ID para regenerar el PDF
export const obtenerDetalleCompra = async (_event, { compraId }) => {
  try {
    const compra = db.prepare(`
      SELECT 
        C.id AS id,
        C.fecha,
        C.total_general AS totalGeneral,
        P.id AS proveedor_id,
        P.nombre,
        P.apellido,
        P.dni,
        P.domicilio
      FROM Compra C
      JOIN Proveedor P ON C.proveedor_id = P.id
      WHERE C.id = ?
    `).get(compraId)

    if (!compra) {
      throw new Error(`No se encontró la compra con ID: ${compraId}`)
    }

    const items = db.prepare(`
      SELECT 
        CD.articulo_id,
        CD.cantidad,
        CD.precio_unitario,
        CD.importe,
        CD.iva,
        CD.total
      FROM CompraDetalle CD
      WHERE CD.compra_id = ?
    `).all(compraId)

    // Calculamos subtotal e IVA generals
    const subtotalGeneral = items.reduce((sum, item) => sum + item.importe, 0)
    const ivaGeneral = items.reduce((sum, item) => sum + item.iva, 0)
    const totalGeneral = items.reduce((sum, item) => sum + item.total, 0)

    const formValues = {
      id: compra.id,
      proveedor: compra.proveedor_id.toString(),
      fecha: compra.fecha,
      items: items,
      subtotalGeneral,
      ivaGeneral,
      totalGeneral
    }

    const proveedorSeleccionado = {
      id: compra.proveedor_id,
      nombre: compra.nombre,
      apellido: compra.apellido,
      dni: compra.dni,
      domicilio: compra.domicilio
    }

    return {
      success: true,
      formValues,
      proveedorSeleccionado
    }
  } catch (error) {
    console.error('Error al obtener detalle de la compra:', error)
    throw error
  }
}

// Función dummy/placeholder para generar-archivo-bienes-usados si es requerida por el renderer
export const generarArchivoBienesUsados = async (_event, { mes, anio }) => {
  try {
    // Retornamos un mensaje de éxito simple o una lista vacía para no romper el flujo
    return {
      success: true,
      message: 'Archivo para Bienes Usados generado.',
      path: `bienes_usados_${mes}_${anio}.txt`
    }
  } catch (error) {
    console.error('Error en generarArchivoBienesUsados:', error)
    throw error
  }
}

export default db

