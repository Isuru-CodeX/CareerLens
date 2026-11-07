# CareerLens AI - Deployment & Operations Guide

## 1. Quick Local Execution

### Prerequisites
- Python 3.10+ (tested with Python 3.12+ and Python 3.14.7)
- Node.js 18+ (tested with Node v20+ / Node v24 LTS)
- npm 9+
- Git

### Option A: One-Click Startup Script (Recommended for Windows)
Run the automated launcher script from the root repository:
```powershell
.\run_dev.ps1
```
or double-click:
```cmd
run_dev.bat
```
This automatically configures the Python virtual environment, installs backend dependencies, seeds the database with demo career data if empty, and spins up both servers:
- **Frontend App**: `http://localhost:5173`
- **Backend API Docs**: `http://localhost:8000/docs`
- **Pre-seeded Demo User**: `demo@careerlens.ai` / `CareerLens2026!`

### Option B: Manual Terminal Execution

#### Terminal 1: Backend
```bash
cd backend
python -m venv venv

# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

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

---

## 3. Chrome / Edge Extension Deployment (Manifest V3)

1. Open **Google Chrome** or **Microsoft Edge**.
2. Navigate to `chrome://extensions` (or `edge://extensions`).
3. Toggle on **Developer mode** in the top-right corner.
4. Click **Load unpacked**.
5. Select the `CareerLens/extension` directory.
6. Open any job posting on LinkedIn, Indeed, Glassdoor, or Wellfound to see the in-page match badge and 1-click clipper.

---

## 4. Production Operational Considerations

### 4.1 Server-Side Audio & FFmpeg
CareerLens AI bundles `imageio-ffmpeg` to provide format-agnostic audio conversion without requiring external system FFmpeg installations.

### 4.2 Database Migrations
On startup, FastAPI automatically initializes tables and synchronizes schema additions via SQLAlchemy:
```python
Base.metadata.create_all(bind=engine)
```
For enterprise deployments, standard PostgreSQL connections are configured via `DATABASE_URL` in `.env`.

### 4.3 Background Task Refresh
CareerLens runs an asynchronous APScheduler job refreshing stale salary benchmarks every 6 hours.
