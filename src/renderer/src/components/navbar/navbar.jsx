import './navbar.css'

const Navbar = () => {
  const sendIpcMessage = (channel) => {
    window.api.ipcRenderer.send(channel)
  }

  return (
    <nav className="navbar">
      <div className="navbar-brand">Recibo App</div>
      <ul className="navbar-menu">
        <li className="navbar-item">
          <button className="navbar-button" onClick={() => sendIpcMessage('abrir-nuevo-recibo')}>
            Nuevo Recibo
          </button>
        </li>
        <li className="navbar-dropdown">
          <button className="navbar-button">Proveedores</button>
          <div className="navbar-dropdown-content">
            <button onClick={() => sendIpcMessage('abrir-nuevo-proveedor')}>Nuevo Proveedor</button>
            <button onClick={() => sendIpcMessage('abrir-modificar-proveedor')}>
              Modificar Proveedor
            </button>
          </div>
        </li>
        <li className="navbar-dropdown">
          <button className="navbar-button">Informes</button>
          <div className="navbar-dropdown-content">
            <button onClick={() => sendIpcMessage('abrir-ventana-informe-compras')}>
              Informe de Compras
            </button>
            <button onClick={() => sendIpcMessage('abrir-ventana-informe-contable')}>
              Informe Contable
            </button>
          </div>
        </li>
        <li className="navbar-item">
          <button className="navbar-button" onClick={() => sendIpcMessage('cerrar-aplicacion')}>
            Salir
          </button>
        </li>
      </ul>
    </nav>
  )
}

export default Navbar
