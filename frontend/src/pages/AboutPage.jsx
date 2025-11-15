import AboutMapsModal from "../components/AboutMapsModal";

export default function AboutPage() {
  return (
    <div className="prose prose-invert max-w-none">
         <AboutMapsModal />

      <h2>About the Simulation Parameters</h2>
      <p>This page explains the meaning of the main configuration fields used in the simulation forms.</p>
      
      <h3>General Parameters</h3>
      <ul>
        <li><strong>Simulation Name:</strong> A unique name for your simulation folder (e.g., <code>berlin_jamming_50_vehicles</code>).</li>
        <li><strong>Map Name:</strong> The SUMO network file (<code>.net.xml</code>) to use.</li>
        <li><strong>Simulation Time:</strong> The total duration of the simulation in seconds.</li>
      </ul>

      <h3>Traffic Parameters</h3>
      <ul>
        <li><strong>Total Vehicles:</strong> The total number of vehicles to be spawned during the simulation time.</li>
        <li><strong>Vehicle Distribution:</strong> (Not yet implemented) Defines if all vehicles are identical ("Homogeneous") or varied ("Heterogeneous").</li>
        <li><strong>Random Seed:</strong> A number to ensure simulation reproducibility. The same seed will generate the same traffic pattern.</li>
      </ul>
      
      <h3>V2X Communication</h3>
      <ul>
        <li><strong>Communication Mode:</strong>
          <ul>
            <li><strong>D2D (Device-to-Device):</strong> Vehicles communicate directly (e.g., PC5/sidelink).</li>
            <li><strong>Cellular (V2N):</strong> Vehicles communicate via a gNodeB (base station). (Future work)</li>
          </ul>
        </li>
        <li><strong>Applications per Vehicle:</strong> How many application-layer processes are running on each vehicle (e.g., 1 for CAMs).</li>
      </ul>

      <h3>Attack Parameters (Jamming)</h3>
      <ul>
        <li><strong>Enable Jamming:</strong> Checkbox to include the attacker in the simulation.</li>
        <li><strong>Jamming Start/End Time:</strong> When the attack begins and ends (in seconds).</li>
        <li><strong>Jamming Power (dBm):</strong> The transmission power of the jammer.</li>
        <li><strong>Jamming Strategy:</strong> (Future work) "Constant" (always on), "Reactive" (jams on detection), etc.</li>
      </ul>
    </div>
  )
}