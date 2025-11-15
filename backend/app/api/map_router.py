from fastapi import APIRouter, HTTPException
from typing import List
from app.core.config import settings

router = APIRouter()

@router.get("/api/maps", response_model=List[str])
async def get_available_maps():
    """
    Lists all available SUMO maps (.net.xml) from the configured directory.
    """
    maps_dir = settings.SUMO_MAPS_DIR
    if not maps_dir.is_dir():
        raise HTTPException(status_code=500, detail="SUMO maps directory not configured correctly.")
        
    # Lista os mapas que você já tem
    map_files = [f.name for f in maps_dir.glob("*.net.xml")]
    
    # Adiciona os .geojson para o "Advanced Map Viewer"
    # map_files.extend([f.name for f in maps_dir.glob("*.geojson")])
    
    return map_files