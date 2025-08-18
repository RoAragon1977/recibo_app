import { useState, useEffect } from 'react'
import './formModProv.css'

const FormModProv = () => {
  const [proveedores, setProveedores] = useState([])
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState(null)
  const [formData, setFormData] = useState({
    id: '',
    nombre: '',
    apellido: '',
    dni: '',
    domicilio: ''
  })
  const [mensaje, setMensaje] = useState('')

  // Cargar la lista de proveedores al iniciar el componente
  useEffect(() => {
    const fetchProveedores = async () => {
      try {
        const listaProveedores = await window.electron.ipcRenderer.invoke('obtener-proveedor')
        setProveedores(listaProveedores)
      } catch (error) {
        console.error('Error al obtener proveedores:', error)
        setMensaje('Error al cargar los proveedores.')
      }
    }
    fetchProveedores()
  }, [])

  // Cuando se selecciona un proveedor, rellenar el formulario
  const handleSelectProveedor = (e) => {
    const provId = e.target.value
    if (provId) {
      const prov = proveedores.find((p) => p.id === parseInt(provId))
      setProveedorSeleccionado(prov)
      setFormData({
        id: prov.id,
        nombre: prov.nombre,
        apellido: prov.apellido,
        dni: prov.dni,
        domicilio: prov.domicilio
      })
      setMensaje('')
    } else {
      setProveedorSeleccionado(null)
      setFormData({ id: '', nombre: '', apellido: '', dni: '', domicilio: '' })
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleGuardar = async (e) => {
    e.preventDefault()
    if (!proveedorSeleccionado) {
      setMensaje('Por favor, seleccione un proveedor.')
      return
    }
    try {
      await window.electron.ipcRenderer.invoke('actualizar-proveedor', formData)
      setMensaje('¡Proveedor actualizado con éxito!')
      setTimeout(() => {
        window.electron.ipcRenderer.send('cerrar-ventana-mod-proveedor')
      }, 1500)
    } catch (error) {
      console.error('Error al actualizar proveedor:', error)
      setMensaje('Error al guardar los cambios.')
    }
  }

  const handleCerrar = () => {
    window.electron.ipcRenderer.send('cerrar-ventana-mod-proveedor')
  }

  return (
    <div className="form-container">
      <h2>Modificar Proveedor</h2>
      <form onSubmit={handleGuardar}>
        <div className="form-group">
          <label>Seleccione un Proveedor:</label>
          <select onChange={handleSelectProveedor} defaultValue="">
            <option value="">-- Seleccionar --</option>
            {proveedores.map((prov) => (
              <option key={prov.id} value={prov.id}>
                {prov.apellido}, {prov.nombre} ({prov.dni})
              </option>
            ))}
          </select>
        </div>

        {proveedorSeleccionado && (
          <>
            <div className="form-group">
              <label>Nombre:</label>
              <input type="text" name="nombre" value={formData.nombre} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Apellido:</label>
              <input
                type="text"
                name="apellido"
                value={formData.apellido}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label>DNI:</label>
              <input type="text" name="dni" value={formData.dni} readOnly />
            </div>
            <div className="form-group">
              <label>Domicilio:</label>
              <input
                type="text"
                name="domicilio"
                value={formData.domicilio}
                onChange={handleChange}
              />
            </div>
            <div className="form-actions">
              <button type="submit" className="btn-submit">
                Guardar Cambios
              </button>
              <button type="button" onClick={handleCerrar} className="btn-cancel">
                Cerrar
              </button>
            </div>
          </>
        )}
      </form>
      {mensaje && <p className="mensaje-feedback">{mensaje}</p>}
    </div>
  )
}

export default FormModProv
