import { useFormik } from 'formik'
import * as Yup from 'yup'
import { useEffect, useState } from 'react'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

import { obtenerFechaActual, fetchTotalDelDia } from '../../helpers/formHelper'
import './formulario.css'

const { ipcRenderer } = window.electron

const Formulario = ({ onClose }) => {
  const [idFactura, setIdFactura] = useState(1)
  const [proveedores, setProveedores] = useState([])
  const [articulos, setArticulos] = useState([])
  const [totalDelDia, setTotalDelDia] = useState(0)

  // Obtener datos al cargar el formulario
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [lastId, proveedores, articulos] = await Promise.all([
          ipcRenderer.invoke('obtener-ultimo-id'),
          ipcRenderer.invoke('obtener-proveedor'),
          ipcRenderer.invoke('obtener-articulos')
        ])
        setIdFactura(lastId)
        setProveedores(proveedores)
        setArticulos(articulos)
      } catch (error) {
        console.error('Error al obtener los datos:', error)
      }
    }
    fetchData()
    fetchTotalDelDia()
  }, [fetchTotalDelDia])

  // Obtener el total del día al cargar el formulario
  // const fetchTotalDelDia = async () => {
  //   try {
  //     const fecha = obtenerFechaActual()
  //     const total = await ipcRenderer.invoke('obtener-total-dia', fecha)
  //     setTotalDelDia(total || 0)
  //   } catch (error) {
  //     console.error('Error al obtener el total del día:', error)
  //   }
  // }

  // useEffect(() => {
  //   fetchTotalDelDia()
  // }, [fetchTotalDelDia])

  // Cierra la ventana de carga de recibo
  const handleCerrar = () => {
    if (window.electron && window.electron.ipcRenderer) {
      window.electron.ipcRenderer.send('cerrar-ventana-recibo')
    }
  }

  const formik = useFormik({
    initialValues: {
      id: idFactura || '1', // Se asigna cuando el ID esta disponible
      proveedor: '',
      articulo: '',
      cantidad: '',
      precio_unitario: '',
      importe: 0.0,
      iva: 0.0,
      total: 0.0,
      fecha: obtenerFechaActual()
    },
    enableReinitialize: true, // Permite que el ID se actualice cuando cambia "idFactura"
    validationSchema: Yup.object({
      proveedor: Yup.string().required('El proveedor es obligatorio'),
      articulo: Yup.string().required('El artículo es obligatorio'),
      cantidad: Yup.number().min(0.01, 'Debe ser mayor a 0').required('Obligatorio'),
      precio_unitario: Yup.number().min(0, 'Debe ser un número positivo').required('Obligatorio')
    }),
    onSubmit: async (values, { resetForm }) => {
      try {
        const result = await ipcRenderer.invoke('crear-recibo', values)
        console.log(`Factura generada con ID: ${result.id}`)
        setIdFactura(result.id + 1)
        resetForm({
          values: {
            id: result.id + 1,
            proveedor: '',
            articulo: '',
            cantidad: '',
            precio_unitario: '',
            importe: 0.0,
            iva: 0.0,
            total: 0.0
          }
        })
        fetchTotalDelDia() // Actualza el tota del día luego de generar un recibo

        // Obtener datos del proveedor y articulo seleccionado
        const provSelec = proveedores.find((p) => p.id === Number(values.proveedor))
        const artSelec = articulos.find((a) => a.id === Number(values.articulo))

        if (!provSelec || !artSelec) {
          console.error('Proveedor o Artículo no encontrado')
          return
        }
        console.log('Valores de proveedores:', proveedores)
        console.log('ID de proveedor seleccionado:', values.proveedor)
        // Generar PDF
        const generarPDF = () => {
          const doc = new jsPDF({ format: 'a4' })

          // Definir márgenes y estilos
          const margenIzq = 10
          const margenDer = 190
          const espacioDuplicado = 140

          // Funcion para generar un recibo
          const generarRecibo = (startY) => {
            doc.setFontSize(10)
            doc.setFont('helvetica', 'normal')
            let y = startY + 10

            // Información del recibo
            const fechaForm = formik.values.fecha.replace(/\//g, '  ')

            doc.text(`${fechaForm}`, margenDer - 40, y) // Fecha
            y += 16
            doc.text(`Proveedor: ${provSelec.nombre} ${provSelec.apellido}`, margenIzq, y)
            y += 8
            doc.text(`DNI: ${provSelec.dni}`, margenIzq, y)
            y += 8
            doc.text(`Domicilio: ${provSelec.domicilio}`, margenIzq, y)
            y += 16

            // Datos de la tabla
            const columns = ['Artículo', 'Cantidad (Kg)', 'Precio Unitario ($)', 'Total ($)']
            const data = [
              [
                artSelec.nombre, // Se corrige para mostrar el nombre
                formik.values.cantidad || '0',
                formik.values.precio_unitario || '0',
                formik.values.total
              ]
            ]

            autoTable(doc, {
              startY: y,
              head: [],
              body: data,
              theme: 'plain',
              styles: {
                fontSize: 10,
                halign: 'center',
                cellPadding: 3
              },
              headStyles: {
                fillColor: [255, 255, 255], // color de fondo blanco
                textColor: [0, 0, 0], //Color de texto negro
                lineWidth: 0 // Sin bordes
              },
              alternateRowStyles: {
                fillColor: [255, 255, 255]
              }
            })

            y = doc.lastAutoTable.finalY + 10

            // Subtotal, IVA y Total alineados a la derecha
            doc.text(`Subtotal: $${formik.values.importe}`, margenDer - 40, y)
            y += 8
            doc.text(`IVA (21%): $${formik.values.iva}`, margenDer - 40, y)
            y += 8
            doc.setFont('helvetica', 'bold')
            doc.text(`Total a pagar: $${formik.values.total}`, margenDer - 40, y)
          }

          // Generar el primer recibo
          generarRecibo(20)

          // Generar el segundo recibo en la misma hoja A4 (duplicado)
          generarRecibo(espacioDuplicado)

          // Guardar PDF en la carpeta de descargas
          doc.save(`recibo_${result.id}.pdf`)
        }

        generarPDF()
      } catch (error) {
        console.error('Error al crear la factura:', error)
      }
    }
  })

  // Formula para calcular el iva y el total del recibo
  const calcularTotales = () => {
    const cantidad = parseFloat(formik.values.cantidad) || 0
    const precioUnitario = parseFloat(formik.values.precio_unitario) || 0
    const importe = (cantidad * precioUnitario).toFixed(2)
    const iva = (importe * 0.21).toFixed(2)
    const total = (parseFloat(importe) + parseFloat(iva)).toFixed(2)

    formik.setFieldValue('importe', importe)
    formik.setFieldValue('iva', iva)
    formik.setFieldValue('total', total)
  }

  return (
    <form onSubmit={formik.handleSubmit}>
      <h2 className="titulo">Formulario de Recibo</h2>
      <div className="contForm">
        <div className="conten-proveedor">
          <div className="unidad-input">
            <label>Proveedor</label>
            <select className="prov" name="proveedor" {...formik.getFieldProps('proveedor')}>
              <option value="">Seleccione un proveedor</option>
              {proveedores.map((proveedor) => (
                <option key={proveedor.id} value={proveedor.id}>
                  {proveedor.nombre} {proveedor.apellido}
                </option>
              ))}
            </select>
            {formik.touched.proveedor && formik.errors.proveedor && (
              <p>{formik.errors.proveedor}</p>
            )}
          </div>

          <div className="unidad-input">
            <label>Nº de Recibo</label>
            <input type="text" value={formik.values.id} readOnly className="input-readonly" />
          </div>

          <div className="unidad-input">
            <label>Fecha</label>
            <input
              type="text"
              name="fecha"
              value={formik.values.fecha}
              readOnly
              className="input-readonly"
            />
          </div>
        </div>

        <div className="conten-compra">
          <div className="unidad-input">
            <label>Artículo</label>
            <select className="prov" name="articulo" {...formik.getFieldProps('articulo')}>
              <option value="">Seleccione un Articulo</option>
              {articulos.map((articulo) => (
                <option key={articulo.id} value={articulo.id}>
                  {articulo.nombre}
                </option>
              ))}
            </select>
            {formik.touched.articulo && formik.errors.articulo && <p>{formik.errors.articulo}</p>}
          </div>

          <div className="unidad-input">
            <label>Cantidad (Kg)</label>
            <input
              type="text"
              name="cantidad"
              inputMode="decimal"
              pattern="\d+(\.\d{1,2})?"
              onChange={(e) => {
                formik.setFieldValue('cantidad', e.target.value || '0')
                calcularTotales()
              }}
              value={formik.values.cantidad || '0'}
            />
          </div>

          <div className="unidad-input">
            <label>Precio Unitario ($)</label>
            <input
              type="text"
              name="precio_unitario"
              inputMode="decimal"
              pattern="\d+(\.\d{1,2})?"
              onChange={(e) => {
                formik.setFieldValue('precio_unitario', e.target.value || '0')
                calcularTotales()
              }}
              value={formik.values.precio_unitario || '0'}
            />
          </div>

          <div className="unidad-input">
            <label>Importe</label>
            <input type="text" value={formik.values.importe} readOnly className="input-readonly" />
          </div>

          <div className="unidad-input">
            <label>IVA (21%)</label>
            <input type="text" value={formik.values.iva} readOnly className="input-readonly" />
          </div>

          <div className="unidad-input">
            <label>Total</label>
            <input type="text" value={formik.values.total} readOnly className="input-readonly" />
          </div>
        </div>
        <div className="unidad_boton">
          <button type="submit">Generar Factura</button>
          <button type="button" onClick={handleCerrar}>
            Salir
          </button>
        </div>
        <div className="unidad-total">
          <h3>
            Total del Día: $
            {totalDelDia.toLocaleString('es-ES', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}
          </h3>
        </div>
      </div>
    </form>
  )
}

export default Formulario
