import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Whitelist de canales IPC. Cualquier canal fuera de estas listas es rechazado.
// Si agregás un handler nuevo en src/main/index.js, sumalo acá también.
const INVOKE_CHANNELS = [
  'obtener-ultimo-id',
  'crear-proveedor',
  'crear-recibo',
  'obtener-total-dia',
  'actualizar-proveedor',
  'obtener-proveedor',
  'obtener-articulos',
  'obtener-informe-compras-mensuales',
  'generar-pdf-informe-compras',
  'obtener-informe-contable',
  'generar-archivos-iva-reciclados',
  'obtener-detalle-compra',
  'generar-archivo-bienes-usados',
  'importar-excel'
]

const SEND_CHANNELS = [
  'ping',
  'abrir-nuevo-recibo',
  'abrir-nuevo-proveedor',
  'abrir-modificar-proveedor',
  'abrir-ventana-informe-compras',
  'abrir-ventana-informe-contable',
  'abrir-ventana-exportar-iva',
  'cerrar-ventana-recibo',
  'cerrar-ventana-proveedor',
  'cerrar-ventana-mod-proveedor',
  'cerrar-ventana-informe',
  'cerrar-ventana-informe-contable',
  'cerrar-ventana-exportar-iva',
  'cerrar-ventana-informe-bienes-usados',
  'cerrar-aplicacion',
  'restart_app'
]

const ON_CHANNELS = ['update_downloaded']

const checkCanal = (lista, channel) => {
  if (!lista.includes(channel)) {
    throw new Error(`Canal IPC no permitido: "${channel}"`)
  }
}

const secureIpcRenderer = {
  invoke: (channel, ...args) => {
    checkCanal(INVOKE_CHANNELS, channel)
    return ipcRenderer.invoke(channel, ...args)
  },
  send: (channel, ...args) => {
    checkCanal(SEND_CHANNELS, channel)
    ipcRenderer.send(channel, ...args)
  },
  on: (channel, listener) => {
    checkCanal(ON_CHANNELS, channel)
    const subscription = (_event, ...args) => listener(...args)
    ipcRenderer.on(channel, subscription)
    return () => ipcRenderer.removeListener(channel, subscription)
  }
}

// API segura para el renderer
const api = {
  ipcRenderer: secureIpcRenderer
}

// window.electron mantiene las utilidades de electronAPI,
// pero su ipcRenderer pasa por la misma whitelist
const secureElectronAPI = {
  ...electronAPI,
  ipcRenderer: secureIpcRenderer
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', secureElectronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  window.electron = secureElectronAPI
  window.api = api
}
