#!/bin/bash

echo "Setting SUMO PYTHONPATH..."
# Assegure-se que o caminho está correto
export PYTHONPATH="$PYTHONPATH:/usr/share/sumo/tools"

echo "Activating virtual environment..."
# Se seu venv não estiver ativo, descomente a linha abaixo
source .venv/bin/activate

echo "Starting Uvicorn server..."
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000