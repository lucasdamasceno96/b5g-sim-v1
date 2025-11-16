import axios from 'axios'
import { useEffect, useState } from 'react'

const API_BASE_URL = "http://localhost:8000"

export default function SimpleJammingPage() {
  
  // --- State Inicial (Vazio e Aninhado) ---
  const [formData, setFormData] = useState({
    simulation_name: "",
    map_name: "",
    simulation_time: "",
    total_vehicles: "",
    vehicle_distribution: "heterogeneous",
    random_seed: 1234,
    communication_mode: "D2D",
    execute_with_attack: false,
    
    app_params: {
      send_interval_s: 0.1,
      packet_size_b: 256,
    },
    net_params: {
      tx_power_dbm: 23,
      bitrate_mbps: 6,
    },
    jamming_params: {
      start_time_s: 20,
      stop_time_s: 100,
      power_dbm: 20,
      strategy: "constant",
    }
  })
  
  const [availableMaps, setAvailableMaps] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [downloadUrl, setDownloadUrl] = useState(null)

  useEffect(() => {
    // Carrega mapas
    axios.get(`${API_BASE_URL}/api/maps`)
      .then(response => {
        setAvailableMaps(response.data.filter(map => map.endsWith('.net.xml')))
      })
      .catch(err => setError("Failed to load maps."))
  }, [])

  // --- Handlers Genéricos ---
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  // Handler para campos aninhados (ex: app_params.send_interval_s)
  const handleNestedChange = (group, name, value) => {
    setFormData(prev => ({
      ...prev,
      [group]: {
        ...prev[group],
        [name]: parseFloat(value) || 0 // Converte para número
      }
    }))
  }
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setDownloadUrl(null);
    
    // Converte campos de texto para números antes de enviar
    const payload = {
        ...formData,
        simulation_time: parseInt(formData.simulation_time) || 0,
        total_vehicles: parseInt(formData.total_vehicles) || 0,
        random_seed: parseInt(formData.random_seed) || 1234,
    }

    console.log("Sending payload:", payload)
    
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/simulations/generate_zip`,
        payload,
        { responseType: 'blob' }
      )
      
      // ... (lógica de download do blob - sem alteração) ...
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const contentDisposition = response.headers['content-disposition'];
      let filename = `${payload.simulation_name || 'simulation'}.zip`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
        if (filenameMatch.length === 2) filename = filenameMatch[1];
      }
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
      setDownloadUrl(true);
      
    } catch (err) {
      // ... (lógica de erro - sem alteração) ...
      console.error(err);
      if (err.response && err.response.data) {
         err.response.data.text().then(text => {
            try {
              const jsonData = JSON.parse(text);
              setError(`Error: ${jsonData.detail || 'Failed to generate simulation.'}`);
            } catch { setError('An unknown error occurred.'); }
         });
      } else { setError("Failed to connect to backend."); }
    } finally {
      setLoading(false)
    }
  }

  // --- Renderização ---
  if (downloadUrl) {
    return (
      <div className="text-center p-8 bg-gray-800 rounded-lg shadow-xl">
        <h2 className="text-2xl font-bold text-green-400 mb-4">Simulation ZIP Generated!</h2>
        <button
          onClick={() => setDownloadUrl(null)} // Simplificado para voltar
          className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-500"
        >
          Generate New Simulation
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-white mb-6 border-b border-gray-700 pb-2">
        New Simulation: Simple (Random)
      </h1>
      
      {error && (
        <div className="bg-red-800 border border-red-600 text-red-100 px-4 py-3 rounded-md">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* --- Duas Colunas: Setup e V2X --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Coluna 1: Setup */}
        <fieldset className="bg-gray-800 p-6 rounded-lg shadow-md space-y-4">
          <legend className="text-xl font-semibold text-white mb-4">General Setup</legend>
          <label className="block">
            <span className="text-gray-300">Simulation Name</span>
            <input type="text" name="simulation_name" value={formData.simulation_name} onChange={handleChange} placeholder="ex: simple_berlin_test" required />
          </label>
          <label className="block">
            <span className="text-gray-300">Map Name</span>
            <select name="map_name" value={formData.map_name} onChange={handleChange} required>
              <option value="" disabled>Selecione um mapa...</option>
              {availableMaps.map(map => <option key={map} value={map}>{map}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-gray-300">Simulation Time (s)</span>
            <input type="number" name="simulation_time" value={formData.simulation_time} onChange={handleChange} placeholder="ex: 120" required />
          </label>
           <label className="block">
            <span className="text-gray-300">Random Seed</span>
            <input type="number" name="random_seed" value={formData.random_seed} onChange={handleChange} />
          </label>
           <label className="block">
            <span className="text-gray-300">Total Vehicles</span>
            <input type="number" name="total_vehicles" value={formData.total_vehicles} onChange={handleChange} placeholder="ex: 50" required />
          </label>
        </fieldset>

        {/* Coluna 2: V2X Params */}
        <div className="space-y-8">
          <fieldset className="bg-gray-800 p-6 rounded-lg shadow-md space-y-4">
            <legend className="text-xl font-semibold text-white mb-4">Application Parameters</legend>
            <label className="block">
              <span className="text-gray-300">Send Interval (s)</span>
              <input type="number" step="0.1" value={formData.app_params.send_interval_s} onChange={e => handleNestedChange('app_params', 'send_interval_s', e.target.value)} />
            </label>
            <label className="block">
              <span className="text-gray-300">Packet Size (bytes)</span>
              <input type="number" value={formData.app_params.packet_size_b} onChange={e => handleNestedChange('app_params', 'packet_size_b', e.target.value)} />
            </label>
          </fieldset>
          
          <fieldset className="bg-gray-800 p-6 rounded-lg shadow-md space-y-4">
            <legend className="text-xl font-semibold text-white mb-4">Network Parameters</legend>
            <label className="block">
              <span className="text-gray-300">Vehicle TX Power (dBm)</span>
              <input type="number" value={formData.net_params.tx_power_dbm} onChange={e => handleNestedChange('net_params', 'tx_power_dbm', e.target.value)} />
            </label>
            <label className="block">
              <span className="text-gray-300">Bitrate (Mbps)</span>
              <input type="number" value={formData.net_params.bitrate_mbps} onChange={e => handleNestedChange('net_params', 'bitrate_mbps', e.target.value)} />
            </label>
          </fieldset>
        </div>
      </div>

      {/* --- Seção de Ataque (Ocupa a largura inteira) --- */}
      <fieldset className="bg-gray-800 p-6 rounded-lg shadow-md">
        <legend className="text-xl font-semibold text-white mb-4">Attack: Jamming</legend>
        
        <label className="flex items-center space-x-2 mb-6">
          <input
            type="checkbox"
            name="execute_with_attack"
            checked={formData.execute_with_attack}
            onChange={handleChange}
          />
          <span className="text-gray-300">Enable Jamming Attack (Posicionado no Centro)</span>
        </label>
        
        {formData.execute_with_attack && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-fade-in">
            <label className="block">
              <span className="text-gray-300">Start Time (s)</span>
              <input type="number" value={formData.jamming_params.start_time_s} onChange={e => handleNestedChange('jamming_params', 'start_time_s', e.target.value)} />
            </label>
            <label className="block">
              <span className="text-gray-300">Stop Time (s)</span>
              <input type="number" value={formData.jamming_params.stop_time_s} onChange={e => handleNestedChange('jamming_params', 'stop_time_s', e.target.value)} />
            </label>
            <label className="block">
              <span className="text-gray-300">Jammer Power (dBm)</span>
              <input type="number" value={formData.jamming_params.power_dbm} onChange={e => handleNestedChange('jamming_params', 'power_dbm', e.target.value)} />
            </label>
            <label className="block">
              <span className="text-gray-300">Strategy</span>
              <select value={formData.jamming_params.strategy} onChange={e => handleNestedChange('jamming_params', 'strategy', e.target.value)}>
                <option value="constant">Constant</option>
                <option value="reactive">Reactive</option>
                <option value="random">Random</option>
              </select>
            </label>
          </div>
        )}
      </fieldset>

      {/* --- Ações --- */}
      <div className="flex justify-end pt-4">
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-opacity-75 disabled:opacity-50"
        >
          {loading ? "Generating..." : "Generate Simulation ZIP"}
        </button>
      </div>
    </form>
  )
}