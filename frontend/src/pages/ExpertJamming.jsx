import axios from 'axios';
import L from 'leaflet';
import React, { useEffect, useState } from 'react';
import { Circle, GeoJSON, MapContainer, Marker, Popup, TileLayer, useMapEvents } from 'react-leaflet';

// --- ÍCONES (Mesmo padrão visual) ---
const createIcon = (emoji, color) => L.divIcon({
  className: 'custom-div-icon',
  html: `<div style='font-size: 28px; color: ${color}; filter: drop-shadow(0px 2px 2px rgba(0,0,0,0.6)); display: flex; align-items: center; justify-content: center; width: 30px; height: 30px;'>${emoji}</div>`,
  iconSize: [30, 30], iconAnchor: [15, 30]
});

const icons = {
  car: createIcon("🚗", "#2E7D32"),
  drone: createIcon("🚁", "#D32F2F"),
  tower: createIcon("📡", "#E65100"),
  rsu: createIcon("🗼", "#0288D1")
};

// --- MODAL DE EDIÇÃO (O CORAÇÃO DA PÁGINA EXPERT) ---
const ConfigModal = ({ node, onClose, onSave }) => {
  const [params, setParams] = useState(node.params);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setParams(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-[2000] flex items-center justify-center backdrop-blur-sm">
      <div className="bg-[#1e1e1e] border border-gray-600 rounded-lg w-[400px] shadow-2xl text-gray-200 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-[#252525] rounded-t-lg">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <span>{node.type === 'car' ? '🚗 Car' : node.type === 'drone' ? '🚁 Drone' : node.type === 'tower' ? '📡 Tower' : '🗼 RSU'}</span>
            <span className="text-gray-500 text-sm">#{node.id}</span>
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
        </div>

        {/* Form Scrollable */}
        <div className="p-4 overflow-y-auto custom-scrollbar space-y-4">
          
          {/* Parâmetros Comuns (Física/Rede) */}
          <section>
            <h4 className="text-xs font-bold text-blue-400 uppercase mb-2">Network / PHY</h4>
            <div className="grid grid-cols-2 gap-3">
               <div>
                 <label className="text-[10px] text-gray-400 block mb-1">Tx Power (dBm)</label>
                 <input type="number" name="txPower" value={params.txPower} onChange={handleChange} className="w-full bg-gray-700 border border-gray-600 rounded p-1 text-sm"/>
               </div>
               {node.type === 'car' && (
                 <div>
                   <label className="text-[10px] text-gray-400 block mb-1">Packet Size (B)</label>
                   <input type="number" name="packetSize" value={params.packetSize} onChange={handleChange} className="w-full bg-gray-700 border border-gray-600 rounded p-1 text-sm"/>
                 </div>
               )}
            </div>
          </section>

          {/* Parâmetros Específicos de Carro */}
          {node.type === 'car' && (
            <section className="border-t border-gray-700 pt-3">
              <h4 className="text-xs font-bold text-green-400 uppercase mb-2">Application (V2X)</h4>
              <div className="space-y-3">
                <div>
                   <label className="text-[10px] text-gray-400 block mb-1">App Type</label>
                   <select name="appType" value={params.appType} onChange={handleChange} className="w-full bg-gray-700 border border-gray-600 rounded p-1 text-sm">
                      <option value="V2XApp">Basic V2X (Beaconing)</option>
                      <option value="V2XWarningApp">Warning (Event Driven)</option>
                   </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-gray-400 block mb-1">Interval (s)</label>
                    <input type="number" step="0.01" name="interval" value={params.interval} onChange={handleChange} className="w-full bg-gray-700 border border-gray-600 rounded p-1 text-sm"/>
                  </div>
                  <div className="flex items-center pt-4">
                    <label className="flex items-center gap-2 cursor-pointer text-xs">
                        <input type="checkbox" name="mitigation" checked={params.mitigation} onChange={handleChange} className="accent-green-500"/>
                        Active Defense
                    </label>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Parâmetros Específicos de Jammer */}
          {(node.type === 'drone' || node.type === 'tower') && (
            <section className="border-t border-gray-700 pt-3">
              <h4 className="text-xs font-bold text-red-400 uppercase mb-2">Attack Logic</h4>
              <div className="space-y-3">
                <div>
                   <label className="text-[10px] text-gray-400 block mb-1">Strategy</label>
                   <select name="strategy" value={params.strategy} onChange={handleChange} className="w-full bg-gray-700 border border-gray-600 rounded p-1 text-sm">
                      <option value="constant">Constant Jamming</option>
                      <option value="reactive">Reactive (On Sense)</option>
                      <option value="random">Random Bursts</option>
                   </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-gray-400 block mb-1">Start Time (s)</label>
                    <input type="number" name="start" value={params.start} onChange={handleChange} className="w-full bg-gray-700 border border-gray-600 rounded p-1 text-sm"/>
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400 block mb-1">Stop Time (s)</label>
                    <input type="number" name="stop" value={params.stop} onChange={handleChange} className="w-full bg-gray-700 border border-gray-600 rounded p-1 text-sm"/>
                  </div>
                </div>
                {node.type === 'drone' && (
                   <div className="border-t border-gray-700 pt-2 mt-2">
                      <label className="text-[10px] text-gray-400 block mb-1">Drone Speed (m/s)</label>
                      <input type="number" name="speed" value={params.speed} onChange={handleChange} className="w-full bg-gray-700 border border-gray-600 rounded p-1 text-sm"/>
                   </div>
                )}
              </div>
            </section>
          )}

        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-gray-700 bg-[#252525] rounded-b-lg flex gap-3">
           <button onClick={() => { onSave(node.id, null); }} className="px-4 py-2 bg-red-900/50 text-red-200 border border-red-800 rounded hover:bg-red-800 text-xs font-bold">DELETE NODE</button>
           <div className="flex-grow"></div>
           <button onClick={onClose} className="px-4 py-2 text-gray-300 hover:text-white text-xs">Cancel</button>
           <button onClick={() => onSave(node.id, params)} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded font-bold text-xs shadow-lg">SAVE CHANGES</button>
        </div>
      </div>
    </div>
  );
};

// --- MAP COMPONENTS ---
const MemoizedGeoJsonLayer = React.memo(function GeoJsonLayer({ mapName }) {
  const [geoData, setGeoData] = useState(null);
  const map = useMapEvents({});
  useEffect(() => {
    if (!mapName) { setGeoData(null); return; }
    fetch(`/maps/${mapName.replace('.net.xml', '.geojson')}`)
      .then(res => res.ok ? res.json() : null)
      .then(d => { if(d) { setGeoData(d); map.fitBounds(L.geoJSON(d).getBounds()); }});
  }, [mapName, map]);
  return geoData ? <GeoJSON data={geoData} style={{color:"#1e3a8a", weight:2, opacity: 0.5}} /> : null;
});

function MapClickHandler({ activeTool, onClick }) {
  useMapEvents({ click(e) { onClick(activeTool, e.latlng); } });
  return null;
}

// --- MAIN PAGE ---
export default function ExpertJammingPage() {
  
  // -- GLOBAL SETTINGS --
  const [globalConfig, setGlobalConfig] = useState({
    simulation_name: "Expert_Experiment_01",
    map_name: "",
    duration: 120,
    seed: 1234
  });

  // -- NODES STATE (A MÁGICA ACONTECE AQUI) --
  // Lista de objetos heterogêneos
  const [nodes, setNodes] = useState([]); 
  const [availableMaps, setMaps] = useState([]);
  
  // -- UI STATE --
  const [activeTool, setActiveTool] = useState(null); // 'car', 'drone', 'tower', 'rsu'
  const [editingNode, setEditingNode] = useState(null); // Nó sendo editado no modal
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    axios.get("http://localhost:8000/api/maps").then(r => setMaps(r.data.filter(m => m.endsWith(".xml"))));
  }, []);

  // Adiciona nó com parâmetros padrão baseados no tipo
  const handleMapClick = (tool, latlng) => {
    if (!tool) return;
    
    const newNode = {
        id: Date.now(), // ID único temporário
        type: tool,
        lat: latlng.lat,
        lng: latlng.lng,
        params: getDefaultParams(tool)
    };
    
    setNodes(prev => [...prev, newNode]);
    // Não fecha a tool para permitir colocar vários
  };

  const getDefaultParams = (type) => {
      if (type === 'car') return { txPower: 23, packetSize: 300, interval: 0.1, appType: 'V2XApp', mitigation: false };
      if (type === 'drone') return { txPower: 30, strategy: 'constant', start: 20, stop: 100, speed: 10 };
      if (type === 'tower') return { txPower: 40, strategy: 'reactive', start: 0, stop: 120 };
      if (type === 'rsu') return { txPower: 30 };
      return {};
  };

  const handleSaveNode = (id, newParams) => {
      if (newParams === null) {
          // Delete
          setNodes(prev => prev.filter(n => n.id !== id));
      } else {
          // Update
          setNodes(prev => prev.map(n => n.id === id ? { ...n, params: newParams } : n));
      }
      setEditingNode(null);
  };

  const handleGenerate = async () => {
      if(!globalConfig.map_name) return alert("Select a map!");
      setLoading(true);
      
      const payload = {
          ...globalConfig,
          nodes_list: nodes // Envia a lista detalhada
      };

      try {
        // Endpoint NOVO para Expert
        const res = await axios.post("http://localhost:8000/api/simulations/generate_expert_zip", payload, {responseType:'blob'});
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const link = document.createElement('a');
        link.href = url; link.setAttribute('download', `${globalConfig.simulation_name}_EXPERT.zip`);
        document.body.appendChild(link); link.click(); link.remove();
      } catch (e) {
          console.error(e);
          alert("Error generating expert simulation.");
      } finally {
          setLoading(false);
      }
  };

  return (
    <div className="flex h-screen bg-[#f0f0f0] font-sans overflow-hidden text-gray-800">
      
      {/* SIDEBAR */}
      <div className="w-[300px] bg-[#1e1e1e] border-r border-gray-800 flex flex-col shadow-2xl z-10 text-gray-200">
         <div className="p-4 bg-[#252525] border-b border-gray-700">
             <h1 className="text-xl font-bold text-white flex gap-2 items-center">
                 <span className="text-purple-500">🧠</span> Expert <span className="font-light">Mode</span>
             </h1>
             <p className="text-[10px] text-gray-400 mt-1">Full Framework Coverage & Granular Control</p>
         </div>

         <div className="p-4 space-y-4 overflow-y-auto flex-grow custom-scrollbar">
             <div>
                 <label className="text-[10px] text-gray-400 uppercase font-bold">Global Settings</label>
                 <input className="w-full bg-gray-700 border border-gray-600 rounded p-1.5 text-xs mt-1 text-white" 
                        value={globalConfig.simulation_name} onChange={e=>setGlobalConfig({...globalConfig, simulation_name: e.target.value})} placeholder="Sim Name"/>
                 
                 <select className="w-full bg-gray-700 border border-gray-600 rounded p-1.5 text-xs mt-2 text-white"
                        value={globalConfig.map_name} onChange={e=>setGlobalConfig({...globalConfig, map_name: e.target.value})}>
                     <option value="">Select Map...</option>
                     {availableMaps.map(m=><option key={m} value={m}>{m}</option>)}
                 </select>

                 <div className="grid grid-cols-2 gap-2 mt-2">
                     <input type="number" className="bg-gray-700 border border-gray-600 rounded p-1 text-xs text-white" placeholder="Duration (s)"
                            value={globalConfig.duration} onChange={e=>setGlobalConfig({...globalConfig, duration: e.target.value})}/>
                     <input type="number" className="bg-gray-700 border border-gray-600 rounded p-1 text-xs text-white" placeholder="Seed"
                            value={globalConfig.seed} onChange={e=>setGlobalConfig({...globalConfig, seed: e.target.value})}/>
                 </div>
             </div>

             <div className="border-t border-gray-700 pt-4">
                 <label className="text-[10px] text-gray-400 uppercase font-bold">Placed Nodes ({nodes.length})</label>
                 <div className="space-y-1 mt-2 max-h-[300px] overflow-y-auto pr-1">
                     {nodes.length === 0 && <p className="text-xs text-gray-500 italic">No nodes placed yet.</p>}
                     {nodes.map((n, i) => (
                         <div key={n.id} onClick={()=>setEditingNode(n)} 
                              className="bg-gray-800 p-2 rounded border border-gray-700 flex justify-between items-center cursor-pointer hover:bg-gray-700 hover:border-purple-500 transition group">
                             <div className="flex items-center gap-2">
                                 <span className="text-sm">{n.type === 'car' ? '🚗' : n.type === 'drone' ? '🚁' : n.type==='rsu'?'🗼':'📡'}</span>
                                 <div className="flex flex-col">
                                     <span className="text-xs font-bold text-gray-300 capitalize">{n.type} {i}</span>
                                     <span className="text-[9px] text-gray-500">{n.params.txPower}dBm</span>
                                 </div>
                             </div>
                             <span className="text-[10px] text-blue-400 opacity-0 group-hover:opacity-100">EDIT</span>
                         </div>
                     ))}
                 </div>
             </div>
         </div>

         <div className="p-4 bg-[#252525] border-t border-gray-700">
             <button onClick={handleGenerate} disabled={loading} className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded shadow-lg text-xs uppercase tracking-widest">
                 {loading ? "Generating..." : "Download Expert ZIP"}
             </button>
         </div>
      </div>

      {/* MAPA AREA */}
      <div className="flex-1 relative bg-white">
          
          {/* TOOLBAR FLUTUANTE */}
          <div className="absolute top-4 left-4 z-[1000] bg-white border border-gray-300 p-1.5 rounded shadow-xl flex gap-2">
              {[
                  {id:'car', icon:'🚗', color:'text-green-600', border:'border-green-500', bg:'bg-green-100'},
                  {id:'drone', icon:'🚁', color:'text-red-600', border:'border-red-500', bg:'bg-red-100'},
                  {id:'tower', icon:'📡', color:'text-orange-600', border:'border-orange-500', bg:'bg-orange-100'},
                  {id:'rsu', icon:'🗼', color:'text-blue-600', border:'border-blue-500', bg:'bg-blue-100'},
              ].map(t => (
                  <button key={t.id} onClick={() => setActiveTool(activeTool === t.id ? null : t.id)}
                      className={`w-10 h-10 flex items-center justify-center rounded border transition text-xl
                      ${activeTool === t.id ? `${t.bg} ${t.border} ${t.color} shadow-inner` : 'border-transparent hover:bg-gray-100 grayscale hover:grayscale-0'}
                      `} title={`Place ${t.id}`}>
                      {t.icon}
                  </button>
              ))}
              <div className="w-px bg-gray-300 mx-1"></div>
              <button onClick={()=>setNodes([])} className="px-2 text-[10px] font-bold text-red-400 hover:text-red-600 border border-transparent hover:border-red-200 rounded">CLR</button>
          </div>

          <MapContainer center={[-15.79, -47.88]} zoom={14} style={{height:'100%', width:'100%', background:'#f0f0f0'}}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OSM" />
              <MemoizedGeoJsonLayer mapName={globalConfig.map_name} />
              
              <MapClickHandler activeTool={activeTool} onClick={handleMapClick} />

              {nodes.map((n, i) => (
                  <Marker key={n.id} position={n} icon={icons[n.type]} eventHandlers={{ click: () => { /* Se clicar no marker sem tool ativa, edita */ if(!activeTool) setEditingNode(n); } }}>
                      {!activeTool && <Popup>Double click list to edit</Popup>}
                      {/* Visualização de Alcance baseado no Power individual */}
                      {(n.type !== 'car') && (
                          <Circle center={n} radius={n.params.txPower * 15} pathOptions={{ color: n.type==='drone'?'red':n.type==='rsu'?'blue':'orange', opacity: 0.2, fillOpacity: 0.1 }} />
                      )}
                  </Marker>
              ))}
          </MapContainer>
      </div>

      {/* RENDERIZA O MODAL SE TIVER UM NÓ SELECIONADO */}
      {editingNode && <ConfigModal node={editingNode} onClose={()=>setEditingNode(null)} onSave={handleSaveNode} />}
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #222; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #555; border-radius: 2px; }
      `}</style>
    </div>
  );
}