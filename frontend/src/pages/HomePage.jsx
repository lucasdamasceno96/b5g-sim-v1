export default function HomePage() {
  return (
    <div className="prose prose-invert max-w-none">
      <h2>Welcome to the V2X Simulation Platform</h2>
      <p>
        This platform abstracts the complexity of creating V2X scenarios 
        (SUMO + OMNeT++/Veins + Simu5G), allowing you to configure and 
        generate the necessary files to run simulations with cyber-attacks.
      </p>
      <p>
        The goal is to provide a "Tool Paper" interface to accelerate
        V2X cybersecurity research.
      </p>
      <ul>
        <li>Generate files: <code>omnetpp.ini</code>, <code>.sumocfg</code>, <code>.rou.xml</code>, and <code>.launchd.xml</code>.</li>
        <li>Choose pre-generated maps and routes.</li>
        <li>Configure traffic density and communication parameters.</li>
        <li>Inject attack scenarios (e.g., Jamming, Spoofing) into the simulation.</li>
      </ul>
      
      <h3>How to Start</h3>
      <ol>
        <li>Navigate to <strong>Simulations</strong> in the header.</li>
        <li>Choose an attack scenario (e.g., "Simple Jamming").</li>
        <li>Fill out the form and click "Generate Simulation".</li>
        <li>A <code>.zip</code> file containing all required configuration
            files will be downloaded.</li>
        <li>Extract the ZIP and run the simulation using OMNeT++.</li>
      </ol>
    </div>
  )
}