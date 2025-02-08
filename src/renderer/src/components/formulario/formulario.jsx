import { useFormik } from 'formik'
import * as Yup from 'yup'
import { useState } from 'react'

const Formulario = () => {
  const [idCounter, setIdCounter] = useState(1) // Contador para el ID

  const formik = useFormik({
    initialValues: {
      id: idCounter,
      proveedor: '',
      cuit: '',
      domicilio: '',
      articulo: '',
      cantidad: 1,
      precio_unitario: 0,
      importe: 0,
      subtotal: 0,
      iva: 0,
      total: 0
    },
    validationSchema: Yup.object({
      proveedor: Yup.string().required('El proveedor es obligatorio'),
      cuit: Yup.string()
        .matches(/^\d{2}-\d{8}-\d{1}$/, 'Formato inválido (XX-XXXXXXXX-X)')
        .required('El CUIT es obligatorio'),
      domicilio: Yup.string().required('El domicilio es obligatorio'),
      articulo: Yup.string().required('El artículo es obligatorio'),
      cantidad: Yup.number().min(1, 'Debe ser al menos 1').required('Obligatorio'),
      precio_unitario: Yup.number().min(0, 'Debe ser un número positivo').required('Obligatorio')
    }),
    onSubmit: (values, { resetForm }) => {
      alert(`Factura generada:\n${JSON.stringify(values, null, 2)}`)
      setIdCounter((prev) => prev + 1) // Incrementar el ID
      resetForm({ values: { ...formik.initialValues, id: idCounter + 1 } })
    }
  })

  // Función para actualizar los cálculos automáticamente
  const calcularTotales = () => {
    const importe = formik.values.cantidad * formik.values.precio_unitario
    const subtotal = importe
    const iva = subtotal * 0.21
    const total = subtotal + iva

    formik.setValues({ ...formik.values, importe, subtotal, iva, total })
  }

  return (
    <form onSubmit={formik.handleSubmit}>
      <h2 className="titulo">Formulario de Recibo</h2>

      <div className="contForm">
        <label className="block text-sm font-medium text-gray-700">ID</label>
        <input
          type="text"
          value={formik.values.id}
          readOnly
          className="mt-1 p-2 w-full border rounded bg-gray-100"
        />

        <label className="block text-sm font-medium text-gray-700 mt-2">Proveedor</label>
        <input
          type="text"
          name="proveedor"
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          value={formik.values.proveedor}
          className="mt-1 p-2 w-full border rounded"
        />
        {formik.touched.proveedor && formik.errors.proveedor && (
          <p className="text-red-500 text-sm">{formik.errors.proveedor}</p>
        )}

        <label className="block text-sm font-medium text-gray-700 mt-2">CUIT</label>
        <input
          type="text"
          name="cuit"
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          value={formik.values.cuit}
          className="mt-1 p-2 w-full border rounded"
          placeholder="XX-XXXXXXXX-X"
        />
        {formik.touched.cuit && formik.errors.cuit && (
          <p className="text-red-500 text-sm">{formik.errors.cuit}</p>
        )}

        <label className="block text-sm font-medium text-gray-700 mt-2">Domicilio</label>
        <input
          type="text"
          name="domicilio"
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          value={formik.values.domicilio}
          className="mt-1 p-2 w-full border rounded"
        />
        {formik.touched.domicilio && formik.errors.domicilio && (
          <p className="text-red-500 text-sm">{formik.errors.domicilio}</p>
        )}

        <label className="block text-sm font-medium text-gray-700 mt-2">Artículo</label>
        <input
          type="text"
          name="articulo"
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          value={formik.values.articulo}
          className="mt-1 p-2 w-full border rounded"
        />
        {formik.touched.articulo && formik.errors.articulo && <p>{formik.errors.articulo}</p>}

        <div className="flex space-x-2 mt-2">
          <div className="w-1/2">
            <label className="block text-sm font-medium text-gray-700">Cantidad</label>
            <input
              type="number"
              name="cantidad"
              onChange={(e) => {
                formik.handleChange(e)
                calcularTotales()
              }}
              onBlur={formik.handleBlur}
              value={formik.values.cantidad}
              className="mt-1 p-2 w-full border rounded"
            />
          </div>

          <div className="w-1/2">
            <label className="block text-sm font-medium text-gray-700">Precio Unitario</label>
            <input
              type="number"
              name="precio_unitario"
              onChange={(e) => {
                formik.handleChange(e)
                calcularTotales()
              }}
              onBlur={formik.handleBlur}
              value={formik.values.precio_unitario}
              className="mt-1 p-2 w-full border rounded"
            />
          </div>
        </div>

        <label className="block text-sm font-medium text-gray-700 mt-2">Importe</label>
        <input
          type="number"
          value={formik.values.importe}
          readOnly
          className="mt-1 p-2 w-full border rounded bg-gray-100"
        />

        <label className="block text-sm font-medium text-gray-700 mt-2">Subtotal</label>
        <input
          type="number"
          value={formik.values.subtotal}
          readOnly
          className="mt-1 p-2 w-full border rounded bg-gray-100"
        />

        <label className="block text-sm font-medium text-gray-700 mt-2">IVA (21%)</label>
        <input
          type="number"
          value={formik.values.iva}
          readOnly
          className="mt-1 p-2 w-full border rounded bg-gray-100"
        />

        <label className="block text-sm font-medium text-gray-700 mt-2">Total</label>
        <input
          type="number"
          value={formik.values.total}
          readOnly
          className="mt-1 p-2 w-full border rounded bg-gray-100"
        />

        <button
          type="submit"
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Generar Factura
        </button>
      </div>
    </form>
  )
}

export default Formulario
