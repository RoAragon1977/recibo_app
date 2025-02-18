import { useFormik } from 'formik'
import * as Yup from 'yup'
import { useEffect, useState } from 'react'
const { ipcRenderer } = window.electron

import './formulario.css'

const Formulario = ({ onClose }) => {
  const [idFactura, setIdFactura] = useState(1)
  const [proveedores, setProveedores] = useState([])

  // Obtener el último ID al cargar el formulario
  useEffect(() => {
    const fetchLastId = async () => {
      const lastId = await ipcRenderer.invoke('obtener-ultimo-id')
      setIdFactura(lastId)
    }
    fetchLastId()
  }, [])

  // Obtener la lista de Proveedores al cargar el formulario
  useEffect(() => {
    const buscarProveedores = async () => {
      const proveedores = await ipcRenderer.invoke('obtener-proveedor')
      setProveedores(proveedores)
    }
    buscarProveedores()
  }, [])

  // Cierra la ventana de carga de recibo
  const handleCerrar = () => {
    if (window.electron && window.electron.ipcRenderer) {
      window.electron.ipcRenderer.send('cerrar-ventana-recibo')
    }
  }

  // Obtiene la fecha del día que se carga un recivo
  const obtenerFechaActual = () => {
    const fecha = new Date()
    const dia = String(fecha.getDate()).padStart(2, '0')
    const mes = String(fecha.getMonth() + 1).padStart(2, '0')
    const anio = fecha.getFullYear()
    return `${dia}/${mes}/${anio}`
  }

  const formik = useFormik({
    initialValues: {
      id: idFactura || '1', // Se asigna cuando el ID esta disponible
      proveedor: '',
      // dni: '',
      // domicilio: '',
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
      // dni: Yup.string()
      //   .matches(/^\d{7,8}$/, 'El DNI debe tener 7 u 8 dígitos')
      //   .required('El DNI es obligatorio')
      //   .transform((value) => (value.length === 7 ? `0${value}` : value)),
      // domicilio: Yup.string().required('El domicilio es obligatorio'),
      articulo: Yup.string().required('El artículo es obligatorio'),
      cantidad: Yup.number().min(0.01, 'Debe ser mayor a 0').required('Obligatorio'),
      precio_unitario: Yup.number().min(0, 'Debe ser un número positivo').required('Obligatorio')
    }),
    onSubmit: async (values, { resetForm }) => {
      try {
        const result = await ipcRenderer.invoke('crear-recibo', values)
        alert(`Factura generada con ID: ${result.id}`)
        setIdFactura(result.id + 1)
        resetForm({
          values: {
            id: result.id + 1,
            proveedor: '',
            // dni: '',
            // domicilio: '',
            articulo: '',
            cantidad: '',
            precio_unitario: '',
            importe: 0.0,
            iva: 0.0,
            total: 0.0
          }
        })
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
            <label>ID</label>
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

          {/*<div className="unidad-input">
            <label>DNI</label>
            <input type="text" name="dni" {...formik.getFieldProps('dni')} />
            {formik.touched.dni && formik.errors.dni && <p>{formik.errors.dni}</p>}
          </div>

          <div className="unidad-input">
            <label>Domicilio</label>
            <input type="text" name="domicilio" {...formik.getFieldProps('domicilio')} />
            {formik.touched.domicilio && formik.errors.domicilio && (
              <p>{formik.errors.domicilio}</p>
            )}
          </div> */}
        </div>

        <div className="conten-compra">
          <div className="unidad-input">
            <label>Artículo</label>
            <input type="text" name="articulo" {...formik.getFieldProps('articulo')} />
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
                formik.setFieldValue('cantidad', e.target.value)
                calcularTotales()
              }}
              value={formik.values.cantidad}
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
                formik.setFieldValue('precio_unitario', e.target.value)
                calcularTotales()
              }}
              value={formik.values.precio_unitario}
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
      </div>
    </form>
  )
}

export default Formulario
