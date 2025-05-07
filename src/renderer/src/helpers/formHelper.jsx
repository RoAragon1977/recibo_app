import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

// Obtiene la fecha del día que se carga un recivo
const obtenerFechaActual = () => {
  const fecha = new Date()
  const dia = String(fecha.getDate()).padStart(2, '0')
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const anio = fecha.getFullYear()
  return `${dia}/${mes}/${anio}`
}

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

const fetchTotalDelDia = async () => {
  try {
    const fecha = obtenerFechaActual()
    const total = await ipcRenderer.invoke('obtener-total-dia', fecha)
    setTotalDelDia(total || 0)
  } catch (error) {
    console.error('Error al obtener el total del día:', error)
  }
}

export { obtenerFechaActual, generarPDF, fetchTotalDelDia }
