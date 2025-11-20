import io
import zipfile
import subprocess
import os
import logging
from pathlib import Path
from datetime import datetime
import json
from typing import Tuple

try:
    import sumolib
except ImportError:
    logging.error("SUMOLIB not found. Check PYTHONPATH.")
    sumolib = None

from app.models.simulation import AdvancedSimulationPayload
from app.core.config import settings
from app.services.simulation_service import SimulationService 

class AdvancedSimulationService(SimulationService):

    def __init__(self):
        if sumolib is None:
            raise ImportError("SUMOLIB is unavailable. Please configure PYTHONPATH.")
        self.net = None
        self.payload = None

    def _load_sumo_net(self, map_name: str):
        """Loads the SUMO network file to enable coordinate conversion."""
        net_file = settings.SUMO_MAPS_DIR / map_name
        if not net_file.exists():
            raise FileNotFoundError(f"Map file not found: {net_file}")
        self.net = sumolib.net.readNet(str(net_file))

    def _convert_latlng_to_xy(self, latlng) -> Tuple[float, float]:
        """Converts Lat/Lng to SUMO X/Y coordinates with fallback methods."""
        if not self.net: raise Exception("SUMO net not loaded.")
        
        try:
            # Try different SUMO methods depending on version/map type
            if hasattr(self.net, 'convertGeoToXY'):
                return self.net.convertGeoToXY(latlng.lng, latlng.lat)
            elif hasattr(self.net, 'convertLonLat2XY'):
                return self.net.convertLonLat2XY(latlng.lng, latlng.lat)
            else:
                # Fallback for simple maps without projection (Cartesian)
                return float(latlng.lng), float(latlng.lat)
        except Exception as e:
            logging.warning(f"Coordinate conversion failed (using raw): {e}")
            return float(latlng.lng), float(latlng.lat)

    def _convert_latlng_to_edge(self, latlng) -> str:
        """Finds the closest road edge to the given coordinates."""
        if not self.net: raise Exception("SUMO net not loaded.")
        x, y = self._convert_latlng_to_xy(latlng)
        
        lanes = self.net.getNeighboringLanes(x, y, 200) 
        if not lanes:
             lanes = self.net.getNeighboringLanes(x, y, 1000)
             if not lanes:
                raise Exception(f"No road found near coordinates {latlng}.")
        closest_lane, dist = min(lanes, key=lambda l: l[1])
        return closest_lane.getEdge().getID()

    def _generate_fixed_routes_xml(self, sim_dir: Path) -> Path:
        """Generates routes.xml for fixed fleet vehicles using <flow>."""
        route_file = sim_dir / "fixed.rou.xml"
        with open(route_file, "w") as f:
            f.write("<routes>\n")
            f.write('  <vType id="fixed_fleet" accel="2.6" decel="4.5" sigma="0.5" length="5" maxSpeed="70"/>\n\n')
            
            for i, route in enumerate(self.payload.fixed_routes_list):
                try:
                    from_edge = self._convert_latlng_to_edge(route.start)
                    to_edge = self._convert_latlng_to_edge(route.end)
                    if from_edge == to_edge: continue

                    f.write(f'  <flow id="fixed_{i}" type="fixed_fleet" begin="0" end="{self.payload.simulation_time}" ')
                    f.write(f'number="{route.count}" from="{from_edge}" to="{to_edge}"/>\n')
                except Exception as e:
                    logging.error(f"Error generating fixed route {i}: {e}")
            
            f.write("</routes>\n")
        return route_file

    def _generate_random_routes_xml(self, sim_dir: Path) -> Path:
        """Generates random traffic using randomTrips.py."""
        route_file = sim_dir / "random.rou.xml"
        net_file = settings.SUMO_MAPS_DIR / self.payload.map_name
        
        period = 0
        if self.payload.num_random_vehicles > 0:
            period = float(self.payload.simulation_time) / float(self.payload.num_random_vehicles)

        command = [
            "python", settings.RANDOM_TRIPS_PY,
            "-n", str(net_file),
            "-e", str(self.payload.simulation_time),
            "-p", str(period), 
            "-o", str(route_file),
            "--seed", str(self.payload.random_seed),
            "--validate"
        ]
        
        logging.info(f"Running RandomTrips: {' '.join(command)}")
        subprocess.run(command, check=True, capture_output=True, text=True)
        return route_file

    def _generate_ned_file(self, payload: AdvancedSimulationPayload) -> str:
        """Generates the .ned topology file dynamically."""
        sim_name = payload.simulation_name.replace(" ", "_").replace("-", "_")
        
        # Calculate safe vector size to prevent index out of bounds
        # (Fixed + Random + 20% buffer)
        total_cars = int((payload.num_fixed_vehicles + payload.num_random_vehicles) * 1.2) + 10

        ned = f"""package simulations.{sim_name};

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
import de.hshl.b5gcybertestv2x.nodes.NR.NRJammer;
import de.hshl.b5gcybertestv2x.nodes.jammers.DroneJammer;
import de.hshl.b5gcybertestv2x.nodes.NR.RSUNR;
import org.car2x.veins.subprojects.veins_inet.VeinsInetManager;

network {sim_name}
{{
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
        
        // Using a generic gNB for coverage
        gNodeB1: gNB {{ @display("p=150,150;is=vl"); }}
        
        // Vehicle vector with safe buffer size
        car[{total_cars}]: CarV2X;
"""
        # Dynamic Jammers
        if payload.jammers_list:
            j_type = payload.jamming_params.jammer_type
            j_class = "DroneJammer" if j_type == "DroneJammer" else "NRJammer"
            icon = "device/drone" if j_type == "DroneJammer" else "device/antennatower"
            
            for i, _ in enumerate(payload.jammers_list):
                ned += f"        jammer_{i}: {j_class} {{ @display(\"i={icon}\"); }}\n"

        # Dynamic RSUs
        if payload.rsus_list:
            for i, _ in enumerate(payload.rsus_list):
                ned += f"        rsu_{i}: RSUNR {{ @display(\"i=device/antennatower\"); }}\n"

        ned += """
    connections allowunconnected:
        server.pppg++ <--> Eth10G <--> router.pppg++;
        router.pppg++ <--> Eth10G <--> upf.filterGate;
        upf.pppg++ <--> Eth10G <--> gNodeB1.ppp;
}
"""
        return ned

    def _generate_omnetpp_ini(self, payload: AdvancedSimulationPayload) -> str:
        """
        Generates the omnetpp.ini file.
        CRITICAL UPDATE: Now injects Jammer Physics parameters and Metrics Recording.
        """
        sim_name = payload.simulation_name.replace(" ", "_").replace("-", "_")
        jp = payload.jamming_params
        
        ini = f"""[General]
network = simulations.{sim_name}.{sim_name}
sim-time-limit = {payload.simulation_time}s
seed-set = {payload.random_seed}

# --- Veins/SUMO Manager ---
*.veinsManager.host = "localhost"
*.veinsManager.port = 9999
*.veinsManager.moduleType = "de.hshl.b5gcybertestv2x.nodes.CarV2X"
*.veinsManager.moduleName = "car"
*.veinsManager.launchConfig = xmldoc("simulation.launchd.xml")
*.veinsManager.updateInterval = 0.1s

# --- Traffic Generation (V2X Application) ---
# This ensures cars are actually talking to each other
*.car[*].numApps = 1
*.car[*].app[0].typename = "V2XApp" 
*.car[*].app[0].sendInterval = {payload.app_params.send_interval_s}s
*.car[*].app[0].packetSize = {payload.app_params.packet_size_b}B
*.car[*].app[0].destAddresses = "broadcast" 
*.car[*].mitigation.active = {"true" if payload.mitigation_active else "false"}
*.car[*].mitigation.rerouteOnAttack = {"true" if payload.reroute_on_attack else "false"}

# --- 5G Network Params ---
*.car[*].phy.txPower = {payload.net_params.tx_power_dbm}dBm
*.gNodeB*.phy.txPower = 40dBm
"""
        # --- JAMMER CONFIGURATION (UPDATED) ---
        for i, jammer in enumerate(payload.jammers_list):
            x, y = self._convert_latlng_to_xy(jammer)
            
            ini += f"\n# --- Jammer {i} Setup ---\n"
            
            # 1. Mobility (Physics)
            if jp.jammer_type == "DroneJammer":
                # If mobile, use Linear or Static depending on implementation
                ini += f"*.jammer_{i}.mobility.typename = \"StaticGridMobility\"\n" # Simplified for now
            else:
                ini += f"*.jammer_{i}.mobility.typename = \"StaticGridMobility\"\n"
            
            ini += f"*.jammer_{i}.mobility.initialX = {x:.2f}m\n"
            ini += f"*.jammer_{i}.mobility.initialY = {y:.2f}m\n"
            
            # 2. Attack Logic (Application Layer)
            ini += f"*.jammer_{i}.app[0].typename = \"JammerApp\"\n"
            ini += f"*.jammer_{i}.app[0].startTime = {jp.start_time_s}s\n"
            ini += f"*.jammer_{i}.app[0].stopTime = {jp.stop_time_s}s\n"
            
            # 3. Radio/PHY Parameters (Critical for NRJammer)
            # These params control the actual signal interference
            ini += f"*.jammer_{i}.jammerType = \"{jp.strategy}\"\n"
            ini += f"*.jammer_{i}.transmissionPower = {jp.power_dbm}dBm\n"
            ini += f"*.jammer_{i}.active = true\n"
            ini += f"*.jammer_{i}.carrierFrequency = 5.9GHz\n" 

        # --- RSU CONFIGURATION ---
        for i, rsu in enumerate(payload.rsus_list):
            x, y = self._convert_latlng_to_xy(rsu)
            ini += f"\n# RSU {i}\n"
            ini += f"*.rsu_{i}.mobility.typename = \"StaticGridMobility\"\n"
            ini += f"*.rsu_{i}.mobility.initialX = {x:.2f}m\n"
            ini += f"*.rsu_{i}.mobility.initialY = {y:.2f}m\n"

        # --- METRICS RECORDING (CRITICAL FOR PAPER) ---
        ini += """
\n# --- Scientific Metrics Collection ---
# These vectors are essential for the Tool Paper results
**.scalar-recording = true
**.vector-recording = true

# Vehicle Metrics
**.car[*].**.sinr.vector-recording = true
**.car[*].**.throughput.vector-recording = true
**.car[*].**.packetLoss.vector-recording = true
**.car[*].**.minSnr.vector-recording = true

# Jammer Metrics
**.jammer_*.**.transmissionState.vector-recording = true
**.jammer_*.**.radioMode.vector-recording = true
"""
        return ini

    def _generate_sumocfg(self, payload) -> str:
        route_files = []
        if payload.num_fixed_vehicles > 0: route_files.append("fixed.rou.xml")
        if payload.num_random_vehicles > 0: route_files.append("random.rou.xml")
        return f"""<configuration>
    <input>
        <net-file value="{payload.map_name}"/>
        <route-files value="{','.join(route_files)}"/>
    </input>
    <time>
        <begin value="0"/>
        <end value="{payload.simulation_time}"/>
    </time>
</configuration>"""

    def _generate_launchd_xml(self, payload) -> str:
        files = [payload.map_name, "simulation.sumocfg", "omnetpp.ini"]
        if payload.num_fixed_vehicles > 0: files.append("fixed.rou.xml")
        if payload.num_random_vehicles > 0: files.append("random.rou.xml")
        xml = "<launchd>\n"
        for f in files: xml += f'  <copy file="{f}"/>\n'
        xml += '  <run command="sumo-gui -c simulation.sumocfg --remote-port 9999"/>\n</launchd>'
        return xml

    def create_advanced_simulation_zip(self, payload: AdvancedSimulationPayload) -> io.BytesIO:
        self.payload = payload
        self._load_sumo_net(payload.map_name)
        
        zip_buffer = io.BytesIO()
        temp_dir = Path(f"temp_{datetime.now().strftime('%Y%m%d_%H%M%S')}")
        temp_dir.mkdir()
        
        try:
            gen_files = []
            if payload.num_fixed_vehicles > 0:
                gen_files.append(self._generate_fixed_routes_xml(temp_dir))
            if payload.num_random_vehicles > 0:
                gen_files.append(self._generate_random_routes_xml(temp_dir))
            
            ned_content = self._generate_ned_file(payload)
            ini_content = self._generate_omnetpp_ini(payload)
            sumocfg = self._generate_sumocfg(payload)
            launchd = self._generate_launchd_xml(payload)
            
            sim_folder = payload.simulation_name.replace(" ", "_").replace("-", "_")
            
            with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zf:
                zf.writestr(f"{sim_folder}/simulation.ned", ned_content)
                zf.writestr(f"{sim_folder}/package.ned", f"package simulations.{sim_folder};")
                zf.writestr(f"{sim_folder}/omnetpp.ini", ini_content)
                zf.writestr(f"{sim_folder}/simulation.sumocfg", sumocfg)
                zf.writestr(f"{sim_folder}/simulation.launchd.xml", launchd)
                
                for f in gen_files: zf.write(f, f"{sim_folder}/{f.name}")
                zf.write(settings.SUMO_MAPS_DIR / payload.map_name, f"{sim_folder}/{payload.map_name}")
                
        finally:
            for f in gen_files: 
                if f.exists(): f.unlink()
            if temp_dir.exists(): temp_dir.rmdir()

        zip_buffer.seek(0)
        return zip_buffer