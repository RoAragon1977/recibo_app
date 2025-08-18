import './navbar.css'

const Navbar = () => {
  const handleNuevoRecibo = () => {
    if (window.electron && window.electron.ipcRenderer) {
      window.electron.ipcRenderer.send('abrir-nuevo-recibo')
    }
  }

  const handleNuevoProv = () => {
    if (window.electron && window.electron.ipcRenderer) {
      window.electron.ipcRenderer.send('abrir-nuevo-proveedor')
    }
  }

  const handleModificarProveedor = () => {
    if (window.electron && window.electron.ipcRenderer) {
      window.electron.ipcRenderer.send('abrir-modificar-proveedor')
    }
  }

  const salirApp = () => {
    if (window.electron && window.electron.ipcRenderer) {
      window.electron.ipcRenderer.send('cerrar-aplicacion')
    }
  }

  const handleConsultaCompras = () => {
    if (window.electron && window.electron.ipcRenderer) {
      window.electron.ipcRenderer.send('abrir-ventana-informe-compras')
    }
  }

  return (
    <nav className="navbar">
      <div className="navbar-brand">Recibo App</div>
      <ul className="navbar-menu">
        <li className="navbar-item">
          <button className="navbar-button" onClick={handleNuevoRecibo}>
            Nuevo Recibo
          </button>
        </li>
        <li className="navbar-item">
          <button className="navbar-button" onClick={handleNuevoProv}>
            Proveedor
          </button>
        </li>
        <li className="navbar-item">
          <button className="navbar-button" onClick={handleModificarProveedor}>
            Modificar Proveedor
          </button>
        </li>
        <li className="navbar-item">
          <button className="navbar-button" onClick={handleConsultaCompras}>
            Consultas
          </button>
        </li>
        <li className="navbar-item">
          <button className="navbar-button" onClick={salirApp}>
            Salir
          </button>
        </li>
      </ul>
    </nav>
  )
}

export default Navbar
