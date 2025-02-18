import { HashRouter as Router, Route, Routes } from 'react-router-dom'

import Navbar from './components/navbar/navbar'
import Formulario from './components/formulario/formulario'
import FormProv from './components/formulario/formProv'

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
      </Routes>
    </Router>
  )
}

export default App
