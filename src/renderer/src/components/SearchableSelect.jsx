/* eslint-disable react/prop-types */
// El proyecto no usa prop-types; los props están documentados en el JSDoc del componente.
import { useState, useEffect, useRef } from 'react'
import './searchableSelect.css'

// Quita acentos y pasa a minúsculas para comparar
const normalizar = (str) =>
  (str ?? '').toString().normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

/**
 * Selector con búsqueda: filtra las opciones mientras se escribe
 * y solo muestra las coincidencias.
 *
 * Props:
 * - options: [{ id, label, info }] — info es opcional (ej: DNI)
 * - value: id seleccionado ('' si ninguno)
 * - onChange: (id) => void
 * - onBlur: opcional, para Formik
 * - name: opcional, para Formik
 * - placeholder
 */
const SearchableSelect = ({ options, value, onChange, onBlur, name, placeholder }) => {
  const [texto, setTexto] = useState('')
  const [abierto, setAbierto] = useState(false)
  const contenedorRef = useRef(null)

  const seleccionado = options.find((o) => String(o.id) === String(value))

  // Si el id seleccionado cambia desde afuera (ej: reset de Formik), sincroniza el texto
  useEffect(() => {
    setTexto(seleccionado ? seleccionado.label : '')
  }, [seleccionado?.id])

  // Cerrar al hacer click fuera
  useEffect(() => {
    const handleClickFuera = (e) => {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target)) {
        setAbierto(false)
        // Si no hay selección válida, restaurar el texto al valor seleccionado
        setTexto(seleccionado ? seleccionado.label : '')
      }
    }
    document.addEventListener('mousedown', handleClickFuera)
    return () => document.removeEventListener('mousedown', handleClickFuera)
  }, [seleccionado])

  const filtro = normalizar(texto)
  const coincidencias = options.filter((o) =>
    normalizar(`${o.label} ${o.info ?? ''}`).includes(filtro)
  )

  const handleEscribir = (e) => {
    setTexto(e.target.value)
    setAbierto(true)
    // Si el texto deja de coincidir exactamente con el seleccionado, limpiar la selección
    if (seleccionado && normalizar(e.target.value) !== normalizar(seleccionado.label)) {
      onChange('')
    }
  }

  const handleElegir = (opcion) => {
    onChange(String(opcion.id))
    setTexto(opcion.label)
    setAbierto(false)
  }

  return (
    <div className="searchable-select" ref={contenedorRef}>
      <input
        type="text"
        name={name}
        value={texto}
        placeholder={placeholder}
        onChange={handleEscribir}
        onFocus={() => setAbierto(true)}
        onBlur={onBlur}
        autoComplete="off"
      />
      {abierto && (
        <ul className="searchable-select-lista">
          {coincidencias.length === 0 ? (
            <li className="searchable-select-vacio">Sin coincidencias</li>
          ) : (
            coincidencias.map((o) => (
              <li
                key={o.id}
                className={
                  String(o.id) === String(value)
                    ? 'searchable-select-opcion activa'
                    : 'searchable-select-opcion'
                }
                onMouseDown={() => handleElegir(o)}
              >
                {o.label}
                {o.info && <span className="searchable-select-info">{o.info}</span>}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}

export default SearchableSelect
