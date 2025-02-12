import { HashRouter as Router, Route, Routes } from 'react-router-dom'

import Formulario from './components/formulario/formulario'
import Navbar from './components/navbar/navbar'

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
      </Routes>
    </Router>
  )
}

export default App
