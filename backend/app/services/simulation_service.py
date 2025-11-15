import io
import zipfile
import subprocess
import os
from pathlib import Path
from datetime import datetime
import json

from app.models.simulation import SimulationPayload
from app.core.config import settings

class SimulationService:

    def _generate_routes(self, sim_dir: Path, payload: SimulationPayload) -> Path:
        """Gera o arquivo de rotas (routes.rou.xml) usando randomTrips.py"""
        
        route_file = sim_dir / "routes.rou.xml"
        net_file = settings.SUMO_MAPS_DIR / payload.map_name

        if not net_file.exists():
            raise FileNotFoundError(f"Map file not found: {net_file}")

        # Comando para randomTrips.py
        command = [
            "python",
            settings.RANDOM_TRIPS_PY,
            "-n", str(net_file),
            "-e", str(payload.simulation_time),
            "-p", str(payload.simulation_time / payload.total_vehicles), # Período
            "-o", str(route_file),
            "--seed", str(payload.random_seed),
            "--validate"
        ]
        
        try:
            subprocess.run(command, check=True, capture_output=True, text=True)
            return route_file
        except subprocess.CalledProcessError as e:
            print(f"Error generating routes: {e.stderr}")
            raise Exception(f"Failed to generate SUMO routes: {e.stderr}")

    def _generate_omnetpp_ini(self, payload: SimulationPayload) -> str:
        """Gera o conteúdo do omnetpp.ini"""
        
        # Baseado no PDF (B5GCyberTestV2X-master_content.pdf) e no seu app.py
        # Esta é uma versão simplificada para o SimpleJammingPage
        
        # Lógica para ataque de Jamming
        attacker_config = ""
        if payload.execute_with_attack and payload.jamming_params:
            jp = payload.jamming_params
            attacker_config = f"""
# --- ATTACKER (JAMMING) CONFIG ---
*.numAttacker = 1
*.attacker[0].typename = "DroneJammer"
*.attacker[0].mobility.typename = "StaticGridMobility"
*.attacker[0].mobility.numHosts = 1
*.attacker[0].mobility.deployment = "center" 
*.attacker[0].app[0].typename = "JammerApp"
*.attacker[0].app[0].startTime = {jp.start}s
*.attacker[0].app[0].stopTime = {jp.end}s
*.attacker[0].app[0].power = {jp.power_dbm}mW 
# ... (outros parâmetros de jamming)
"""
        else:
            attacker_config = "*.numAttacker = 0"

        ini_content = f"""
[General]
network = B5GSim
sim-time-limit = {payload.simulation_time}s
seed-set = {payload.random_seed}
# ... (outras configs gerais)

# --- Veins/SUMO ---
*.manager.updateInterval = 0.1s
*.manager.host = "localhost"
*.manager.port = 9999
*.manager.autoShutdown = true
*.manager.launchConfig = xmldoc("simulation.launchd.xml")

# --- Scenario ---
*.numHosts = {payload.total_vehicles}
*.host[*].typename = "NRCar" # Assumindo NRCar como padrão

# --- Mobility ---
*.host[*].mobility.typename = "VeinsInetMobility"

# --- Applications ---
*.host[*].numApps = {payload.apps_per_vehicle}
*.host[*].app[0].typename = "V2XApp" # Exemplo
# ... (configurações de app)

{attacker_config}

# --- 5G ---
# ... (configs de 5G baseadas no modo D2D/Celular)
*.host[*].masterId = 100
*.host[*].cellId = 1
*.host[*].isUe = true
*.host[*].isRsu = false

# --- Metrics (exemplo) ---
**.scalar-recording = true
**.vector-recording = true
output-scalar-file = "results/scalars"
output-vector-file = "results/vectors"
# ...
"""
        return ini_content

    def _generate_sumocfg(self, payload: SimulationPayload) -> str:
        """Gera o conteúdo do simulation.sumocfg"""
        return f"""
<configuration>
  <input>
    <net-file value="{payload.map_name}"/>
    <route-files value="routes.rou.xml"/>
  </input>
  <time>
    <begin value="0"/>
    <end value="{payload.simulation_time}"/>
  </time>
</configuration>
"""

    def _generate_launchd_xml(self, payload: SimulationPayload) -> str:
        """Gera o conteúdo do simulation.launchd.xml"""
        return f"""
<launchd>
  <copy file="{payload.map_name}"/>
  <copy file="routes.rou.xml"/>
  <copy file="simulation.sumocfg"/>
  <copy file="omnetpp.ini"/>
  <run command="sumo-gui -c simulation.sumocfg --remote-port 9999"/>
</launchd>
"""

    def create_simulation_zip(self, payload: SimulationPayload) -> io.BytesIO:
        """
        Cria uma simulação completa e a retorna como um arquivo ZIP em memória.
        """
        
        # 1. Criar um buffer de bytes em memória para o ZIP
        zip_buffer = io.BytesIO()
        
        # 2. Criar um diretório temporário "virtual" para as rotas
        # Usamos um nome de pasta temporária real para o subprocesso, mas o ZIP será em memória
        
        temp_dir_name = f"temp_sim_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        temp_dir_path = Path(temp_dir_name)
        temp_dir_path.mkdir()
        
        zip_sim_folder = payload.simulation_name

        try:
            # 3. Gerar arquivo de rotas (o único que precisa ir ao disco)
            route_file_path = self._generate_routes(temp_dir_path, payload)
            
            # 4. Gerar outros arquivos em memória
            omnetpp_ini = self._generate_omnetpp_ini(payload)
            sumocfg = self._generate_sumocfg(payload)
            launchd_xml = self._generate_launchd_xml(payload)
            metadata_json = json.dumps(payload.dict(), indent=2)

            # 5. Criar o arquivo ZIP e adicionar os arquivos
            with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zipf:
                # Adiciona arquivos gerados
                zipf.writestr(f"{zip_sim_folder}/omnetpp.ini", omnetpp_ini)
                zipf.writestr(f"{zip_sim_folder}/simulation.sumocfg", sumocfg)
                zipf.writestr(f"{zip_sim_folder}/simulation.launchd.xml", launchd_xml)
                zipf.writestr(f"{zip_sim_folder}/metadata.json", metadata_json)
                
                # Adiciona o arquivo de rota
                zipf.write(route_file_path, f"{zip_sim_folder}/routes.rou.xml")
                
                # Adiciona o mapa (copiado do diretório de mapas)
                map_source_path = settings.SUMO_MAPS_DIR / payload.map_name
                if map_source_path.exists():
                    zipf.write(map_source_path, f"{zip_sim_folder}/{payload.map_name}")
                else:
                    print(f"Warning: Map file {map_source_path} not found. ZIP will be created without it.")

        except Exception as e:
            # Limpa em caso de erro
            if route_file_path.exists():
                route_file_path.unlink()
            if temp_dir_path.exists():
                temp_dir_path.rmdir()
            raise e
        finally:
            # 6. Limpar arquivos temporários
            if route_file_path.exists():
                route_file_path.unlink()
            if temp_dir_path.exists():
                temp_dir_path.rmdir()

        # 7. Retornar o buffer do ZIP
        zip_buffer.seek(0)
        return zip_buffer