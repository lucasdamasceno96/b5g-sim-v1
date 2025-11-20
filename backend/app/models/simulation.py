from pydantic import BaseModel, Field
from typing import List, Optional

# --- Sub-models ---

class AppParams(BaseModel):
    send_interval_s: float = Field(0.1, description="Packet interval in seconds")
    packet_size_b: int = Field(256, description="Packet size in bytes")

class NetParams(BaseModel):
    tx_power_dbm: float = Field(23, description="Transmission power in dBm")
    bitrate_mbps: int = Field(6, description="Bitrate in Mbps")

class JammingParams(BaseModel):
    start_time_s: float = Field(20.0)
    stop_time_s: float = Field(100.0)
    power_dbm: float = Field(20.0)
    strategy: str = Field("constant", description="Strategy: constant, reactive, random")
    # FIX: Added missing jammer_type field
    jammer_type: str = Field("DroneJammer", description="DroneJammer (Mobile) or NRJammer (Static)")

class LatLng(BaseModel):
    lat: float
    lng: float

class FixedRoute(BaseModel):
    start: LatLng
    end: LatLng
    count: int

# --- Main Payload ---

class AdvancedSimulationPayload(BaseModel):
    simulation_name: str = Field(..., example="advanced_test")
    map_name: str = Field(..., example="berlim.net.xml")
    simulation_time: int = Field(120)
    random_seed: int = 1234
    
    # Traffic
    num_fixed_vehicles: int = Field(0)
    num_random_vehicles: int = Field(0)
    vehicle_distribution: str = Field("heterogeneous")
    communication_mode: str = Field("D2D")
    
    # Parameters
    app_params: AppParams = Field(default_factory=AppParams)
    net_params: NetParams = Field(default_factory=NetParams)
    
    # Mitigation
    mitigation_active: bool = False
    reroute_on_attack: bool = False
    
    # Map Elements
    attack_placement: str = Field("fixed")
    jammers_list: List[LatLng] = Field(default_factory=list)
    jamming_params: Optional[JammingParams] = Field(default_factory=JammingParams)
    
    # FIX: Added RSUs list
    rsus_list: List[LatLng] = Field(default_factory=list)
    
    fixed_routes_list: List[FixedRoute] = Field(default_factory=list)

# Simple Payload (Legacy support)
class SimulationPayload(BaseModel):
    simulation_name: str
    map_name: str
    simulation_time: int
    total_vehicles: int
    vehicle_distribution: str = "heterogeneous"
    random_seed: int = 1234
    communication_mode: str = "D2D"
    app_params: AppParams = Field(default_factory=AppParams)
    net_params: NetParams = Field(default_factory=NetParams)
    execute_with_attack: bool = False
    jamming_params: Optional[JammingParams] = Field(default_factory=JammingParams)