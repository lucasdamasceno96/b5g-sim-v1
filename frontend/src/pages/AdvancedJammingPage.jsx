import axios from 'axios';
import L from 'leaflet';
import { useEffect, useState } from 'react';
import { GeoJSON, MapContainer, Marker, Popup, TileLayer, useMapEvents } from 'react-leaflet';

// --- ICONS (FIXED: Complete definitions) ---
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


// --- Map Components (GeoJsonLayer, MapClickHandler - unchanged logic) ---
function GeoJsonLayer({ mapName, setMapBounds }) {
  const [geoData, setGeoData] = useState(null);
  const map = useMapEvents({});

  useEffect(() => {
    if (!mapName) { setGeoData(null); return; }
    
    const geoJsonFile = mapName.replace('.net.xml', '.geojson');
    const geoJsonPath = `/maps/${geoJsonFile}`;
    console.log(`Attempting to load GeoJSON from: ${geoJsonPath}`);

    fetch(geoJsonPath)
      .then(res => {
        if (!res.ok) throw new Error(`404 - File not found: ${geoJsonPath}. Check 'frontend/public/maps/'`);
        return res.json();
      })
      .then(data => {
        console.log(`GeoJSON ${geoJsonFile} loaded.`);
        setGeoData(data);
        const bounds = L.geoJSON(data).getBounds();
        if (bounds.isValid()) {
          map.fitBounds(bounds);
          setMapBounds(bounds);
        }
      })
      .catch(err => {
        console.error(`ERROR LOADING MAP: ${err.message}`);
        setGeoData(null);
      });
  }, [mapName, map, setMapBounds]);

  return geoData ? <GeoJSON data={geoData} style={{ color: "#666", weight: 2 }} /> : null;
}

function MapClickHandler({ mode, onAddJammer, onSetRoutePoint }) {
  useMapEvents({
    click(e) {
      const latlng = e.latlng;
      if (mode === 'jammer') onAddJammer(latlng);
      else if (mode === 'routeStart') onSetRoutePoint('start', latlng);
      else if (mode === 'routeEnd') onSetRoutePoint('end', latlng);
    },
  });
  return null;
}


// --- Main Component ---
const API_BASE_URL = "http://localhost:8000";

export default function AdvancedJammingPage() {
  
  const [formData, setFormData] = useState({
    simulation_name: "",
    map_name: "",
    simulation_time: "",
    random_seed: 1234,
    num_fixed_vehicles: 0,
    num_random_vehicles: 0,
    vehicle_distribution: "heterogeneous",
    communication_mode: "D2D",
    mitigation_active: false,
    reroute_on_attack: false,
    
    app_params: { send_interval_s: 0.1, packet_size_b: 256 },
    net_params: { tx_power_dbm: 23, bitrate_mbps: 6 },
    jamming_params: { start_time_s: 20, stop_time_s: 100, power_dbm: 20, strategy: "constant" }
  });

  const [availableMaps, setAvailableMaps] = useState([]);
  const [mapBounds, setMapBounds] = useState(null);
  const [placementMode, setPlacementMode] = useState('jammer');
  const [jammers, setJammers] = useState([]);
  const [fixedRoute, setFixedRoute] = useState({ start: null, end: null });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [downloadUrl, setDownloadUrl] = useState(null);
  
  // --- NEW: State for map background ---
  const [showMapBackground, setShowMapBackground] = useState(true);

  useEffect(() => {
    axios.get(`${API_BASE_URL}/api/maps`)
      .then(response => {
        setAvailableMaps(response.data.filter(map => map.endsWith('.net.xml')))
      })
      .catch(err => setError("Failed to load maps."));
  }, []);

  // --- Handlers (unchanged) ---
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };
  
  const handleNestedChange = (group, name, value) => {
    setFormData(prev => ({
      ...prev,
      [group]: {
        ...prev[group],
        [name]: name === 'strategy' ? value : (parseFloat(value) || 0)
      }
    }))
  };

  const handleMapClick = (latlng) => { setJammers(prev => [...prev, latlng]); };
  const handleSetRoutePoint = (pointType, latlng) => {
    setFixedRoute(prev => ({ ...prev, [pointType]: latlng }));
    setPlacementMode('jammer');
  };

  // --- HandleSubmit (unchanged) ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const simTime = parseInt(formData.simulation_time) || 0;
    const fixedVehicles = parseInt(formData.num_fixed_vehicles) || 0;
    const randomVehicles = parseInt(formData.num_random_vehicles) || 0;

     if (!formData.map_name) { setError("Please select a map."); return; }
     if (simTime <= 0) { setError("Simulation Time must be > 0."); return; }
     if (fixedVehicles > 0 && (!fixedRoute.start || !fixedRoute.end)) { setError("Please define start/end for fixed fleet."); return; }
     if (fixedVehicles === 0 && randomVehicles === 0) { setError("Add at least one vehicle."); return; }
    
    setLoading(true);
    setError(null);
    setDownloadUrl(null);

    const payload = {
      ...formData,
      simulation_time: simTime,
      num_fixed_vehicles: fixedVehicles,
      num_random_vehicles: randomVehicles,
      random_seed: parseInt(formData.random_seed) || 1234,
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
      let filename = `${payload.simulation_name || 'simulation'}.zip`;
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
            setFormData({
              simulation_name: "", map_name: "", simulation_time: "", random_seed: 1234,
              num_fixed_vehicles: 0, num_random_vehicles: 0,
              vehicle_distribution: "heterogeneous", communication_mode: "D2D",
              mitigation_active: false, reroute_on_attack: false,
              app_params: { send_interval_s: 0.1, packet_size_b: 256 },
              net_params: { tx_power_dbm: 23, bitrate_mbps: 6 },
              jamming_params: { start_time_s: 20, stop_time_s: 100, power_dbm: 20, strategy: "constant" }
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
      
      {/* Column 1: Form (unchanged) */}
      <div className="lg:col-span-1">
        <form onSubmit={handleSubmit} className="space-y-6 bg-gray-800 p-6 rounded-lg shadow-md h-full overflow-auto">
          <h1 className="text-2xl font-bold text-white mb-4">Advanced Simulation</h1>
          {error && (
            <div className="bg-red-800 border border-red-600 text-red-100 px-4 py-3 rounded-md">
              <strong>Error:</strong> {error}
            </div>
          )}
          
          <fieldset className="space-y-4">
            <legend className="text-xl font-semibold text-white mb-2">Setup</legend>
            <label className="block"><span className="text-gray-300">Simulation Name</span>
              <input type="text" name="simulation_name" value={formData.simulation_name} onChange={handleChange} placeholder="ex: advanced_test" />
            </label>
            <label className="block"><span className="text-gray-300">Map File (.net.xml)</span>
              <select name="map_name" value={formData.map_name} onChange={handleChange} required>
                <option value="" disabled>Select a map...</option>
                {availableMaps.map(map => <option key={map} value={map}>{map}</option>)}
              </select>
            </label>
             <label className="block"><span className="text-gray-300">Simulation Time (s)</span>
              <input type="number" name="simulation_time" value={formData.simulation_time} onChange={handleChange} placeholder="ex: 120" min="1" />
            </label>
            <label className="block"><span className="text-gray-300">Random Seed</span>
              <input type="number" name="random_seed" value={formData.random_seed} onChange={handleChange} />
            </label>
          </fieldset>

          <fieldset className="space-y-4">
            <legend className="text-xl font-semibold text-white mb-2">Traffic</legend>
             <label className="block"><span className="text-gray-300">Fixed Fleet Vehicles (with Route)</span>
              <input type="number" name="num_fixed_vehicles" value={formData.num_fixed_vehicles} onChange={handleChange} min="0" />
            </label>
             <label className="block"><span className="text-gray-300">Random Vehicles (Fill)</span>
              <input type="number" name="num_random_vehicles" value={formData.num_random_vehicles} onChange={handleChange} min="0" />
            </label>
          </fieldset>

          <fieldset className="space-y-4">
             <legend className="text-xl font-semibold text-white mb-2">V2X & Network</legend>
             <label className="block"><span className="text-gray-300">Send Interval (s)</span>
              <input type="number" step="0.1" value={formData.app_params.send_interval_s} onChange={e => handleNestedChange('app_params', 'send_interval_s', e.target.value)} />
            </label>
            <label className="block"><span className="text-gray-300">Packet Size (bytes)</span>
              <input type="number" value={formData.app_params.packet_size_b} onChange={e => handleNestedChange('app_params', 'packet_size_b', e.target.value)} />
            </label>
            <label className="block"><span className="text-gray-300">Vehicle TX Power (dBm)</span>
              <input type="number" value={formData.net_params.tx_power_dbm} onChange={e => handleNestedChange('net_params', 'tx_power_dbm', e.target.value)} />
            </label>
          </fieldset>
          
          <fieldset className="space-y-4">
             <legend className="text-xl font-semibold text-white mb-2">Jamming Attack</legend>
             <label className="block"><span className="text-gray-300">Start Time (s)</span>
              <input type="number" value={formData.jamming_params.start_time_s} onChange={e => handleNestedChange('jamming_params', 'start_time_s', e.target.value)} />
            </label>
            <label className="block"><span className="text-gray-300">Stop Time (s)</span>
              <input type="number" value={formData.jamming_params.stop_time_s} onChange={e => handleNestedChange('jamming_params', 'stop_time_s', e.target.value)} />
            </label>
            <label className="block"><span className="text-gray-300">Jammer Power (dBm)</span>
              <input type="number" value={formData.jamming_params.power_dbm} onChange={e => handleNestedChange('jamming_params', 'power_dbm', e.target.Vvalue)} />
            </label>
            <label className="block"><span className="text-gray-300">Strategy</span>
              <select value={formData.jamming_params.strategy} onChange={e => handleNestedChange('jamming_params', 'strategy', e.target.value)}>
                <option value="constant">Constant</option><option value="reactive">Reactive</option><option value="random">Random</option>
              </select>
            </label>
          </fieldset>

          <fieldset className="space-y-4">
            <legend className="text-xl font-semibold text-white mb-2">Mitigation</legend>
            <label className="flex items-center space-x-2"><input type="checkbox" name="mitigation_active" checked={formData.mitigation_active} onChange={handleChange} />
              <span className="text-gray-300">Activate Mitigation</span>
            </label>
             <label className="flex items-center space-x-2"><input type="checkbox" name="reroute_on_attack" checked={formData.reroute_on_attack} onChange={handleChange} />
              <span className="text-gray-300">Reroute on Attack</span>
            </label>
          </fieldset>

          <div className="pt-4">
            <button
              type="submit" disabled={loading}
              className="w-full px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-500 disabled:opacity-50"
            >
              {loading ? "Generating..." : "Generate Advanced Simulation"}
            </button>
          </div>
        </form>
      </div>

      {/* Column 2: Map and Controls */}
      <div className="lg:col-span-2 space-y-4">
        {/* Map Controls (WITH NEW CHECKBOX) */}
        <div className="bg-gray-800 p-4 rounded-lg shadow-md flex justify-between items-center">
            <div>
                <span className="text-lg font-semibold text-white mr-4">Map Mode:</span>
                <div className="inline-flex rounded-md shadow-sm" role="group">
                <button type="button" onClick={() => setPlacementMode('jammer')} className={`px-4 py-2 text-sm font-medium rounded-l-lg ${getModeClass('jammer')}`}>Add Jammer</button>
                <button type="button" onClick={() => setPlacementMode('routeStart')} className={`px-4 py-2 text-sm font-medium border-t border-b border-gray-700 ${getModeClass('routeStart')}`}>Set Route Start</button>
                <button type="button" onClick={() => setPlacementMode('routeEnd')} className={`px-4 py-2 text-sm font-medium rounded-r-lg ${getModeClass('routeEnd')}`}>Set Route End</button>
                </div>
            </div>
            <div className='flex items-center space-x-4'>
                {/* --- NEW BACKGROUND CHECKBOX --- */}
                <label className="flex items-center space-x-2">
                  <input type="checkbox" checked={showMapBackground} onChange={(e) => setShowMapBackground(e.target.checked)} />
                  <span className="text-gray-300 text-sm">Show Background</span>
                </label>
                <span className="text-lg font-semibold text-indigo-300">Jammers: {jammers.length}</span>
                <button type="button" onClick={() => { setJammers([]); setFixedRoute({ start: null, end: null }); }} className="px-4 py-2 text-sm font-medium text-red-400 hover:text-red-300">Clear Pins</button>
            </div>
        </div>

        {/* The Map */}
        <div className="h-[600px] rounded-lg overflow-hidden shadow-lg">
          <MapContainer
            center={[-15.79, -47.88]}
            zoom={4}
            style={{ height: '100%', width: '100%', backgroundColor: '#111' }}
          >
            {/* --- NEW: Conditional Background Rendering --- */}
            {showMapBackground && (
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
            )}
            
            {/* BUG FIX: 'key' forces map recreation on change */}
            <GeoJsonLayer 
              key={formData.map_name} 
              mapName={formData.map_name} 
              setMapBounds={setMapBounds} 
            />
            
            <MapClickHandler
              mode={placementMode}
              onAddJammer={handleMapClick}
              onSetRoutePoint={handleSetRoutePoint}
            />

            {jammers.map((pos, idx) => (<Marker key={`j-${idx}`} position={pos} icon={jammerIcon}><Popup>Jammer #{idx + 1}</Popup></Marker>))}
            {fixedRoute.start && (<Marker position={fixedRoute.start} icon={startIcon}><Popup>Fixed Route Start</Popup></Marker>)}
            {fixedRoute.end && (<Marker position={fixedRoute.end} icon={endIcon}><Popup>Fixed Route End</Popup></Marker>)}

          </MapContainer>
        </div>
      </div>
    </div>
  )
}