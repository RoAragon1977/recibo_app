import React, { useState } from 'react'
import { ToastContainer, toast } from 'react-toastify'

import { agruparDatosInforme } from '../../helpers/formHelper'
import './compras.css'

const ComprasMensuales = () => {
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
      if (
        isNaN(mesNumerico) ||
        mesNumerico < 1 ||
        mesNumerico > 12 ||
        isNaN(anioNumerico) ||
        anioNumerico < 1900 ||
        anioNumerico > 2200
      ) {
        toast.error('Mes o año inválido.')
        setCargando(false)
        return
      }

      const data = await window.api.ipcRenderer.invoke('obtener-informe-compras-mensuales', {
        mes: mesNumerico,
        anio: anioNumerico
      })

      const datosDetalladosAgrupados = agruparDatosInforme(data.comprasDetalladas)
      setDatosInforme({ comprasDetalladas: datosDetalladosAgrupados, resumen: data.resumen })
    } catch (err) {
      console.error('Error al generar informe:', err)
      toast.error(`Error al generar informe: ${err.message}`)
    } finally {
      setCargando(false)
    }
  }

  const handleGenerarPDF = async () => {
    if (!datosInforme) {
      toast.warn('Primero debe generar el informe en pantalla.')
      return
    }
    toast.info('Generando PDF...')
    try {
      const resultado = await window.api.ipcRenderer.invoke('generar-pdf-informe-compras', {
        mes,
        anio
      })
      if (resultado.success) {
        toast.success(`PDF guardado exitosamente en: ${resultado.path}`)
      } else {
        toast.error(resultado.message || 'No se pudo generar el PDF.')
      }
    } catch (err) {
      console.error('Error al solicitar generación de PDF:', err)
      toast.error(`Error al generar PDF: ${err.message}`)
    }
  }

  const handleCerrarVentana = () => {
    if (window.api && window.api.ipcRenderer) {
      window.api.ipcRenderer.send('cerrar-ventana-informe')
    }
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
    <div className="compras-container">
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
      <h2>Informe de Compras Mensuales</h2>
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
          min="1900"
          max="2200"
        />
        <button onClick={handleGenerarInforme} disabled={cargando}>
          {' '}
          {cargando ? 'Generando...' : 'Generar Informe'}{' '}
        </button>
        <button onClick={handleGenerarPDF} disabled={!datosInforme || cargando}>
          {' '}
          Generar PDF{' '}
        </button>
        <button onClick={handleCerrarVentana}>Salir</button>
      </div>
      {datosInforme && !cargando && (
        <div className="informe-display">
          <h3>
            Detalle de Compras del Mes: {meses.find((m) => m.value === mes)?.label || mes}/{anio}
          </h3>
          {datosInforme.comprasDetalladas.length === 0 ? (
            <p>No se encontraron compras para el período seleccionado.</p>
          ) : (
            datosInforme.comprasDetalladas.map((datosProveedor, idx) => (
              <div key={idx} className="proveedor-section">
                <h4>
                  Proveedor: {datosProveedor.proveedor_nombre} {datosProveedor.proveedor_apellido}
                </h4>
                {datosProveedor.compras.map((compra, compraIdx) => (
                  <div key={compraIdx} className="compra-details">
                    <h5>
                      Compra ID: {compra.compra_id} - Fecha: {compra.compra_fecha}
                    </h5>
                    <table>
                      <thead>
                        <tr>
                          <th>Artículo</th>
                          <th>Cantidad</th>
                          <th>Total (sin IVA)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {compra.articulos.map((articulo, artIdx) => (
                          <tr key={artIdx}>
                            <td>{articulo.articulo_nombre}</td>
                            <td>{articulo.articulo_cantidad}</td>
                            <td>{articulo.articulo_importe_sin_iva.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            ))
          )}
          <h3>
            Resumen Total por Artículo del Mes: {meses.find((m) => m.value === mes)?.label || mes}/
            {anio}
          </h3>
          {datosInforme.resumen.length === 0 ? (
            <p>No hay datos para el resumen.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Artículo</th>
                  <th>Cantidad Total</th>
                  <th>Precio Total (sin IVA)</th>
                </tr>
              </thead>
              <tbody>
                {datosInforme.resumen.map((item, idx) => (
                  <tr key={idx}>
                    <td>{item.articulo_nombre}</td>
                    <td>{item.total_cantidad}</td>
                    <td>{item.total_importe_sin_iva.toFixed(2)}</td>
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
export default ComprasMensuales
