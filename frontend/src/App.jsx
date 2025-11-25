import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import AboutPage from './pages/AboutPage';
import AdvancedJammingPage from './pages/AdvancedJammingPage'; // Placeholder
import ExpertJammingPage from './pages/ExpertJamming';
import HomePage from './pages/HomePage';
import MapGeneratorPage from './pages/MapGeneratorPage'; // Placeholder
import SimpleJammingPage from './pages/SimpleJammingPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        {/* Rotas principais */}
        <Route index element={<HomePage />} />
        <Route path="about" element={<AboutPage />} />
        
        {/* Rotas de Simulação (dentro do dropdown) */}
        <Route path="simulations/simple-jamming" element={<SimpleJammingPage />} />
        <Route path="simulations/advanced-jamming" element={<AdvancedJammingPage />} />
         <Route path="simulations/expert-jamming" element={<ExpertJammingPage />} />
        {/* Rota de Utilidades */}
        <Route path="tools/map-generator" element={<MapGeneratorPage />} />
        
        {/* Rota 404 (opcional) */}
        <Route path="*" element={<div><h2>404 - Page Not Found</h2></div>} />
      </Route>
    </Routes>
  )
}

export default App