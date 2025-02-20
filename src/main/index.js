import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import {
  obtenerUltimoId,
  insertarProveedor,
  insertarRecibo,
  obtenerProveedor,
  obtenerTotalesDiarios
} from './database'

function createWindow() {
  // crea la ventana principal.
  const mainWindow = new BrowserWindow({
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.maximize()
  mainWindow.show()

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// Ventana secundaria para "Nuevo Recibo"
let reciboWindow = null

function abrirNuevoRecibo() {
  if (reciboWindow) {
    reciboWindow.focus()
    return
  }

  reciboWindow = new BrowserWindow({
    width: 900,
    height: 800,
    parent: BrowserWindow.getAllWindows()[0],
    modal: true,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    reciboWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}#nuevo-recibo`)
  } else {
    reciboWindow.loadFile(join(__dirname, '../renderer/index.html'), {
      hash: 'nuevo-recibo'
    })
  }

  reciboWindow.on('closed', () => {
    reciboWindow = null
  })
}

// Ventana secundaria para "Nuevo Proveedor"
let provWindow = null

function abrirNuevoProv() {
  if (provWindow) {
    provWindow.focus()
    return
  }

  provWindow = new BrowserWindow({
    width: 900,
    height: 800,
    parent: BrowserWindow.getAllWindows()[0],
    modal: true,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    provWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}#nuevo-proveedor`)
  } else {
    provWindow.loadFile(join(__dirname, '../renderer/index.html'), {
      hash: 'nuevo-proveedor'
    })
  }

  provWindow.on('closed', () => {
    provWindow = null
  })
}

// Manejo de eventos de IPC
app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  ipcMain.on('ping', () => console.log('pong'))

  // Obtener el último ID de compra
  ipcMain.handle('obtener-ultimo-id', async () => {
    try {
      return obtenerUltimoId()
    } catch (error) {
      console.error('Error al obtener el último ID:', error)
      throw error
    }
  })

  // Insertar un nuevo proveedor
  ipcMain.handle('crear-proveedor', async (event, proveedor) => {
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
  })

  // Crear un nuevo recibo
  ipcMain.handle('crear-recibo', async (event, recibo) => {
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
  })

  // Obtener el total del día
  ipcMain.handle('obtener-total-dia', async (_, fecha) => {
    try {
      return obtenerTotalesDiarios(fecha)
    } catch (error) {
      console.error('Error al obtener el total del día:', error)
      throw error
    }
  })

  createWindow()

  app.on('activate', function () {
    // En macOS es común volver a crear una ventana en la aplicación cuando se hace clic en el
    // ícono del dock y no hay otras ventanas abiertas.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })

  ipcMain.on('abrir-nuevo-recibo', abrirNuevoRecibo)
  ipcMain.on('abrir-nuevo-proveedor', abrirNuevoProv)
  ipcMain.on('cerrar-ventana-recibo', () => {
    if (reciboWindow) {
      reciboWindow.close()
      reciboWindow = null
    }
  })
  ipcMain.on('cerrar-ventana-proveedor', () => {
    if (provWindow) {
      provWindow.close()
      provWindow = null
    }
  })
  ipcMain.on('cerrar-aplicacion', () => {
    app.quit()
  })
  ipcMain.handle('obtener-proveedor', obtenerProveedor)
})

// Salir cuando se cierran todas las ventanas, excepto en macOS. Allí, es común
// que las aplicaciones y su barra de menú permanezcan activas hasta que el usuario las cierre
// explícitamente con Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
// En este archivo puedes incluir el resto del código del proceso principal específico de tu aplicación.
// También puedes colocarlos en archivos separados y solicitarlos aquí.
