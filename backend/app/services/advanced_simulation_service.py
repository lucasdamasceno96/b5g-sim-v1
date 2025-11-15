import io
import zipfile
import subprocess
import os
import logging
from pathlib import Path
from datetime import datetime
import json
from typing import Tuple

# Tenta importar o sumolib
try:
    import sumolib
except ImportError:
    logging.error("SUMOLIB não encontrado. Verifique seu PYTHONPATH.")
    # Permite que o app inicie, mas falhará na execução
    sumolib = None

from app.models.simulation import AdvancedSimulationPayload
from app.core.config import settings
from app.services.simulation_service import SimulationService # Reutilizaremos partes

class AdvancedSimulationService(SimulationService):
    """
    Cria simulações avançadas com posicionamento fixo de jammers e rotas.
    """

    def __init__(self):
        if sumolib is None:
            raise ImportError("SUMOLIB não está disponível. Exporte seu PYTHONPATH.")
        
        self.net = None # Carregaremos o 'net' do SUMO
        self.payload = None

    def _load_sumo_net(self, map_name: str) -> 'sumolib.net.Net':
        """Carrega o arquivo .net.xml usando sumolib"""
        net_file = settings.SUMO_MAPS_DIR / map_name
        if not net_file.exists():
            raise FileNotFoundError(f"Map file not found: {net_file}")
        try:
            return sumolib.net.readNet(str(net_file))
        except Exception as e:
            raise Exception(f"Failed to load SUMO net file {net_file}: {e}")

    def _convert_latlng_to_edge(self, latlng: 'LatLng') -> str:
        """Converte Lat/Lng para a 'edge' (rua) mais próxima no mapa SUMO."""
        if not self.net:
            raise Exception("SUMO net not loaded.")
        
        # Converte Geo (lat, lng) para coords (x, y) do mapa
        x, y = self.net.convertGeoToXY(latlng.lng, latlng.lat)
        
        # Encontra a 'lane' mais próxima (raio de 100m)
        radius = 100
        lanes = self.net.getNeighboringLanes(x, y, radius)
        if not lanes:
            # Se não achar, tenta um raio maior (pode ser impreciso)
            lanes = self.net.getNeighboringLanes(x, y, 500)
            if not lanes:
                 raise Exception(f"No lanes found near {latlng}. Point is too far from road.")
        
        # Pega a lane mais próxima e retorna a ID da 'edge' (rua)
        closest_lane, dist = min(lanes, key=lambda l: l[1])
        return closest_lane.getEdge().getID()

    def _convert_latlng_to_xy(self, latlng: 'LatLng') -> Tuple[float, float]:
        """Converte Lat/Lng para coordenadas X,Y do SUMO."""
        if not self.net:
            raise Exception("SUMO net not loaded.")
        x, y = self.net.convertGeoToXY(latlng.lng, latlng.lat)
        return x, y

    def _generate_fixed_routes_xml(self, sim_dir: Path) -> Path:
        """
        Gera o routes.rou.xml para veículos com rotas fixas (início/fim).
        """
        route_file = sim_dir / "fixed.rou.xml"
        
        with open(route_file, "w") as f:
            f.write("<routes>\n")
            
            # Define um tipo de veículo padrão
            f.write('  <vType id="fixed_fleet" accel="2.6" decel="4.5" sigma="0.5" length="5" maxSpeed="70"/>\n\n')
            
            depart_time = 0
            for i, route in enumerate(self.payload.fixed_routes_list):
                try:
                    # Converte os pontos Lat/Lng para 'edges' (ruas) do SUMO
                    from_edge = self._convert_latlng_to_edge(route.start)
                    to_edge = self._convert_latlng_to_edge(route.end)
                    
                    # Gera N veículos para esta rota
                    for v_idx in range(route.count):
                        f.write(f'  <trip id="fixed_{i}_{v_idx}" type="fixed_fleet" depart="{depart_time}" ')
                        f.write(f'from="{from_edge}" to="{to_edge}"/>\n')
                        depart_time += 1 # Espalha a saída dos veículos
                        
                except Exception as e:
                    logging.warning(f"Skipping fixed route {i}: {e}")
            
            f.write("</routes>\n")
        
        return route_file
# Adicione esta função dentro da classe AdvancedSimulationService
    
    def _generate_launchd_xml(self, payload: AdvancedSimulationPayload) -> str:
        """
        Gera o .launchd.xml para o cenário AVANÇADO.
        Esta função SOBRESCREVE a função base para copiar os arquivos de rota corretos.
        """
        
        # Lista dos arquivos que o Veins precisa copiar
        files_to_copy = [
            payload.map_name,
            "simulation.sumocfg",
            "omnetpp.ini"
        ]
        
        # Adiciona os arquivos de rota que realmente existem
        if payload.num_fixed_vehicles > 0:
            files_to_copy.append("fixed.rou.xml")
        if payload.num_random_vehicles > 0:
            files_to_copy.append("random.rou.xml")

        xml_content = "\n<launchd>\n"
        
        for file in files_to_copy:
            xml_content += f"  <copy file=\\\"{file}\\\"/>\n"
            
        xml_content += "  <run command=\\\"sumo-gui -c simulation.sumocfg --remote-port 9999\\\"/>\n"
        xml_content += "</launchd>\n"
        
        return xml_content
    def _generate_random_routes_xml(self, sim_dir: Path) -> Path:
        """
        Gera o routes.rou.xml para veículos aleatórios (preenchimento).
        """
        route_file = sim_dir / "random.rou.xml"
        net_file = settings.SUMO_MAPS_DIR / self.payload.map_name
        
        # Calcula o período (quantos veículos por segundo)
        # Evita divisão por zero se o tempo for curto
        period = max(1, self.payload.simulation_time) / self.payload.num_random_vehicles

        command = [
            "python",
            settings.RANDOM_TRIPS_PY,
            "-n", str(net_file),
            "-e", str(self.payload.simulation_time),
            "-p", str(period),
            "-o", str(route_file),
            "--seed", str(self.payload.random_seed),
            "--validate"
        ]
        
        try:
            subprocess.run(command, check=True, capture_output=True, text=True)
            return route_file
        except subprocess.CalledProcessError as e:
            logging.error(f"Error generating random routes: {e.stderr}")
            raise Exception(f"Failed to generate SUMO random routes: {e.stderr}")

    def _generate_omnetpp_ini(self, payload: AdvancedSimulationPayload) -> str:
        """
        Gera o omnetpp.ini para o cenário avançado.
        """
        
        # --- Configuração de Ataque (Jammer) ---
        attacker_config = ""
        if payload.jammers_list:
            attacker_config = f"*.numAttacker = {len(payload.jammers_list)}\n"
            
            for i, jammer in enumerate(payload.jammers_list):
                try:
                    # Converte Lat/Lng para X,Y
                    x, y = self._convert_latlng_to_xy(jammer)
                    
                    attacker_config += f"*.attacker[{i}].typename = \"DroneJammer\"\n"
                    attacker_config += f"*.attacker[{i}].mobility.typename = \"StaticGridMobility\"\n"
                    attacker_config += f"*.attacker[{i}].mobility.numHosts = 1\n"
                    # Define a posição X, Y, Z (ex: 10m de altura)
                    attacker_config += f"*.attacker[{i}].mobility.deployment = \"fixed({x}, {y}, 10)\"\n" 
                    attacker_config += f"*.attacker[{i}].app[0].typename = \"JammerApp\"\n"
                    attacker_config += f"*.attacker[{i}].app[0].startTime = 20s\n" # (Pode vir do payload)
                    attacker_config += f"*.attacker[{i}].app[0].stopTime = 100s\n" # (Pode vir do payload)
                    attacker_config += f"*.attacker[{i}].app[0].power = 20mW\n" # (Pode vir do payload)
                    attacker_config += "\n"
                
                except Exception as e:
                     logging.warning(f"Skipping jammer {i}: {e}")
                     attacker_config += f"*.attacker[{i}].typename = \"DroneJammer\" # (Posição falhou)\n"
        else:
            attacker_config = "*.numAttacker = 0"

        # --- Configuração Geral ---
        total_vehicles = payload.num_fixed_vehicles + payload.num_random_vehicles
        
        ini_content = f"""
[General]
network = B5GSim
sim-time-limit = {payload.simulation_time}s
seed-set = {payload.random_seed}

# --- Veins/SUMO ---
*.manager.updateInterval = 0.1s
*.manager.host = "localhost"
*.manager.port = 9999
*.manager.autoShutdown = true
*.manager.launchConfig = xmldoc("simulation.launchd.xml")

# --- Scenario ---
*.numHosts = {total_vehicles}
*.host[*].typename = "NRCar"

# --- Mobility ---
*.host[*].mobility.typename = "VeinsInetMobility"

# --- Applications (exemplo) ---
*.host[*].numApps = 1
*.host[*].app[0].typename = "V2XApp"

# --- Ataque (Jamming) ---
{attacker_config}

# --- 5G & Mitigation ---
*.host[*].masterId = 100
*.host[*].cellId = 1
*.host[*].isUe = true
*.host[*].isRsu = false
*.host[*].mitigation.active = {"true" if payload.mitigation_active else "false"}
*.host[*].mitigation.rerouteOnAttack = {"true" if payload.reroute_on_attack else "false"}

# --- Métricas ---
**.scalar-recording = true
**.vector-recording = true
"""
        return ini_content

    def _generate_sumocfg(self, payload: AdvancedSimulationPayload) -> str:
        """
        Gera o .sumocfg, agora incluindo AMBOS os arquivos de rota.
        """
        
        route_files = []
        if payload.num_fixed_vehicles > 0:
            route_files.append("fixed.rou.xml")
        if payload.num_random_vehicles > 0:
            route_files.append("random.rou.xml")
        
        route_files_str = ",".join(route_files)
        
        return f"""
<configuration>
  <input>
    <net-file value="{payload.map_name}"/>
    <route-files value="{route_files_str}"/>
  </input>
  <time>
    <begin value="0"/>
    <end value="{payload.simulation_time}"/>
  </time>
</configuration>
"""

    def create_advanced_simulation_zip(self, payload: AdvancedSimulationPayload) -> io.BytesIO:
        """
        Função principal: Carrega o mapa, gera todos os arquivos e compacta.
        """
        
        self.payload = payload
        
        # 1. Carrega a rede SUMO para conversão de coordenadas
        self.net = self._load_sumo_net(payload.map_name)
        
        zip_buffer = io.BytesIO()
        temp_dir_path = Path(f"temp_sim_{datetime.now().strftime('%Y%m%d_%H%M%S')}")
        temp_dir_path.mkdir()
        
        zip_sim_folder = payload.simulation_name
        generated_files = []

        try:
            # 2. Gerar arquivos de rota (no disco temporariamente)
            if payload.num_fixed_vehicles > 0:
                fixed_routes = self._generate_fixed_routes_xml(temp_dir_path)
                generated_files.append(fixed_routes)
                
            if payload.num_random_vehicles > 0:
                random_routes = self._generate_random_routes_xml(temp_dir_path)
                generated_files.append(random_routes)
            
            # 3. Gerar outros arquivos em memória
            omnetpp_ini = self._generate_omnetpp_ini(payload)
            sumocfg = self._generate_sumocfg(payload)
            launchd_xml = self._generate_launchd_xml(payload) # Reutiliza do serviço base
            metadata_json = json.dumps(payload.dict(), indent=2)

            # 4. Criar o ZIP
            with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zipf:
                # Adiciona arquivos gerados em memória
                zipf.writestr(f"{zip_sim_folder}/omnetpp.ini", omnetpp_ini)
                zipf.writestr(f"{zip_sim_folder}/simulation.sumocfg", sumocfg)
                zipf.writestr(f"{zip_sim_folder}/simulation.launchd.xml", launchd_xml)
                zipf.writestr(f"{zip_sim_folder}/metadata.json", metadata_json)
                
                # Adiciona arquivos de rota do disco
                for file_path in generated_files:
                    zipf.write(file_path, f"{zip_sim_folder}/{file_path.name}")
                
                # Adiciona o mapa
                map_source_path = settings.SUMO_MAPS_DIR / payload.map_name
                zipf.write(map_source_path, f"{zip_sim_folder}/{payload.map_name}")

        finally:
            # 5. Limpar arquivos temporários
            for file_path in generated_files:
                if file_path.exists():
                    file_path.unlink()
            if temp_dir_path.exists():
                temp_dir_path.rmdir()

        zip_buffer.seek(0)
        return zip_buffer