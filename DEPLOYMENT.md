# CareerLens AI - Deployment & Operations Guide

## 1. Quick Local Execution

### Prerequisites
- Python 3.10+ (tested with Python 3.14.7)
- Node.js 18+ (tested with Node v24.13.0)
- npm 9+

### Option A: One-Click Startup Script (Windows)
Run the automated launcher script from the root repository:
```powershell
.\run_dev.ps1
```
or double click:
```cmd
run_dev.bat
```
This automatically initializes the Python virtual environment, installs backend dependencies, seeds the database with demo career data if empty, and boots both servers:
- **Frontend App**: `http://localhost:5173`
- **Backend API Docs**: `http://localhost:8000/docs`
- **Pre-seeded Demo User**: `demo@careerlens.ai` / `CareerLens2026!`

### Option B: Manual Terminal Execution

#### Terminal 1: Backend
```bash
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
python ..\database\seed-data\seed.py
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

#### Terminal 2: Frontend
```bash
cd frontend
npm install
npm run dev
```

---

## 2. Docker & Container Deployment

CareerLens AI provides production-ready Docker containers and an orchestration `docker-compose.yml`.

### Running with Docker Compose
```bash
# Build and run containers in detached mode
docker-compose up --build -d

# Check service status
docker-compose ps

# View application logs
docker-compose logs -f backend
```

Services exposed:
- **Frontend (Nginx)**: `http://localhost:3000`
- **FastAPI Backend**: `http://localhost:8000`
- **PostgreSQL Database**: `localhost:5432`

---

## 3. Production Configuration & Environment Variables

| Variable | Description | Example / Default |
|---|---|---|
| `DATABASE_URL` | PostgreSQL or SQLite connection string | `postgresql+psycopg2://user:pass@host:5432/careerlens` |
| `SECRET_KEY` | JWT signing secret key | 64-character randomized hex string |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Token validity duration | `10080` (7 days) |
| `UPLOAD_DIR` | Private storage path for resumes | `/app/storage` |
| `MAX_UPLOAD_SIZE_MB` | Maximum resume file size limit | `10` |
| `OPENAI_API_KEY` | Optional: OpenAI API key | `sk-...` (Heuristic engine used if empty) |
| `GEMINI_API_KEY` | Optional: Gemini API key | `AIza...` |
| `CORS_ORIGINS` | Permitted client domains | `["https://careerlens.example.com"]` |

---

## 4. Database Backup & Disaster Recovery

### Automated PostgreSQL Backup
```bash
docker exec -t careerlens-postgres pg_dump -U careerlens careerlens > backup_$(date +%Y%m%d).sql
```

### Restoration
```bash
cat backup_20261105.sql | docker exec -i careerlens-postgres psql -U careerlens -d careerlens
```
