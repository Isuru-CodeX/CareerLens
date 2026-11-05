# CareerLens AI

### AI Resume Analyzer, Job Matcher and Application Tracker

[![Python 3.10+](https://img.shields.io/badge/Python-3.10%2B-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115%2B-009688.svg)](https://fastapi.tiangolo.com/)
[![React 19](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0%2B-3178c6.svg)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.0-38bdf8.svg)](https://tailwindcss.com/)
[![Tests Passing](https://img.shields.io/badge/Tests-7%20Passed-emerald.svg)](./TESTING.md)
[![GDPR Compliant](https://img.shields.io/badge/Privacy-GDPR%20Compliant-10b981.svg)](./SECURITY.md)

CareerLens AI is a modern, production-oriented career intelligence platform designed to help candidates analyze and elevate their resumes, evaluate alignment against target job descriptions, generate truth-preserving AI rewrites, and manage their end-to-end job application pipeline.

---

## Key Highlights & Feature Matrix

### 1. Executive Visual Design & Appearance System
- **Theme Palette**: Deep royal blue (`#1e40af`, `#2563eb`), dark slate navy (`#0f172a`, `#0b1120`), and emerald accents (`#10b981`).
- **Mandatory 3 Appearance Modes**: `System` (default, syncs with OS theme changes in real time), `Light` (crisp, document-friendly), and `Dark` (high-contrast navy surfaces).
- **Zero Theme Flash**: Pre-render inline script in `<head>` applies active theme before visible DOM painting.
- **Responsive Architecture**: Mobile-first design verified across all viewports (320px to 1440px+) with smooth collapsible slide-over drawer and adaptive tables.
- **Print Styles**: `@media print` rules deliver clean, theme-neutral printable resume sheets.

### 2. Resume Library & Immutability Architecture
- **Multi-Format Support**: Upload PDF, Word (`.docx`), and Markdown/Text resumes up to 10MB.
- **Private Storage**: Files stored in private disk storage with cryptographically safe UUIDs.
- **Structured Parsing**: Detects contact details, professional summary, experience bullets, education, skills, projects, and certifications.
- **Review & Correction**: Interactive editor lets candidates correct extracted sections without modifying or overwriting original files.

### 3. Heuristic Quality Scoring & Vague Phrase Detector
- **Transparent 4-Pillar Scoring**:
  - **Structure (25%)**: Header presence, contact completeness, formatting hierarchy.
  - **Readability & Voice (20%)**: Sentence length, active voice ratio, document density.
  - **Measurable Impact (35%)**: Presence of numbers, percentages, dollar values, and metrics.
  - **Skills Breadth (20%)**: Modern industry keyword recognition.
- **Vague Phrase Detector**: Scans for passive expressions (*"responsible for"*, *"helped with"*, *"worked on"*, *"team player"*) and suggests high-impact, truthful action verbs (*"Spearheaded"*, *"Architected"*, *"Optimized"*).
- **Server-Side PDF Reports**: Generates professional PDF analysis audit reports via ReportLab.
- **Strict Compliance**: Disclaimers clearly communicate that scores represent algorithmic self-improvement guidance, not employer ATS guarantees.

### 4. Job Description Matcher & Skill Gap Analysis
- **Job Posting Parser**: Extracts required qualifications, preferred skills, and core domain requirements.
- **Deep Alignment**: Calculates match score (0-100%), surface resume quotes for matched skills, identifies missing competencies, and detects partial/transferable knowledge.
- **Learning Roadmap**: Suggests concrete tutorials, documentation, and pathways for missing skills.

### 5. Evidence-Preserving AI Writing Assistant
- **Google XYZ Formula Rewriter**: Transforms weak bullets into *"Accomplished [X] as measured by [Y] by doing [Z]"* with side-by-side original vs improved comparison.
- **Grounded Cover Letter Generator**: Composes bespoke, professional cover letters using only verified facts from the candidate's resume and target job requirements.
- **Interview Practice Simulator**: Generates technical, behavioral, and situational questions tailored to the candidate's background with STAR method talking points.

### 6. Application Pipeline Tracker
- **Kanban Board & Table List Views**: Drag and advance applications through *Interested*, *Applied*, *Assessment*, *Interview*, *Offer*, *Rejected*, and *Withdrawn*.
- **Metrics**: Real-time stats on total applications, active interviews, offers, and response rate.
- **Celebration Feedback**: Confetti particle burst upon advancing any application to the *Offer* stage.
- **Interview Reminders**: Schedule follow-up deadlines and track recruiter contacts.

### 7. Security & GDPR Privacy Governance
- **Data Isolation**: Strict server-side `user_id` authorization filters on all queries.
- **Data Portability**: 1-Click JSON export of complete profile, resumes, and applications.
- **Permanent Erasure**: Deleting an account purges all database records and physically deletes resume files from server disk storage.

---

## Quickstart & Installation

### Option 1: Automatic Windows Launcher
Run the PowerShell script:
```powershell
.\run_dev.ps1
```
or double-click:
```cmd
run_dev.bat
```
Both servers will start:
- **Frontend**: [http://localhost:5173](http://localhost:5173)
- **FastAPI Backend & Swagger**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Pre-seeded Demo User**: `demo@careerlens.ai` / `CareerLens2026!`

### Option 2: Manual Terminal Execution

#### 1. Backend Setup
```bash
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
python ..\database\seed-data\seed.py
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

#### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### Option 3: Docker Compose
```bash
docker-compose up --build -d
```
Exposes:
- Frontend on [http://localhost:3000](http://localhost:3000)
- Backend on [http://localhost:8000](http://localhost:8000)
- PostgreSQL on port `5432`

---

## Repository Documentation Index

| Document | Purpose |
|---|---|
| [PROJECT_REQUIREMENTS.md](./PROJECT_REQUIREMENTS.md) | Full user specification and requirements |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Architecture diagrams, component interactions & design choices |
| [DATABASE_DESIGN.md](./DATABASE_DESIGN.md) | Database ERD, table definitions, relationships & indexes |
| [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) | Complete OpenAPI/REST endpoint documentation and schemas |
| [UI_UX_GUIDELINES.md](./UI_UX_GUIDELINES.md) | Color tokens, typography, 3-mode theme rules & responsive breakpoints |
| [SECURITY.md](./SECURITY.md) | Threat model, file security, bcrypt hashing & GDPR compliance |
| [TESTING.md](./TESTING.md) | Automated pytest suite results, build tests & manual testing matrix |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Docker Compose instructions, environment variables & backup procedures |

---

## Verification & Automated Test Status

All 7 core pytest test suites pass:
```bash
backend\venv\Scripts\pytest.exe backend\tests\test_backend.py -v
======================= 7 passed, 14 warnings in 2.20s ========================
```
Frontend builds with 0 errors in Vite:
```bash
cd frontend && npm run build
✓ built in 679ms
```

---

## License
MIT License. Built for candidates seeking transparent career intelligence and data ownership.

