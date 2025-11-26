import io
import zipfile
import logging
import subprocess
from pathlib import Path
from datetime import datetime # Importação adicionada para evitar erro de timestamp

try:
    import sumolib
except ImportError:
    logging.error("SUMOLIB not found. Check PYTHONPATH.")
    sumolib = None

from app.core.config import settings
from app.models.expert_models import ExpertSimulationPayload

class ExpertSimulationService:
    def __init__(self):
        if sumolib is None: raise ImportError("SUMOLIB missing")
        self.net = None

    def _load_net(self, map_name):
        net_path = settings.SUMO_MAPS_DIR / map_name
        if not net_path.exists():
            raise FileNotFoundError(f"Map {map_name} not found in {settings.SUMO_MAPS_DIR}")
        self.net = sumolib.net.readNet(str(net_path))

    def _geo_to_xy(self, lat, lng):
        """Converte Lat/Lon para X/Y do SUMO"""
        try:
            if hasattr(self.net, 'convertGeoToXY'):
                return self.net.convertGeoToXY(float(lng), float(lat))
            elif hasattr(self.net, 'convertLonLat2XY'):
                return self.net.convertLonLat2XY(float(lng), float(lat))
            return float(lng), float(lat)
        except Exception as e:
            logging.warning(f"Geo conversion failed: {e}")
            return float(lng), float(lat)

    def _get_edge_id(self, lat, lng):
        """Encontra a EdgeID (Rua) mais próxima da coordenada"""
        x, y = self._geo_to_xy(lat, lng)
        
        # Tenta encontrar com raios crescentes
        lanes = self.net.getNeighboringLanes(x, y, 50)
        if not lanes: lanes = self.net.getNeighboringLanes(x, y, 200)
        if not lanes: lanes = self.net.getNeighboringLanes(x, y, 500)
        
        if not lanes: 
            # Fallback seguro
            logging.warning(f"No road found at {lat},{lng}. Using fallback.")
            return list(self.net.getEdges())[0].getID()
            
        return min(lanes, key=lambda l: l[1])[0].getEdge().getID()

    def _generate_random_routes_xml(self, map_name, duration, num_vehicles, seed):
        """Gera tráfego aleatório de fundo se solicitado"""
        if num_vehicles <= 0: return ""
        
        # Usa um diretório temporário para evitar conflitos
        temp_id = datetime.now().strftime('%Y%m%d_%H%M%S')
        route_file = Path(f"temp_expert_random_{temp_id}.rou.xml")
        net_file = settings.SUMO_MAPS_DIR / map_name
        
        period = float(duration) / float(num_vehicles)

        command = [
            "python", settings.RANDOM_TRIPS_PY,
            "-n", str(net_file),
            "-e", str(duration),
            "-p", str(period), 
            "-o", str(route_file),
            "--seed", str(seed),
            "--validate"
        ]
        
        try:
            subprocess.run(command, check=True, capture_output=True, text=True)
            if route_file.exists():
                with open(route_file, "r") as f:
                    content = f.read()
                route_file.unlink()
                return content
            return ""
        except Exception as e:
            logging.error(f"Random Trips Error: {e}")
            if route_file.exists(): route_file.unlink()
            return ""

    def generate_zip(self, payload: ExpertSimulationPayload) -> io.BytesIO:
        self._load_net(payload.map_name)
        
        # 1. Organizar Nós
        cars = [n for n in payload.nodes_list if n.type == 'car']
        drones = [n for n in payload.nodes_list if n.type == 'drone']
        towers = [n for n in payload.nodes_list if n.type == 'tower']
        rsus = [n for n in payload.nodes_list if n.type == 'rsu']
        
        sim_name = payload.simulation_name.replace(" ", "_")
        
        # 2. Gerar Arquivos
        # Rotas Manuais (Expert)
        routes_fixed = self._create_routes_xml(cars)
        
        # Rotas Aleatórias (Background)
        # Verifica se o campo existe no payload, default 0
        num_random = getattr(payload, 'num_random_vehicles', 0)
        routes_random = self._generate_random_routes_xml(payload.map_name, payload.duration, num_random, payload.seed)
        
        # Total de carros para o vetor car[] no NED
        total_cars = len(cars) + num_random
        
        ned = self._create_ned(sim_name, total_cars, drones, towers, rsus)
        ini = self._create_ini(sim_name, payload, cars, drones, towers, rsus, num_random)
        
        # Lista de rotas para o sumocfg
        route_files = ["fixed.rou.xml"]
        if num_random > 0 and routes_random:
            route_files.append("random.rou.xml")
        routes_str = ",".join(route_files)
        
        sumocfg = f"""<configuration>
    <input>
        <net-file value="{payload.map_name}"/>
        <route-files value="{routes_str}"/>
    </input>
    <time>
        <begin value="0"/>
        <end value="{payload.duration}"/>
    </time>
</configuration>"""

        # Launchd XML
        copy_cmds = f'<copy file="{payload.map_name}"/><copy file="simulation.sumocfg"/><copy file="omnetpp.ini"/><copy file="demo.xml"/><copy file="fixed.rou.xml"/>'
        if num_random > 0 and routes_random:
            copy_cmds += '<copy file="random.rou.xml"/>'
            
        launchd = f"""<launchd>
    {copy_cmds}
    <run command="sumo-gui -c simulation.sumocfg --remote-port 9999"/>
</launchd>"""
        
        demo_xml = "<config><interface hosts='**' address='10.x.x.x' netmask='255.x.x.x'/><multicast-group hosts='**' address='224.0.0.1'/></config>"
        
        # 3. Criar ZIP com estrutura de pasta raiz
        zip_buffer = io.BytesIO()
        folder = f"simulations/{sim_name}" # Pasta raiz do pacote
        
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zf:
            zf.writestr(f"{folder}/simulation.ned", ned)
            zf.writestr(f"{folder}/package.ned", f"package simulations.{sim_name};")
            zf.writestr(f"{folder}/omnetpp.ini", ini)
            zf.writestr(f"{folder}/simulation.sumocfg", sumocfg)
            zf.writestr(f"{folder}/simulation.launchd.xml", launchd)
            zf.writestr(f"{folder}/fixed.rou.xml", routes_fixed)
            zf.writestr(f"{folder}/demo.xml", demo_xml)
            
            if num_random > 0 and routes_random:
                zf.writestr(f"{folder}/random.rou.xml", routes_random)
            
            map_p = settings.SUMO_MAPS_DIR / payload.map_name
            if map_p.exists():
                zf.write(map_p, f"{folder}/{payload.map_name}")
            
        zip_buffer.seek(0)
        return zip_buffer

    def _create_routes_xml(self, cars):
        xml = "<routes>\n"
        xml += '  <vType id="expert_car" accel="2.6" decel="4.5" sigma="0.5" length="5" maxSpeed="70" color="0,1,0"/>\n'
        
        for i, car in enumerate(cars):
            # Usa posições do payload. Se dest não existir, usa start (mas deve existir pela lógica do front)
            s_lat, s_lng = car.lat, car.lng
            d_lat = car.dest_lat if car.dest_lat is not None else s_lat
            d_lng = car.dest_lng if car.dest_lng is not None else s_lng
            
            from_edge = self._get_edge_id(s_lat, s_lng)
            to_edge = self._get_edge_id(d_lat, d_lng)
            
            # Se origem == destino, força rota completa na via
            extra_attr = 'departPos="0" arrivalPos="max"' if from_edge == to_edge else 'departPos="0"'
            
            xml += f'  <trip id="v{i}" type="expert_car" depart="0" from="{from_edge}" to="{to_edge}" {extra_attr}/>\n'
            
        xml += "</routes>"
        return xml

    def _create_ned(self, sim_name, total_cars, drones, towers, rsus):
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
        
        // Vector de Carros (Expert + Random)
        car[{total_cars}]: CarV2X;
"""
        # Adiciona submódulos estáticos
        for i, _ in enumerate(drones): ned += f"        drone_{i}: DroneJammer {{ @display(\"i=device/drone\"); }}\n"
        for i, _ in enumerate(towers): ned += f"        tower_{i}: NRJammer {{ @display(\"i=device/antennatower\"); }}\n"
        for i, _ in enumerate(rsus): ned += f"        rsu_{i}: RSUNR {{ @display(\"i=device/antennatower\"); }}\n"
        
        ned += """
    connections allowunconnected:
        server.pppg++ <--> Eth10G <--> router.pppg++;
        router.pppg++ <--> Eth10G <--> upf.filterGate;
        upf.pppg++ <--> Eth10G <--> gNodeB1.ppp;
}
"""
        return ned

    def _create_ini(self, sim_name, payload, cars, drones, towers, rsus, num_random):
        ini = f"""[General]
network = simulations.{sim_name}.{sim_name}
sim-time-limit = {payload.duration}s
seed-set = {payload.seed}

# --- Veins Manager ---
*.veinsManager.host = "localhost"
*.veinsManager.port = 9999
*.veinsManager.moduleType = "de.hshl.b5gcybertestv2x.nodes.CarV2X"
*.veinsManager.moduleName = "car"
*.veinsManager.launchConfig = xmldoc("simulation.launchd.xml")
*.veinsManager.updateInterval = 0.1s

# --- 5G Network ---
*.gNodeB*.phy.txPower = 40dBm
**.scalar-recording = true
**.vector-recording = true

# --- SERVER ---
*.server.numApps = 1
*.server.app[0].typename = "VoIPReceiver"
*.server.app[0].localPort = 3000
"""
        # 1. Carros Manuais (Expert) - Configuração Individual
        for i, c in enumerate(cars):
            p = c.params
            ini += f"\n# Car {i} (Manual)\n"
            ini += f"*.car[{i}].numApps = 1\n"
            ini += f"*.car[{i}].app[0].typename = \"VoIPSender\"\n"
            ini += f"*.car[{i}].app[0].destAddress = \"server\"\n"
            ini += f"*.car[{i}].app[0].destPort = 3000\n"
            ini += f"*.car[{i}].app[0].startTime = uniform(0s, 1s)\n"
            ini += f"*.car[{i}].app[0].packetSize = {p.get('packetSize', 300)}B\n"
            ini += f"*.car[{i}].phy.txPower = {p.get('txPower', 23)}dBm\n"
            ini += f"*.car[{i}].mitigation.active = {'true' if p.get('mitigation') else 'false'}\n"

        # 2. Carros Aleatórios (Background) - Configuração em Lote
        if num_random > 0:
            start = len(cars)
            end = start + num_random - 1
            # Default params para aleatórios
            def_power = 23
            def_packet = 256
            
            ini += f"\n# Random Cars ({start} to {end})\n"
            # Sintaxe de range do OMNeT++
            ini += f"*.car[{start}..{end}].numApps = 1\n"
            ini += f"*.car[{start}..{end}].app[0].typename = \"VoIPSender\"\n"
            ini += f"*.car[{start}..{end}].app[0].destAddress = \"server\"\n"
            ini += f"*.car[{start}..{end}].app[0].destPort = 3000\n"
            ini += f"*.car[{start}..{end}].app[0].startTime = uniform(0s, 5s)\n"
            ini += f"*.car[{start}..{end}].app[0].packetSize = {def_packet}B\n"
            ini += f"*.car[{start}..{end}].phy.txPower = {def_power}dBm\n"

        # 3. Infraestrutura (Jammers/RSU)
        for i, d in enumerate(drones):
            p = d.params
            x, y = self._geo_to_xy(d.lat, d.lng)
            ini += f"\n# Drone {i}\n"
            ini += f"*.drone_{i}.mobility.typename = \"LinearMobility\"\n"
            ini += f"*.drone_{i}.mobility.initialX = {x:.2f}m\n"
            ini += f"*.drone_{i}.mobility.initialY = {y:.2f}m\n"
            ini += f"*.drone_{i}.mobility.initialZ = 50m\n"
            ini += f"*.drone_{i}.mobility.speed = {p.get('speed', 10)}mps\n"
            ini += f"*.drone_{i}.app[0].typename = \"JammerApp\"\n"
            ini += f"*.drone_{i}.app[0].startTime = {p.get('start', 20)}s\n"
            ini += f"*.drone_{i}.app[0].stopTime = {p.get('stop', 100)}s\n"
            ini += f"*.drone_{i}.jammerType = \"{p.get('strategy', 'constant')}\"\n"
            ini += f"*.drone_{i}.transmissionPower = {p.get('txPower', 30)}dBm\n"
            ini += f"*.drone_{i}.active = true\n"

        for i, t in enumerate(towers):
            p = t.params
            x, y = self._geo_to_xy(t.lat, t.lng)
            ini += f"\n# Tower {i}\n"
            ini += f"*.tower_{i}.mobility.typename = \"StaticGridMobility\"\n"
            ini += f"*.tower_{i}.mobility.initialX = {x:.2f}m\n"
            ini += f"*.tower_{i}.mobility.initialY = {y:.2f}m\n"
            ini += f"*.tower_{i}.app[0].typename = \"JammerApp\"\n"
            ini += f"*.tower_{i}.jammerType = \"{p.get('strategy', 'constant')}\"\n"
            ini += f"*.tower_{i}.transmissionPower = {p.get('txPower', 40)}dBm\n"
            ini += f"*.tower_{i}.active = true\n"

        for i, r in enumerate(rsus):
            x, y = self._geo_to_xy(r.lat, r.lng)
            ini += f"\n# RSU {i}\n"
            ini += f"*.rsu_{i}.mobility.typename = \"StaticGridMobility\"\n"
            ini += f"*.rsu_{i}.mobility.initialX = {x:.2f}m\n"
            ini += f"*.rsu_{i}.mobility.initialY = {y:.2f}m\n"

        return ini