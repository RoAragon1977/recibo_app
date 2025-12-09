import { HashRouter as Router, Route, Routes } from 'react-router-dom'

import Navbar from './components/navbar/navbar'
import Formulario from './components/formulario/formulario'
import FormModProv from './components/formulario/formModProv'
import FormProv from './components/formulario/formProv'
import ComprasMensuales from './components/informes/compras'
import InformeContable from './components/informes/Contable'

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
        <Route path="/informe-contable-ventana" element={<InformeContable />} />
      </Routes>
    </Router>
  )
}

export default App
