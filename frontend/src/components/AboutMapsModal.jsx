import { useState } from "react";

export default function AboutMapsModal() {
  const [open, setOpen] = useState(false);

  const maps = [
    {
      file: "highway.net.xml",
      geojson: "highway.geojson",
      type: "Highway/Road",
      use: "High-speed scenarios on highways",
      complexity: "Medium"
    },
    {
      file: "industrial.net.xml",
      geojson: "industrial.geojson", 
      type: "Industrial Zone",
      use: "Tests in industrial areas with special vehicles",
      complexity: "Medium"
    },
    {
      file: "rural.net.xml",
      geojson: "rural.geojson",
      type: "Rural Area", 
      use: "Long-distance scenarios with minimal infrastructure",
      complexity: "Low"
    },
    {
      file: "suburban.net.xml",
      geojson: "suburban.geojson",
      type: "Suburban Area",
      use: "Residential areas with moderate traffic",
      complexity: "Medium"
    },
    {
      file: "T_Intersection.net.xml",
      geojson: "T_Intersection.geojson",
      type: "T-Intersection",
      use: "Minimal scenario for basic testing",
      complexity: "Low"
    },
    {
      file: "urban_dense.net.xml",
      geojson: "urban_dense.geojson",
      type: "Dense Urban",
      use: "Urban centers with heavy traffic and multiple intersections", 
      complexity: "High"
    },
    {
      file: "urban_grid.net.xml",
      geojson: "urban_grid.geojson",
      type: "Urban Grid",
      use: "Street grid pattern for systematic testing",
      complexity: "Medium"
    }
  ];

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-3 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 shadow transition-colors"
      >
        Available Maps
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-[#1f1f1f] text-gray-200 rounded-xl shadow-xl p-6 w-full max-w-6xl border border-gray-700"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold mb-2 text-purple-300">
              Available SUMO Maps
            </h2>
            <p className="text-gray-400 mb-5 text-sm">
              {maps.length} maps configured for V2X simulations
            </p>

            <div className="overflow-x-auto max-h-[70vh]">
              <table className="w-full text-sm border border-gray-700">
                <thead className="bg-[#2a2a2a] text-gray-300 sticky top-0">
                  <tr>
                    <th className="border border-gray-700 px-3 py-3 text-left">.net.xml File</th>
                    <th className="border border-gray-700 px-3 py-3 text-left">GeoJSON File</th>
                    <th className="border border-gray-700 px-3 py-3 text-left">Scenario Type</th>
                    <th className="border border-gray-700 px-3 py-3 text-left">Scientific Use</th>
                    <th className="border border-gray-700 px-3 py-3 text-left">Complexity</th>
                  </tr>
                </thead>

                <tbody>
                  {maps.map((m, i) => (
                    <tr
                      key={i}
                      className={`hover:bg-[#2a2a2a] transition-colors ${
                        i % 2 === 0 ? "bg-[#1b1b1b]" : "bg-[#232323]"
                      }`}
                    >
                      <td className="border border-gray-700 px-3 py-2 font-mono text-xs">
                        {m.file}
                      </td>
                      <td className="border border-gray-700 px-3 py-2 font-mono text-xs">
                        {m.geojson}
                      </td>
                      <td className="border border-gray-700 px-3 py-2">
                        {m.type}
                      </td>
                      <td className="border border-gray-700 px-3 py-2 text-sm">
                        {m.use}
                      </td>
                      <td className="border border-gray-700 px-3 py-2">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          m.complexity === 'Low' ? 'bg-green-500/20 text-green-300' :
                          m.complexity === 'Medium' ? 'bg-yellow-500/20 text-yellow-300' :
                          'bg-red-500/20 text-red-300'
                        }`}>
                          {m.complexity}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 text-xs text-gray-400">
              <p><strong>Note:</strong> All maps include .net.xml (SUMO) and .geojson (frontend visualization) files</p>
            </div>

            <button
              onClick={() => setOpen(false)}
              className="mt-5 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 shadow transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}