import axios from 'axios';
import L from 'leaflet';
import { useEffect, useState } from 'react';
import { GeoJSON, MapContainer, Marker, Popup, useMapEvents } from 'react-leaflet';

// --- Ícones (mesma configuração de antes) ---
const jammerIcon = L.divIcon({
  className: 'custom-div-icon',
  html: "<div style='background-color: #f00; width: 12px; height: 12px; border-radius: 50%; border: 2px solid #fff; box-shadow: 0 0 5px #000;'></div>",
  iconSize: [12, 12],
  iconAnchor: [6, 6]
});
const startIcon = L.divIcon({
  className: 'custom-div-icon',
  html: "<div style='font-size: 24px; color: #00A900;'>🚗</div>",
  iconSize: [24, 24],
  iconAnchor: [12, 24]
});
const endIcon = L.divIcon({
  className: 'custom-div-icon',
  html: "<div style='font-size: 24px;'>🏁</div>",
  iconSize: [24, 24],
  iconAnchor: [1, 24]
});

// --- Componente de Mapa: GeoJsonLayer (com logs de debug) ---
function GeoJsonLayer({ mapName, setMapBounds }) {
  const [geoData, setGeoData] = useState(null);
  const map = useMapEvents({});

  useEffect(() => {
    if (!mapName) {
      setGeoData(null); // Limpa o mapa se nenhum for selecionado
      return;
    }
    
    const geoJsonFile = mapName.replace('.net.xml', '.geojson');
    const geoJsonPath = `/maps/${geoJsonFile}`;
    
    console.log(`Tentando carregar GeoJSON de: ${geoJsonPath}`);

    fetch(geoJsonPath)
      .then(res => {
        if (!res.ok) {
          throw new Error(`Falha ao buscar: ${res.status} ${res.statusText}`);
        }
        return res.json();
      })
      .then(data => {
        console.log(`GeoJSON ${geoJsonFile} carregado com sucesso.`);
        setGeoData(data);
        const bounds = L.geoJSON(data).getBounds();
        if (bounds.isValid()) {
          map.fitBounds(bounds);
          setMapBounds(bounds);
        }
      })
      .catch(err => {
        console.error(`ERRO AO CARREGAR O MAPA: ${geoJsonPath}. Verifique se o arquivo existe em 'frontend/public/maps/'`, err);
        setGeoData(null); // Limpa dados antigos se falhar
      });

  }, [mapName, map, setMapBounds]);

  // Renderiza as ruas com uma cor cinza escura
  return geoData ? <GeoJSON data={geoData} style={{ color: "#666", weight: 2 }} /> : null;
}

// --- Componente de Mapa: MapClickHandler (sem mudanças) ---
function MapClickHandler({ mode, onAddJammer, onSetRoutePoint }) {
  useMapEvents({
    click(e) {
      const latlng = e.latlng;
      if (mode === 'jammer') {
        onAddJammer(latlng);
      } else if (mode === 'routeStart') {
        onSetRoutePoint('start', latlng);
      } else if (mode === 'routeEnd') {
        onSetRoutePoint('end', latlng);
      }
    },
  });
  return null;
}

// --- Componente Principal ---
const API_BASE_URL = "http://localhost:8000";

export default function AdvancedJammingPage() {
  
  // --- STATE (Valores iniciais vazios ou 0) ---
  const [formData, setFormData] = useState({
    simulation_name: "",
    map_name: "", // Começa vazio
    simulation_time: "", // Começa vazio
    num_fixed_vehicles: 0,
    num_random_vehicles: 0,
    vehicle_distribution: "heterogeneous",
    communication_mode: "D2D",
    mitigation_active: false,
    reroute_on_attack: false,
  });

  const [availableMaps, setAvailableMaps] = useState([]);
  const [mapBounds, setMapBounds] = useState(null);
  const [placementMode, setPlacementMode] = useState('jammer');
  const [jammers, setJammers] = useState([]);
  const [fixedRoute, setFixedRoute] = useState({ start: null, end: null });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [downloadUrl, setDownloadUrl] = useState(null);

  // --- EFFECTS ---
  useEffect(() => {
    axios.get(`${API_BASE_URL}/api/maps`)
      .then(response => {
        const netXmlMaps = response.data.filter(map => map.endsWith('.net.xml'));
        setAvailableMaps(netXmlMaps);
        // NÃO auto-seleciona mais o primeiro mapa
      })
      .catch(err => setError("Failed to load maps."));
  }, []);

  // --- HANDLERS ---
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      // Salva o valor 'checked' para checkboxes, senão salva o 'value'
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleMapClick = (latlng) => {
    setJammers(prev => [...prev, latlng]);
  };
  
  const handleSetRoutePoint = (pointType, latlng) => {
    setFixedRoute(prev => ({ ...prev, [pointType]: latlng }));
    setPlacementMode('jammer');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Converte os valores do formulário para números, usando 0 se estiverem vazios
    const simTime = parseInt(formData.simulation_time) || 0;
    const fixedVehicles = parseInt(formData.num_fixed_vehicles) || 0;
    const randomVehicles = parseInt(formData.num_random_vehicles) || 0;

    // Validação
    if (!formData.map_name) {
        setError("Please select a map.");
        return;
    }
    if (simTime <= 0) {
        setError("Simulation Time must be greater than 0.");
        return;
    }
    if (fixedVehicles > 0 && (!fixedRoute.start || !fixedRoute.end)) {
        setError("Please define a start and end point for the fixed fleet.");
        return;
    }
    if (fixedVehicles === 0 && randomVehicles === 0) {
        setError("You must add at least one fixed or random vehicle.");
        return;
    }
    
    setLoading(true);
    setError(null);
    setDownloadUrl(null);

    const payload = {
      ...formData,
      // Envia os valores numéricos convertidos
      simulation_time: simTime,
      num_fixed_vehicles: fixedVehicles,
      num_random_vehicles: randomVehicles,
      
      attack_placement: "fixed",
      jammers_list: jammers.map(j => ({ lat: j.lat, lng: j.lng })),
      fixed_routes_list: fixedVehicles > 0 ? [{
        start: { lat: fixedRoute.start.lat, lng: fixedRoute.start.lng },
        end: { lat: fixedRoute.end.lat, lng: fixedRoute.end.lng },
        count: fixedVehicles
      }] : [],
    };
    
    console.log("Submitting Advanced Payload:", payload);
    
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/simulations/generate_advanced_zip`,
        payload,
        { responseType: 'blob' }
      )
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const contentDisposition = response.headers['content-disposition'];
      let filename = `${formData.simulation_name || 'simulation'}.zip`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/)
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
      setLoading(false);
    }
  };
  
  const getModeClass = (mode) => {
    return placementMode === mode
      ? 'bg-indigo-600 text-white'
      : 'bg-gray-600 text-gray-300 hover:bg-gray-500';
  };
  
  // --- RENDER ---
  
  if (downloadUrl) {
    return (
      <div className="text-center p-8 bg-gray-800 rounded-lg shadow-xl">
        <h2 className="text-2xl font-bold text-green-400 mb-4">Simulation ZIP Generated!</h2>
        <button
          onClick={() => {
            setDownloadUrl(null);
            setJammers([]);
            setFixedRoute({ start: null, end: null });
            setError(null);
            // Reseta o formulário
            setFormData({
              simulation_name: "", map_name: "", simulation_time: "",
              num_fixed_vehicles: 0, num_random_vehicles: 0,
              vehicle_distribution: "heterogeneous", communication_mode: "D2D",
              mitigation_active: false, reroute_on_attack: false,
            });
          }}
          className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-500"
        >
          Generate New Simulation
        </button>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Coluna 1: Formulário */}
      <div className="lg:col-span-1">
        <form onSubmit={handleSubmit} className="space-y-6 bg-gray-800 p-6 rounded-lg shadow-md">
          <h1 className="text-2xl font-bold text-white mb-4">
            Advanced Simulation
          </h1>
          
          {error && (
            <div className="bg-red-800 border border-red-600 text-red-100 px-4 py-3 rounded-md">
              <strong>Error:</strong> {error}
            </div>
          )}
          
          <fieldset className="space-y-4">
            <legend className="text-xl font-semibold text-white mb-2">Setup</legend>
            <label className="block">
              <span className="text-gray-300">Simulation Name</span>
              <input type="text" name="simulation_name" value={formData.simulation_name} onChange={handleChange} placeholder="ex: berlin_advanced_test" />
            </label>
            <label className="block">
              <span className="text-gray-300">Map File (.net.xml)</span>
              {/* Adicionado placeholder "Selecione um mapa" */}
              <select name="map_name" value={formData.map_name} onChange={handleChange} required>
                <option value="" disabled>Selecione um mapa...</option>
                {availableMaps.map(map => <option key={map} value={map}>{map}</option>)}
              </select>
            </label>
          </fieldset>

          <fieldset className="space-y-4">
            <legend className="text-xl font-semibold text-white mb-2">Traffic & V2X</legend>
             <label className="block">
              <span className="text-gray-300">Simulation Time (s)</span>
              <input type="number" name="simulation_time" value={formData.simulation_time} onChange={handleChange} placeholder="ex: 120" min="1" />
            </label>
             <label className="block">
              <span className="text-gray-300">Fixed Fleet Vehicles (com Rota)</span>
              <input type="number" name="num_fixed_vehicles" value={formData.num_fixed_vehicles} onChange={handleChange} min="0" />
            </label>
             <label className="block">
              <span className="text-gray-300">Random Vehicles (Preenchimento)</span>
              <input type="number" name="num_random_vehicles" value={formData.num_random_vehicles} onChange={handleChange} min="0" />
            </label>
             <label className="block">
              <span className="text-gray-300">Vehicle Distribution</span>
              <select name="vehicle_distribution" value={formData.vehicle_distribution} onChange={handleChange}>
                <option value="heterogeneous">Heterogeneous</option>
                <option value="homogeneous">Homogeneous</option>
              </select>
            </label>
          </fieldset>
          
          <fieldset className="space-y-4">
            <legend className="text-xl font-semibold text-white mb-2">Mitigation</legend>
            <label className="flex items-center space-x-2">
              <input type="checkbox" name="mitigation_active" checked={formData.mitigation_active} onChange={handleChange} />
              <span className="text-gray-300">Activate Mitigation</span>
            </label>
             <label className="flex items-center space-x-2">
              <input type="checkbox" name="reroute_on_attack" checked={formData.reroute_on_attack} onChange={handleChange} />
              <span className="text-gray-300">Reroute on Attack</span>
            </label>
          </fieldset>

          <div className="pt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-opacity-75 disabled:opacity-50"
            >
              {loading ? "Generating..." : "Generate Advanced Simulation"}
            </button>
          </div>
        </form>
      </div>

      {/* Coluna 2: Mapa e Controles */}
      <div className="lg:col-span-2 space-y-4">
        <div className="bg-gray-800 p-4 rounded-lg shadow-md flex justify-between items-center">
          <div>
            <span className="text-lg font-semibold text-white mr-4">Map Mode:</span>
            <div className="inline-flex rounded-md shadow-sm" role="group">
              <button type="button" onClick={() => setPlacementMode('jammer')} className={`px-4 py-2 text-sm font-medium rounded-l-lg ${getModeClass('jammer')}`}>
                Add Jammer
              </button>
              <button type="button" onClick={() => setPlacementMode('routeStart')} className={`px-4 py-2 text-sm font-medium border-t border-b border-gray-700 ${getModeClass('routeStart')}`}>
                Set Route Start
              </button>
              <button type="button" onClick={() => setPlacementMode('routeEnd')} className={`px-4 py-2 text-sm font-medium rounded-r-lg ${getModeClass('routeEnd')}`}>
                Set Route End
              </button>
            </div>
          </div>
          <div className='flex items-center space-x-4'>
            <span className="text-lg font-semibold text-indigo-300">
              Jammers: {jammers.length}
            </span>
            <button
              type="button"
              onClick={() => { setJammers([]); setFixedRoute({ start: null, end: null }); }}
              className="px-4 py-2 text-sm font-medium text-red-400 hover:text-red-300"
            >
              Clear Pins
            </button>
          </div>
        </div>

        {/* O Mapa */}
        <div className="h-[600px] rounded-lg overflow-hidden shadow-lg">
          <MapContainer
            center={[-15.79, -47.88]}
            zoom={4}
            // Fundo preto e sem o "mapa real"
            style={{ height: '100%', width: '100%', backgroundColor: '#111' }}
          >
            {/* O <TileLayer> FOI REMOVIDO DAQUI
            */}
            
            <GeoJsonLayer mapName={formData.map_name} setMapBounds={setMapBounds} />
            
            <MapClickHandler
              mode={placementMode}
              onAddJammer={handleMapClick}
              onSetRoutePoint={handleSetRoutePoint}
            />

            {jammers.map((pos, idx) => (
              <Marker key={`j-${idx}`} position={pos} icon={jammerIcon}>
                <Popup>Jammer #{idx + 1}</Popup>
              </Marker>
            ))}
            
            {fixedRoute.start && (
              <Marker position={fixedRoute.start} icon={startIcon}>
                <Popup>Fixed Route Start</Popup>
              </Marker>
            )}
            {fixedRoute.end && (
              <Marker position={fixedRoute.end} icon={endIcon}>
                <Popup>Fixed Route End</Popup>
              </Marker>
            )}

          </MapContainer>
        </div>
      </div>
    </div>
  )
}