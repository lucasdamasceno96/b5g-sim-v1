from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import simulation_router, map_router, utility_router
from app.core.config import settings # Importa para garantir que foi carregado

app = FastAPI(
    title="B5G Cyber Test V2X Backend",
    description="API for generating V2X simulation scenarios.",
    version="2.0.0"
)

# Configuração do CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"], # URL do seu frontend React (Vite)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inclui os routers
app.include_router(simulation_router.router)
app.include_router(map_router.router)
app.include_router(utility_router.router)

@app.get("/")
async def read_root():
    return {"message": "Welcome to the V2X Simulation API v2.0"}

# Para rodar: uvicorn app.main:app --reload --port 8000