from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
import io

# Modelos (ambos)
from app.models.simulation import SimulationPayload, AdvancedSimulationPayload

# Serviços (ambos)
from app.services.simulation_service import SimulationService
# A LINHA QUE FALTAVA ESTÁ AQUI:
from app.services.advanced_simulation_service import AdvancedSimulationService

router = APIRouter()

# --- Endpoint Simples (existente) ---
@router.post("/api/simulations/generate_zip")
async def create_simulation(
    payload: SimulationPayload,
    service: SimulationService = Depends(SimulationService) # <--- 'Depends' DENTRO da função
):
    """
    Cria uma simulação SIMPLES e retorna um ZIP.
    """
    try:
        zip_buffer: io.BytesIO = service.create_simulation_zip(payload)
        zip_filename = f"{payload.simulation_name}.zip"
        headers = {'Content-Disposition': f'attachment; filename="{zip_filename}"'}
        
        return StreamingResponse(
            zip_buffer,
            media_type="application/x-zip-compressed",
            headers=headers
        )
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        print(f"Internal error: {e}")
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")


# --- NOVO Endpoint Avançado ---
@router.post("/api/simulations/generate_advanced_zip")
async def create_advanced_simulation(
    payload: AdvancedSimulationPayload,
    service: AdvancedSimulationService = Depends(AdvancedSimulationService) # <--- 'Depends' DENTRO da função
):
    """
    Cria uma simulação AVANÇADA (com posições Lat/Lng) e retorna um ZIP.
    """
    try:
        zip_buffer: io.BytesIO = service.create_advanced_simulation_zip(payload)
        
        zip_filename = f"{payload.simulation_name}.zip"
        headers = {'Content-Disposition': f'attachment; filename="{zip_filename}"'}
        
        return StreamingResponse(
            zip_buffer,
            media_type="application/x-zip-compressed",
            headers=headers
        )
        
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ImportError as e: # Captura erro do SUMOLIB
        raise HTTPException(status_code=500, detail=f"Configuration Error: {e}. Did you export PYTHONPATH?")
    except Exception as e:
        print(f"Internal error: {e}")
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")