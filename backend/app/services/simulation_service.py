import io
import zipfile
import subprocess
import os
import logging
import random
from pathlib import Path
from datetime import datetime
import json

try:
    import sumolib
except ImportError:
    logging.error("SUMOLIB not found. Check PYTHONPATH.")
    sumolib = None

from app.models.simulation import SimulationPayload
from app.core.config import settings

class SimulationService:

    def __init__(self):
        if sumolib is None:
            raise ImportError("SUMOLIB is unavailable. Please configure PYTHONPATH.")
        self.net = None

    def _load_net(self, map_name: str):
        net_file = settings.SUMO_MAPS_DIR / map_name
        if not net_file.exists():
            raise FileNotFoundError(f"Map file not found: {net_file}")
        self.net = sumolib.net.readNet(str(net_file))

    def _generate_jammer_positions(self, num_jammers):
        """Generate random jammer positions inside the map bounding box."""
        bbox = self.net.getBoundary()
        min_x, min_y, max_x, max_y = bbox
        
        positions = []
        for _ in range(num_jammers):
            x = random.uniform(min_x + 50, max_x - 50)
            y = random.uniform(min_y + 50, max_y - 50)
            positions.append((x, y))
        return positions

    def _generate_routes(self, sim_dir: Path, payload: SimulationPayload) -> Path:
        """Generate background traffic using randomTrips.py."""
        route_file = sim_dir / "random.rou.xml"
        net_file = settings.SUMO_MAPS_DIR / payload.map_name

        period = float(payload.simulation_time) / max(1, payload.total_vehicles)

        command = [
            "python", settings.RANDOM_TRIPS_PY,
            "-n", str(net_file),
            "-e", str(payload.simulation_time),
            "-p", str(period),
            "-o", str(route_file),
            "--seed", str(payload.random_seed),
            "--validate"
        ]
        
        subprocess.run(command, check=True, capture_output=True, text=True)
        return route_file

    def _generate_ned_file(self, sim_name, num_cars, num_jammers):
        """Generate network topology file."""
        ned = f"""package {sim_name};

import inet.networklayer.configurator.ipv4.Ipv4NetworkConfigurator;
import inet.networklayer.ipv4.RoutingTableRecorder;
import inet.node.inet.StandardHost;
import inet.node.inet.Router;
import simu5g.common.binder.Binder;
import simu5g.nodes.Upf;
import simu5g.world.radio.LteChannelControl;
import simu5g.common.carrierAggregation.CarrierAggregation;
import de.hshl.b5gcybertestv2x.nodes.gNB;
import de.hshl.b5gcybertestv2x.nodes.CarV2X;
import de.hshl.b5gcybertestv2x.nodes.jammers.DroneJammer;
import org.car2x.veins.subprojects.veins_inet.VeinsInetManager;

network {sim_name} {{
    parameters:
        double playgroundSizeX @unit(m);
        double playgroundSizeY @unit(m);
        double playgroundSizeZ @unit(m);
        @display("bgb=1000,1000");

    submodules:
        routingRecorder: RoutingTableRecorder {{ @display("p=50,75;is=s"); }}
        configurator: Ipv4NetworkConfigurator {{ @display("p=50,125"); config = xmldoc("demo.xml"); }}
        veinsManager: VeinsInetManager {{ @display("p=50,227;is=s"); }}
        channelControl: LteChannelControl {{ @display("p=50,25;is=s"); }}
        binder: Binder {{ @display("p=50,175;is=s"); }}
        carrierAggregation: CarrierAggregation {{ @display("p=50,250;is=s"); }}
        
        server: StandardHost {{ @display("p=660,136;i=device/server"); }}
        router: Router {{ @display("p=561,135;i=device/smallrouter"); }}
        upf: Upf {{ @display("p=462,136"); }}
        
        gNodeB1: gNB {{ @display("p=150,150;is=vl"); }}
        
        car[{num_cars}]: CarV2X;
"""
        for i in range(num_jammers):
            ned += f"        jammer_{i}: DroneJammer {{ @display(\"i=device/drone\"); }}\n"

        ned += """
    connections allowunconnected:
        server.pppg++ <--> Eth10G <--> router.pppg++;
        router.pppg++ <--> Eth10G <--> upf.filterGate;
        upf.pppg++ <--> Eth10G <--> gNodeB1.ppp;
}
"""
        return ned

    def _generate_omnetpp_ini(self, payload: SimulationPayload, jammer_positions) -> str:
        sim_name = payload.simulation_name.replace(" ", "_")
        
        ini = f"""[General]
network = {sim_name}.{sim_name}
sim-time-limit = {payload.simulation_time}s
seed-set = {payload.random_seed}
debug-on-errors = false
cmdenv-express-mode = true

*.veinsManager.host = "localhost"
*.veinsManager.port = 9999
*.veinsManager.moduleType = "de.hshl.b5gcybertestv2x.nodes.CarV2X"
*.veinsManager.moduleName = "car"
*.veinsManager.launchConfig = xmldoc("simulation.launchd.xml")
*.veinsManager.updateInterval = 0.1s

**.numBands = 25 
**.ueTxPower = 26
**.eNodeBTxPower = 46

*.car[*].cellularNic.nrPhy.dynamicCellAssociation = true
*.car[*].masterId = 0     
*.car[*].macCellId = 0    
*.car[*].nrMasterId = 1     
*.car[*].nrMacCellId = 1    

**.gNodeB1.macCellId = 1
**.gNodeB1.macNodeId = 1

*.car[*].mobility.typename = "VeinsInetMobility"
**.sctp.nagleEnabled = false
**.sctp.enableHeartbeats = false

*.server.numApps = 1
*.server.app[0].typename = "VoIPReceiver"
*.server.app[0].localPort = 3000

*.car[*].numApps = 1
*.car[*].app[0].typename = "VoIPSender"
*.car[*].app[0].destAddress = "server"
*.car[*].app[0].destPort = 3000
*.car[*].app[0].startTime = uniform(0s, 5s)
*.car[*].app[0].packetSize = {payload.app_params.packet_size_b}B
*.car[*].phy.txPower = {payload.net_params.tx_power_dbm}dBm

**.scalar-recording = true
**.vector-recording = true
**.car[*].**.sinr.vector-recording = true
**.car[*].**.packetLoss.vector-recording = true
"""

        if payload.execute_with_attack and payload.jamming_params:
            jp = payload.jamming_params
            for i, (x, y) in enumerate(jammer_positions):
                ini += f"\n*.jammer_{i}.mobility.typename = \"LinearMobility\"\n"
                ini += f"*.jammer_{i}.mobility.initialX = {x:.2f}m\n"
                ini += f"*.jammer_{i}.mobility.initialY = {y:.2f}m\n"
                ini += f"*.jammer_{i}.mobility.initialZ = 50m\n"
                ini += f"*.jammer_{i}.mobility.speed = 10mps\n"
                ini += f"*.jammer_{i}.app[0].typename = \"JammerApp\"\n"
                ini += f"*.jammer_{i}.app[0].startTime = {jp.start_time_s}s\n"
                ini += f"*.jammer_{i}.app[0].stopTime = {jp.stop_time_s}s\n"
                ini += f"*.jammer_{i}.jammerType = \"{jp.strategy}\"\n"
                ini += f"*.jammer_{i}.transmissionPower = {jp.power_dbm}dBm\n"
                ini += f"*.jammer_{i}.active = true\n"

        return ini

    def _generate_sumocfg(self, map_name, duration):
        return f"""<configuration>
    <input>
        <net-file value="{map_name}"/>
        <route-files value="random.rou.xml"/>
    </input>
    <time>
        <begin value="0"/>
        <end value="{duration}"/>
    </time>
</configuration>"""

    def create_simulation_zip(self, payload: SimulationPayload) -> io.BytesIO:
        self._load_net(payload.map_name)
        
        num_jammers = 0
        if payload.execute_with_attack:
            factor = 0.10
            num_jammers = max(1, int(payload.total_vehicles * factor)) 
        
        jammer_positions = self._generate_jammer_positions(num_jammers)
        
        sim_name = payload.simulation_name.replace(" ", "_")
        temp_dir = Path(f"temp_simple_{datetime.now().strftime('%Y%m%d_%H%M%S')}")
        temp_dir.mkdir()
        
        try:
            route_file = self._generate_routes(temp_dir, payload)
            
            ned = self._generate_ned_file(sim_name, payload.total_vehicles, num_jammers)
            ini = self._generate_omnetpp_ini(payload, jammer_positions)
            sumocfg = self._generate_sumocfg(payload.map_name, payload.simulation_time)
            
            launchd = f"""<launchd>
                <copy file="{payload.map_name}"/>
                <copy file="simulation.sumocfg"/>
                <copy file="omnetpp.ini"/>
                <copy file="demo.xml"/>
                <copy file="random.rou.xml"/>
                <run command="sumo-gui -c simulation.sumocfg --remote-port 9999"/>
            </launchd>"""
            
            demo_xml = "<config><interface hosts='**' address='10.x.x.x' netmask='255.x.x.x'/><multicast-group hosts='**' address='224.0.0.1'/></config>"
            
            zip_buffer = io.BytesIO()

            folder = f"{sim_name}"
            
            with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zf:
                zf.writestr(f"{folder}/simulation.ned", ned)
                zf.writestr(f"{folder}/package.ned", f"package {sim_name};")
                zf.writestr(f"{folder}/omnetpp.ini", ini)
                zf.writestr(f"{folder}/simulation.sumocfg", sumocfg)
                zf.writestr(f"{folder}/simulation.launchd.xml", launchd)
                zf.writestr(f"{folder}/demo.xml", demo_xml)
                zf.write(route_file, f"{folder}/random.rou.xml")
                
                map_p = settings.SUMO_MAPS_DIR / payload.map_name
                if map_p.exists():
                    zf.write(map_p, f"{folder}/{payload.map_name}")
                
        finally:
            if route_file.exists(): route_file.unlink()
            if temp_dir.exists(): temp_dir.rmdir()

        zip_buffer.seek(0)
        return zip_buffer
