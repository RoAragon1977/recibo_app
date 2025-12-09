import React, { useState } from 'react'
import { ToastContainer, toast } from 'react-toastify'
import { generarInformeContablePDF } from '../../helpers/formHelper'
import './Contable.css'

const InformeContable = () => {
  const anioActual = new Date().getFullYear()
  const [mes, setMes] = useState((new Date().getMonth() + 1).toString())
  const [anio, setAnio] = useState(anioActual.toString())
  const [datosInforme, setDatosInforme] = useState(null)
  const [cargando, setCargando] = useState(false)

  const handleGenerarInforme = async () => {
    if (!mes || !anio) {
      toast.error('Por favor, seleccione mes y año.')
      return
    }
    setCargando(true)
    setDatosInforme(null)
    try {
      const mesNumerico = parseInt(mes, 10)
      const anioNumerico = parseInt(anio, 10)

      const data = await window.api.ipcRenderer.invoke('obtener-informe-contable', {
        mes: mesNumerico,
        anio: anioNumerico
      })

      setDatosInforme(data)
    } catch (err) {
      console.error('Error al generar informe contable:', err)
      toast.error(`Error al generar informe: ${err.message}`)
    } finally {
      setCargando(false)
    }
  }

  const handleGenerarPDF = () => {
    if (!datosInforme || datosInforme.length === 0) {
      toast.warn('Primero debe generar un informe con datos.')
      return
    }
    toast.info('Generando PDF...')
    generarInformeContablePDF(mes, anio, datosInforme, meses)
  }

  const handleCerrarVentana = () => {
    window.api.ipcRenderer.send('cerrar-ventana-informe-contable')
  }

  const meses = [
    { value: '1', label: 'Enero' },
    { value: '2', label: 'Febrero' },
    { value: '3', label: 'Marzo' },
    { value: '4', label: 'Abril' },
    { value: '5', label: 'Mayo' },
    { value: '6', label: 'Junio' },
    { value: '7', label: 'Julio' },
    { value: '8', label: 'Agosto' },
    { value: '9', label: 'Septiembre' },
    { value: '10', label: 'Octubre' },
    { value: '11', label: 'Noviembre' },
    { value: '12', label: 'Diciembre' }
  ]

  return (
    <div className="contable-container">
      <ToastContainer position="top-right" autoClose={5000} hideProgressBar={false} />
      <h2>Informe Contable Mensual</h2>
      <div className="filtros-informe">
        <label htmlFor="mes-select">Mes:</label>
        <select id="mes-select" value={mes} onChange={(e) => setMes(e.target.value)}>
          {meses.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
        <label htmlFor="anio-input">Año:</label>
        <input
          type="number"
          id="anio-input"
          value={anio}
          onChange={(e) => setAnio(e.target.value)}
          placeholder="AAAA"
        />
        <button onClick={handleGenerarInforme} disabled={cargando}>
          {cargando ? 'Generando...' : 'Generar Informe'}
        </button>
        <button onClick={handleGenerarPDF} disabled={!datosInforme || cargando}>
          Generar PDF
        </button>
        <button onClick={handleCerrarVentana}>Salir</button>
      </div>
      {datosInforme && !cargando && (
        <div className="informe-display">
          <h3>
            Recibos de {meses.find((m) => m.value === mes)?.label || mes}/{anio}
          </h3>
          {datosInforme.length === 0 ? (
            <p>No se encontraron recibos para el período seleccionado.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Nº de comprobante</th>
                  <th>Proveedor</th>
                  <th>Nº de DNI</th>
                  <th>Subtotal</th>
                  <th>IVA del Subtotal</th>
                  <th>Total a pagar</th>
                </tr>
              </thead>
              <tbody>
                {datosInforme.map((recibo) => (
                  <tr key={recibo.compra_id}>
                    <td>{recibo.fecha}</td>
                    <td>{recibo.compra_id}</td>
                    <td>{recibo.proveedor}</td>
                    <td>{recibo.dni}</td>
                    <td>{recibo.subtotal.toFixed(2)}</td>
                    <td>{recibo.iva.toFixed(2)}</td>
                    <td>{recibo.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}

export default InformeContable
