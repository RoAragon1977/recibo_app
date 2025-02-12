import React from 'react'
import './navbar.css'

const Navbar = ({ onNuevoRecibo }) => {
  const handleNuevoRecibo = () => {
    if (window.electron && window.electron.ipcRenderer) {
      window.electron.ipcRenderer.send('abrir-nuevo-recibo')
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
          <div className="navbar-dropdown">
            <button className="navbar-button">Edición</button>
            <div className="navbar-dropdown-content">
              <button>Editar Recibo</button>
              <button>Eliminar Recibo</button>
            </div>
          </div>
        </li>
        <li className="navbar-item">
          <button className="navbar-button">Consulta</button>
        </li>
      </ul>
    </nav>
  )
}

export default Navbar
