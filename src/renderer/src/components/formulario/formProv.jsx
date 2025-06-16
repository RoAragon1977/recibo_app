import { useFormik } from 'formik'
import * as Yup from 'yup'
import { ToastContainer, toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

import './formulario.css'

const { ipcRenderer } = window.api

const FormProv = ({ onClose }) => {
  const handleCerrar = () => {
    if (window.api && window.api.ipcRenderer) {
      window.api.ipcRenderer.send('cerrar-ventana-proveedor')
    }
  }

  const formik = useFormik({
    initialValues: {
      nombre: '',
      apellido: '',
      dni: '',
      domicilio: ''
    },
    validationSchema: Yup.object({
      nombre: Yup.string().required('El nombre es obligatorio'),
      apellido: Yup.string().required('El apellido es obligatorio'),
      dni: Yup.string()
        .matches(/^\d{7,8}$/, 'El DNI debe tener 7 u 8 dígitos')
        .required('El DNI es obligatorio')
        .transform((value) => (value.length === 7 ? `0${value}` : value)),
      domicilio: Yup.string().required('El domicilio es obligatorio')
    }),
    onSubmit: async (values, { resetForm }) => {
      try {
        await ipcRenderer.invoke('crear-proveedor', values)
        resetForm({
          values: {
            nombre: '',
            apellido: '',
            dni: '',
            domicilio: ''
          }
        })
        toast.success(`Proveedor "${values.nombre} ${values.apellido}" creado exitosamente.`)
      } catch (error) {
        console.error('Error al crear el proveedor:', error)
        toast.error(`Error al crear el proveedor: ${error.message || 'Error desconocido'}`)
      }
    }
  })

  return (
    <form onSubmit={formik.handleSubmit}>
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
      <h2 className="titulo">Formulario Nuevo Proveedor</h2>
      <div className="contForm">
        <div className="conten-proveedor">
          <div className="unidad-input">
            <label>Nombre</label>
            <input type="text" name="nombre" {...formik.getFieldProps('nombre')} />
            {formik.touched.nombre && formik.errors.nombre && <p>{formik.errors.nombre}</p>}
          </div>

          <div className="unidad-input">
            <label>Apellido</label>
            <input type="text" name="apellido" {...formik.getFieldProps('apellido')} />
            {formik.touched.apellido && formik.errors.apellido && <p>{formik.errors.apellido}</p>}
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

export default FormProv
