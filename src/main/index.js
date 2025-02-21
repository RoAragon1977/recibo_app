import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import {
  obtenerProveedor,
  obtenerArticulos,
  introProveedor,
  introRecibo,
  totalDelDia,
  ultimoIdCompra
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
  ipcMain.handle('obtener-ultimo-id', ultimoIdCompra)
  ipcMain.handle('crear-proveedor', introProveedor)
  ipcMain.handle('crear-recibo', introRecibo)
  ipcMain.handle('obtener-total-dia', totalDelDia)

  createWindow()

  app.on('activate', function () {
    // En macOS es común volver a crear una ventana en la aplicación cuando se hace clic en el
    // ícono del dock y no hay otras ventanas abiertas.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })

  ipcMain.handle('obtener-proveedor', obtenerProveedor)
  ipcMain.handle('obtener-articulos', obtenerArticulos)
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
