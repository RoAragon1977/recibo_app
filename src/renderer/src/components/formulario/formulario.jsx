import { useFormik } from 'formik'
import * as Yup from 'yup'
import { useState } from 'react'

const Formulario = () => {
  const [idCounter, setIdCounter] = useState(1)

  const formik = useFormik({
    initialValues: {
      id: idCounter,
      proveedor: '',
      dni: '',
      domicilio: '',
      articulo: '',
      cantidad: '',
      precio_unitario: '',
      importe: 0.0,
      iva: 0.0,
      total: 0.0
    },
    validationSchema: Yup.object({
      proveedor: Yup.string().required('El proveedor es obligatorio'),
      dni: Yup.string()
        .matches(/^\d{7,8}$/, 'El DNI debe tener 7 u 8 dígitos')
        .required('El DNI es obligatorio')
        .transform((value) => (value.length === 7 ? `0${value}` : value)),
      domicilio: Yup.string().required('El domicilio es obligatorio'),
      articulo: Yup.string().required('El artículo es obligatorio'),
      cantidad: Yup.number().min(0.01, 'Debe ser mayor a 0').required('Obligatorio'),
      precio_unitario: Yup.number().min(0, 'Debe ser un número positivo').required('Obligatorio')
    }),
    onSubmit: (values, { resetForm }) => {
      alert(`Factura generada:\n${JSON.stringify(values, null, 2)}`)
      setIdCounter((prev) => prev + 1)
      resetForm({
        values: {
          id: idCounter + 1,
          proveedor: '',
          dni: '',
          domicilio: '',
          articulo: '',
          cantidad: '',
          precio_unitario: '',
          importe: 0.0,
          iva: 0.0,
          total: 0.0
        }
      })
    }
  })

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
        <label>ID</label>
        <input type="text" value={formik.values.id} readOnly className="input-readonly" />

        <label>Proveedor</label>
        <input type="text" name="proveedor" {...formik.getFieldProps('proveedor')} />
        {formik.touched.proveedor && formik.errors.proveedor && <p>{formik.errors.proveedor}</p>}

        <label>DNI</label>
        <input type="text" name="dni" {...formik.getFieldProps('dni')} />
        {formik.touched.dni && formik.errors.dni && <p>{formik.errors.dni}</p>}

        <label>Domicilio</label>
        <input type="text" name="domicilio" {...formik.getFieldProps('domicilio')} />
        {formik.touched.domicilio && formik.errors.domicilio && <p>{formik.errors.domicilio}</p>}

        <label>Artículo</label>
        <input type="text" name="articulo" {...formik.getFieldProps('articulo')} />
        {formik.touched.articulo && formik.errors.articulo && <p>{formik.errors.articulo}</p>}

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

        <label>Importe</label>
        <input type="text" value={formik.values.importe} readOnly className="input-readonly" />

        <label>IVA (21%)</label>
        <input type="text" value={formik.values.iva} readOnly className="input-readonly" />

        <label>Total</label>
        <input type="text" value={formik.values.total} readOnly className="input-readonly" />

        <button type="submit">Generar Factura</button>
      </div>
    </form>
  )
}

export default Formulario
