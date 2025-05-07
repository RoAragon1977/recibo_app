import { ipcMain } from 'electron'

import db from './database' // Importamos la base de datos // Importamos la base de datos

// Crear nueva factura
ipcMain.handle('crear-recibo', async (event, factura) => {
  try {
    const stmt = db.prepare(`
      INSERT INTO facturas (proveedor, dni, domicilio, articulo, cantidad, precio_unitario, importe, subtotal, iva, total) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    const result = stmt.run(
      factura.proveedor,
      factura.dni,
      factura.domicilio,
      factura.articulo,
      factura.cantidad,
      factura.precio_unitario,
      factura.importe,
      factura.subtotal,
      factura.iva,
      factura.total
    )
    return { id: result.lastInsertRowid }
  } catch (error) {
    console.error('Error al guardar factura', error)
    throw error
  }
})

// Obtener todas las facturas
ipcMain.handle('obtener-facturas', async () => {
  try {
    return db.prepare('SELECT * FROM facturas').all()
  } catch (error) {
    console.error('Error al obtener facturas', error)
    throw error
  }
})

// Eliminar factura
ipcMain.handle('eliminar-factura', async (event, id) => {
  try {
    db.prepare('DELETE FROM facturas WHERE id = ?').run(id)
    return { success: true }
  } catch (error) {
    console.error('Error al eliminar factura', error)
    throw error
  }
})

// Actualizar factura
ipcMain.handle('actualizar-factura', async (event, factura) => {
  try {
    const stmt = db.prepare(`
      UPDATE facturas SET proveedor = ?, dni = ?, domicilio = ?, articulo = ?, cantidad = ?, 
      precio_unitario = ?, importe = ?, subtotal = ?, iva = ?, total = ? WHERE id = ?
    `)
    stmt.run(
      factura.proveedor,
      factura.dni,
      factura.domicilio,
      factura.articulo,
      factura.cantidad,
      factura.precio_unitario,
      factura.importe,
      factura.subtotal,
      factura.iva,
      factura.total,
      factura.id
    )
    return { success: true }
  } catch (error) {
    console.error('Error al actualizar factura', error)
    throw error
  }
})

// Exportamos un objeto vacío porque ipcMain ya está registrado
