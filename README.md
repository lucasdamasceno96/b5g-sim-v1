# CyberV2X Orchestrator

**A Web-Based Platform for Automating V2X Cybersecurity Simulation Scenarios.**

This tool abstracts the complexity of configuring **B5GCyberTestV2X** simulations (based on OMNeT++, Simu5G, Veins, and SUMO). It allows researchers to design attack scenarios (Jamming, DoS) via a GUI and automatically generates the necessary configuration files (`omnetpp.ini`, `simulation.ned`, `.rou.xml`, etc.).

## Key Features

- **Visual Scenario Design:** Interactive map based on Leaflet/OpenStreetMap.
- **Automated Conversion:** Handles Geo-to-Cartesian coordinate transformation using SUMO bindings.
- **Multi-Level Logic:**
  - **QuickSim:** Abstract input for rapid prototyping.
  - **Expert Mode:** Instance-based configuration (e.g., specific TxPower per vehicle, custom Jammer trajectories).
- **Output:** Generates a ready-to-run ZIP package for the B5GCyberTestV2X framework.

---

## 🚀 Option 1: Running with Docker (Recommended)

This is the easiest way to run the platform. It ensures all dependencies (Python, Node.js, SUMO 1.25) are correctly configured.

### Prerequisites

- Docker & Docker Compose

### Steps

1.  Clone the repository.
2.  Run the orchestration command:
    ```bash
    docker compose up --build
    ```
3.  Access the platform:
    - **Frontend (UI):** [http://localhost:5173](http://localhost:5173)
    - **Backend (API Docs):** [http://localhost:8000/docs](http://localhost:8000/docs)

_(Note: The `maps/` directory is mounted via volume, so generated files will appear in your local project folder automatically.)_

---

## ⚙️ Option 2: Manual Installation (Native)

Use this method only if you need to debug the source code directly on your host machine.

### Prerequisites

- **Python 3.10+**
- **Node.js 22 (LTS)**
- **Eclipse SUMO 1.25** (Must be in your system PATH and `SUMO_HOME` environment variable set).

### 1. Backend Setup

Navigate to the `backend` folder:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

````

Create a `.env` file in `backend/` pointing to your local paths:

```ini
SUMO_HOME="/usr/share/sumo"
SUMO_MAPS_DIR="/absolute/path/to/repo/maps"
```

Run the server:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 2\. Frontend Setup

Navigate to the `frontend` folder:

```bash
cd frontend
npm install
npm run dev
```

---

## Project Architecture

- **Frontend:** React (Vite) + TailwindCSS + React-Leaflet.
- **Backend:** Python (FastAPI) + GeoPy + Eclipse SUMO Python Bindings (`traci`/`sumolib`).
- **Target Simulation:** Generated files are compatible with OMNeT++ 6.0 and B5GCyberTestV2X.

<!-- end list -->

```

```
````
