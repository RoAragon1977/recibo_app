import { useFormik } from 'formik'
import * as Yup from 'yup'
const { ipcRenderer } = window.electron

import './formulario.css'

const FormularioProv = (onclose) => {
  const handleCerrar = () => {
    if (window.electron && window.electron.ipcRenderer) {
      window.electron.ipcRenderer.send('cerrar-ventana-proveedor')
    }
  }

  const formik = useFormik({
    initialValues: {
      proveedor: '',
      dni: '',
      domicilio: ''
    },
    validationSchema: Yup.object({
      proveedor: Yup.string().required('El proveedor es obligatorio'),
      dni: Yup.string()
        .matches(/^\d{7,8}$/, 'El DNI debe tener 7 u 8 dígitos')
        .required('El DNI es obligatorio')
        .transform((value) => (value.length === 7 ? `0${value}` : value)),
      domicilio: Yup.string().required('El domicilio es obligatorio')
    }),
    onSubmit: async (values, { resetForm }) => {
      try {
        const result = await ipcRenderer.invoke('crear-factura', values)
        alert(`Factura generada con ID: ${result.id}`)
        resetForm({
          values: {
            proveedor: '',
            dni: '',
            domicilio: ''
          }
        })
      } catch (error) {
        console.error('Error al crear la factura:', error)
      }
    }
  })

  return (
    <form onSubmit={formik.handleSubmit}>
      <h2 className="titulo">Formulario de Proveedor</h2>
      <div className="contForm">
        <div className="conten-proveedor">
          <div className="unidad-input">
            <label>Proveedor</label>
            <input type="text" name="proveedor" {...formik.getFieldProps('proveedor')} />
            {formik.touched.proveedor && formik.errors.proveedor && (
              <p>{formik.errors.proveedor}</p>
            )}
          </div>

          <div className="unidad-input">
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
          </div>
        </div>

        <div className="unidad_boton">
          <button type="submit">Cargar Proveedor</button>
          <button type="button" onClick={handleCerrar}>
            Salir
          </button>
        </div>
      </div>
    </form>
  )
}

export default FormularioProv
