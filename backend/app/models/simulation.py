from pydantic import BaseModel, Field
from typing import List, Optional

class JammingParams(BaseModel):
    enable: bool = False
    start: float = 20.0
    end: float = 100.0
    power_dbm: float = 20.0
    strategy: str = "constant" # "constant", "reactive", "random"
    
class SimulationPayload(BaseModel):
    # Meta
    simulation_name: str = Field(..., example="simple_jamming_berlin")
    
    # Map & Time
    map_name: str = Field(..., example="berlim.net.xml")
    simulation_time: int = Field(120, gt=0, description="Total simulation time in seconds")
    
    # Traffic
    total_vehicles: int = Field(50, gt=0)
    vehicle_distribution: str = Field("heterogeneous", example="heterogeneous") # ou "homogeneous"
    random_seed: int = 1234
    
    # V2X
    communication_mode: str = Field("D2D", example="D2D") # ou "cellular"
    apps_per_vehicle: int = Field(1, ge=1)
    
    # Attacks
    execute_with_attack: bool = False
    jamming_params: Optional[JammingParams] = None
    
    # Metrics
    metrics: List[str] = Field(default_factory=lambda: ["SINR", "Throughput", "PacketLoss"])

# --- Novos Modelos para o 'Advanced' ---

class LatLng(BaseModel):
    """ Modelo para coordenadas Geo (Latitude/Longitude) """
    lat: float = Field(..., example=52.5200)
    lng: float = Field(..., example=13.4050)

class FixedRoute(BaseModel):
    """ Define uma rota fixa com início, fim e contagem de veículos """
    start: LatLng
    end: LatLng
    count: int = Field(1, gt=0)

class AdvancedSimulationPayload(BaseModel):
    """ Payload completo para a simulação avançada """
    
    # Meta
    simulation_name: str = Field(..., example="advanced_jamming_berlin")
    map_name: str = Field(..., example="berlim.net.xml")
    simulation_time: int = Field(120, gt=0)
    random_seed: int = 1234
    
    # Traffic (Novos campos)
    num_fixed_vehicles: int = Field(0, ge=0)
    num_random_vehicles: int = Field(0, ge=0)
    
    # V2X
    vehicle_distribution: str = Field("heterogeneous")
    communication_mode: str = Field("D2D")
    
    # Mitigation (Novos campos)
    mitigation_active: bool = False
    reroute_on_attack: bool = False
    
    # Map Placement
    attack_placement: str = Field("fixed", example="fixed")
    jammers_list: List[LatLng] = Field(default_factory=list)
    fixed_routes_list: List[FixedRoute] = Field(default_factory=list)

from pydantic import BaseModel, Field
from typing import List, Optional

# --- Modelos de Parâmetros (Reutilizáveis) ---

class AppParams(BaseModel):
    send_interval_s: float = Field(0.1, example=0.1, description="Intervalo entre pacotes (segundos)")
    packet_size_b: int = Field(256, example=256, description="Tamanho do pacote (bytes)")

class NetParams(BaseModel):
    tx_power_dbm: float = Field(23, example=23, description="Potência de TX dos veículos (dBm)")
    bitrate_mbps: int = Field(6, example=6, description="Taxa de bits (Mbps)")

class JammingParams(BaseModel):
    start_time_s: float = Field(20.0, description="Início do ataque (segundos)")
    stop_time_s: float = Field(100.0, description="Fim do ataque (segundos)")
    power_dbm: float = Field(20.0, description="Potência do Jammer (dBm)")
    strategy: str = Field("constant", example="constant", description="constant, reactive, random")


# --- Payload da Simulação SIMPLES ---

class SimulationPayload(BaseModel):
    # Meta
    simulation_name: str = Field(..., example="simple_jamming_berlin")
    map_name: str = Field(..., example="berlim.net.xml")
    simulation_time: int = Field(120, gt=0)
    
    # Traffic
    total_vehicles: int = Field(50, gt=0)
    vehicle_distribution: str = Field("heterogeneous")
    random_seed: int = 1234
    
    # V2X
    communication_mode: str = Field("D2D")
    
    # --- Novos Parâmetros ---
    app_params: AppParams = Field(default_factory=AppParams)
    net_params: NetParams = Field(default_factory=NetParams)
    
    # Attack
    execute_with_attack: bool = False
    jamming_params: Optional[JammingParams] = Field(default_factory=JammingParams)
    
    metrics: List[str] = Field(default_factory=lambda: ["SINR", "Throughput", "PacketLoss"])


# --- Payload da Simulação AVANÇADA ---

class LatLng(BaseModel):
    lat: float
    lng: float

class FixedRoute(BaseModel):
    start: LatLng
    end: LatLng
    count: int

class AdvancedSimulationPayload(BaseModel):
    # Meta
    simulation_name: str = Field(..., example="advanced_jamming_berlin")
    map_name: str = Field(..., example="berlim.net.xml")
    simulation_time: int = Field(120, gt=0)
    random_seed: int = 1234
    
    # Traffic
    num_fixed_vehicles: int = Field(0, ge=0)
    num_random_vehicles: int = Field(0, ge=0)
    
    # V2X
    vehicle_distribution: str = Field("heterogeneous")
    communication_mode: str = Field("D2D")
    
    # --- Novos Parâmetros ---
    app_params: AppParams = Field(default_factory=AppParams)
    net_params: NetParams = Field(default_factory=NetParams)
    
    # Mitigation
    mitigation_active: bool = False
    reroute_on_attack: bool = False
    
    # Map Placement & Attack
    attack_placement: str = Field("fixed")
    jammers_list: List[LatLng] = Field(default_factory=list)
    jamming_params: Optional[JammingParams] = Field(default_factory=JammingParams)
    fixed_routes_list: List[FixedRoute] = Field(default_factory=list)