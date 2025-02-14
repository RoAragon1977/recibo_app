import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import db from './database'

ipcMain.handle('obtener-ultimo-id', async () => {
  try {
    const row = db.prepare('SELECT MAX(id) as lastId FROM Compra').get()
    return row.lastId ? row.lastId + 1 : 1
  } catch (error) {
    console.error('Error al obtener el último ID:', error)
    throw error
  }
})

function createWindow() {
  // crea la ventana principal.
  const mainWindow = new BrowserWindow({
    // width: 900,
    // height: 800,
    show: false,
    autoHideMenuBar: true,
    // ...(process.platform === 'linux' ? { icon } : {}),
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

  // HMR para renderizador basado en la línea de comandos de electron-vite.
  // Carga la URL remota para desarrollo o el archivo HTML local para producción.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

//Crea la ventana secundaria del formulario
let reciboWindow = null

function abrirNuevoRecibo() {
  if (reciboWindow) {
    reciboWindow.focus() // Si ya está abierta, la enfoca
    return
  }

  reciboWindow = new BrowserWindow({
    width: 900,
    height: 800,
    parent: BrowserWindow.getAllWindows()[0], // Hace que sea una ventana hija de la principal
    modal: true, // Evita que se pueda interactuar con la ventana principal mientras está abierta
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
      const insertProveedor = db.prepare(`
        INSERT INTO Proveedor (proveedor, dni, domicilio)
        VALUES (?, ?, ?)
        ON CONFLICT(dni) DO UPDATE SET
          proveedor = excluded.proveedor,
          domicilio = excluded.domicilio
      `)
      insertProveedor.run(factura.proveedor, factura.dni, factura.domicilio)

      // Obtener el ID del proveedor
      const proveedorId = db.prepare('SELECT id FROM Proveedor WHERE dni = ?').get(factura.dni).id

      const insertCompra = db.prepare(`
        INSERT INTO Compra (proveedor_id, articulo, cantidad, precio_unitario, importe, iva, total, fecha)
        VALUES (?, ?, ?, ?, ?, ?, ?,?)
      `)
      const result = insertCompra.run(
        proveedorId,
        factura.articulo,
        factura.cantidad,
        factura.precio_unitario,
        factura.importe,
        factura.iva,
        factura.total,
        factura.fecha
      )

      return { id: result.lastInsertRowid }
    } catch (error) {
      console.error('Error al insertar la factura:', error)
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
  ipcMain.on('cerrar-ventana-recibo', () => {
    if (reciboWindow) {
      reciboWindow.close()
      reciboWindow = null
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
