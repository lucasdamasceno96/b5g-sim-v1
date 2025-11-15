import os
from pydantic_settings import BaseSettings, SettingsConfigDict 
from pathlib import Path
from dotenv import load_dotenv

# Carrega o .env do diretório raiz do backend
env_path = Path('.') / '.env'
load_dotenv(dotenv_path=env_path)

class Settings(BaseSettings):
    SUMO_HOME: str = "/usr/share/sumo"
    SUMO_MAPS_DIR: Path = Path("./maps")
    MAP_GENERATOR_OUTPUT_DIR: Path = Path("./maps")
    
    # Ferramentas do SUMO
    @property
    def RANDOM_TRIPS_PY(self) -> str:
        return os.path.join(self.SUMO_HOME, "tools/randomTrips.py")

    @property
    def NETCONVERT_BIN(self) -> str:
        return os.path.join(self.SUMO_HOME, "bin/netconvert")

    class Config:
        case_sensitive = True

settings = Settings()