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

const generarReciboPDF = (reciboId, formValues, proveedorSeleccionado, articulosLista) => {
  const doc = new jsPDF({ format: 'a4' })

  // Definir márgenes y estilos
  const margenIzq = 10
  const margenDer = doc.internal.pageSize.getWidth() - 10 // Margen derecho dinámico
  const espacioDuplicado = 140 // Espacio vertical para el duplicado

  // Funcion para generar un recibo (original o duplicado)
  const generarCuerpoRecibo = (startY) => {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    let y = startY + 10

    // Información del recibo
    const fechaForm = formValues.fecha.replace(/\//g, '  ')

    doc.text(`${fechaForm}`, margenDer - 30, y, { align: 'right' }) // Fecha
    y += 16
    doc.text(
      `Proveedor: ${proveedorSeleccionado.nombre} ${proveedorSeleccionado.apellido}`,
      margenIzq,
      y
    )
    y += 8
    doc.text(`DNI: ${proveedorSeleccionado.dni}`, margenIzq, y)
    y += 8
    doc.text(`Domicilio: ${proveedorSeleccionado.domicilio}`, margenIzq, y)
    y += 12

    // Datos de la tabla
    const columns = [
      'Artículo',
      'Cant. (Kg)',
      'P. Unit. ($)',
      'Importe ($)',
      'IVA ($)',
      'Total ($)'
    ]
    const data = formValues.items.map((item) => {
      const artSelec = articulosLista.find((a) => a.id === Number(item.articulo_id))
      return [
        artSelec ? artSelec.nombre : 'N/A',
        item.cantidad,
        item.precio_unitario,
        item.importe,
        item.iva,
        item.total
      ]
    })

    autoTable(doc, {
      startY: y,
      head: [columns],
      body: data,
      theme: 'grid',
      styles: { fontSize: 10, cellPadding: 2 },
      headStyles: { fillColor: [220, 220, 220], textColor: [0, 0, 0], fontStyle: 'bold' },
      columnStyles: {
        1: { halign: 'right' },
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'right' },
        5: { halign: 'right' }
      }
    })
    y = doc.lastAutoTable.finalY + 10
    doc.text(`Subtotal: $${formValues.subtotalGeneral.toFixed(2)}`, margenDer - 5, y, {
      align: 'right'
    })
    y += 7
    doc.text(`IVA (21%): $${formValues.ivaGeneral.toFixed(2)}`, margenDer - 5, y, {
      align: 'right'
    })
    y += 7
    doc.setFont('helvetica', 'bold')
    doc.text(`Total a pagar: $${formValues.totalGeneral.toFixed(2)}`, margenDer - 5, y, {
      align: 'right'
    })
  }

  // Generar el primer recibo (original)
  generarCuerpoRecibo(15)

  // Generar el segundo recibo (duplicado)
  generarCuerpoRecibo(espacioDuplicado)

  // Guardar PDF en la carpeta de descargas
  doc.save(`recibo_${reciboId}.pdf`)
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

export { obtenerFechaActual, generarReciboPDF, fetchTotalDelDia }
