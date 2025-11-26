import { Link } from 'react-router-dom';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-200 font-sans selection:bg-purple-500 selection:text-white">
      
      {/* --- HERO SECTION --- */}
      <div className="relative overflow-hidden bg-[#111] border-b border-gray-800">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
        <div className="max-w-7xl mx-auto px-6 py-20 relative z-10 text-center">
          <h1 className="text-5xl md:text-6xl font-extrabold text-white mb-6 tracking-tight">
            Next-Gen <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">V2X Security</span> Simulation
          </h1>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
            Accelerate your cybersecurity research. Generate complex <strong>5G/6G Vehicle-to-Everything</strong> scenarios for OMNeT++ & SUMO in seconds, not days.
          </p>
          <div className="mt-10 flex justify-center gap-4">
            <Link to="/simulations/expert" className="px-8 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg shadow-lg shadow-purple-900/30 transition transform hover:-translate-y-1">
              Start Expert Mode 🧠
            </Link>
            <Link to="/about" className="px-8 py-3 bg-[#222] border border-gray-700 hover:bg-[#333] text-gray-300 font-bold rounded-lg transition">
              Learn Architecture 📚
            </Link>
          </div>
        </div>
      </div>

      {/* --- MODE SELECTOR (CARDS) --- */}
      <div className="max-w-7xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold text-white mb-10 border-l-4 border-cyan-500 pl-4">Select Your Workflow</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Card 1: Quick */}
          <Link to="/simulations/simple" className="group relative bg-[#161616] p-8 rounded-2xl border border-gray-800 hover:border-cyan-500 transition duration-300 overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition text-6xl">⚡</div>
            <h3 className="text-xl font-bold text-white mb-3 group-hover:text-cyan-400 transition">Quick Sim</h3>
            <p className="text-sm text-gray-400 mb-6">
              <strong>"I need data now."</strong><br/>
              Automated jamming scenarios. Ideal for statistical analysis and high-level throughput metrics without manual setup.
            </p>
            <span className="text-xs font-bold text-cyan-600 uppercase tracking-widest group-hover:underline">Launch Quick Sim →</span>
          </Link>

          {/* Card 2: Advanced */}
          <Link to="/simulations/advanced" className="group relative bg-[#161616] p-8 rounded-2xl border border-gray-800 hover:border-purple-500 transition duration-300 overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition text-6xl">🛠️</div>
            <h3 className="text-xl font-bold text-white mb-3 group-hover:text-purple-400 transition">Advanced Sim</h3>
            <p className="text-sm text-gray-400 mb-6">
              <strong>"I need control."</strong><br/>
              Define topology, place static towers, and configure global network parameters. Perfect for specific attack vectors.
            </p>
            <span className="text-xs font-bold text-purple-600 uppercase tracking-widest group-hover:underline">Launch Advanced →</span>
          </Link>

          {/* Card 3: Expert */}
          <Link to="/simulations/expert" className="group relative bg-[#161616] p-8 rounded-2xl border border-gray-800 hover:border-green-500 transition duration-300 overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition text-6xl">🧠</div>
            <h3 className="text-xl font-bold text-white mb-3 group-hover:text-green-400 transition">Expert Mode</h3>
            <p className="text-sm text-gray-400 mb-6">
              <strong>"I am a Network Engineer."</strong><br/>
              Granular control. Configure every node individually: Routes, 5G Numerology, Bandwidth, and specific Jamming targets.
            </p>
            <span className="text-xs font-bold text-green-600 uppercase tracking-widest group-hover:underline">Launch Expert →</span>
          </Link>

        </div>
      </div>

      {/* --- HOW IT WORKS (Diagram Visual) --- */}
      <div className="bg-[#0f0f0f] border-t border-gray-900 py-16">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-white mb-10 text-center">Workflow Pipeline</h2>
          <div className="flex flex-col md:flex-row items-center justify-center gap-8 opacity-80">
            
            {/* Step 1 */}
            <div className="text-center max-w-xs">
              <div className="w-16 h-16 mx-auto bg-gray-800 rounded-full flex items-center justify-center text-2xl mb-4 border border-gray-700">🖥️</div>
              <h4 className="font-bold text-white mb-2">1. Configure</h4>
              <p className="text-xs text-gray-500">Select map, place nodes, and define attack parameters via Web UI.</p>
            </div>

            {/* Arrow */}
            <div className="hidden md:block text-gray-600 text-2xl">➔</div>

            {/* Step 2 */}
            <div className="text-center max-w-xs">
              <div className="w-16 h-16 mx-auto bg-gray-800 rounded-full flex items-center justify-center text-2xl mb-4 border border-gray-700">⚙️</div>
              <h4 className="font-bold text-white mb-2">2. Process</h4>
              <p className="text-xs text-gray-500">Backend (Python) calculates routes (SUMO) and generates network topology (.NED).</p>
            </div>

            {/* Arrow */}
            <div className="hidden md:block text-gray-600 text-2xl">➔</div>

            {/* Step 3 */}
            <div className="text-center max-w-xs">
              <div className="w-16 h-16 mx-auto bg-gray-800 rounded-full flex items-center justify-center text-2xl mb-4 border border-gray-700">📦</div>
              <h4 className="font-bold text-white mb-2">3. Simulate</h4>
              <p className="text-xs text-gray-500">Download ZIP bundle containing valid OMNeT++ project files ready to run.</p>
            </div>

          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="py-8 text-center text-xs text-gray-600 border-t border-gray-900 bg-black">
        <p>© 2025 CyberV2X Orchestrator. Built for B5GCyberTestV2X Framework.</p>
      </div>

    </div>
  );
}