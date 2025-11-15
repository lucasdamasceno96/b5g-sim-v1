import { useState } from "react";

export default function AboutMapsModal() {
  const [open, setOpen] = useState(false);

  const maps = [
    {
      file: "berlim.net.xml",
      type: "European urban",
      use: "Realistic urban base",
      status: "✔️ Excellent",
    },
    {
      file: "Berlin_Residential-Complex_Streets.net.xml",
      type: "Complex residential",
      use: "Dense mobility / alternative routing",
      status: "✔️ Great",
    },
    {
      file: "Grid_2x2.net.xml",
      type: "Simple synthetic grid",
      use: "Controlled reference scenario",
      status: "✔️ Essential",
    },
    {
      file: "Manhattan_Grid-Medium_Urban.net.xml",
      type: "Manhattan-style grid",
      use: "Multi-intersection jamming tests",
      status: "✔️ Perfect",
    },
    {
      file: "Midwest_Rural-Long_Straight_Road.net.xml",
      type: "Long rural highway",
      use: "High-speed, long-range jamming",
      status: "✔️ Excellent",
    },
    {
      file: "New_York_Downtown-Dense_Urban.net.xml",
      type: "Extremely dense downtown",
      use: "Critical interference evaluation",
      status: "✔️ Very good",
    },
    {
      file: "Paris_Old_Town-Irregular_Streets.net.xml",
      type: "Irregular narrow old-town maze",
      use: "Worst LOS / ideal for jamming",
      status: "✔️ Important",
    },
    {
      file: "Sao_Paulo_Highway-High-Speed_Road.net.xml",
      type: "High-speed multi-lane highway",
      use: "Long-range tests",
      status: "✔️ Complete",
    },
    {
      file: "Swiss_Mountain_Road-Curvy_Terrain.net.xml",
      type: "Mountain/curvy terrain",
      use: "Multipath + obstacles + jamming",
      status: "✔️ Excellent",
    },
    {
      file: "T_Intersection.net.xml",
      type: "Simple T intersection",
      use: "Minimal baseline scenario",
      status: "✔️ Necessary",
    },
    {
      file: "Tokyo_Multi-Intersection-Heavy_Traffic.net.xml",
      type: "Heavy-traffic multiple intersections",
      use: "Comparison with Manhattan/NYC",
      status: "✔️ Scientific",
    },
  ];

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-3 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 shadow"
      >
        Sumo Maps Reference
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-[#1f1f1f] text-gray-200 rounded-xl shadow-xl p-6 w-full max-w-4xl border border-gray-700"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold mb-5 text-purple-300">
              SUMO Map Reference
            </h2>

            <div className="overflow-x-auto max-h-[60vh]">
              <table className="w-full text-sm border border-gray-700">
                <thead className="bg-[#2a2a2a] text-gray-300">
                  <tr>
                    <th className="border border-gray-700 px-3 py-2 text-left">File</th>
                    <th className="border border-gray-700 px-3 py-2 text-left">Scenario Type</th>
                    <th className="border border-gray-700 px-3 py-2 text-left">Scientific Use</th>
                    <th className="border border-gray-700 px-3 py-2 text-left">Status</th>
                  </tr>
                </thead>

                <tbody>
                  {maps.map((m, i) => (
                    <tr
                      key={i}
                      className={i % 2 === 0 ? "bg-[#1b1b1b]" : "bg-[#232323]"}
                    >
                      <td className="border border-gray-700 px-3 py-2 font-mono">
                        {m.file}
                      </td>
                      <td className="border border-gray-700 px-3 py-2">{m.type}</td>
                      <td className="border border-gray-700 px-3 py-2">{m.use}</td>
                      <td className="border border-gray-700 px-3 py-2">{m.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              onClick={() => setOpen(false)}
              className="mt-5 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 shadow"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
