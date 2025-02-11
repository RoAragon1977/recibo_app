import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import db from './database'

function createWindow() {
  // crea la ventana principal.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR para renderizador basado en la línea de comandos de electron-vite.
  // Carga la URL remota para desarrollo o el archivo HTML local para producción.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// Este método se llamará cuando Electron haya finalizado
// la inicialización y esté listo para crear ventanas del navegador.
// Algunas API solo se pueden usar después de que se produzca este evento.
app.whenReady().then(() => {
  // Establecer el ID del modelo de usuario de la aplicación para Windows
  electronApp.setAppUserModelId('com.electron')

  // Abre o cierra DevTools de forma predeterminada con F12 en desarrollo
  // e ignora CommandOrControl + R en producción.
  // Consulta https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  // Manejar el evento "crear-factura"
  ipcMain.handle('crear-factura', async (event, factura) => {
    try {
      const proveedorStmt = db.prepare(`
        INSERT INTO Proveedor (proveedor, dni, domicilio)
        VALUES (?, ?, ?)
        ON CONFLICT(dni) DO UPDATE SET
          proveedor = ?,
          domicilio = ?
      `)
      const proveedorInfo = proveedorStmt.run(
        factura.proveedor,
        factura.dni,
        factura.domicilio,
        factura.proveedor,
        factura.domicilio
      )

      const proveedorId =
        proveedorInfo.lastInsertRowid ||
        db.prepare('SELECT id FROM Proveedor WHERE dni = ?').get(factura.dni).id

      const compraStmt = db.prepare(`
        INSERT INTO Compra (proveedor_id, articulo, cantidad, precio_unitario, importe, iva, total)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
      const compraInfo = compraStmt.run(
        proveedorId,
        factura.articulo,
        factura.cantidad,
        factura.precio_unitario,
        factura.importe,
        factura.iva,
        factura.total
      )
      return { id: compraInfo.lastInsertRowid }
    } catch (error) {
      console.error('Error occurred in handler for "crear-factura":', error)
      throw error
    }
  })

  createWindow()

  app.on('activate', function () {
    // En macOS es común volver a crear una ventana en la aplicación cuando se hace clic en el
    // ícono del dock y no hay otras ventanas abiertas.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
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
