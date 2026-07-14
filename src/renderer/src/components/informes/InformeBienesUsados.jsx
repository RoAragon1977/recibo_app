import { useState, useEffect } from 'react'
import { ToastContainer, toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { generarReciboPDF } from '../../helpers/formHelper'
import './Contable.css' // Reutilizamos Contable.css que tiene los estilos de tablas e informes

const { ipcRenderer } = window.api

const InformeBienesUsados = () => {
  const [mes, setMes] = useState(new Date().getMonth() + 1)
  const [anio, setAnio] = useState(new Date().getFullYear())
  const [isGenerating, setIsGenerating] = useState(false)
  const [datosInforme, setDatosInforme] = useState([])
  const [articulosList, setArticulosList] = useState([])

  // Cargar lista de artículos necesarios para generar el PDF
  useEffect(() => {
    const fetchArticulos = async () => {
      try {
        const list = await ipcRenderer.invoke('obtener-articulos')
        setArticulosList(list || [])
      } catch (error) {
        console.error('Error al obtener los artículos:', error)
      }
    }
    fetchArticulos()
  }, [])

  const handleBuscarCompras = async () => {
    try {
      const data = await ipcRenderer.invoke('obtener-informe-contable', {
        mes: Number(mes),
        anio: Number(anio)
      })
      setDatosInforme(data || [])
    } catch (error) {
      console.error('Error al buscar comprobantes:', error)
      toast.error('Error al buscar comprobantes del período.')
    }
  }

  const handleGenerarArchivo = async () => {
    setIsGenerating(true)
    try {
      const result = await ipcRenderer.invoke('generar-archivo-bienes-usados', { mes, anio })
      if (result.success) {
        toast.success(`Archivo generado exitosamente en: ${result.path}`)
      } else {
        toast.info(result.message || 'No se generó el archivo.')
      }
      // Al generar el archivo, también actualizamos la lista
      await handleBuscarCompras()
    } catch (error) {
      console.error('Error al generar el archivo:', error)
      toast.error(`Error al generar el archivo: ${error.message}`)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleGenerarPDF = async (compraId) => {
    try {
      toast.info('Generando PDF...')
      const result = await ipcRenderer.invoke('obtener-detalle-compra', { compraId })
      if (result.success) {
        const { formValues, proveedorSeleccionado } = result
        generarReciboPDF(compraId, formValues, proveedorSeleccionado, articulosList)
        toast.success(`PDF del recibo #${compraId} generado correctamente.`)
      } else {
        toast.error('No se pudieron obtener los detalles de este recibo.')
      }
    } catch (error) {
      console.error('Error al regenerar PDF:', error)
      toast.error(`Error al generar el PDF: ${error.message}`)
    }
  }

  const handleCerrar = () => {
    ipcRenderer.send('cerrar-ventana-informe-bienes-usados')
  }

  const anios = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i)
  const meses = [
    { valor: 1, nombre: 'Enero' },
    { valor: 2, nombre: 'Febrero' },
    { valor: 3, nombre: 'Marzo' },
    { valor: 4, nombre: 'Abril' },
    { valor: 5, nombre: 'Mayo' },
    { valor: 6, nombre: 'Junio' },
    { valor: 7, nombre: 'Julio' },
    { valor: 8, nombre: 'Agosto' },
    { valor: 9, nombre: 'Septiembre' },
    { valor: 10, nombre: 'Octubre' },
    { valor: 11, nombre: 'Noviembre' },
    { valor: 12, nombre: 'Diciembre' }
  ]

  return (
    <div className="contable-container">
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
      <h2>Libro IVA Digital - Bienes Usados</h2>
      <div className="filtros-informe">
        <label htmlFor="mes">Mes:</label>
        <select id="mes" value={mes} onChange={(e) => setMes(Number(e.target.value))}>
          {meses.map((m) => (
            <option key={m.valor} value={m.valor}>
              {m.nombre}
            </option>
          ))}
        </select>
        <label htmlFor="anio">Año:</label>
        <select id="anio" value={anio} onChange={(e) => setAnio(Number(e.target.value))}>
          {anios.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <button onClick={handleBuscarCompras}>Buscar Comprobantes</button>
        <button onClick={handleGenerarArchivo} disabled={isGenerating}>
          {isGenerating ? 'Generando...' : 'Generar Archivo'}
        </button>
        <button onClick={handleCerrar}>Cerrar</button>
      </div>

      <div className="informe-display">
        <h3>Registros de Compras del Período</h3>
        {datosInforme.length === 0 ? (
          <p>No se encontraron recibos. Seleccione período y presione &quot;Buscar Comprobantes&quot;.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Nº de comprobante</th>
                <th>Proveedor</th>
                <th>Nº de DNI</th>
                <th>Total a pagar</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {datosInforme.map((recibo) => (
                <tr key={recibo.compra_id}>
                  <td>{recibo.fecha}</td>
                  <td>{recibo.compra_id}</td>
                  <td>{recibo.proveedor}</td>
                  <td>{recibo.dni}</td>
                  <td>${recibo.total.toFixed(2)}</td>
                  <td>
                    <button
                      onClick={() => handleGenerarPDF(recibo.compra_id)}
                      style={{
                        padding: '4px 8px',
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        backgroundColor: '#27ae60',
                        color: 'white',
                        border: 'none',
                        borderRadius: '3px'
                      }}
                    >
                      📄 Guardar PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

export default InformeBienesUsados
