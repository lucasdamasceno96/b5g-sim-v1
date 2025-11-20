import axios from 'axios'
import { useEffect, useState } from 'react'

const API_BASE_URL = "http://localhost:8000"

export default function SimpleJammingPage() {
  
  // --- State Management ---
  const [formData, setFormData] = useState({
    simulation_name: "", 
    map_name: "", 
    simulation_time: 120,
    total_vehicles: 50, 
    vehicle_distribution: "heterogeneous",
    random_seed: 1234,
    communication_mode: "D2D",
    execute_with_attack: false,
    
    // Technical Parameters
    app_params: { 
      send_interval_s: 0.1, 
      packet_size_b: 256 
    },
    net_params: { 
      tx_power_dbm: 23, 
      bitrate_mbps: 6 
    },
    
    // Attack Parameters (Added speed and type support)
    jamming_params: { 
      start_time_s: 20, 
      stop_time_s: 100, 
      power_dbm: 20, 
      strategy: "constant",
      speed_ms: 10,           // New: Drone speed
      jammer_type: "DroneJammer" // Default to Drone for simple sim
    }
  })
  
  const [availableMaps, setAvailableMaps] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [downloadUrl, setDownloadUrl] = useState(null)

  // --- Load Maps on Mount ---
  useEffect(() => {
    axios.get(`${API_BASE_URL}/api/maps`)
      .then(response => {
        // Filter only xml files
        setAvailableMaps(response.data.filter(map => map.endsWith('.xml')))
      })
      .catch(err => setError("Failed to load maps from backend."))
  }, [])

  // --- Handlers ---
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleNestedChange = (group, name, value) => {
    setFormData(prev => ({
      ...prev,
      [group]: {
        ...prev[group],
        // Keep strategy/type as string, convert others to float/int
        [name]: (name === 'strategy' || name === 'jammer_type') ? value : (parseFloat(value) || 0)
      }
    }))
  }
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setDownloadUrl(null);
    
    // 1. Construct Payload compatible with 'AdvancedSimulationPayload'
    // This ensures the Backend generates the full .NED file structure
    const advancedPayload = {
        simulation_name: formData.simulation_name,
        map_name: formData.map_name,
        simulation_time: parseInt(formData.simulation_time) || 120,
        random_seed: parseInt(formData.random_seed) || 1234,
        
        // Map Simple 'Total' to Advanced 'Random'
        num_fixed_vehicles: 0,
        num_random_vehicles: parseInt(formData.total_vehicles) || 10,
        
        vehicle_distribution: formData.vehicle_distribution,
        communication_mode: formData.communication_mode,
        
        app_params: formData.app_params,
        net_params: formData.net_params,
        
        mitigation_active: false, // Simple sim defaults to false
        reroute_on_attack: false,
        
        attack_placement: "random", // Flag for backend (though we send explicit list below)
        
        // Auto-generate 1 Jammer if attack is enabled (Default Position: 0,0 or Center)
        jammers_list: formData.execute_with_attack ? [{lat: 0.0, lng: 0.0}] : [], 
        jamming_params: formData.jamming_params,
        
        // Empty lists for advanced features not used in Simple Mode
        rsus_list: [],
        fixed_routes_list: [],
        gnodebs_list: []
    }

    console.log("Sending Simple Payload to Advanced Endpoint:", advancedPayload)
    
    try {
      // 2. Use the ADVANCED endpoint to get .ned generation
      const response = await axios.post(
        `${API_BASE_URL}/api/simulations/generate_advanced_zip`,
        advancedPayload,
        { responseType: 'blob' }
      )
      
      // 3. Handle File Download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const contentDisposition = response.headers['content-disposition'];
      let filename = `${formData.simulation_name || 'simulation'}.zip`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
        if (filenameMatch && filenameMatch.length === 2) filename = filenameMatch[1];
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
      console.error(err);
      setError("Failed to generate simulation. Ensure Backend is running.");
    } finally {
      setLoading(false)
    }
  }

  // --- Render Result View ---
  if (downloadUrl) {
    return (
      <div className="text-center p-8 bg-gray-800 rounded-lg shadow-xl max-w-2xl mx-auto mt-10">
        <h2 className="text-2xl font-bold text-green-400 mb-4">Success! Simulation Generated.</h2>
        <p className="text-gray-300 mb-6">The ZIP file includes the full .ned topology and .ini configurations.</p>
        <button
          onClick={() => setDownloadUrl(null)}
          className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-500 transition"
        >
          Create Another Simulation
        </button>
      </div>
    )
  }

  // --- Render Form View ---
  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-4xl mx-auto p-4">
      <div className="border-b border-gray-700 pb-4">
        <h1 className="text-3xl font-bold text-white">Quick Simulation</h1>
        <p className="text-gray-400 mt-1">Generate a random traffic scenario with optional drone jamming.</p>
      </div>
      
      {error && (
        <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-md">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Left Column: Setup */}
        <div className="space-y-6">
          <fieldset className="bg-gray-800 p-6 rounded-lg shadow-md space-y-4 border border-gray-700">
            <legend className="text-xl font-semibold text-indigo-400 px-2">General Setup</legend>
            
            <label className="block">
              <span className="text-gray-300 text-sm">Simulation Name</span>
              <input type="text" name="simulation_name" className="w-full mt-1 bg-gray-700 border border-gray-600 rounded p-2 text-white focus:border-indigo-500 outline-none" 
                value={formData.simulation_name} onChange={handleChange} placeholder="ex: simple_test" required />
            </label>
            
            <label className="block">
              <span className="text-gray-300 text-sm">Map File</span>
              <select name="map_name" className="w-full mt-1 bg-gray-700 border border-gray-600 rounded p-2 text-white focus:border-indigo-500 outline-none"
                value={formData.map_name} onChange={handleChange} required>
                <option value="" disabled>Select a map...</option>
                {availableMaps.map(map => <option key={map} value={map}>{map}</option>)}
              </select>
            </label>
            
            <div className="grid grid-cols-2 gap-4">
              <label className="block">
                <span className="text-gray-300 text-sm">Time (s)</span>
                <input type="number" name="simulation_time" className="w-full mt-1 bg-gray-700 border border-gray-600 rounded p-2 text-white"
                  value={formData.simulation_time} onChange={handleChange} required />
              </label>
              <label className="block">
                <span className="text-gray-300 text-sm">Vehicles</span>
                <input type="number" name="total_vehicles" className="w-full mt-1 bg-gray-700 border border-gray-600 rounded p-2 text-white"
                  value={formData.total_vehicles} onChange={handleChange} required />
              </label>
            </div>
             <label className="block">
                <span className="text-gray-300 text-sm">Random Seed</span>
                <input type="number" name="random_seed" className="w-full mt-1 bg-gray-700 border border-gray-600 rounded p-2 text-white"
                  value={formData.random_seed} onChange={handleChange} />
              </label>
          </fieldset>
        </div>

        {/* Right Column: Technical Params */}
        <div className="space-y-6">
          <fieldset className="bg-gray-800 p-6 rounded-lg shadow-md space-y-4 border border-gray-700">
            <legend className="text-xl font-semibold text-blue-400 px-2">Network Config</legend>
            
            <div className="grid grid-cols-2 gap-4">
              <label className="block">
                <span className="text-gray-300 text-sm">Interval (s)</span>
                <input type="number" step="0.01" className="w-full mt-1 bg-gray-700 border border-gray-600 rounded p-2 text-white"
                  value={formData.app_params.send_interval_s} onChange={e => handleNestedChange('app_params', 'send_interval_s', e.target.value)} />
              </label>
              <label className="block">
                <span className="text-gray-300 text-sm">Packet Size (B)</span>
                <input type="number" className="w-full mt-1 bg-gray-700 border border-gray-600 rounded p-2 text-white"
                  value={formData.app_params.packet_size_b} onChange={e => handleNestedChange('app_params', 'packet_size_b', e.target.value)} />
              </label>
              <label className="block">
                <span className="text-gray-300 text-sm">TX Power (dBm)</span>
                <input type="number" className="w-full mt-1 bg-gray-700 border border-gray-600 rounded p-2 text-white"
                  value={formData.net_params.tx_power_dbm} onChange={e => handleNestedChange('net_params', 'tx_power_dbm', e.target.value)} />
              </label>
              <label className="block">
                <span className="text-gray-300 text-sm">Bitrate (Mbps)</span>
                <input type="number" className="w-full mt-1 bg-gray-700 border border-gray-600 rounded p-2 text-white"
                  value={formData.net_params.bitrate_mbps} onChange={e => handleNestedChange('net_params', 'bitrate_mbps', e.target.value)} />
              </label>
            </div>
          </fieldset>
        </div>
      </div>

      {/* Attack Section (Full Width) */}
      <fieldset className="bg-gray-800 p-6 rounded-lg shadow-md border border-gray-700">
        <div className="flex items-center justify-between mb-6 border-b border-gray-700 pb-2">
             <legend className="text-xl font-semibold text-red-400">Cyber Attack</legend>
             <label className="flex items-center space-x-3 cursor-pointer bg-gray-700 px-4 py-2 rounded hover:bg-gray-600 transition">
                <input type="checkbox" className="w-5 h-5 text-red-600 rounded focus:ring-red-500"
                    name="execute_with_attack" checked={formData.execute_with_attack} onChange={handleChange} />
                <span className="text-white font-medium">Enable Drone Attack</span>
            </label>
        </div>
        
        {formData.execute_with_attack && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-fade-in">
            <label className="block">
              <span className="text-gray-300 text-sm">Start Time (s)</span>
              <input type="number" className="w-full mt-1 bg-gray-700 border border-gray-600 rounded p-2 text-white"
                value={formData.jamming_params.start_time_s} onChange={e => handleNestedChange('jamming_params', 'start_time_s', e.target.value)} />
            </label>
            <label className="block">
              <span className="text-gray-300 text-sm">Stop Time (s)</span>
              <input type="number" className="w-full mt-1 bg-gray-700 border border-gray-600 rounded p-2 text-white"
                value={formData.jamming_params.stop_time_s} onChange={e => handleNestedChange('jamming_params', 'stop_time_s', e.target.value)} />
            </label>
            <label className="block">
              <span className="text-gray-300 text-sm">Power (dBm)</span>
              <input type="number" className="w-full mt-1 bg-gray-700 border border-gray-600 rounded p-2 text-white"
                value={formData.jamming_params.power_dbm} onChange={e => handleNestedChange('jamming_params', 'power_dbm', e.target.value)} />
            </label>
            <label className="block">
              <span className="text-gray-300 text-sm">Drone Speed (m/s)</span>
              <input type="number" className="w-full mt-1 bg-gray-700 border border-gray-600 rounded p-2 text-white"
                value={formData.jamming_params.speed_ms} onChange={e => handleNestedChange('jamming_params', 'speed_ms', e.target.value)} />
            </label>
          </div>
        )}
        {!formData.execute_with_attack && (
            <p className="text-gray-500 text-center italic">Enable attack to configure Jammer/Drone parameters.</p>
        )}
      </fieldset>

      {/* Actions */}
      <div className="flex justify-end pt-4">
        <button
          type="submit"
          disabled={loading}
          className={`px-8 py-4 text-lg font-bold rounded-lg shadow-lg transform transition hover:scale-105 ${loading ? 'bg-gray-600 cursor-not-allowed' : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-500 hover:to-purple-500'}`}
        >
          {loading ? "Generating Files..." : "Generate Simulation ZIP"}
        </button>
      </div>
    </form>
  )
}