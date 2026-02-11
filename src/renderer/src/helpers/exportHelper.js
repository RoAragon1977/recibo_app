/**
 * Rellena una cadena a la derecha con espacios hasta la longitud deseada, truncando si es necesario.
 * @param {string} str - La cadena de entrada.
 * @param {number} length - La longitud final deseada.
 * @returns {string}
 */
export const formatString = (str, length) => {
  return (str || '').toString().slice(0, length).padEnd(length, ' ')
}

/**
 * Rellena un número a la izquierda con ceros hasta la longitud deseada.
 * @param {number|string} num - El número de entrada.
 * @param {number} length - La longitud final deseada.
 * @returns {string}
 */
export const formatNumber = (num, length) => {
  return (num || 0).toString().padStart(length, '0')
}

/**
 * Formatea un importe a una cadena de 15 dígitos (13 enteros, 2 decimales).
 * @param {number} amount - El importe.
 * @returns {string}
 */
export const formatAmount = (amount) => {
  const isNegative = amount < 0
  const absAmount = Math.abs(amount || 0)
  const fixedAmount = absAmount.toFixed(2).replace('.', '')

  const padding = isNegative ? 14 : 15
  let formatted = fixedAmount.padStart(padding, '0')

  if (isNegative) {
    // Coloca el signo negativo al principio del campo.
    formatted = '-' + formatted
  }
  return formatted
}

const getDocumentInfo = (dni) => {
  const cleanDni = (dni || '').toString().replace(/\D/g, '')
  // Si tiene 11 dígitos es CUIT (80), si no (asumimos 7-8) es DNI (96)
  const codigo = cleanDni.length === 11 ? '80' : '96'
  return { codigo, number: cleanDni }
}

const generateComprasCbte = (data) => {
  return data
    .map((compra) => {
      const fecha = new Date(compra.fecha.split('/').reverse().join('-'))
      const fechaFormateada =
        fecha.getFullYear().toString() +
        (fecha.getMonth() + 1).toString().padStart(2, '0') +
        fecha.getDate().toString().padStart(2, '0')

      // Asegurar consistencia matemática: Total = Subtotal + IVA
      const totalCalculado = compra.subtotal + compra.iva_total

      const { codigo, number } = getDocumentInfo(compra.dni)

      const cbte = [
        formatString(fechaFormateada, 8), // Campo 1: Fecha
        formatString('032', 3), // Campo 2: Tipo Cbte (Hardcodeado para Reciclados)
        formatNumber(1, 5), // Campo 3: Punto de Venta (Asumido 1, no existe en DB)
        formatNumber(compra.compra_id, 20), // Campo 4: Nro Cbte
        formatNumber(0, 16), // Campo 5: Despacho (Ceros para este régimen)
        formatString(codigo, 2), // Campo 6: Cód. Doc. Vendedor
        formatNumber(number, 20), // Campo 7: ID Vendedor (Corregido: ceros a la izquierda)
        formatString(
          [compra.proveedor_apellido, compra.proveedor_nombre].filter(Boolean).join(' '),
          30
        ), // Campo 8: Nombre Vendedor
        formatAmount(totalCalculado), // Campo 9: Importe Total (Corregido: suma exacta)
        formatAmount(0), // Campo 10: Neto No Gravado
        formatAmount(0), // Campo 11: Percepción a cuenta de IVA
        formatAmount(0), // Campo 12: Percepción otros regímenes
        formatAmount(0), // Campo 13: Percepción IIBB
        formatAmount(0), // Campo 14: Percepción Imp. Municipales
        formatAmount(0), // Campo 15: Impuestos Internos
        formatAmount(0), // Campo 16: Otros Tributos
        formatString('PES', 3), // Campo 17: Cód. Moneda
        formatNumber('1000000', 10), // Campo 18: Tipo de Cambio (1.000000)
        formatString(compra.alicuotas.length, 1), // Campo 19: Cant. Alícuotas
        formatString(' ', 1), // Campo 20: Cód. Operación
        formatAmount(compra.iva_total), // Campo 21: CF Computable
        formatAmount(0), // Campo 22: Otros Tributos
        formatNumber(0, 11), // Campo 23: CUIT Emisor/Corredor (Corregido: 11 ceros)
        formatString('', 30), // Campo 24: Nombre Emisor/Corredor (30 espacios)
        formatAmount(0) // Campo 25: IVA Comisión (15 ceros)
      ].join('')
      return cbte
    })
    .join('\r\n')
}

const generateComprasAlicuotas = (data) => {
  const alicuotasRows = []
  data.forEach((compra) => {
    const { codigo, number } = getDocumentInfo(compra.dni)
    compra.alicuotas.forEach((alic) => {
      const row = [
        formatString('032', 3), // Campo 1: Tipo Cbte
        formatNumber(1, 5), // Campo 2: Punto de Venta (Asumido 1)
        formatNumber(compra.compra_id, 20), // Campo 3: Nro Cbte
        formatString(codigo, 2), // Campo 4: Cód. Doc. Vendedor
        formatNumber(number, 20), // Campo 5: ID Vendedor (Corregido: ceros a la izquierda)
        formatAmount(alic.neto_gravado), // Campo 6: Neto Gravado
        formatNumber(5, 4), // Campo 7: Alícuota IVA (0005 para 21%)
        formatAmount(alic.impuesto_liquidado) // Campo 8: Impuesto Liquidado
      ].join('')
      alicuotasRows.push(row)
    })
  })
  return alicuotasRows.join('\r\n')
}

const downloadFile = (content, filename) => {
  // Convertir a ANSI (Windows-1252) para asegurar 1 byte por carácter y evitar errores de longitud por UTF-8
  const buf = new Uint8Array(content.length)
  for (let i = 0; i < content.length; i++) {
    const code = content.charCodeAt(i)
    // Si el carácter está fuera del rango ANSI (0-255), lo reemplazamos por '?' para mantener la longitud fija
    buf[i] = code < 256 ? code : 63
  }
  const blob = new Blob([buf], { type: 'text/plain;charset=windows-1252' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export const exportToTxt = (compras) => {
  // Agrupar detalles por compra para tener un registro por comprobante
  const comprasAgrupadas = compras.reduce((acc, curr) => {
    let compra = acc.find((c) => c.compra_id === curr.compra_id)
    if (!compra) {
      compra = { ...curr, subtotal: 0, iva_total: 0, alicuotas: [] }
      acc.push(compra)
    }
    compra.subtotal += curr.importe
    compra.iva_total += curr.iva
    compra.alicuotas.push({ neto_gravado: curr.importe, impuesto_liquidado: curr.iva })
    return acc
  }, [])

  const cbteContent = generateComprasCbte(comprasAgrupadas)
  const alicuotasContent = generateComprasAlicuotas(comprasAgrupadas)

  downloadFile(cbteContent, 'LIBRO_IVA_DIGITAL_COMPRAS_CBTE.txt')
  downloadFile(alicuotasContent, 'LIBRO_IVA_DIGITAL_COMPRAS_ALICUOTAS.txt')
}
