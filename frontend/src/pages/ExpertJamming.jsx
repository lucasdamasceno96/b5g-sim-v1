import axios from 'axios';
import L from 'leaflet';
import React, { useEffect, useState } from 'react';
import { Circle, GeoJSON, MapContainer, Marker, Polyline, TileLayer, useMapEvents } from 'react-leaflet';

// --- ICONS ---
const createIcon = (emoji, color) => L.divIcon({
  className: 'custom-div-icon',
  html: `<div style='font-size: 24px; color: ${color}; filter: drop-shadow(0 2px 2px rgba(0,0,0,0.8)); display:flex; justify-content:center; align-items:center;'>${emoji}</div>`,
  iconSize: [30, 30], iconAnchor: [15, 15]
});

const icons = {
  start: createIcon("🟢", "#2E7D32"),
  end: createIcon("🏁", "#000000"),
  drone: createIcon("🚁", "#D32F2F"),
  tower: createIcon("📡", "#E65100"),
  rsu: createIcon("🗼", "#0288D1")
};

// --- MODAL DE EDIÇÃO (Melhorado) ---
const ConfigModal = ({ node, onClose, onSave }) => {
  const [params, setParams] = useState(node.params);
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setParams(p => ({ ...p, [name]: type === 'checkbox' ? checked : value }));
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-[2000] flex items-center justify-center backdrop-blur-sm">
      <div className="bg-[#1e1e1e] border border-gray-600 rounded-lg w-[450px] shadow-2xl text-gray-200 flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-gray-700 bg-[#252525] flex justify-between items-center">
          <h3 className="font-bold text-lg flex gap-2 items-center">
             <span>{node.type === 'car' ? '🚗' : node.type === 'drone' ? '🚁' : node.type === 'rsu' ? '🗼' : '📡'}</span> 
             Edit Object #{node.id}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
        </div>
        
        <div className="p-5 space-y-5 overflow-y-auto custom-scrollbar">
           {/* CARROS */}
           {node.type === 'car' && (
             <div className="space-y-3">
               <div className="bg-green-900/20 p-2 rounded border border-green-800/50">
                   <h4 className="text-xs font-bold text-green-400 uppercase mb-2">V2X Application (VoIP)</h4>
                   <div className="grid grid-cols-2 gap-3">
                     <div><label className="text-[10px] text-gray-400">Packet Size (Bytes)</label><input name="packetSize" type="number" value={params.packetSize} onChange={handleChange} className="input-expert"/></div>
                     <div><label className="text-[10px] text-gray-400">Interval (s)</label><input name="interval" type="number" step="0.01" value={params.interval} onChange={handleChange} className="input-expert"/></div>
                   </div>
               </div>
               
               <div>
                   <h4 className="text-xs font-bold text-blue-400 uppercase mb-2">Physical Layer</h4>
                   <div className="grid grid-cols-2 gap-3">
                        <div><label className="text-[10px] text-gray-400">Tx Power (dBm)</label><input name="txPower" type="number" value={params.txPower} onChange={handleChange} className="input-expert"/></div>
                        <div className="flex items-center mt-4">
                            <label className="flex items-center gap-2 cursor-pointer text-xs">
                                <input type="checkbox" name="mitigation" checked={params.mitigation} onChange={handleChange} className="accent-blue-500"/> Active Defense
                            </label>
                        </div>
                   </div>
               </div>
             </div>
           )}

           {/* JAMMERS */}
           {(node.type === 'drone' || node.type === 'tower') && (
             <div className="space-y-3">
               <div className="bg-red-900/20 p-2 rounded border border-red-800/50">
                   <h4 className="text-xs font-bold text-red-400 uppercase mb-2">Attack Profile</h4>
                   <div className="mb-2">
                       <label className="text-[10px] text-gray-400">Strategy</label>
                       <select name="strategy" value={params.strategy} onChange={handleChange} className="input-expert">
                          <option value="constant">Constant</option>
                          <option value="reactive">Reactive</option>
                          <option value="random">Random</option>
                       </select>
                   </div>
                   <div className="grid grid-cols-2 gap-3">
                     <div><label className="text-[10px] text-gray-400">Start Time (s)</label><input name="start" type="number" value={params.start} onChange={handleChange} className="input-expert"/></div>
                     <div><label className="text-[10px] text-gray-400">Stop Time (s)</label><input name="stop" type="number" value={params.stop} onChange={handleChange} className="input-expert"/></div>
                   </div>
               </div>
               <div>
                   <label className="text-[10px] text-gray-400">Tx Power (dBm)</label>
                   <input name="txPower" type="number" value={params.txPower} onChange={handleChange} className="input-expert"/>
                   {node.type === 'drone' && (
                       <div className="mt-2"><label className="text-[10px] text-gray-400">Speed (m/s)</label><input name="speed" type="number" value={params.speed} onChange={handleChange} className="input-expert"/></div>
                   )}
               </div>
             </div>
           )}

           {/* RSU */}
           {node.type === 'rsu' && (
               <div className="bg-blue-900/20 p-2 rounded border border-blue-800/50">
                   <h4 className="text-xs font-bold text-blue-400 uppercase mb-2">RSU Config</h4>
                   <div><label className="text-[10px] text-gray-400">Range/Power (dBm)</label><input name="txPower" type="number" value={params.txPower} onChange={handleChange} className="input-expert"/></div>
                   <p className="text-[9px] text-gray-500 mt-2">RSU acts as a fixed infrastructure node.</p>
               </div>
           )}
        </div>

        <div className="p-4 bg-[#252525] rounded-b-lg flex justify-between border-t border-gray-700">
           <button onClick={() => onSave(node.id, null)} className="text-red-400 hover:text-red-200 text-xs font-bold px-2">DELETE OBJECT</button>
           <button onClick={() => onSave(node.id, params)} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 text-white px-6 py-1.5 rounded font-bold text-xs shadow-lg">SAVE CHANGES</button>
        </div>
      </div>
      <style>{` .input-expert { width: 100%; background: #374151; border: 1px solid #4b5563; padding: 4px; border-radius: 4px; color: white; font-size: 12px; outline: none; } `}</style>
    </div>
  );
};

// --- MAP LAYER OTIMIZADO (React.memo) ---
// Isso garante que o mapa pesado não seja redesenhado a cada clique
const MemoizedGeoJson = React.memo(({ mapName }) => {
  const [data, setData] = useState(null);
  const map = useMapEvents({});
  useEffect(() => {
    if(!mapName) { setData(null); return; }
    // Assume endpoint padrão para mapas
    fetch(`/maps/${mapName.replace('.net.xml','.geojson')}`)
        .then(r=>r.ok?r.json():null)
        .then(d=>{ 
            if(d){ 
                setData(d); 
                map.fitBounds(L.geoJSON(d).getBounds()); 
            }
        });
  }, [mapName, map]);
  
  // Cor Azul Escura para contraste no modo claro
  return data ? <GeoJSON data={data} style={{color:"#1e3a8a", weight:2, opacity:0.5}} /> : null;
});

function MapClickHandler({ activeTool, onClick }) {
  useMapEvents({ click(e) { onClick(activeTool, e.latlng); } });
  return null;
}

// --- PÁGINA PRINCIPAL ---
export default function ExpertJammingPage() {
  // ESTADO GLOBAL COMPLETO
  const [global, setGlobal] = useState({ 
      simulation_name: "Expert_Sim", 
      map_name: "", 
      duration: 120, 
      seed: 1234,
      // Novos Campos: Tráfego de Fundo
      num_random_vehicles: 0,
      // Default Params (Para novos nós manuais)
      default_tx_power: 23,
      default_bitrate: 6,
      vehicle_distribution: "heterogeneous"
  });

  const [maps, setMaps] = useState([]);
  const [nodes, setNodes] = useState([]);
  
  // Interaction States
  const [activeTool, setActiveTool] = useState(null); // 'car', 'drone', 'tower', 'rsu'
  const [tempStart, setTempStart] = useState(null); // Para rota
  const [editingNode, setEditingNode] = useState(null);
  const [showBg, setShowBg] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => { 
      axios.get("http://localhost:8000/api/maps")
           .then(r => setMaps(r.data.filter(m => m.endsWith(".xml"))))
           .catch(e => console.error("Failed to load maps", e));
  }, []);

  // Lógica de Adição de Nós
  const handleMapClick = (tool, latlng) => {
    if (!tool) return;

    if (tool === 'car') {
        if (!tempStart) {
            setTempStart(latlng); // 1. Marca Início
        } else {
            // 2. Marca Fim e Cria
            const newCar = {
                id: Date.now(), type: 'car',
                lat: tempStart.lat, lng: tempStart.lng, 
                dest_lat: latlng.lat, dest_lng: latlng.lng, 
                params: { txPower: global.default_tx_power, packetSize: 300, mitigation: false, interval: 0.1 }
            };
            setNodes(p => [...p, newCar]);
            setTempStart(null); 
        }
    } else {
        const defaults = {
            drone: { txPower: 30, strategy: 'constant', start: 20, stop: global.duration, speed: 10 },
            tower: { txPower: 40, strategy: 'reactive', start: 0, stop: global.duration },
            rsu: { txPower: 30 }
        };
        const newNode = { id: Date.now(), type: tool, lat: latlng.lat, lng: latlng.lng, params: defaults[tool] };
        setNodes(p => [...p, newNode]);
    }
  };

  const generateZip = async () => {
      if(!global.map_name) return alert("Select a map!");
      setLoading(true);
      try {
          const res = await axios.post("http://localhost:8000/api/simulations/generate_expert_zip", { ...global, nodes_list: nodes }, { responseType: 'blob' });
          const url = window.URL.createObjectURL(new Blob([res.data]));
          const link = document.createElement('a');
          link.href = url; link.setAttribute('download', `${global.simulation_name}_EXPERT.zip`);
          document.body.appendChild(link); link.click(); link.remove();
      } catch (e) { alert("Backend Error: Check console/logs"); console.error(e); } finally { setLoading(false); }
  };

  // Style Helpers
  const sectionTitle = "text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 border-b border-gray-700 pb-1";
  const inputStyle = "w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-xs text-white focus:border-blue-500 focus:outline-none";
  const labelStyle = "block text-[10px] text-gray-400 mb-0.5";

  return (
    <div className="flex h-screen bg-[#f0f0f0] font-sans text-gray-800 overflow-hidden">
      
      {/* --- SIDEBAR --- */}
      <div className="w-[360px] bg-[#1e1e1e] flex flex-col shadow-2xl z-10 text-gray-200 border-r border-gray-800 flex-shrink-0">
        
        {/* Header */}
        <div className="p-4 bg-[#252525] border-b border-gray-700">
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
               <span className="text-green-500">🧠</span> Expert <span className="font-light text-gray-400">Mode</span>
            </h1>
        </div>
        
        {/* Scrollable Form */}
        <div className="p-4 flex-grow overflow-y-auto space-y-5 custom-scrollbar">
             
             {/* 1. Scenario Config */}
             <div>
                <h3 className={sectionTitle}>1. Scenario Setup</h3>
                <div className="space-y-2">
                    <div><label className={labelStyle}>Simulation Name</label><input className={inputStyle} value={global.simulation_name} onChange={e=>setGlobal({...global, simulation_name: e.target.value})} /></div>
                    <div><label className={labelStyle}>Map File</label>
                        <select className={inputStyle} value={global.map_name} onChange={e=>setGlobal({...global, map_name: e.target.value})}>
                            <option value="">Select Map...</option>{maps.map(m=><option key={m} value={m}>{m}</option>)}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div><label className={labelStyle}>Duration (s)</label><input type="number" className={inputStyle} value={global.duration} onChange={e=>setGlobal({...global, duration: e.target.value})}/></div>
                        <div><label className={labelStyle}>Seed</label><input type="number" className={inputStyle} value={global.seed} onChange={e=>setGlobal({...global, seed: e.target.value})}/></div>
                    </div>
                </div>
             </div>

             {/* 2. Traffic & Random Vehicles (NOVIDADE EXPERT) */}
             <div>
                <h3 className={sectionTitle}>2. Global Traffic (Background)</h3>
                <div className="space-y-2">
                    <div><label className={labelStyle}>Add Random Vehicles</label><input type="number" className={inputStyle} value={global.num_random_vehicles} onChange={e=>setGlobal({...global, num_random_vehicles: e.target.value})}/>
                        <p className="text-[9px] text-gray-500 mt-1">Vehicles generated automatically to fill the map.</p>
                    </div>
                    <div className="mt-2">
                        <label className={labelStyle}>Vehicle Distribution</label>
                        <select className={inputStyle} value={global.vehicle_distribution} onChange={e=>setGlobal({...global, vehicle_distribution: e.target.value})}>
                            <option value="heterogeneous">Heterogeneous (Mixed)</option>
                            <option value="homogeneous">Homogeneous (Cars Only)</option>
                        </select>
                    </div>
                </div>
             </div>

             {/* 3. Global Defaults (RESTAURADO) */}
             <div>
                <h3 className={sectionTitle}>3. Network Defaults</h3>
                <div className="grid grid-cols-2 gap-2">
                    <div><label className={labelStyle}>Tx Power (dBm)</label><input type="number" className={inputStyle} value={global.default_tx_power} onChange={e=>setGlobal({...global, default_tx_power: e.target.value})}/></div>
                    <div><label className={labelStyle}>Bitrate (Mbps)</label><input type="number" className={inputStyle} value={global.default_bitrate} onChange={e=>setGlobal({...global, default_bitrate: e.target.value})}/></div>
                </div>
             </div>

             {/* 4. Object List */}
             <div className="border-t border-gray-700 pt-4">
                <h3 className={sectionTitle} style={{borderColor:'#8b5cf6'}}>4. Placed Objects ({nodes.length})</h3>
                <div className="mt-2 space-y-1 overflow-y-auto max-h-[300px] pr-1">
                    {nodes.length === 0 && <div className="text-xs text-gray-500 italic text-center py-4 border border-dashed border-gray-700 rounded">Use toolbar to add objects</div>}
                    {nodes.map((n, i) => (
                        <div key={n.id} onClick={()=>setEditingNode(n)} 
                             className="bg-gray-800 p-2 rounded border border-gray-700 hover:border-blue-500 cursor-pointer flex justify-between items-center group transition">
                            <div className="flex items-center gap-3">
                                <span className="text-lg">{n.type==='car'?'🚗':n.type==='drone'?'🚁':n.type==='rsu'?'🗼':'📡'}</span>
                                <div className="flex flex-col">
                                    <span className="text-xs font-bold text-gray-200 capitalize">{n.type} {i}</span>
                                    <span className="text-[9px] text-gray-500">{n.params.txPower}dBm</span>
                                </div>
                            </div>
                            <button className="text-[9px] bg-blue-900/50 text-blue-300 px-2 py-0.5 rounded border border-blue-800 group-hover:bg-blue-600 group-hover:text-white transition">EDIT</button>
                        </div>
                    ))}
                </div>
             </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#252525] border-t border-gray-700">
            <button onClick={generateZip} disabled={loading} className="w-full py-3 bg-gradient-to-r from-purple-700 to-blue-700 hover:from-purple-600 hover:to-blue-600 text-white font-bold rounded shadow-lg text-xs uppercase tracking-widest transition transform hover:scale-105">
                {loading ? "GENERATING ZIP..." : "DOWNLOAD SIMULATION"}
            </button>
        </div>
      </div>

      {/* --- MAP AREA --- */}
      <div className="flex-1 relative">
         
         {/* Toolbar Flutuante */}
         <div className="absolute top-4 left-4 z-[1000] bg-white border border-gray-300 p-1.5 rounded shadow-xl flex gap-2">
            {[
                {id:'car', icon:'🚗', hint:'Car (Route: Click Start -> Click End)', bg:'bg-green-50'},
                {id:'drone', icon:'🚁', hint:'Drone (Jammer)', bg:'bg-red-50'}, 
                {id:'tower', icon:'📡', hint:'Tower (Static)', bg:'bg-orange-50'}, 
                {id:'rsu', icon:'🗼', hint:'RSU (Infrastructure)', bg:'bg-blue-50'}
            ].map(t => (
                <button key={t.id} onClick={()=>setActiveTool(activeTool===t.id ? null : t.id)} title={t.hint}
                   className={`w-10 h-10 flex items-center justify-center rounded border text-xl transition ${activeTool===t.id ? `border-blue-500 shadow-inner ${t.bg}` : 'border-transparent hover:bg-gray-100'}`}>
                   {t.icon}
                </button>
            ))}
            <div className="w-px bg-gray-300 mx-1"></div>
            <button onClick={()=>setNodes([])} className="px-3 text-[10px] font-bold text-red-500 hover:text-red-700 border border-transparent hover:border-red-200 rounded">RESET</button>
         </div>

         {/* Instruction Banner (UX Fix) */}
         {activeTool === 'car' && (
             <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-blue-600 text-white px-6 py-2 rounded-full text-xs font-bold shadow-xl pointer-events-none border-2 border-white/20 animate-pulse">
                 {tempStart ? "📍 STEP 2: CLICK DESTINATION POINT" : "🟢 STEP 1: CLICK START POINT"}
             </div>
         )}

         <MapContainer center={[-15.79, -47.88]} zoom={14} style={{height:'100%', width:'100%', background:'#e5e5e5'}}>
            {/* Botão Background */}
            {showBg && <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OSM"/>}
            
            {/* Mapa Renderizado Otimizado */}
            <MemoizedGeoJson mapName={global.map_name} />
            
            <MapClickHandler activeTool={activeTool} onClick={handleMapClick} />
            
            {/* Linha Temporária de Rota */}
            {tempStart && <Marker position={tempStart} icon={icons.start} opacity={0.7} />}
            
            {nodes.map(n => (
                <React.Fragment key={n.id}>
                    {n.type === 'car' ? (
                        <>
                            <Marker position={[n.lat, n.lng]} icon={icons.start} eventHandlers={{click: ()=>!activeTool && setEditingNode(n)}} />
                            <Marker position={[n.dest_lat, n.dest_lng]} icon={icons.end} eventHandlers={{click: ()=>!activeTool && setEditingNode(n)}} />
                            <Polyline positions={[[n.lat, n.lng], [n.dest_lat, n.dest_lng]]} pathOptions={{color:'#2E7D32', weight:4, dashArray:'10,10', opacity: 0.8}} />
                        </>
                    ) : (
                        <>
                            <Marker position={[n.lat, n.lng]} icon={icons[n.type]} eventHandlers={{click: ()=>!activeTool && setEditingNode(n)}}>
                                {/* Visual Radius (RSU = Blue) */}
                                {n.type === 'rsu' ? 
                                    <Circle center={[n.lat, n.lng]} radius={300} pathOptions={{color:'#0288D1', fillColor:'#0288D1', opacity:0.3, fillOpacity:0.1}} /> :
                                    <Circle center={[n.lat, n.lng]} radius={n.params.txPower ? n.params.txPower * 15 : 100} pathOptions={{color:'red', opacity:0.1, fillOpacity:0.1}} />
                                }
                            </Marker>
                        </>
                    )}
                </React.Fragment>
            ))}
         </MapContainer>

         {/* Map Toggle Button */}
         <div className="absolute bottom-6 right-6 z-[1000]">
             <button onClick={()=>setShowBg(!showBg)} className="bg-white border-2 border-gray-300 px-4 py-2 rounded font-bold text-xs text-gray-700 hover:bg-gray-50 shadow-md transition">
                 {showBg ? 'HIDE MAP' : 'SHOW MAP'}
             </button>
         </div>
      </div>

      {/* MODAL */}
      {editingNode && <ConfigModal node={editingNode} onClose={()=>setEditingNode(null)} onSave={(id,p)=>{if(p===null)setNodes(nodes.filter(x=>x.id!==id));else setNodes(nodes.map(x=>x.id===id?{...x,params:p}:x));setEditingNode(null)}} />}
      
      <style>{` .custom-scrollbar::-webkit-scrollbar { width: 5px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #444; border-radius: 3px; } `}</style>
    </div>
  );
}