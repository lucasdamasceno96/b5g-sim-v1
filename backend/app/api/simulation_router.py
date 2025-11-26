from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
import io
import logging

# Importa os Modelos (Simples e Avançado)
from app.models.simulation import SimulationPayload, AdvancedSimulationPayload
from app.models.expert_models import ExpertSimulationPayload # Import novo 

# Importa os Serviços
from app.services.simulation_service import SimulationService
from app.services.advanced_simulation_service import AdvancedSimulationService
from app.services.expert_simulation_service import ExpertSimulationService

router = APIRouter()

# --- Endpoint Simples (Random/Legacy) ---
@router.post("/api/simulations/generate_zip")
async def create_simulation(
    payload: SimulationPayload,
    service: SimulationService = Depends(SimulationService)
):
    """
    Gera simulação simples (aleatória).
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
    except Exception as e:
        logging.error(f"Erro no Simple Sim: {e}")
        raise HTTPException(status_code=500, detail=f"Internal Error: {str(e)}")


# --- Endpoint Avançado (NED Dinâmico + RSUs + Jammers) ---
@router.post("/api/simulations/generate_advanced_zip")
async def create_advanced_simulation(
    payload: AdvancedSimulationPayload,
    service: AdvancedSimulationService = Depends(AdvancedSimulationService)
):
    """
    Gera simulação avançada com topologia .NED completa.
    """
    try:
        # Chama o serviço avançado que gera o .NED e .INI
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
    except Exception as e:
        logging.error(f"Erro no Advanced Sim: {e}")
        # Retorna o erro detalhado para o frontend ver o alerta
        raise HTTPException(status_code=500, detail=f"Internal Error: {str(e)}")
@router.post("/api/simulations/generate_expert_zip")
async def create_expert_simulation(payload: ExpertSimulationPayload):
    try:
        service = ExpertSimulationService()
        zip_buffer = service.generate_zip(payload)
        filename = f"{payload.simulation_name}_EXPERT.zip"
        return StreamingResponse(
            zip_buffer,
            media_type="application/x-zip-compressed",
            headers={'Content-Disposition': f'attachment; filename="{filename}"'}
        )
    except Exception as e:
        logging.error(f"Expert Sim Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))