import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import fs from 'fs/promises'
import { autoUpdater } from 'electron-updater'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import {
  obtenerProveedor,
  obtenerArticulos,
  introProveedor,
  introRecibo,
  totalDelDia,
  ultimoIdCompra,
  obtenerInformeComprasMensuales
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
    fullscreen: true,
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

// Ventana para "Informe de Compras Mensuales"
let informeComprasWindow = null

function abrirVentanaInformeCompras() {
  if (informeComprasWindow) {
    informeComprasWindow.focus()
    return
  }

  informeComprasWindow = new BrowserWindow({
    fullscreen: true,
    parent: BrowserWindow.getAllWindows()[0], // Opcional: hacerlo hijo de la ventana principal
    modal: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    informeComprasWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}#informe-compras-ventana`)
  } else {
    informeComprasWindow.loadFile(join(__dirname, '../renderer/index.html'), {
      hash: 'informe-compras-ventana'
    })
  }

  informeComprasWindow.on('closed', () => {
    informeComprasWindow = null
  })
}

// Manejador para generar PDF del informe de compras
async function handleGenerarPdfInformeCompras(_event, { mes, anio }) {
  if (!informeComprasWindow) {
    return { success: false, message: 'La ventana del informe no está abierta.' }
  }

  try {
    const { filePath, canceled } = await dialog.showSaveDialog(informeComprasWindow, {
      title: 'Guardar Informe PDF',
      defaultPath: `informe_compras_${mes.toString().padStart(2, '0')}_${anio}.pdf`,
      filters: [{ name: 'Archivos PDF', extensions: ['pdf'] }]
    })

    if (canceled || !filePath) {
      return { success: false, message: 'Guardado cancelado por el usuario.' }
    }

    const pdfData = await informeComprasWindow.webContents.printToPDF({
      printBackground: true, // Importante para incluir estilos CSS (colores, fondos)
      pageSize: 'A4', // Puedes ajustar esto (Letter, A3, etc.)
      landscape: false // Cambia a true si prefieres orientación horizontal
    })

    await fs.writeFile(filePath, pdfData)
    return { success: true, path: filePath }
  } catch (error) {
    console.error('Error al generar o guardar el PDF:', error)
    return { success: false, message: `Error al generar PDF: ${error.message}` }
  }
}

// Manejo de eventos de IPC
app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // --- LÓGICA DE AUTO-ACTUALIZACIÓN ---
  // Esta línea es la más importante. Busca actualizaciones al iniciar la app
  // y si encuentra una, la descarga y notifica al usuario cuando está lista.
  autoUpdater.checkForUpdatesAndNotify()

  // Opcional: Escucha eventos para mostrar mensajes personalizados en tu UI de React.
  autoUpdater.on('update-available', () => {
    // Puedes enviar un mensaje a tu ventana principal si quieres mostrar algo.
    // Ejemplo: mainWindow.webContents.send('update_available');
    console.log('Actualización disponible y se está descargando.')
  })

  autoUpdater.on('update-downloaded', () => {
    // Cuando la actualización está lista, puedes notificar al usuario para que reinicie.
    const mainWindow = BrowserWindow.getAllWindows()[0]
    if (mainWindow) {
      mainWindow.webContents.send('update_downloaded')
    }
    console.log('Actualización descargada y lista para instalar.')
  })
  // --- FIN DE LA LÓGICA DE AUTO-ACTUALIZACIÓN ---

  ipcMain.on('ping', () => console.log('pong'))

  // Obtener el último ID de compra
  ipcMain.handle('obtener-ultimo-id', ultimoIdCompra)
  ipcMain.handle('crear-proveedor', introProveedor)
  ipcMain.handle('crear-recibo', introRecibo)
  ipcMain.handle('obtener-total-dia', totalDelDia)
  ipcMain.handle('obtener-informe-compras-mensuales', obtenerInformeComprasMensuales)
  ipcMain.handle('generar-pdf-informe-compras', handleGenerarPdfInformeCompras)

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
  ipcMain.on('abrir-ventana-informe-compras', abrirVentanaInformeCompras)

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
  ipcMain.on('cerrar-ventana-informe', () => {
    if (informeComprasWindow) {
      informeComprasWindow.close()
      // informeComprasWindow se establecerá a null por el evento 'closed' ya definido
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
