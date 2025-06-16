import { useFormik, FieldArray, getIn, FormikProvider } from 'formik'
import * as Yup from 'yup'
import { useEffect, useState, useCallback } from 'react'
import { jsPDF } from 'jspdf'
import { ToastContainer, toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

import { generarReciboPDF, obtenerFechaActual } from '../../helpers/formHelper'
import './formulario.css'

const STATIC_INITIAL_ITEM = {
  articulo_id: '', // Guardará el ID del artículo
  cantidad: '',
  precio_unitario: '',
  importe: 0.0,
  iva: 0.0,
  total: 0.0
}

const { ipcRenderer } = window.api

const Formulario = ({ onClose }) => {
  const [idFactura, setIdFactura] = useState(1)
  const [proveedores, setProveedores] = useState([])
  const [articulos, setArticulos] = useState([])
  const [totalDelDia, setTotalDelDia] = useState(0)
  const [isDataLoaded, setIsDataLoaded] = useState(false)

  const fetchInitialData = useCallback(async () => {
    try {
      const [lastId, fetchedProveedores, fetchedArticulos] = await Promise.all([
        ipcRenderer.invoke('obtener-ultimo-id'),
        ipcRenderer.invoke('obtener-proveedor'),
        ipcRenderer.invoke('obtener-articulos')
      ])
      setIdFactura(lastId)
      setProveedores(fetchedProveedores)
      setArticulos(fetchedArticulos)
      setIsDataLoaded(true)
    } catch (error) {
      console.error('Error al obtener los datos iniciales:', error)
      toast.error(`Error al obtener los datos iniciales: ${error.message || 'Error desconocido'}`)
    }
  }, [])

  const fetchTotalDelDiaCallback = useCallback(async () => {
    try {
      const fecha = obtenerFechaActual()
      const total = await ipcRenderer.invoke('obtener-total-dia', fecha)
      setTotalDelDia(total || 0)
    } catch (error) {
      console.error('Error al obtener el total del día:', error)
    }
  }, [])

  useEffect(() => {
    fetchInitialData().then(() => {
      fetchTotalDelDiaCallback()
    })
  }, [fetchInitialData, fetchTotalDelDiaCallback])

  // Cierra la ventana de carga de recibo
  const handleCerrar = () => {
    if (window.api && window.api.ipcRenderer) {
      window.api.ipcRenderer.send('cerrar-ventana-recibo')
    }
  }

  const formik = useFormik({
    initialValues: {
      id: idFactura, // Se asigna cuando el ID esta disponible
      proveedor: '',
      fecha: obtenerFechaActual(),
      items: [STATIC_INITIAL_ITEM],
      subtotalGeneral: 0.0,
      ivaGeneral: 0.0,
      totalGeneral: 0.0
    },
    enableReinitialize: true, // Permite que el ID se actualice cuando cambia "idFactura"
    validationSchema: Yup.object({
      proveedor: Yup.string().required('El proveedor es obligatorio'),
      items: Yup.array()
        .of(
          Yup.object().shape({
            articulo_id: Yup.string().required('El articulo es obligatorio'),
            cantidad: Yup.number().min(0.01, 'debe ser mayor a 0').required('Obligatorio'),
            precio_unitario: Yup.number().min(0, 'Positivo').required('Obligatorio')
          })
        )
        .min(1, 'Debe agregar al menos un artículo')
    }),
    onSubmit: async (values, { resetForm }) => {
      try {
        const reciboData = {
          proveedorId: values.proveedor,
          fecha: values.fecha,
          items: values.items.map((item) => ({
            articulo_id: item.articulo_id,
            cantidad: parseFloat(item.cantidad),
            precio_unitario: parseFloat(item.precio_unitario),
            importe: parseFloat(item.importe),
            iva: parseFloat(item.iva),
            total: parseFloat(item.total)
          })),
          totalGeneral: parseFloat(values.totalGeneral)
        }

        const result = await ipcRenderer.invoke('crear-recibo', reciboData)
        setIdFactura(result.id + 1)
        resetForm({
          values: {
            id: result.id + 1,
            proveedor: '',
            fecha: obtenerFechaActual(),
            items: [STATIC_INITIAL_ITEM],
            subtotalGeneral: 0.0,
            ivaGeneral: 0.0,
            totalGeneral: 0.0
          }
        })

        fetchTotalDelDiaCallback()

        // Obtener datos del proveedor seleccionado
        const provSelec = proveedores.find((p) => p.id === Number(values.proveedor))

        if (!provSelec) {
          console.error('Proveedor no encontrado para PDF')
          toast.error('Proveedor no encontrado para generar el PDF.')
          return
        }

        generarReciboPDF(result.id, values, provSelec, articulos)
        toast.success(`Recibo N° ${result.id} generado y PDF creado exitosamente!`)
      } catch (error) {
        console.error('Error al crear el recibo:', error)
        toast.error(`Error al crear el recibo: ${error.message || 'Error desconocido'}`)
      }
    }
  })

  // Recalcula totales cuando cambian los items
  useEffect(() => {
    let newSubtotalGeneral = 0
    let newIvaGeneral = 0
    let newTotalGeneralCalc = 0

    const updatedItems = formik.values.items.map((item) => {
      const cantidad = parseFloat(item.cantidad) || 0
      const precioUnitario = parseFloat(item.precio_unitario) || 0
      const importe = cantidad * precioUnitario
      const iva = importe * 0.21
      const totalItem = importe + iva

      newSubtotalGeneral += importe
      newIvaGeneral += iva
      newTotalGeneralCalc += totalItem

      return {
        ...item,
        importe: importe.toFixed(2),
        iva: iva.toFixed(2),
        total: totalItem.toFixed(2)
      }
    })

    // Comprueba si los valores realmente cambiaron para evitar bucles
    if (JSON.stringify(formik.values.items) !== JSON.stringify(updatedItems)) {
      formik.setFieldValue('items', updatedItems, false)
    }
    if (formik.values.subtotalGeneral !== parseFloat(newSubtotalGeneral.toFixed(2))) {
      formik.setFieldValue('subtotalGeneral', parseFloat(newSubtotalGeneral.toFixed(2)), false)
    }
    if (formik.values.ivaGeneral !== parseFloat(newIvaGeneral.toFixed(2))) {
      formik.setFieldValue('ivaGeneral', parseFloat(newIvaGeneral.toFixed(2)), false)
    }
    if (formik.values.totalGeneral !== parseFloat(newTotalGeneralCalc.toFixed(2))) {
      formik.setFieldValue('totalGeneral', parseFloat(newTotalGeneralCalc.toFixed(2)), false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formik.values.items]) // Solo se ejecuta si el array 'items' o su contenido cambia.

  // Manejador para cambios en campos de items
  const handleItemChange = (index, field, value) => {
    const newItems = formik.values.items.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    )
    formik.setFieldValue('items', newItems)
  }

  // Renderiza un indicador de carga o null hasta que los datos estén listos
  if (!isDataLoaded) {
    return <div>Cargando formulario...</div> // O cualquier otro indicador de carga
  }

  return (
    <FormikProvider value={formik}>
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
      <form key={idFactura} onSubmit={formik.handleSubmit}>
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
          <FieldArray name="items">
            {({ push, remove }) => (
              <div className="conten-compra-items">
                <h4>Artículos del Recibo</h4>
                <table className="tabla-items">
                  <thead>
                    <tr>
                      <th>Artículo</th>
                      <th>Cantidad (Kg)</th>
                      <th>P. Unitario ($)</th>
                      <th>Importe ($)</th>
                      <th>IVA (21%) ($)</th>
                      <th>Total Artículo ($)</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formik.values.items.map((item, index) => (
                      <tr key={index}>
                        <td className="item-articulo">
                          <select
                            className="prov" // Considerar renombrar esta clase si es muy genérica
                            name={`items[${index}].articulo_id`}
                            value={item.articulo_id}
                            onChange={(e) => handleItemChange(index, 'articulo_id', e.target.value)}
                            onBlur={formik.handleBlur}
                          >
                            <option value="">Seleccione Artículo</option>
                            {articulos.map((articulo) => (
                              <option key={articulo.id} value={articulo.id}>
                                {articulo.nombre}
                              </option>
                            ))}
                          </select>
                          {getIn(formik.touched, `items[${index}].articulo_id`) &&
                            getIn(formik.errors, `items[${index}].articulo_id`) && (
                              <p className="error-message">
                                {getIn(formik.errors, `items[${index}].articulo_id`)}
                              </p>
                            )}
                        </td>
                        <td className="item-cantidad">
                          <input
                            type="text"
                            name={`items[${index}].cantidad`}
                            inputMode="decimal"
                            pattern="\d*([.,]\d+)?"
                            value={item.cantidad}
                            onChange={(e) =>
                              handleItemChange(index, 'cantidad', e.target.value.replace(',', '.'))
                            }
                            onBlur={formik.handleBlur}
                          />
                          {getIn(formik.touched, `items[${index}].cantidad`) &&
                            getIn(formik.errors, `items[${index}].cantidad`) && (
                              <p className="error-message">
                                {getIn(formik.errors, `items[${index}].cantidad`)}
                              </p>
                            )}
                        </td>
                        <td className="item-precio">
                          <input
                            type="text"
                            name={`items[${index}].precio_unitario`}
                            inputMode="decimal"
                            pattern="\d*([.,]\d+)?"
                            value={item.precio_unitario}
                            onChange={(e) =>
                              handleItemChange(
                                index,
                                'precio_unitario',
                                e.target.value.replace(',', '.')
                              )
                            }
                            onBlur={formik.handleBlur}
                          />
                          {getIn(formik.touched, `items[${index}].precio_unitario`) &&
                            getIn(formik.errors, `items[${index}].precio_unitario`) && (
                              <p className="error-message">
                                {getIn(formik.errors, `items[${index}].precio_unitario`)}
                              </p>
                            )}
                        </td>
                        <td className="item-importe">
                          <input
                            type="text"
                            value={item.importe}
                            readOnly
                            className="input-readonly"
                          />
                        </td>
                        <td className="item-iva">
                          <input type="text" value={item.iva} readOnly className="input-readonly" />
                        </td>
                        <td className="item-total-articulo">
                          <input
                            type="text"
                            value={item.total}
                            readOnly
                            className="input-readonly"
                          />
                        </td>
                        <td>
                          <button
                            type="button"
                            className="remove-item-btn"
                            onClick={() => formik.values.items.length > 1 && remove(index)}
                            disabled={formik.values.items.length <= 1}
                          >
                            Quitar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button
                  type="button"
                  className="add-item-btn"
                  onClick={() => push(STATIC_INITIAL_ITEM)}
                >
                  Agregar Artículo
                </button>
              </div>
            )}
          </FieldArray>

          <div className="conten-totales-generales">
            <div className="unidad-input">
              <label>Subtotal</label>
              <input
                type="text"
                value={formik.values.subtotalGeneral.toFixed(2)}
                readOnly
                className="input-readonly"
              />
            </div>
            <div className="unidad-input">
              <label>IVA</label>
              <input
                type="text"
                value={formik.values.ivaGeneral.toFixed(2)}
                readOnly
                className="input-readonly"
              />
            </div>
            <div className="unidad-input">
              <label>Total</label>
              <input
                type="text"
                value={formik.values.totalGeneral.toFixed(2)}
                readOnly
                className="input-readonly"
              />
            </div>
          </div>
          <div className="unidad_boton"></div>
        </div>
        <div className="unidad_boton">
          <button type="submit" disabled={formik.isSubmitting || !formik.isValid || !formik.dirty}>
            Generar Recibo
          </button>
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
      </form>
    </FormikProvider>
  )
}

export default Formulario
