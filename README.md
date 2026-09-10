# 🛢️ AI-Powered Intelligent Oil Spill Detection, Prioritization & Response System
### Smart India Hackathon (SIH 2024) • Maritime Emergency Operations Command

[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://typescriptlang.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql)](https://postgresql.org)
[![PostGIS](https://img.shields.io/badge/PostGIS-3.4-4CAF50)](https://postgis.net)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-38B2AC?logo=tailwindcss)](https://tailwindcss.com)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker)](https://docker.com)

---

## 1. Project Overview

The **AI Oil Spill Intelligence System** is an end-to-end autonomous command and decision-support platform designed for maritime emergency response agencies (such as the Indian Coast Guard MRCC, port authorities, and environmental ministries).

The platform continuously processes synthetic aperture radar (SAR) and drone imagery, detects surface hydrocarbon dampening anomalies, calculates transparent explainable risk scores (0–100), and algorithmically prioritizes operational emergency response queues based on shoreline impact arrival ETA and maritime vulnerability.

### Complete Autonomous Operational Pipeline:
$$\mathbf{DETECT} \longrightarrow \mathbf{VERIFY} \longrightarrow \mathbf{ANALYZE\;(GIS)} \longrightarrow \mathbf{RISK\;ENGINE} \longrightarrow \mathbf{PRIORITIZE} \longrightarrow \mathbf{INCIDENT\;MANAGEMENT}$$

---

## 2. System Architecture

```
                               ┌──────────────────────────────────────────────┐
                               │       Sentinel-1 SAR / Drone Imagery         │
                               └──────────────────────┬───────────────────────┘
                                                      │
                                                      ▼
                                   ┌──────────────────────────────────────┐
                                   │       FastAPI Detection Engine       │
                                   │ (UNet / DeepLabV3+ Anomaly Segmenter)│
                                   └──────────────────┬───────────────────┘
                                                      │
                                                      ▼
                      ┌───────────────────────────────────────────────────────────────┐
                      │                 PostgreSQL 16 + PostGIS                       │
                      │  • Incident Record (Point GeoJSON, MultiPolygon Geometry)     │
                      │  • Marine Reserves, Fishing Zones, Shipping Channels, Ports   │
                      │  • Chronological Audit Timeline & Lifecycle Log               │
                      └───────────────┬───────────────────────────────┬───────────────┘
                                      │                               │
                                      ▼                               ▼
                      ┌───────────────────────────────┐  ┌────────────────────────────┐
                      │    Spatial GIS Analysis       │  │ Transparent Risk Engine    │
                      │  • Shortest Coastline Dist    │  │  • Multi-Factor Weights    │
                      │  • Shoreline Arrival ETA (h)  │  │  • Normalized 0-100 Score  │
                      │  • Sensitive Zones within 50k │  │  • Severity Tier Output    │
                      └───────────────┬───────────────┘  └────────────┬───────────────┘
                                      │                               │
                                      └───────────────┬───────────────┘
                                                      │
                                                      ▼
                                       ┌─────────────────────────────┐
                                       │ Deterministic Priority Queue│
                                       │ (Coastline ETA + Risk Rank) │
                                       └──────────────┬──────────────┘
                                                      │
                                                      ▼
                                       ┌─────────────────────────────┐
                                       │ React 18 Leaflet Dashboard  │
                                       │ (Real-Time Situational Map) │
                                       └─────────────────────────────┘
```

---

## 3. Technology Stack

### Frontend
- **React 18 + TypeScript** — High-performance single page application.
- **Vite** — High-speed build tooling and Hot Module Replacement (HMR).
- **Vanilla CSS & TailwindCSS** — Modern dark-mode maritime glassmorphism UI.
- **React-Leaflet + Leaflet** — Interactive cartographic GIS map with custom SVG markers and GeoJSON polygon rendering.
- **Lucide React** — Crisp maritime and emergency status icons.
- **WCAG Accessibility** — Textual severity badges (`CRITICAL`, `HIGH`, `MODERATE`, `LOW`) and ARIA labels.

### Backend & AI Engine
- **Python 3.11 / 3.14 + FastAPI** — Modern async REST API layer with automatic OpenAPI/Swagger docs.
- **Pydantic v2** — Strict request/response validation and environmental settings.
- **SQLAlchemy 2.0** — High-performance ORM supporting relational and GeoJSON spatial columns.
- **Uvicorn** — Production ASGI asynchronous web server.
- **Shapely & GeoPandas** — Geospatial vector calculations and buffer operations.

### Spatial Database
- **PostgreSQL 16 + PostGIS 3.4** — Industrial spatial database indexing maritime polygons, shipping channels, and incident boundaries.
- **Docker Compose** — One-command reproducible database provisioning.

---

## 4. Prerequisites

Before starting, ensure you have:
- **Node.js** v18.0 or higher (`node -v`)
- **Python** 3.11 or higher (`python3 --version`)
- **Docker** and **Docker Compose** (for PostgreSQL + PostGIS container)

---

## 5. Quickstart & Installation

### Step 1: Clone and Enter Workspace
```bash
git clone <repository_url>
cd "AI OIL SPILL Detection"
```

### Step 2: Provision Database (PostgreSQL + PostGIS)
Launch the PostgreSQL and PostGIS container:
```bash
docker compose up -d
```
Verify the database container is healthy:
```bash
docker compose ps
```

### Step 3: Configure Environment Variables
Copy the template to `.env`:
```bash
cp .env.example .env
```
Default configuration values:
```env
APP_NAME="AI Oil Spill Intelligence API"
APP_ENV=development
DEBUG=true
APP_HOST=0.0.0.0
APP_PORT=8000

# PostgreSQL + PostGIS Connection
DATABASE_URL=postgresql+psycopg://oilspill_user:changeme@localhost:5432/oilspill_db

# Security & CORS
SECRET_KEY=CHANGE_ME_IN_PRODUCTION
FRONTEND_URL=http://localhost:5173
```

### Step 4: Backend Setup & Startup
Navigate to the `backend` directory, create a virtual environment, and install dependencies:
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Run database migrations / seed GIS maritime layers
python -c "from app.database.session import engine, Base; import app.models; Base.metadata.create_all(bind=engine); print('Database tables initialized.')"

# Start the FastAPI Uvicorn server (auto-reloads on edit)
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
The REST API and interactive Swagger docs will be available at:
- API Root: `http://localhost:8000/`
- Interactive Swagger UI: `http://localhost:8000/docs`
- ReDoc UI: `http://localhost:8000/redoc`

### Step 5: Frontend Setup & Startup
Open a new terminal window, navigate to `frontend`, install packages, and start Vite:
```bash
cd frontend
npm install
npm run dev
```
The Frontend Command Center will be running at: `http://localhost:5173/`

---

## 6. Simulation & Demo Mode

The system is equipped with **Simulation & Demo Mode** allowing 100% offline demonstration without requiring external satellite feeds:
- **Preset SAR Scenarios**:
  - `sentinel_sar_slick`: High-confidence Sentinel-1 C-band synthetic aperture radar slick.
  - `drone_coastal_spill`: Close-range aerial UAV multi-spectral spill.
  - `clean_ocean_water`: Normal sea surface verification (returns "No Oil Spill Detected").
  - `low_confidence_sheen`: Sub-threshold anomaly triggering probabilistic false-positive warning.
- **Seeded GIS Maritime Reserves**: Pre-indexed marine sanctuaries, coral reefs, and active fishing corridors along the Bay of Bengal and Indian coastline.

---

## 7. REST API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Basic application liveness check |
| `GET` | `/api/v1/dashboard/summary` | Real-time aggregated KPIs (active cases, critical spills, total slick area) |
| `POST` | `/api/v1/detection/analyze` | Ingests satellite/drone image or preset; auto-escalates to Incident, Risk, & Priority |
| `GET` | `/api/v1/incidents` | Paginated incident list with filtering by `status`, `severity`, and `risk_score` |
| `GET` | `/api/v1/incidents/{id}` | Complete multi-dimensional incident record including chronological audit timeline |
| `PUT` | `/api/v1/incidents/{id}` | Updates incident status (`RESPONSE_IN_PROGRESS`, `RESOLVED`) or severity tier |
| `GET` | `/api/v1/incidents/{id}/events` | Chronological audit trail of all automated and manual emergency events |
| `POST` | `/api/v1/incidents/{id}/events` | Logs operational actions (e.g. containment boom deployment, drone dispatch) |
| `GET` | `/api/v1/incidents/{id}/nearby-zones`| PostGIS spatial proximity query for maritime reserves and ports within radius |
| `GET` | `/api/v1/incidents/priority` | Live priority queue ranking active incidents by shoreline ETA and risk index |
| `POST` | `/api/v1/risk/calculate` | Transparent explainable risk engine calculation with factor breakdown |
| `GET` | `/api/v1/map/layers` | GeoJSON features for incidents, polygons, coastline, reserves, and shipping routes |

---

## 8. Smart India Hackathon (SIH) 15-Step Demo Script

Follow this exact sequence during jury evaluation:

1. **Open Dashboard (`/`)**:
   - Point out live API-driven metrics: Active Incidents, Critical Spills, High Severity, and Total Monitored Slick Area.
2. **Inspect Priority Queue Panel**:
   - Highlight the Live Top 5 Priority Queue on the Dashboard showing deterministic rank, urgency badge, and shoreline ETA.
3. **Open Priority Studio (`/priority`)**:
   - Show how the algorithm ranks incidents by urgency. Click on the #1 ranked critical incident.
4. **Demonstrate Risk Explainability**:
   - Point to the transparent sub-score breakdown (Risk Score component, Shoreline Impact ETA, Environmental Sensitivity).
5. **Open Incident Detail (`/incidents?selected=...`)**:
   - Inspect the comprehensive 6-card intelligence dossier.
6. **Review AI Detection Specs**:
   - Show model confidence (e.g., 94%), estimated spill area in $\text{km}^2$, and geographic coordinates.
7. **Inspect GIS Maritime Proximity**:
   - Show protected marine zones, ports, and fishing grounds identified within 50 km.
8. **Demonstrate Chronological Audit Trail**:
   - Show the 4 automated milestone events (`SPILL_DETECTED_BY_AI`, `GIS_SPATIAL_ANALYSIS_COMPLETED`, etc.).
9. **Execute Operational Dispatch**:
   - Change Status to `RESPONSE ACTIVE` and click **"Deploy Response"**. Enter deployment directive.
   - Show the new `CONTAINMENT_TEAM_DISPATCHED` event appear instantly on the timeline!
10. **Open Interactive Geospatial Map (`/map`)**:
    - Show the incident marker pulsing based on severity.
    - Toggle layer checkboxes: Spill Polygons, Fishing Zones, Protected Areas, Ports, Shipping Lanes.
11. **Click on Spill Polygon & Run Spatial Analysis**:
    - Click on a marker to open popup with quick metrics. Click "Spatial Analysis" to adjust the proximity buffer radius slider.
12. **Navigate to AI Spill Detection (`/detect-spill`)**:
    - Select simulation preset `"Sentinel-1 SAR Slick"`.
13. **Run AI Detection Model**:
    - Click **"Analyze Imagery with AI Model"**.
    - Watch the multi-stage progress indicators.
14. **Verify Autonomous Tier-1 Pipeline Output**:
    - Observe the result card: "Oil Spill Detected", segmented mask overlay, PostGIS polygon, and the Autonomous Escalation Bar showing Risk, Priority Rank, Urgency, and Coastline ETA.
15. **Click "Open Incident Operations"**:
    - Shows that the newly ingested anomaly was immediately created as a live trackable incident in PostgreSQL and registered across all modules.

---

## 9. Automated Testing & Verification

Run the comprehensive end-to-end integration and data consistency test suite:
```bash
cd backend
.venv/bin/python -c "import tests.test_full_pipeline as t; t.test_full_tier1_integrated_pipeline(); t.test_data_consistency_across_endpoints(); print('ALL PIPELINE TESTS PASSED!')"
```

Verify frontend production bundle compilation:
```bash
cd frontend
npm run build
```

---

## 10. Known Limitations & Tier-2 Roadmap

- **In-Situ Sensor Fusion (Tier-2)**: Integration with live AIS vessel transponder streams and oceanographic drift current buoys is planned for Tier-2.
- **Physical Skimmer Fleet Telemetry**: Fleet GPS positioning is currently simulated in demo mode.
- **Statutory Certification**: Risk scoring is engineered as advisory decision-support and does not replace statutory port state control investigations.
