import { useState } from 'react'
import { exportToTxt } from '../../helpers/exportHelper'
import './Contable.css' // Reutilizando estilos para mantener la consistencia
import { ToastContainer, toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

function ExportarIvaReciclados() {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(
    'Seleccione un rango de fechas para generar los archivos para el régimen de IVA Digital.'
  )

  const handleExport = async () => {
    if (!startDate || !endDate) {
      setMessage('Por favor, seleccione un rango de fechas válido.')
      return
    }
    setLoading(true)
    setMessage('Generando archivos, por favor espere...')
    try {
      const data = await window.api.ipcRenderer.invoke('generar-archivos-iva-reciclados', {
        startDate,
        endDate
      })

      if (data && data.length > 0) {
        exportToTxt(data)
        setMessage(
          `Exportación completada. Se generaron los archivos para ${data.length} registros de detalle.`
        )
      } else {
        setMessage('No se encontraron registros para el período seleccionado.')
      }
    } catch (error) {
      setMessage(`Error al exportar los datos: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleImportExcel = async () => {
    setLoading(true)
    setMessage('Abriendo diálogo para seleccionar archivo Excel...')
    try {
      const result = await window.api.ipcRenderer.invoke('importar-excel')
      if (result.success) {
        toast.success(`Importación exitosa: ${result.count} recibos importados.`)
        setMessage(`Importación exitosa: ${result.count} recibos importados.`)
      } else {
        toast.error('Error en la importación. Revise los detalles abajo.')
        setMessage(result.message)
      }
    } catch (error) {
      toast.error(`Error al importar Excel: ${error.message}`)
      setMessage(`Error al importar Excel: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="contable-container">
      <ToastContainer position="top-right" autoClose={5000} hideProgressBar={false} />
      <h2>Exportar Libro IVA Digital - Materiales Reciclados</h2>
      <div className="filtros-informe" style={{ flexDirection: 'column', alignItems: 'center' }}>
        <label htmlFor="startDate">Fecha Desde:</label>
        <input
          type="date"
          id="startDate"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
        <label htmlFor="endDate">Fecha Hasta:</label>
        <input
          type="date"
          id="endDate"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />
        <button onClick={handleExport} disabled={loading}>
          {loading ? 'Exportando...' : 'Generar y Descargar Archivos'}
        </button>
        <button onClick={handleImportExcel} disabled={loading} style={{ marginTop: '15px' }}>
          {loading ? 'Importando...' : 'Importar Recibos desde Excel'}
        </button>
      </div>
      <div className="informe-display">
        {message && <pre style={{ whiteSpace: 'pre-wrap', textAlign: 'left' }}>{message}</pre>}
      </div>
    </div>
  )
}

export default ExportarIvaReciclados
