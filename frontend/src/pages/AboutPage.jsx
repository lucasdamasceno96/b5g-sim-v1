import React from 'react';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#121212] text-gray-300 font-sans p-8 overflow-y-auto custom-scrollbar">
      
      {/* --- HEADER --- */}
      <div className="max-w-5xl mx-auto mb-12 text-center">
        <h1 className="text-4xl font-bold text-white mb-4 tracking-tight">
          CyberV2X <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600">Orchestrator</span>
        </h1>
        <p className="text-lg text-gray-400 max-w-2xl mx-auto">
          A complete web-based toolchain for generating complex <strong>5G V2X Cybersecurity Scenarios</strong>. 
          Designed to bridge the gap between high-level research intent and low-level simulation code.
        </p>
      </div>

      {/* --- FRAMEWORK REFERENCE --- */}
      <div className="max-w-5xl mx-auto bg-[#1e1e1e] border border-blue-900/50 rounded-xl p-6 mb-12 flex flex-col md:flex-row items-center justify-between shadow-lg shadow-blue-900/10">
        <div className="mb-4 md:mb-0">
          <h2 className="text-xl font-bold text-blue-400 mb-2">Powered by B5GCyberTestV2X</h2>
          <p className="text-sm text-gray-400">
            This platform generates valid configuration files (<code>.ned</code>, <code>.ini</code>, <code>.rou.xml</code>) specifically tuned for the B5GCyberTestV2X framework (based on Veins, OMNeT++, and Simu5G).
          </p>
        </div>
        <a 
          href="https://b5gcybertestv2x.hshl.de/" 
          target="_blank" 
          rel="noopener noreferrer"
          className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition transform hover:scale-105 flex items-center gap-2"
        >
          Visit Official Framework <span>↗</span>
        </a>
      </div>

      {/* --- SIMULATION MODES --- */}
      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
        
        {/* 1. Quick Sim */}
        <div className="bg-[#1e1e1e] p-6 rounded-xl border border-gray-800 hover:border-cyan-500/50 transition duration-300 group">
          <div className="text-4xl mb-4 group-hover:scale-110 transition duration-300">⚡</div>
          <h3 className="text-xl font-bold text-cyan-400 mb-3">Quick Sim</h3>
          <p className="text-sm text-gray-400 mb-4">
            <strong>"Scientific Abstraction"</strong> mode. Ideal for generating large-scale statistical datasets without manual configuration.
          </p>
          <ul className="text-xs text-gray-500 space-y-2 list-disc pl-4">
            <li>Abstracts parameters (Low/High Intensity).</li>
            <li>Automated Jammer placement (10% density).</li>
            <li>Background traffic generation.</li>
            <li>Focus on throughput & packet loss metrics.</li>
          </ul>
        </div>

        {/* 2. Advanced Sim */}
        <div className="bg-[#1e1e1e] p-6 rounded-xl border border-gray-800 hover:border-purple-500/50 transition duration-300 group">
          <div className="text-4xl mb-4 group-hover:scale-110 transition duration-300">🛠️</div>
          <h3 className="text-xl font-bold text-purple-400 mb-3">Advanced Sim</h3>
          <p className="text-sm text-gray-400 mb-4">
            <strong>"Global Control"</strong> mode. Defines specific parameters for the entire fleet and topology.
          </p>
          <ul className="text-xs text-gray-500 space-y-2 list-disc pl-4">
            <li>Manual placement of Jammers & RSUs.</li>
            <li>Global network settings (Tx Power, Bitrate).</li>
            <li>Mix of Fixed Routes and Random Traffic.</li>
            <li>Visual validation of attack range.</li>
          </ul>
        </div>

        {/* 3. Expert Sim */}
        <div className="bg-[#1e1e1e] p-6 rounded-xl border border-gray-800 hover:border-green-500/50 transition duration-300 group">
          <div className="text-4xl mb-4 group-hover:scale-110 transition duration-300">🧠</div>
          <h3 className="text-xl font-bold text-green-400 mb-3">Expert Mode</h3>
          <p className="text-sm text-gray-400 mb-4">
            <strong>"Granular Engineering"</strong> mode. Configure every single node individually for deep research.
          </p>
          <ul className="text-xs text-gray-500 space-y-2 list-disc pl-4">
            <li>Per-vehicle routing (Start -> End).</li>
            <li>Specific PHY layers (Numerology, Bandwidth).</li>
            <li>Complex Jammer Mobility (Patrol, Circular).</li>
            <li>Heterogeneous fleet configuration.</li>
          </ul>
        </div>
      </div>

      {/* --- TECHNICAL ARCHITECTURE --- */}
      <div className="max-w-5xl mx-auto">
        <h2 className="text-2xl font-bold text-white mb-6 border-b border-gray-800 pb-2">System Architecture</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          <div>
            <h3 className="text-lg font-semibold text-gray-200 mb-3">Frontend (React + Leaflet)</h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              Provides an interactive map interface using <strong>React-Leaflet</strong>. It handles coordinate capture, visualizes simulation entities (Cars, Drones, Towers), and manages complex state for "Instance-Based Configuration". It abstracts the complexity of XML/NED files into intuitive UI forms.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-200 mb-3">Backend (Python FastAPI + SUMO)</h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              The core engine. It uses <strong>sumolib</strong> and <strong>pyproj</strong> to convert GPS coordinates (Lat/Lon) into Cartesian coordinates (UTM) required by OMNeT++. It dynamically generates:
            </p>
            <ul className="text-xs text-gray-500 mt-2 grid grid-cols-2 gap-2">
              <li className="bg-gray-800 p-1 rounded text-center font-mono">simulation.ned</li>
              <li className="bg-gray-800 p-1 rounded text-center font-mono">omnetpp.ini</li>
              <li className="bg-gray-800 p-1 rounded text-center font-mono">*.rou.xml (SUMO)</li>
              <li className="bg-gray-800 p-1 rounded text-center font-mono">launchd.xml</li>
            </ul>
          </div>

        </div>
      </div>

      {/* --- FOOTER --- */}
      <div className="max-w-5xl mx-auto mt-16 pt-8 border-t border-gray-800 text-center text-xs text-gray-600">
        <p>Developed for the Tool Paper: "Automating V2X Cybersecurity Experiments".</p>
        <p>Compatible with OMNeT++ 6.0, Veins 5.2, and SUMO 1.18+.</p>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #121212; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #333; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #444; }
      `}</style>
    </div>
  );
}