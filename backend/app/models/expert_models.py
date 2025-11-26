from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class ExpertNode(BaseModel):
    id: int               # ID visual (timestamp)
    type: str             # 'car', 'drone', 'tower', 'rsu'
    lat: float            # Posição (ou Início da Rota)
    lng: float
    dest_lat: Optional[float] = None # Fim da Rota (Apenas Carro)
    dest_lng: Optional[float] = None
    params: Dict[str, Any] # txPower, packetSize, speed, etc.

class ExpertSimulationPayload(BaseModel):
    simulation_name: str
    map_name: str
    duration: int
    seed: int
    
    # --- CAMPO QUE ESTAVA FALTANDO OU COM ERRO ---
    num_random_vehicles: int = 0  # Default 0 para não quebrar se o front não enviar
    
    nodes_list: List[ExpertNode]