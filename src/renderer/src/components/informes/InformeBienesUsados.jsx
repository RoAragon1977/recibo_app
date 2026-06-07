import { useState } from 'react'
import { ToastContainer, toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import './Informe.css' // Reutilizamos el CSS de los otros informes

const { ipcRenderer } = window.api

const InformeBienesUsados = () => {
  const [mes, setMes] = useState(new Date().getMonth() + 1)
  const [anio, setAnio] = useState(new Date().getFullYear())
  const [isGenerating, setIsGenerating] = useState(false)

  const handleGenerarArchivo = async () => {
    setIsGenerating(true)
    try {
      const result = await ipcRenderer.invoke('generar-archivo-bienes-usados', { mes, anio })
      if (result.success) {
        toast.success(`Archivo generado exitosamente en: ${result.path}`)
      } else {
        toast.info(result.message || 'No se generó el archivo.')
      }
    } catch (error) {
      console.error('Error al generar el archivo:', error)
      toast.error(`Error al generar el archivo: ${error.message}`)
    } finally {
      setIsGenerating(false)
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
    <div className="informe-container">
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
      <h2>Generar Archivo para &quot;Libro IVA Digital - Bienes Usados&quot;</h2>
      <div className="filtros-container">
        <div className="filtro-item">
          <label htmlFor="mes">Mes:</label>
          <select id="mes" value={mes} onChange={(e) => setMes(Number(e.target.value))}>
            {meses.map((m) => (
              <option key={m.valor} value={m.valor}>
                {m.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="filtro-item">
          <label htmlFor="anio">Año:</label>
          <select id="anio" value={anio} onChange={(e) => setAnio(Number(e.target.value))}>
            {anios.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="botones-container">
        <button onClick={handleGenerarArchivo} disabled={isGenerating}>
          {isGenerating ? 'Generando...' : 'Generar Archivo'}
        </button>
        <button onClick={handleCerrar}>Cerrar</button>
      </div>
    </div>
  )
}

export default InformeBienesUsados
