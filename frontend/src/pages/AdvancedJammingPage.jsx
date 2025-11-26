import axios from 'axios';
import L from 'leaflet';
import React, { useEffect, useState } from 'react';
import { Circle, GeoJSON, MapContainer, Marker, Polyline, Popup, TileLayer, useMapEvents } from 'react-leaflet';

// --- UI HELPERS (ÍCONES) ---
const createIcon = (emoji, color) => L.divIcon({
  className: 'custom-div-icon',
  html: `<div style='font-size: 28px; color: ${color}; filter: drop-shadow(2px 2px 1px rgba(0,0,0,0.5));'>${emoji}</div>`,
  iconSize: [30, 30], iconAnchor: [15, 30]
});

const droneIcon = createIcon("🚁", "#D32F2F"); // Vermelho mais forte
const towerIcon = createIcon("📡", "#E65100"); // Laranja escuro
const rsuIcon = createIcon("🗼", "#0288D1");   // Azul forte
const startIcon = createIcon("🚗", "#00FF00"); // Carro vermelho 
const endIcon = createIcon("🏁", "#000000");   // Preto

// --- PERFORMANCE: GEOJSON OTIMIZADO ---
const MemoizedGeoJsonLayer = React.memo(function GeoJsonLayer({ mapName }) {
  const [geoData, setGeoData] = useState(null);
  const map = useMapEvents({});

  useEffect(() => {
    if (!mapName) { setGeoData(null); return; }
    const geoJsonFile = mapName.replace('.net.xml', '.geojson');
    setGeoData(null); // Limpa anterior

    fetch(`/maps/${geoJsonFile}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if(data) {
            setGeoData(data);
            const bounds = L.geoJSON(data).getBounds();
            if (bounds.isValid()) map.fitBounds(bounds);
        }
      });
  }, [mapName, map]);

  // COR ALTERADA: Azul escuro (#1e3a8a) para contrastar com o mapa claro
  return geoData ? <GeoJSON data={geoData} style={{color:"#1e3a8a", weight:2, opacity: 0.6}} /> : null;
});

// --- HANDLER DE CLIQUES ---
function MapClickHandler({ mode, activeType, onClick }) {
  useMapEvents({ click(e) { onClick(mode, activeType, e.latlng); } });
  return null;
}

// --- PÁGINA PRINCIPAL ---
export default function AdvancedJammingPage() {
  
  const [formData, setFormData] = useState({
    simulation_name: "Advanced_Sim", 
    map_name: "", 
    simulation_time: 120, 
    random_seed: 1234,
    num_fixed_vehicles: 1, 
    num_random_vehicles: 30,
    vehicle_distribution: "heterogeneous", 
    app_params: { send_interval_s: 0.1, packet_size_b: 256 },
    net_params: { tx_power_dbm: 23, bitrate_mbps: 6 },
    mitigation_active: false, 
    reroute_on_attack: false,
    jamming_params: { 
        start_time_s: 20, 
        stop_time_s: 100, 
        power_dbm: 30, // Alterar isso mudará o raio visualmente
        strategy: "constant",
    }
  });

  const [availableMaps, setMaps] = useState([]);
  const [mode, setMode] = useState('jammer'); 
  const [activeJammerType, setActiveJammerType] = useState('DroneJammer');
  const [jammers, setJammers] = useState([]); 
  const [rsus, setRsus] = useState([]);
  const [route, setRoute] = useState({start: null, end: null});
  const [showBg, setShowBg] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    axios.get("http://localhost:8000/api/maps").then(r => setMaps(r.data.filter(m => m.endsWith(".xml"))));
  }, []);

  const handleMapClick = (currMode, currType, latlng) => {
    if (currMode === 'jammer') setJammers(p => [...p, { ...latlng, type: currType }]);
    if (currMode === 'rsu') setRsus(p => [...p, latlng]);
    if (currMode === 'start') { setRoute(p => ({...p, start: latlng})); setMode('end'); }
    if (currMode === 'end') { setRoute(p => ({...p, end: latlng})); setMode('jammer'); }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(p => ({ ...p, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleNestedChange = (group, field, val) => {
    setFormData(p => ({...p, [group]: {...p[group], [field]: val}}));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError(null);
    if (!formData.map_name) { setError("Please select a map."); setLoading(false); return; }

    const defaultType = jammers.length > 0 ? jammers[0].type : "DroneJammer";

    const payload = {
        ...formData,
        jamming_params: { ...formData.jamming_params, jammer_type: defaultType },
        simulation_time: parseInt(formData.simulation_time),
        num_fixed_vehicles: parseInt(formData.num_fixed_vehicles),
        num_random_vehicles: parseInt(formData.num_random_vehicles),
        random_seed: parseInt(formData.random_seed),
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
    } catch (err) { setError("Backend Error. Check console."); } 
    finally { setLoading(false); }
  };

  // --- CÁLCULO VISUAL DO RAIO ---
  // Apenas visual: dBm * 15 metros (Ex: 20dBm = 300m, 30dBm = 450m)
  const getVisualRadius = (dbm) => {
      const val = parseFloat(dbm);
      return isNaN(val) ? 100 : Math.max(50, val * 15);
  };

  // Styles
  const sectionTitle = "text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 border-b border-gray-700 pb-1";
  const inputGroup = "grid grid-cols-2 gap-2 mb-2";
  const inputStyle = "w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-xs text-white focus:border-blue-500 focus:outline-none";
  const labelStyle = "block text-[10px] text-gray-400 mb-0.5";

  return (
    <div className="flex h-screen bg-[#f0f0f0] text-gray-800 font-sans overflow-hidden">
      
      {/* --- SIDEBAR (Mantida escura para contraste profissional) --- */}
      <div className="w-[360px] flex-shrink-0 bg-[#1e1e1e] border-r border-gray-800 flex flex-col h-full shadow-2xl z-20 text-gray-200">
        <div className="p-4 border-b border-gray-700 bg-[#252525]">
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
               <span className="text-blue-500">⚡</span> Advanced <span className="font-light text-gray-400">Simulations</span>
            </h1>
        </div>

        <div className="flex-grow overflow-y-auto p-4 custom-scrollbar space-y-4">
            {error && <div className="bg-red-900/50 border border-red-500 p-2 text-xs rounded text-white">{error}</div>}
            
            {/* 1. CONFIG */}
            <div>
                <h3 className={sectionTitle}>Simulation Config</h3>
                <div className="mb-2">
                    <label className={labelStyle}>Project Name</label>
                    <input className={inputStyle} name="simulation_name" value={formData.simulation_name} onChange={handleChange} />
                </div>
                <div className="mb-2">
                    <label className={labelStyle}>Map File</label>
                    <select className={inputStyle} name="map_name" value={formData.map_name} onChange={handleChange}>
                        <option value="">Select Map...</option>
                        {availableMaps.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                </div>
                <div className={inputGroup}>
                    <div><label className={labelStyle}>Time (s)</label><input type="number" className={inputStyle} name="simulation_time" value={formData.simulation_time} onChange={handleChange} /></div>
                    <div><label className={labelStyle}>Seed</label><input type="number" className={inputStyle} name="random_seed" value={formData.random_seed} onChange={handleChange} /></div>
                </div>
            </div>

            {/* 2. TRAFFIC */}
            <div>
                <h3 className={sectionTitle} style={{borderColor:'#10b981'}}>Traffic & Fleet</h3>
                <div className={inputGroup}>
                    <div><label className={labelStyle}>Random Vehicles</label><input type="number" className={inputStyle} name="num_random_vehicles" value={formData.num_random_vehicles} onChange={handleChange} /></div>
                    <div><label className={labelStyle}>Fixed Fleet</label><input type="number" className={inputStyle} name="num_fixed_vehicles" value={formData.num_fixed_vehicles} onChange={handleChange} /></div>
                </div>
                <div>
                    <label className={labelStyle}>Distribution</label>
                    <select className={inputStyle} name="vehicle_distribution" value={formData.vehicle_distribution} onChange={handleChange}>
                        <option value="heterogeneous">Heterogeneous (Mixed)</option>
                        <option value="homogeneous">Homogeneous (Cars Only)</option>
                    </select>
                </div>
            </div>

            {/* 3. V2X */}
            <div>
                <h3 className={sectionTitle} style={{borderColor:'#3b82f6'}}>V2X & Network</h3>
                <div className={inputGroup}>
                    <div><label className={labelStyle}>Interval (s)</label><input type="number" step="0.01" className={inputStyle} value={formData.app_params.send_interval_s} onChange={e=>handleNestedChange('app_params','send_interval_s',e.target.value)} /></div>
                    <div><label className={labelStyle}>Packet Size (B)</label><input type="number" className={inputStyle} value={formData.app_params.packet_size_b} onChange={e=>handleNestedChange('app_params','packet_size_b',e.target.value)} /></div>
                </div>
                <div className={inputGroup}>
                    <div><label className={labelStyle}>TX Power (dBm)</label><input type="number" className={inputStyle} value={formData.net_params.tx_power_dbm} onChange={e=>handleNestedChange('net_params','tx_power_dbm',e.target.value)} /></div>
                    <div><label className={labelStyle}>Bitrate (Mbps)</label><input type="number" className={inputStyle} value={formData.net_params.bitrate_mbps} onChange={e=>handleNestedChange('net_params','bitrate_mbps',e.target.value)} /></div>
                </div>
            </div>

            {/* 4. JAMMING */}
            <div>
                <h3 className={sectionTitle} style={{borderColor:'#ef4444'}}>Jamming Settings</h3>
                <div className={inputGroup}>
                    <div><label className={labelStyle}>Strategy</label>
                        <select className={inputStyle} value={formData.jamming_params.strategy} onChange={e=>handleNestedChange('jamming_params','strategy', e.target.value)}>
                            <option value="constant">Constant</option>
                            <option value="reactive">Reactive</option>
                            <option value="random">Random</option>
                        </select>
                    </div>
                    {/* AQUI: O evento onChange atualiza o estado, que recalcul o raio no mapa */}
                    <div><label className={labelStyle}>Power (dBm)</label><input type="number" className={inputStyle} value={formData.jamming_params.power_dbm} onChange={e=>handleNestedChange('jamming_params','power_dbm', e.target.value)} /></div>
                </div>
                <div className={inputGroup}>
                    <div><label className={labelStyle}>Start (s)</label><input type="number" className={inputStyle} value={formData.jamming_params.start_time_s} onChange={e=>handleNestedChange('jamming_params','start_time_s', e.target.value)} /></div>
                    <div><label className={labelStyle}>Stop (s)</label><input type="number" className={inputStyle} value={formData.jamming_params.stop_time_s} onChange={e=>handleNestedChange('jamming_params','stop_time_s', e.target.value)} /></div>
                </div>
            </div>

            {/* 5. MITIGATION */}
            <div>
                <h3 className={sectionTitle} style={{borderColor:'#eab308'}}>Defense</h3>
                <div className="bg-gray-800 p-2 rounded border border-gray-700 flex flex-col gap-2">
                    <label className="flex items-center gap-2 cursor-pointer text-xs">
                        <input type="checkbox" className="accent-blue-500" name="mitigation_active" checked={formData.mitigation_active} onChange={handleChange} />
                        Active Mitigation
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-xs">
                        <input type="checkbox" className="accent-blue-500" name="reroute_on_attack" checked={formData.reroute_on_attack} onChange={handleChange} />
                        Reroute on Detection
                    </label>
                </div>
            </div>
        </div>

        <div className="p-4 border-t border-gray-700 bg-[#252525]">
            <button onClick={handleSubmit} disabled={loading} className={`w-full py-3 rounded font-bold text-xs uppercase tracking-widest transition shadow-lg ${loading ? 'bg-gray-600' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500'} text-white`}>
                {loading ? "PROCESSING..." : "DOWNLOAD ZIP"}
            </button>
        </div>
      </div>

      {/* --- MAPA AREA --- */}
      <div className="flex-1 relative bg-white">
        
        {/* TOOLBAR */}
        <div className="absolute top-4 left-4 z-[1000] flex flex-col gap-2">
            <div className="bg-white border border-gray-300 p-1 rounded shadow-xl flex gap-1">
                <button onClick={()=>{setMode('jammer'); setActiveJammerType('DroneJammer')}} className={`w-8 h-8 flex items-center justify-center rounded border ${mode==='jammer'&&activeJammerType==='DroneJammer' ? 'bg-red-100 border-red-500 text-red-600 shadow-inner':'border-transparent text-gray-500 hover:bg-gray-100'}`} title="Drone Jammer">🚁</button>
                <button onClick={()=>{setMode('jammer'); setActiveJammerType('NRJammer')}} className={`w-8 h-8 flex items-center justify-center rounded border ${mode==='jammer'&&activeJammerType==='NRJammer' ? 'bg-orange-100 border-orange-500 text-orange-600 shadow-inner':'border-transparent text-gray-500 hover:bg-gray-100'}`} title="Static Jammer">📡</button>
                <div className="w-px bg-gray-300 mx-1 my-1"></div>
                <button onClick={()=>setMode('rsu')} className={`w-8 h-8 flex items-center justify-center rounded border ${mode==='rsu' ? 'bg-blue-100 border-blue-500 text-blue-600 shadow-inner':'border-transparent text-gray-500 hover:bg-gray-100'}`} title="RSU">🗼</button>
                <div className="w-px bg-gray-300 mx-1 my-1"></div>
                <button onClick={()=>setMode('start')} className={`w-8 h-8 flex items-center justify-center rounded border ${mode==='start' ? 'bg-green-100 border-green-500 text-green-600 shadow-inner':'border-transparent text-gray-500 hover:bg-gray-100'}`} title="Start Route">🟢</button>
                <button onClick={()=>setMode('end')} className={`w-8 h-8 flex items-center justify-center rounded border ${mode==='end' ? 'bg-gray-200 border-gray-500 text-black shadow-inner':'border-transparent text-gray-500 hover:bg-gray-100'}`} title="End Route">🏁</button>
            </div>
            
            <div className="bg-white border border-gray-300 px-2 py-1 rounded shadow-xl text-[11px] font-mono text-gray-600 flex justify-between items-center">
                <span>J: {jammers.length} | R: {rsus.length}</span>
                <button onClick={()=>{setJammers([]); setRsus([]); setRoute({start:null,end:null})}} className="ml-2 text-red-500 hover:text-red-700 uppercase font-bold text-[10px]">Clear</button>
            </div>
        </div>

        <MapContainer center={[-15.79, -47.88]} zoom={13} style={{height:'100%', width:'100%', background:'#f0f0f0'}}>
            {/* VOLTEI PARA O OPENSTREETMAP PADRÃO (CLARO) */}
            {showBg && <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OSM" />}
            
            <MemoizedGeoJsonLayer mapName={formData.map_name} />
            <MapClickHandler mode={mode} activeType={activeJammerType} onClick={handleMapClick} />
            
            {route.start && route.end && <Polyline positions={[route.start, route.end]} pathOptions={{color: '#2E7D32', weight: 4, dashArray:'10,10', opacity:0.8}} />}
            
            {jammers.map((j, i) => (
                <div key={`j-${i}`}>
                    <Marker position={j} icon={j.type==='DroneJammer'?droneIcon:towerIcon}>
                         <Popup>
                            <strong>{j.type}</strong><br/>
                            {formData.jamming_params.power_dbm} dBm
                         </Popup>
                    </Marker>
                    {/* RAIO DINÂMICO AQUI: Usa getVisualRadius passando o valor atual do formulário */}
                    <Circle 
                        center={j} 
                        radius={getVisualRadius(formData.jamming_params.power_dbm)} 
                        pathOptions={{ 
                            color: j.type==='DroneJammer'?'#D32F2F':'#E65100', 
                            fillColor: j.type==='DroneJammer'?'#D32F2F':'#E65100', 
                            opacity:0.3, fillOpacity:0.2 
                        }} 
                    />
                </div>
            ))}
            
            {rsus.map((r, i) => (
              <div key={`r-${i}`}>
                <Marker position={r} icon={rsuIcon}><Popup>RSU {i+1}</Popup></Marker>
                {/* RSU com raio azul fixo para D2I */}
                <Circle center={r} radius={250} pathOptions={{ color: '#0288D1', fillColor: '#0288D1', opacity:0.3, fillOpacity:0.2 }} />
              </div>
            ))}

            {route.start && <Marker position={route.start} icon={startIcon} />}
            {route.end && <Marker position={route.end} icon={endIcon} />}
        </MapContainer>
        
        {/* BOTÃO DE BACKGROUND MELHORADO E VISÍVEL */}
        <div className="absolute bottom-5 right-5 z-[1000]">
             <button 
                onClick={()=>setShowBg(!showBg)}
                className={`px-4 py-2 rounded font-bold text-xs shadow-lg transition border-2 ${showBg ? 'bg-white text-gray-800 border-gray-300 hover:bg-gray-50' : 'bg-gray-800 text-white border-gray-600 hover:bg-gray-700'}`}
             >
                {showBg ? 'HIDE MAP LAYER' : 'SHOW MAP LAYER'}
             </button>
        </div>

      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #1e1e1e; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #444; border-radius: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #555; }
        /* Popup claro para combinar com o mapa */
        .leaflet-popup-content-wrapper, .leaflet-popup-tip { background: white; color: #333; border: 1px solid #ccc; box-shadow: 0 3px 14px rgba(0,0,0,0.4); }
      `}</style>
    </div>
  )
}