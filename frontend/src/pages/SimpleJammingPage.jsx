import axios from 'axios';
import L from 'leaflet';
import React, { useEffect, useState } from 'react';
import { GeoJSON, MapContainer, TileLayer, useMapEvents } from 'react-leaflet';

// --- MAPA SOMENTE LEITURA (Visualização Otimizada Dark) ---
const MemoizedGeoJsonLayer = React.memo(({ mapName }) => {
  const [data, setData] = useState(null);
  const map = useMapEvents({});
  useEffect(() => {
    if(!mapName) { setData(null); return; }
    fetch(`/maps/${mapName.replace('.net.xml','.geojson')}`).then(r=>r.ok?r.json():null).then(d=>{ 
        if(d){ setData(d); map.fitBounds(L.geoJSON(d).getBounds()); }
    });
  }, [mapName, map]);
  
  // COR NEON PARA CONTRASTE NO DARK MODE
  return data ? <GeoJSON data={data} style={{color:"#22d3ee", weight:1.5, opacity:0.7}} /> : null;
});

export default function SimpleJammingPage() {
  const [maps, setMaps] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Estado Simplificado (Abstração)
  const [config, setConfig] = useState({
      simulation_name: "Simple_Experiment",
      map_name: "",
      duration: 60,
      vehicle_count: 50,
      attack_enabled: true,
      attack_intensity: "medium", // low, medium, high
      jammer_density: "sparse"    // sparse (5%), balanced (10%), dense (20%)
  });

  useEffect(() => { 
      axios.get("http://localhost:8000/api/maps")
           .then(r => setMaps(r.data.filter(m => m.endsWith(".xml")))); 
  }, []);

  const handleSubmit = async (e) => {
      e.preventDefault();
      if(!config.map_name) return alert("Select a map!");
      setLoading(true);

      // TRADUÇÃO: Abstração -> Parâmetros Técnicos
      const intensityMap = { low: 10, medium: 23, high: 40 }; // dBm
      const densityMap = { sparse: 0.05, balanced: 0.10, dense: 0.20 }; // % da frota

      const payload = {
          simulation_name: config.simulation_name,
          map_name: config.map_name,
          simulation_time: parseInt(config.duration),
          total_vehicles: parseInt(config.vehicle_count),
          random_seed: Math.floor(Math.random() * 10000),
          communication_mode: "D2D",
          execute_with_attack: config.attack_enabled,
          
          // Parâmetros V2X Padrão
          app_params: { send_interval_s: 0.1, packet_size_b: 300 },
          net_params: { tx_power_dbm: 23, bitrate_mbps: 6 },
          
          // Ataque calculado
          jamming_params: config.attack_enabled ? {
              start_time_s: 10,
              stop_time_s: parseInt(config.duration) - 10,
              power_dbm: intensityMap[config.attack_intensity],
              strategy: "constant",
              jammer_type: "DroneJammer"
          } : null
      };

      try {
          const res = await axios.post("http://localhost:8000/api/simulations/generate_zip", payload, { responseType: 'blob' });
          const url = window.URL.createObjectURL(new Blob([res.data]));
          const link = document.createElement('a');
          link.href = url; link.setAttribute('download', `${config.simulation_name}_SIMPLE.zip`);
          document.body.appendChild(link); link.click(); link.remove();
      } catch (err) { 
          console.error(err); alert("Error generating simulation."); 
      } finally { 
          setLoading(false); 
      }
  };

  // Dark Mode Styles
  const labelStyle = "block text-[10px] font-bold text-gray-400 uppercase mb-1 tracking-wider";
  const inputClass = "w-full bg-gray-700 border border-gray-600 text-white text-sm rounded focus:ring-cyan-500 focus:border-cyan-500 block p-2 outline-none transition";
  const cardClass = "bg-[#252525] p-5 rounded-lg shadow-lg border border-gray-700";

  return (
    <div className="flex h-screen bg-[#121212] font-sans text-gray-200 overflow-hidden">
      
      {/* --- PAINEL DE CONTROLE (Esquerda) --- */}
      <div className="w-[380px] flex-shrink-0 flex flex-col h-full border-r border-gray-800 bg-[#1e1e1e] shadow-2xl z-20">
        <div className="p-5 border-b border-gray-700 bg-[#252525]">
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="text-cyan-400">⚡</span> Quick<span className="text-gray-400 font-light">Sim</span>
            </h1>
            <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-widest">Automated Scientific Scenarios</p>
        </div>

        <div className="flex-grow overflow-y-auto p-5 space-y-5 custom-scrollbar">
            
            {/* 1. BASIC SETUP */}
            <div className={cardClass}>
                <h3 className="text-xs font-bold text-cyan-400 mb-3 uppercase border-b border-gray-700 pb-2">1. Environment</h3>
                <div className="space-y-3">
                    <div>
                        <label className={labelStyle}>Simulation Name</label>
                        <input className={inputClass} value={config.simulation_name} onChange={e=>setConfig({...config, simulation_name: e.target.value})} />
                    </div>
                    <div>
                        <label className={labelStyle}>Select Map</label>
                        <select className={inputClass} value={config.map_name} onChange={e=>setConfig({...config, map_name: e.target.value})}>
                            <option value="">Choose a location...</option>
                            {maps.map(m=><option key={m} value={m}>{m}</option>)}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div><label className={labelStyle}>Duration (s)</label><input type="number" className={inputClass} value={config.duration} onChange={e=>setConfig({...config, duration: e.target.value})}/></div>
                        <div><label className={labelStyle}>Vehicles</label><input type="number" className={inputClass} value={config.vehicle_count} onChange={e=>setConfig({...config, vehicle_count: e.target.value})}/></div>
                    </div>
                </div>
            </div>

            {/* 2. ATTACK CONFIG (Abstração) */}
            <div className={`${cardClass} transition-colors duration-300 ${config.attack_enabled ? 'border-red-900/50 bg-red-900/10' : 'border-gray-700'}`}>
                <div className="flex justify-between items-center mb-4">
                    <h3 className={`text-xs font-bold uppercase tracking-wider ${config.attack_enabled ? 'text-red-400' : 'text-gray-500'}`}>2. Threat Scenario</h3>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" checked={config.attack_enabled} onChange={e=>setConfig({...config, attack_enabled: e.target.checked})} />
                        <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-red-600"></div>
                    </label>
                </div>

                {config.attack_enabled && (
                    <div className="space-y-4 animate-fadeIn">
                        <div>
                            <label className={labelStyle}>Jamming Intensity</label>
                            <div className="flex gap-2 bg-gray-800 p-1 rounded-lg border border-gray-700">
                                {['low','medium','high'].map(lvl => (
                                    <button key={lvl} onClick={()=>setConfig({...config, attack_intensity: lvl})}
                                        className={`flex-1 py-1.5 rounded text-[10px] font-bold capitalize transition ${config.attack_intensity===lvl ? 'bg-red-600 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}>
                                        {lvl}
                                    </button>
                                ))}
                            </div>
                            <p className="text-[9px] text-gray-500 mt-1 text-right font-mono">
                                Est. Power: {config.attack_intensity==='low'?'10dBm':config.attack_intensity==='medium'?'23dBm':'40dBm'}
                            </p>
                        </div>

                        <div>
                            <label className={labelStyle}>Attacker Density</label>
                            <select className={inputClass} value={config.jammer_density} onChange={e=>setConfig({...config, jammer_density: e.target.value})}>
                                <option value="sparse">Sparse (5% of Fleet)</option>
                                <option value="balanced">Balanced (10% of Fleet)</option>
                                <option value="dense">Dense (20% of Fleet)</option>
                            </select>
                        </div>
                    </div>
                )}
            </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-700 bg-[#252525]">
            <button onClick={handleSubmit} disabled={loading} 
                className={`w-full py-3 rounded font-bold text-xs uppercase tracking-widest shadow-lg transform transition hover:scale-[1.02] ${loading ? 'bg-gray-600 cursor-not-allowed' : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white'}`}>
                {loading ? "Generating..." : "Generate Scientific Scenario"}
            </button>
        </div>
      </div>

      {/* --- MAPA (Visualização Passiva Dark) --- */}
      <div className="flex-1 relative bg-[#050505]">
          {/* Info Overlay */}
          <div className="absolute top-6 left-6 z-[1000] pointer-events-none">
              <div className="bg-black/80 backdrop-blur border border-gray-700 px-4 py-2 rounded shadow-xl">
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Selected Map</h4>
                  <p className="text-sm font-bold text-cyan-400">{config.map_name || "No map selected"}</p>
              </div>
          </div>

          <MapContainer center={[-15.79, -47.88]} zoom={13} style={{height:'100%', width:'100%', background:'#050505'}} zoomControl={false}>
              {/* CARTODB DARK MATTER TILES */}
              <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" attribution="&copy; CartoDB" />
              <MemoizedGeoJsonLayer mapName={config.map_name} />
          </MapContainer>
      </div>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #1e1e1e; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #444; border-radius: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #555; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out forwards; }
      `}</style>
    </div>
  )
}