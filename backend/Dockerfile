# Base: Ubuntu 24.04 (Mesma do seu dev environment)
FROM ubuntu:24.04

# Evita interações manuais na instalação
ENV DEBIAN_FRONTEND=noninteractive

# 1. Instalar Python, Dependências de Sistema e Adicionar Repo do SUMO
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    software-properties-common \
    libspatialindex-dev \
    libproj-dev \
    gdal-bin \
    curl \
    && add-apt-repository ppa:sumo/stable \
    && apt-get update \
    && apt-get install -y sumo sumo-tools sumo-doc \
    && rm -rf /var/lib/apt/lists/*

# 2. Configurar Variáveis Globais do Container
ENV SUMO_HOME=/usr/share/sumo
ENV PYTHONPATH=$PYTHONPATH:/usr/share/sumo/tools

# 3. Configurar diretório de trabalho
WORKDIR /app

# 4. Copiar requirements e instalar dependências
COPY requirements.txt .

# Criação do venv (Padrão PEP 668 no Ubuntu 24.04)
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

RUN pip install --no-cache-dir -r requirements.txt

# 5. Copiar o código do backend
COPY . .

# 6. Expor porta
EXPOSE 8000

# 7. Iniciar Uvicorn
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]