import io
import zipfile
import subprocess
import os
import logging
from pathlib import Path
from datetime import datetime

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
        net_file = settings.SUMO_MAPS_DIR / map_name
        if not net_file.exists():
            raise FileNotFoundError(f"Map file not found: {net_file}")
        self.net = sumolib.net.readNet(str(net_file))

    def _convert_latlng_to_xy(self, latlng):
        """Converte Lat/Lon para X/Y do SUMO com prioridade correta."""
        if not self.net: raise Exception("SUMO net not loaded.")
        
        # SUMO usa (Longitude, Latitude) -> (X, Y)
        # Garante que estamos passando float
        lng = float(latlng.lng)
        lat = float(latlng.lat)

        try:
            # Tenta método padrão GeoToXY
            if hasattr(self.net, 'convertGeoToXY'):
                x, y = self.net.convertGeoToXY(lng, lat)
                return x, y
            # Tenta método legado LonLat2XY
            elif hasattr(self.net, 'convertLonLat2XY'):
                x, y = self.net.convertLonLat2XY(lng, lat)
                return x, y
            else:
                # Se o mapa não tiver projeção, assume cartesiano (arriscado, mas necessário)
                return lng, lat
        except Exception as e:
            logging.warning(f"Projection error: {e}. Using raw coords.")
            return lng, lat

    def _convert_latlng_to_edge(self, latlng) -> str:
        if not self.net: raise Exception("SUMO net not loaded.")
        x, y = self._convert_latlng_to_xy(latlng)
        
        # Raio de busca ajustado para rodovias (que são largas)
        # Tenta 50m, depois 200m
        lanes = self.net.getNeighboringLanes(x, y, 50) 
        if not lanes:
             lanes = self.net.getNeighboringLanes(x, y, 200)
        
        if not lanes:
             logging.error(f"Could not find any edge at {latlng} (XY: {x},{y})")
             # Retornamos None para tratar o erro, em vez de chutar uma rua aleatória
             raise Exception(f"No road found at clicked position {latlng}")

        # Pega a lane mais próxima e retorna a Edge ID
        closest_lane, dist = min(lanes, key=lambda l: l[1])
        return closest_lane.getEdge().getID()

    # --- XML GENERATORS ---

    def _generate_ipv4_config(self) -> str:
        return """<config>
    <interface hosts="**" address="10.x.x.x" netmask="255.x.x.x"/>
</config>"""

    def _generate_fixed_routes_xml(self, sim_dir: Path) -> Path:
        """
        Gera rotas fixas usando a tag <flow>, restaurando o comportamento antigo.
        """
        route_file = sim_dir / "fixed.rou.xml"
        with open(route_file, "w") as f:
            f.write('<routes>\n')
            f.write('  <vType id="fixed_fleet" accel="2.6" decel="4.5" sigma="0.5" length="5" maxSpeed="70"/>\n\n')
            
            for i, route in enumerate(self.payload.fixed_routes_list):
                try:
                    from_edge = self._convert_latlng_to_edge(route.start)
                    to_edge = self._convert_latlng_to_edge(route.end)
                    
                    if from_edge == to_edge:
                        logging.warning(f"Route {i}: Origin matches Destination ({from_edge}). Skipping invalid route.")
                        continue

                    # RESTAURADO: Uso de <flow> como na versão original funcional
                    # Isso cria um fluxo de veículos entre as duas edges
                    f.write(f'  <flow id="fixed_{i}" type="fixed_fleet" begin="0" end="{self.payload.simulation_time}" number="{route.count}" from="{from_edge}" to="{to_edge}"/>\n')
                
                except Exception as e:
                    logging.error(f"Error generating fixed route {i}: {e}")
            
            f.write("</routes>\n")
        return route_file

    def _generate_random_routes_xml(self, sim_dir: Path) -> Path:
        route_file = sim_dir / "random.rou.xml"
        net_file = settings.SUMO_MAPS_DIR / self.payload.map_name
        
        n_cars = max(1, self.payload.num_random_vehicles)
        period = float(self.payload.simulation_time) / n_cars

        command = [
            "python", settings.RANDOM_TRIPS_PY,
            "-n", str(net_file),
            "-e", str(self.payload.simulation_time),
            "-p", str(period), 
            "-o", str(route_file),
            "--seed", str(self.payload.random_seed),
            "--validate"
        ]
        subprocess.run(command, check=True, capture_output=True, text=True)
        return route_file

    def _generate_ned_file(self, payload: AdvancedSimulationPayload) -> str:
        sim_name = payload.simulation_name.replace(" ", "_").replace("-", "_")
        total_cars = int((payload.num_fixed_vehicles + payload.num_random_vehicles) * 1.5) + 10

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
        gNodeB1: gNB {{ @display("p=150,150;is=vl"); }}
        car[{total_cars}]: CarV2X;
"""
        if payload.jammers_list:
            global_type = payload.jamming_params.jammer_type
            for i, jammer_data in enumerate(payload.jammers_list):
                j_type = global_type
                if isinstance(jammer_data, dict) and 'type' in jammer_data:
                    j_type = jammer_data['type']

                j_class = "DroneJammer" if j_type == "DroneJammer" else "NRJammer"
                icon = "device/drone" if j_type == "DroneJammer" else "device/antennatower"
                ned += f"        jammer_{i}: {j_class} {{ @display(\"i={icon}\"); }}\n"

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
        sim_name = payload.simulation_name.replace(" ", "_").replace("-", "_")
        jp = payload.jamming_params
        
        ini = f"""[General]
network = simulations.{sim_name}.{sim_name}
sim-time-limit = {payload.simulation_time}s
seed-set = {payload.random_seed}

*.veinsManager.host = "localhost"
*.veinsManager.port = 9999
*.veinsManager.moduleType = "de.hshl.b5gcybertestv2x.nodes.CarV2X"
*.veinsManager.moduleName = "car"
*.veinsManager.launchConfig = xmldoc("simulation.launchd.xml")
*.veinsManager.updateInterval = 0.1s

*.car[*].numApps = 1
*.car[*].app[0].typename = "V2XApp" 
*.car[*].app[0].sendInterval = {payload.app_params.send_interval_s}s
*.car[*].app[0].packetSize = {payload.app_params.packet_size_b}B
*.car[*].app[0].destAddresses = "broadcast" 
*.car[*].phy.txPower = {payload.net_params.tx_power_dbm}dBm
*.gNodeB*.phy.txPower = 40dBm

*.car[*].mitigation.active = {"true" if payload.mitigation_active else "false"}
*.car[*].mitigation.rerouteOnAttack = {"true" if payload.reroute_on_attack else "false"}
"""
        # --- JAMMERS ---
        global_type = jp.jammer_type
        for i, jammer_pos in enumerate(payload.jammers_list):
            if hasattr(jammer_pos, 'lat'):
                lat, lng = jammer_pos.lat, jammer_pos.lng
                current_type = global_type
            elif isinstance(jammer_pos, dict):
                lat, lng = jammer_pos['lat'], jammer_pos['lng']
                current_type = jammer_pos.get('type', global_type)
            else: continue 

            class LatLng: 
                def __init__(self, lat, lng): self.lat, self.lng = lat, lng
            
            x, y = self._convert_latlng_to_xy(LatLng(lat, lng))
            
            ini += f"\n# Jammer {i} ({current_type})\n"
            if current_type == "DroneJammer":
                ini += f"*.jammer_{i}.mobility.typename = \"LinearMobility\"\n"
                ini += f"*.jammer_{i}.mobility.speed = 0mps\n"
                ini += f"*.jammer_{i}.mobility.initialZ = 50m\n"
            else:
                ini += f"*.jammer_{i}.mobility.typename = \"StaticGridMobility\"\n"

            ini += f"*.jammer_{i}.mobility.initialX = {x:.2f}m\n"
            ini += f"*.jammer_{i}.mobility.initialY = {y:.2f}m\n"

            ini += f"*.jammer_{i}.app[0].typename = \"JammerApp\"\n"
            ini += f"*.jammer_{i}.app[0].startTime = {jp.start_time_s}s\n"
            ini += f"*.jammer_{i}.app[0].stopTime = {jp.stop_time_s}s\n"
            ini += f"*.jammer_{i}.jammerType = \"{jp.strategy}\"\n"
            ini += f"*.jammer_{i}.transmissionPower = {jp.power_dbm}dBm\n"
            ini += f"*.jammer_{i}.active = true\n"

        # --- RSUS ---
        for i, rsu in enumerate(payload.rsus_list):
            x, y = self._convert_latlng_to_xy(rsu)
            ini += f"\n# RSU {i}\n"
            ini += f"*.rsu_{i}.mobility.typename = \"StaticGridMobility\"\n"
            ini += f"*.rsu_{i}.mobility.initialX = {x:.2f}m\n"
            ini += f"*.rsu_{i}.mobility.initialY = {y:.2f}m\n"

        ini += """
**.scalar-recording = true
**.vector-recording = true
**.car[*].**.sinr.vector-recording = true
**.car[*].**.packetLoss.vector-recording = true
"""
        return ini

    def _generate_sumocfg(self, payload) -> str:
        route_files = []
        if payload.num_fixed_vehicles > 0: route_files.append("fixed.rou.xml")
        if payload.num_random_vehicles > 0: route_files.append("random.rou.xml")
        
        routes_str = ",".join(route_files) if route_files else "random.rou.xml"

        return f"""<configuration>
    <input>
        <net-file value="{payload.map_name}"/>
        <route-files value="{routes_str}"/>
    </input>
    <time>
        <begin value="0"/>
        <end value="{payload.simulation_time}"/>
    </time>
</configuration>"""

    def _generate_launchd_xml(self, payload) -> str:
        files = [payload.map_name, "simulation.sumocfg", "omnetpp.ini", "demo.xml"]
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
            
            if payload.num_random_vehicles > 0 or payload.num_fixed_vehicles == 0:
                gen_files.append(self._generate_random_routes_xml(temp_dir))
            
            ned_content = self._generate_ned_file(payload)
            ini_content = self._generate_omnetpp_ini(payload)
            sumocfg = self._generate_sumocfg(payload)
            launchd = self._generate_launchd_xml(payload)
            demo_xml = self._generate_ipv4_config()
            
            sim_folder = payload.simulation_name.replace(" ", "_").replace("-", "_")
            
            with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zf:
                zf.writestr(f"{sim_folder}/simulation.ned", ned_content)
                zf.writestr(f"{sim_folder}/package.ned", f"package simulations.{sim_folder};")
                zf.writestr(f"{sim_folder}/omnetpp.ini", ini_content)
                zf.writestr(f"{sim_folder}/simulation.sumocfg", sumocfg)
                zf.writestr(f"{sim_folder}/simulation.launchd.xml", launchd)
                zf.writestr(f"{sim_folder}/demo.xml", demo_xml)
                
                for f in gen_files: zf.write(f, f"{sim_folder}/{f.name}")
                
                map_path = settings.SUMO_MAPS_DIR / payload.map_name
                if map_path.exists():
                    zf.write(map_path, f"{sim_folder}/{payload.map_name}")
                
        finally:
            for f in gen_files: 
                if f.exists(): f.unlink()
            if temp_dir.exists(): temp_dir.rmdir()

        zip_buffer.seek(0)
        return zip_buffer