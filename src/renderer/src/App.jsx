import { HashRouter as Router, Route, Routes } from 'react-router-dom'

import Navbar from './components/navbar/navbar'
import Formulario from './components/formulario/formulario'
import ComprasMensuales from './components/informes/compras'
import FormProv from './components/formulario/formProv'
import FormModProv from './components/formulario/formModProv'

function App() {
  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            <>
              <Navbar />
              <p>Bienvenidos a la aplicacion</p>
            </>
          }
        />
        <Route path="/nuevo-recibo" element={<Formulario />} />
        <Route path="/nuevo-proveedor" element={<FormProv />} />
        <Route path="/modificar-proveedor" element={<FormModProv />} />
        <Route path="/informe-compras-ventana" element={<ComprasMensuales />} />
      </Routes>
    </Router>
  )
}

export default App
