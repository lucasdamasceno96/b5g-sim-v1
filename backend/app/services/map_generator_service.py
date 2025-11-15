import subprocess
import logging
import sys
import requests
from math import cos, radians
from pathlib import Path
from typing import Tuple, Optional

from app.core.config import settings

# --- Constantes ---
NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
OVERPASS_URL = "https://overpass-api.de/api/interpreter"
USER_AGENT = "SUMO_V2X_Simulation_Script/1.1"

logging.basicConfig(level=logging.INFO, 
                    format='%(asctime)s [%(levelname)s] - %(message)s',
                    datefmt='%Y-%m-%d %H:%M:%S')

class MapGeneratorService:

    def _get_coordinates(self, city: str) -> Optional[Tuple[float, float]]:
        """Busca latitude e longitude da cidade usando Nominatim."""
        params = {'q': city, 'format': 'json', 'limit': 1}
        headers = {'User-Agent': USER_AGENT}
        try:
            response = requests.get(NOMINATIM_URL, params=params, headers=headers, timeout=10)
            response.raise_for_status()
            data = response.json()
            if data:
                lat = float(data[0]['lat'])
                lon = float(data[0]['lon'])
                logging.info(f"📍 Coordenadas encontradas para {city}: ({lat}, {lon})")
                return lat, lon
            else:
                logging.error(f"❌ Cidade '{city}' não encontrada.")
                return None
        except requests.RequestException as e:
            logging.error(f"Erro na API Nominatim: {e}")
            return None

    def _calculate_bounding_box(self, lat: float, lon: float, size_km: float) -> Tuple[float, float, float, float]:
        """Calcula a bounding box (N, S, E, W) baseada no tamanho em KM."""
        lat_rad = radians(lat)
        deg_lat_km = 111.32
        deg_lon_km = 111.32 * cos(lat_rad)
        
        delta_lat = (size_km / 2.0) / deg_lat_km
        delta_lon = (size_km / 2.0) / deg_lon_km
        
        lat_min = lat - delta_lat
        lat_max = lat + delta_lat
        lon_min = lon - delta_lon
        lon_max = lon + delta_lon
        
        logging.info(f"📦 Bounding Box (S, W, N, E): ({lat_min}, {lon_min}, {lat_max}, {lon_max})")
        return lat_min, lat_max, lon_min, lon_max

    def _download_osm_data(self, lat_min, lat_max, lon_min, lon_max, osm_file: Path) -> bool:
        """Baixa dados do OSM via Overpass API."""
        bbox = f"{lat_min},{lon_min},{lat_max},{lon_max}"
        query = f"""
        [out:xml][timeout:25];
        (
          way["highway"]({bbox});
        );
        (._;>;);
        out meta;
        """
        try:
            logging.info("Downloading OSM data...")
            response = requests.post(OVERPASS_URL, data=query, headers={'User-Agent': USER_AGENT}, timeout=60)
            response.raise_for_status()
            with open(osm_file, 'w', encoding='utf-8') as f:
                f.write(response.text)
            logging.info(f"🗺️ Dados OSM salvos em: {osm_file}")
            return True
        except requests.RequestException as e:
            logging.error(f"Erro na API Overpass: {e}")
            return False

    def _convert_to_sumo(self, osm_file: Path, net_file: Path) -> bool:
        """Converte .osm para .net.xml usando netconvert."""
        netconvert_cmd = [
            settings.NETCONVERT_BIN,
            '--osm-files', str(osm_file),
            '-o', str(net_file),
            '--geometry.remove',
            '--ramps.guess',
            '--junctions.join',
            '--tls.guess-signals',
            '--tls.discard-simple',
            '--tls.join',
            '--no-turnarounds.tls',
            '--output.street-names'
        ]
        
        try:
            logging.info("Executando netconvert...")
            subprocess.run(netconvert_cmd, check=True, capture_output=True, text=True)
            logging.info(f"SUMO network file created: {net_file}")
            return True
        except subprocess.CalledProcessError as e:
            logging.error(f"Falha no netconvert: {e.stderr}")
            return False
        except FileNotFoundError:
            logging.error(f"Erro: 'netconvert' não encontrado. Verifique SUMO_HOME em .env")
            return False

    def generate_map(self, city_name: str, size_km: float) -> dict:
        """Função principal para gerar o mapa."""
        output_dir = settings.MAP_GENERATOR_OUTPUT_DIR
        output_dir.mkdir(parents=True, exist_ok=True)
        
        coords = self._get_coordinates(city_name)
        if not coords:
            raise Exception("City not found")
        
        lat, lon = coords
        bounds = self._calculate_bounding_box(lat, lon, size_km)
        lat_min, lat_max, lon_min, lon_max = bounds
        
        city_safe_name = city_name.replace(' ', '_').lower()
        osm_file = output_dir / f"temp_{city_safe_name}.osm"
        net_file = output_dir / f"{city_safe_name}_{int(size_km)}km.net.xml"
        
        try:
            if not self._download_osm_data(lat_min, lat_max, lon_min, lon_max, osm_file):
                raise Exception("OSM data download failed")
                
            if not self._convert_to_sumo(osm_file, net_file):
                raise Exception("SUMO conversion failed")
            
            logging.info("✅ Map generation successful!")
            return {
                "status": "success",
                "message": "Map generated successfully.",
                "file_name": net_file.name,
                "full_path": str(net_file)
            }
            
        except Exception as e:
            logging.error(f"Map generation failed: {e}")
            return {"status": "error", "message": str(e)}
        
        finally:
            # Limpa arquivo temporário
            if osm_file.exists():
                try:
                    osm_file.unlink()
                    logging.info("Temporary OSM file removed.")
                except OSError as e:
                    logging.warning(f"Could not remove temp OSM file: {e}")