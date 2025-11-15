import axios from 'axios';
import { useEffect, useState } from 'react';



// URL base da sua API
const API_BASE_URL = "http://localhost:8000"

export default function SimpleJammingPage() {
  // --- State ---
  const [formData, setFormData] = useState({
    simulation_name: "simple_jamming_test",
    map_name: "",
    simulation_time: 120,
    total_vehicles: 50,
    vehicle_distribution: "heterogeneous",
    random_seed: 1234,
    communication_mode: "D2D",
    apps_per_vehicle: 1,
    metrics: ["SINR", "Throughput", "PacketLoss"],
    execute_with_attack: true,
    jamming_params: {
      enable: true,
      start: 20.0,
      end: 100.0,
      power_dbm: 20.0,
      strategy: "constant",
    }
  })
  
  const [availableMaps, setAvailableMaps] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [downloadUrl, setDownloadUrl] = useState(null)

  // --- Effects ---
  // Carrega os mapas disponíveis ao montar a página
  useEffect(() => {
    setLoading(true)
    axios.get(`${API_BASE_URL}/api/maps`)
      .then(response => {
        setAvailableMaps(response.data)
        // Define o primeiro mapa como padrão
        if (response.data.length > 0) {
          setFormData(prev => ({ ...prev, map_name: response.data[0] }))
        }
      })
      .catch(err => {
        setError("Failed to load maps. Is the backend running?")
        console.error(err)
      })
      .finally(() => setLoading(false))
  }, [])

  // --- Handlers ---
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    if (name === "execute_with_attack") {
      setFormData(prev => ({
        ...prev,
        execute_with_attack: checked,
        jamming_params: { ...prev.jamming_params, enable: checked }
      }))
    } else {
      setFormData(prev => ({ ...prev, [name]: type === 'number' ? parseFloat(value) : value }))
    }
  }

  const handleJammingChange = (e) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      jamming_params: {
        ...prev.jamming_params,
        [name]: type === 'number' ? parseFloat(value) : value
      }
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setDownloadUrl(null)
    
    // Log para depuração
    console.log("Sending payload:", formData)
    
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/simulations/generate_zip`,
        formData,
        {
          responseType: 'blob', // IMPORTANTE: Espera um blob (arquivo)
        }
      )
      
      // Cria uma URL temporária para o blob (o arquivo ZIP)
      const url = window.URL.createObjectURL(new Blob([response.data]))
      
      // Tenta extrair o nome do arquivo do header 'content-disposition'
      const contentDisposition = response.headers['content-disposition']
      let filename = `${formData.simulation_name}.zip` // Default
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/)
        if (filenameMatch.length === 2) {
          filename = filenameMatch[1]
        }
      }
      
      // Cria um link <a> invisível para forçar o download
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      
      // Limpa
      link.parentNode.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      // Mostra o botão "Gerar Nova"
      setDownloadUrl(true) 
      
    } catch (err) {
      console.error(err)
      if (err.response && err.response.data) {
         // Tenta ler o erro do blob (se for JSON)
         err.response.data.text().then(text => {
            try {
              const jsonData = JSON.parse(text)
              setError(`Error: ${jsonData.detail || 'Failed to generate simulation.'}`)
            } catch {
              setError('An unknown error occurred.')
            }
         })
      } else {
        setError("Failed to connect to backend.")
      }
    } finally {
      setLoading(false)
    }
  }

  // --- Renderização ---
  if (loading && availableMaps.length === 0) {
    return <div>Loading maps...</div>
  }
  
  if (downloadUrl) {
    return (
      <div className="text-center p-8 bg-gray-800 rounded-lg shadow-xl">
        <h2 className="text-2xl font-bold text-green-400 mb-4">Simulation ZIP Generated!</h2>
        <p className="mb-6">Your download should have started automatically.</p>
        <button
          onClick={() => setDownloadUrl(null)}
          className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-opacity-75"
        >
          Generate New Simulation
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-2xl mx-auto">

  <h1 className="text-4xl font-extrabold text-indigo-400 mb-10 tracking-tight">
  🚀 Simple Jamming Simulation
  </h1>

      
      {error && (
        <div className="bg-red-800 border border-red-600 text-red-100 px-4 py-3 rounded-md">
          <strong>Error:</strong> {error}
        </div>
      )}

  

      {/* --- Seção 1: General Setup --- */}
      <fieldset className="bg-gray-900 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-gray-700 hover:border-indigo-500/50 transition">
        <legend className="text-xl font-semibold text-white mb-4">General Setup</legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <label className="block">
            <span className="text-gray-300">Simulation Name</span>
            <input type="text" name="simulation_name" value={formData.simulation_name} onChange={handleChange} required />
          </label>
          <label className="block">
            <span className="text-gray-300">Map Name</span>
            <select name="map_name" value={formData.map_name} onChange={handleChange} required>
              {availableMaps.length === 0 && <option disabled>Loading...</option>}
              {availableMaps.map(map => <option key={map} value={map}>{map}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-gray-300">Simulation Time (s)</span>
            <input type="number" name="simulation_time" value={formData.simulation_time} onChange={handleChange} required />
          </label>
           <label className="block">
            <span className="text-gray-300">Random Seed</span>
            <input type="number" name="random_seed" value={formData.random_seed} onChange={handleChange} required />
          </label>
        </div>
      </fieldset>

      {/* --- Seção 2: Traffic & V2X --- */}
      <fieldset className="bg-gray-900 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-gray-700 hover:border-indigo-500/50 transition">
        <legend className="text-xl font-semibold text-white mb-4">Traffic & V2X Config</legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <label className="block">
            <span className="text-gray-300">Total Vehicles</span>
            <input type="number" name="total_vehicles" value={formData.total_vehicles} onChange={handleChange} required />
          </label>
          <label className="block">
            <span className="text-gray-300">Communication Mode</span>
            <select name="communication_mode" value={formData.communication_mode} onChange={handleChange}>
              <option value="D2D">D2D (Sidelink)</option>
              <option value="cellular" disabled>Cellular (V2N - Not Implemented)</option>
            </select>
          </label>
        </div>
      </fieldset>
      
      {/* --- Seção 3: Attack: Jamming --- */}
      <fieldset className="bg-gray-900 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-gray-700 hover:border-indigo-500/50 transition">
        <legend className="text-xl font-semibold text-white mb-4">Attack: Jamming</legend>
        
        <label className="flex items-center space-x-2 mb-6">
          <input
            type="checkbox"
            name="execute_with_attack"
            checked={formData.execute_with_attack}
            onChange={handleChange}
          />
          <span className="text-gray-300">Enable Jamming Attack</span>
        </label>
        
        {formData.execute_with_attack && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
            <label className="block">
              <span className="text-gray-300">Jamming Start Time (s)</span>
              <input type="number" name="start" value={formData.jamming_params.start} onChange={handleJammingChange} />
            </label>
            <label className="block">
              <span className="text-gray-300">Jamming End Time (s)</span>
              <input type="number" name="end" value={formData.jamming_params.end} onChange={handleJammingChange} />
            </label>
            <label className="block col-span-2">
              <span className="text-gray-300">Jamming Power (dBm)</span>
              <input type="number" name="power_dbm" value={formData.jamming_params.power_dbm} onChange={handleJammingChange} />
            </label>
          </div>
        )}
      </fieldset>

      {/* --- Ações --- */}
      <div className="flex justify-end pt-4">
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-opacity-75 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Generating..." : "Generate Simulation ZIP"}
        </button>
      </div>
    </form>
  )
}