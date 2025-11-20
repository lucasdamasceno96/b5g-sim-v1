import axios from 'axios';
import L from 'leaflet';
import { useEffect, useState } from 'react';
import { GeoJSON, MapContainer, Marker, Popup, TileLayer, useMapEvents } from 'react-leaflet';

// --- UI Helpers (Icons) ---
const createIcon = (emoji, color) => L.divIcon({
  className: 'custom-div-icon',
  html: `<div style='font-size: 24px; color: ${color}; text-shadow: 0 0 3px black;'>${emoji}</div>`,
  iconSize: [24, 24], iconAnchor: [12, 24]
});

const jammerIcon = createIcon("🚁", "#FF0000"); // Drone Jammer
const staticJammerIcon = createIcon("📡", "#FF4500"); // Static Jammer
const rsuIcon = createIcon("🗼", "#0077B6"); // RSU
const startIcon = createIcon("🚗", "#00FF00"); // Route Start
const endIcon = createIcon("🏁", "#FFFFFF"); // Route End

// --- Map Components ---
function GeoJsonLayer({ mapName }) {
  const [geoData, setGeoData] = useState(null);
  const map = useMapEvents({});

  useEffect(() => {
    if (!mapName) { setGeoData(null); return; }
    
    const geoJsonFile = mapName.replace('.net.xml', '.geojson');
    const path = `/maps/${geoJsonFile}`;

    fetch(path)
      .then(res => {
        if(!res.ok) throw new Error(`404 - Map file not found: ${path}`); 
        return res.json()
      })
      .then(data => {
        setGeoData(data);
        const bounds = L.geoJSON(data).getBounds();
        if (bounds.isValid()) map.fitBounds(bounds);
      })
      .catch(e => {
        console.error("Error loading GeoJSON:", e);
        setGeoData(null);
      });
  }, [mapName, map]);

  return geoData ? <GeoJSON data={geoData} style={{color:"#555", weight:2}} /> : null;
}

function MapClickHandler({ mode, onClick }) {
  useMapEvents({ click(e) { onClick(mode, e.latlng); } });
  return null;
}

// --- Main Component ---
export default function AdvancedJammingPage() {
  // STATE COMPLETO (Com todos os parâmetros do Framework)
  const [formData, setFormData] = useState({
    simulation_name: "Advanced_Sim", 
    map_name: "", 
    simulation_time: 120, 
    random_seed: 1234,
    
    // Tráfego
    num_fixed_vehicles: 0, 
    num_random_vehicles: 50,
    vehicle_distribution: "heterogeneous", 
    communication_mode: "D2D",
    
    // Parâmetros Técnicos (Restaurados)
    app_params: { send_interval_s: 0.1, packet_size_b: 256 },
    net_params: { tx_power_dbm: 23, bitrate_mbps: 6 },
    
    // Mitigação (Restaurada)
    mitigation_active: false, 
    reroute_on_attack: false,
    
    // Ataque
    jamming_params: { 
        start_time_s: 20, 
        stop_time_s: 100, 
        power_dbm: 20, 
        strategy: "constant", 
        jammer_type: "DroneJammer"
    }
  });

  const [availableMaps, setMaps] = useState([]);
  const [mode, setMode] = useState('jammer');
  const [jammers, setJammers] = useState([]);
  const [rsus, setRsus] = useState([]);
  const [route, setRoute] = useState({start: null, end: null});
  const [showBg, setShowBg] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    axios.get("http://localhost:8000/api/maps")
         .then(r => setMaps(r.data.filter(m => m.endsWith(".xml"))))
         .catch(e => setError("Failed to load maps."));
  }, []);

  // Handlers
  const handleMapClick = (m, latlng) => {
    if (m === 'jammer') setJammers(p => [...p, latlng]);
    if (m === 'rsu') setRsus(p => [...p, latlng]);
    if (m === 'start') setRoute(p => ({...p, start: latlng}));
    if (m === 'end') setRoute(p => ({...p, end: latlng}));
    if (m === 'start' || m === 'end') setMode('jammer');
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleNestedChange = (group, field, val) => {
    setFormData(p => ({...p, [group]: {...p[group], [field]: val}}));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!formData.map_name) { setError("Please select a map."); setLoading(false); return; }

    // Prepara Payload
    const payload = {
        ...formData,
        // Converte números
        simulation_time: parseInt(formData.simulation_time),
        num_fixed_vehicles: parseInt(formData.num_fixed_vehicles),
        num_random_vehicles: parseInt(formData.num_random_vehicles),
        random_seed: parseInt(formData.random_seed),
        
        // Topologia Visual
        attack_placement: "fixed",
        jammers_list: jammers,
        rsus_list: rsus,
        fixed_routes_list: (formData.num_fixed_vehicles > 0 && route.start && route.end) 
            ? [{ start: route.start, end: route.end, count: parseInt(formData.num_fixed_vehicles) }] : []
    };
    
    try {
        const res = await axios.post("http://localhost:8000/api/simulations/generate_advanced_zip", payload, {responseType:'blob'});
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const link = document.createElement('a');
        link.href = url; link.setAttribute('download', `${formData.simulation_name}.zip`);
        document.body.appendChild(link); link.click(); link.remove();
    } catch (err) {
        console.error(err);
        setError("Backend error. Check console/logs.");
    } finally {
        setLoading(false);
    }
  };

  // Estilo dos botões de modo
  const getModeBtnClass = (btnMode) => {
     let base = "px-3 py-1 text-sm transition border-r border-gray-600 last:border-0 ";
     if (mode === btnMode) {
        if (btnMode === 'jammer') return base + "bg-red-600 text-white";
        if (btnMode === 'rsu') return base + "bg-blue-600 text-white";
        if (btnMode === 'start') return base + "bg-green-600 text-white";
        if (btnMode === 'end') return base + "bg-white text-black";
     }
     return base + "bg-gray-700 hover:bg-gray-600 text-gray-300";
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-screen p-4 bg-gray-900 text-white overflow-hidden">
      
      {/* --- COLUNA 1: FORMULÁRIO COMPLETO --- */}
      <div className="lg:col-span-1 overflow-y-auto pr-2 h-full custom-scrollbar">
        <form onSubmit={handleSubmit} className="space-y-6 bg-gray-800 p-5 rounded shadow-lg">
          
          {/* Header */}
          <div className="border-b border-gray-700 pb-2">
            <h2 className="text-2xl font-bold text-indigo-400">Setup Simulation</h2>
            {error && <div className="mt-2 bg-red-900/50 border border-red-500 text-red-200 p-2 rounded text-sm">{error}</div>}
          </div>
          
          {/* 1. Basic Config */}
          <div className="space-y-3">
              <label className="block text-sm text-gray-400">Simulation Name</label>
              <input className="input-field" name="simulation_name" value={formData.simulation_name} onChange={handleChange} />
              
              <label className="block text-sm text-gray-400">Map File (.net.xml)</label>
              <select className="input-field" name="map_name" value={formData.map_name} onChange={handleChange}>
                <option value="">Select a map...</option>
                {availableMaps.map(m => <option key={m} value={m}>{m}</option>)}
              </select>

              <div className="grid grid-cols-2 gap-3">
                  <div>
                      <label className="block text-sm text-gray-400">Duration (s)</label>
                      <input type="number" className="input-field" name="simulation_time" value={formData.simulation_time} onChange={handleChange} />
                  </div>
                  <div>
                      <label className="block text-sm text-gray-400">Seed</label>
                      <input type="number" className="input-field" name="random_seed" value={formData.random_seed} onChange={handleChange} />
                  </div>
              </div>
          </div>

          {/* 2. Traffic */}
          <fieldset className="border-t border-gray-700 pt-4">
            <legend className="text-green-400 font-bold mb-2 px-1">Traffic</legend>
             <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="block text-xs text-gray-400 mb-1">Random Vehicles</label>
                    <input type="number" className="input-field" name="num_random_vehicles" value={formData.num_random_vehicles} onChange={handleChange} />
                </div>
                <div>
                    <label className="block text-xs text-gray-400 mb-1">Fixed Fleet (Route)</label>
                    <input type="number" className="input-field" name="num_fixed_vehicles" value={formData.num_fixed_vehicles} onChange={handleChange} />
                </div>
            </div>
            <div className="mt-2">
                <label className="block text-xs text-gray-400 mb-1">Vehicle Distribution</label>
                <select className="input-field" name="vehicle_distribution" value={formData.vehicle_distribution} onChange={handleChange}>
                    <option value="heterogeneous">Heterogeneous (Mixed Types)</option>
                    <option value="homogeneous">Homogeneous (Same Type)</option>
                </select>
            </div>
          </fieldset>

          {/* 3. V2X & Network (RESTAURADO!) */}
          <fieldset className="border-t border-gray-700 pt-4">
            <legend className="text-blue-400 font-bold mb-2 px-1">V2X & Network</legend>
             <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="block text-xs text-gray-400 mb-1">App Interval (s)</label>
                    <input type="number" step="0.01" className="input-field" value={formData.app_params.send_interval_s} onChange={e=>handleNestedChange('app_params', 'send_interval_s', e.target.value)} />
                </div>
                <div>
                    <label className="block text-xs text-gray-400 mb-1">Packet Size (bytes)</label>
                    <input type="number" className="input-field" value={formData.app_params.packet_size_b} onChange={e=>handleNestedChange('app_params', 'packet_size_b', e.target.value)} />
                </div>
                <div>
                    <label className="block text-xs text-gray-400 mb-1">TX Power (dBm)</label>
                    <input type="number" className="input-field" value={formData.net_params.tx_power_dbm} onChange={e=>handleNestedChange('net_params', 'tx_power_dbm', e.target.value)} />
                </div>
                <div>
                    <label className="block text-xs text-gray-400 mb-1">Bitrate (Mbps)</label>
                    <input type="number" className="input-field" value={formData.net_params.bitrate_mbps} onChange={e=>handleNestedChange('net_params', 'bitrate_mbps', e.target.value)} />
                </div>
            </div>
          </fieldset>

          {/* 4. Jamming Attack */}
          <fieldset className="border-t border-gray-700 pt-4">
            <legend className="text-red-400 font-bold mb-2 px-1">Jamming Attack</legend>
            
            <label className="block text-xs text-gray-400 mb-1">Jammer Type</label>
            <select className="input-field mb-3" value={formData.jamming_params.jammer_type} onChange={e=>handleNestedChange('jamming_params', 'jammer_type', e.target.value)}>
                <option value="DroneJammer">Drone (Mobile 🚁)</option>
                <option value="NRJammer">Tower (Static 📡)</option>
            </select>
            
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="block text-xs text-gray-400 mb-1">Power (dBm)</label>
                    <input type="number" className="input-field" value={formData.jamming_params.power_dbm} onChange={e=>handleNestedChange('jamming_params','power_dbm', e.target.value)} />
                </div>
                <div>
                    <label className="block text-xs text-gray-400 mb-1">Strategy</label>
                    <select className="input-field" value={formData.jamming_params.strategy} onChange={e=>handleNestedChange('jamming_params','strategy', e.target.value)}>
                        <option value="constant">Constant</option>
                        <option value="reactive">Reactive</option>
                        <option value="random">Random</option>
                    </select>
                </div>
                <div>
                    <label className="block text-xs text-gray-400 mb-1">Start Time (s)</label>
                    <input type="number" className="input-field" value={formData.jamming_params.start_time_s} onChange={e=>handleNestedChange('jamming_params','start_time_s', e.target.value)} />
                </div>
                <div>
                    <label className="block text-xs text-gray-400 mb-1">End Time (s)</label>
                    <input type="number" className="input-field" value={formData.jamming_params.stop_time_s} onChange={e=>handleNestedChange('jamming_params','stop_time_s', e.target.value)} />
                </div>
            </div>
          </fieldset>

          {/* 5. Mitigation (RESTAURADO!) */}
          <fieldset className="border-t border-gray-700 pt-4">
             <legend className="text-yellow-400 font-bold mb-2 px-1">Defense / Mitigation</legend>
             <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 rounded bg-gray-700 border-gray-600 text-indigo-600" 
                           name="mitigation_active" checked={formData.mitigation_active} onChange={handleChange} />
                    <span className="text-gray-300 text-sm">Active Defense</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 rounded bg-gray-700 border-gray-600 text-indigo-600" 
                           name="reroute_on_attack" checked={formData.reroute_on_attack} onChange={handleChange} />
                    <span className="text-gray-300 text-sm">Reroute Vehicles on Attack</span>
                </label>
             </div>
          </fieldset>

          <div className="pt-4 pb-4">
             <button type="submit" disabled={loading} 
                className={`w-full py-3 rounded font-bold shadow-lg transform transition hover:scale-105 ${loading ? 'bg-gray-600 cursor-not-allowed' : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white'}`}>
                {loading ? "Generating Files..." : "Download Simulation ZIP"}
             </button>
          </div>
        </form>
      </div>

      {/* --- COLUNA 2: MAPA E TOOLS --- */}
      <div className="lg:col-span-2 flex flex-col h-full">
        
        {/* Toolbar */}
        <div className="bg-gray-800 p-3 mb-3 rounded flex flex-wrap gap-4 items-center justify-between shadow border border-gray-700">
            <div className="flex items-center gap-3">
                <div className="flex flex-col">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Add Node</span>
                    <div className="flex rounded bg-gray-700 overflow-hidden">
                        <button onClick={()=>setMode('jammer')} className={getModeBtnClass('jammer')}>🚁 Jammer</button>
                        <button onClick={()=>setMode('rsu')} className={getModeBtnClass('rsu')}>🗼 RSU</button>
                    </div>
                </div>
                
                <div className="h-8 w-px bg-gray-600 mx-1"></div>

                <div className="flex flex-col">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Set Route</span>
                    <div className="flex rounded bg-gray-700 overflow-hidden">
                        <button onClick={()=>setMode('start')} className={getModeBtnClass('start')}>Start</button>
                        <button onClick={()=>setMode('end')} className={getModeBtnClass('end')}>End</button>
                    </div>
                </div>
            </div>
            
            <div className="flex items-center gap-4 text-sm font-mono bg-gray-900 px-3 py-1 rounded border border-gray-700">
                <label className="flex items-center cursor-pointer select-none text-gray-400 hover:text-white transition">
                    <input type="checkbox" className="mr-2 accent-indigo-500" checked={showBg} onChange={e=>setShowBg(e.target.checked)} /> 
                    Map Layer
                </label>
                <div className="w-px h-4 bg-gray-700"></div>
                <span className="text-red-400 font-bold">J: {jammers.length}</span>
                <span className="text-blue-400 font-bold">R: {rsus.length}</span>
                <button onClick={()=>{setJammers([]); setRsus([]); setRoute({start:null,end:null})}} 
                        className="text-xs text-red-400 hover:text-red-200 border border-red-900/50 hover:border-red-500 px-2 py-1 rounded transition ml-2">
                    RESET
                </button>
            </div>
        </div>

        {/* Mapa */}
        <div className="flex-grow bg-[#0c0c0c] rounded-lg overflow-hidden relative border border-gray-700 shadow-inner">
            <MapContainer center={[-15.79, -47.88]} zoom={4} style={{height:'100%', width:'100%', background:'#0c0c0c'}}>
                {showBg && <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OSM" />}
                
                <GeoJsonLayer key={formData.map_name} mapName={formData.map_name} />
                <MapClickHandler mode={mode} onClick={handleMapClick} />
                
                {jammers.map((pos,i) => <Marker key={`j${i}`} position={pos} icon={formData.jamming_params.jammer_type==='DroneJammer'?jammerIcon:staticJammerIcon}><Popup>Jammer {i+1}</Popup></Marker>)}
                {rsus.map((pos,i) => <Marker key={`r${i}`} position={pos} icon={rsuIcon}><Popup>RSU {i+1}</Popup></Marker>)}
                {route.start && <Marker position={route.start} icon={startIcon}><Popup>Start</Popup></Marker>}
                {route.end && <Marker position={route.end} icon={endIcon}><Popup>End</Popup></Marker>}
            </MapContainer>
        </div>
      </div>
      
      {/* CSS Inline para Inputs do Formulário */}
      <style>{`
        .input-field {
            width: 100%;
            background-color: #374151; /* bg-gray-700 */
            border: 1px solid #4B5563; /* border-gray-600 */
            color: white;
            padding: 0.5rem;
            border-radius: 0.375rem; /* rounded-md */
            font-size: 0.875rem; /* text-sm */
            outline: none;
            transition: border-color 0.2s;
        }
        .input-field:focus {
            border-color: #6366f1; /* indigo-500 */
        }
        /* Scrollbar Customizada */
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #1f2937; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #4b5563; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #6b7280; }
      `}</style>
    </div>
  )
}