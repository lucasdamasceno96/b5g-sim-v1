from fastapi import APIRouter, HTTPException, Depends, Query
from app.services.map_generator_service import MapGeneratorService

router = APIRouter()

@router.post("/api/utils/generate-map")
async def generate_new_map(
    city_name: str = Query(..., description="Name of the city (e.g., 'Porto Alegre')"),
    size_km: float = Query(2.0, description="Side length of the square area in KM"),
    service: MapGeneratorService = Depends(MapGeneratorService)
):
    """
    Generates a new .net.xml map from OpenStreetMap data.
    """
    try:
        result = service.generate_map(city_name, size_km)
        if result["status"] == "error":
            raise HTTPException(status_code=500, detail=result["message"])
        
        return {"message": f"Map {result['file_name']} generated successfully!"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))