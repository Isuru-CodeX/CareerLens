# CareerLens AI - Backend Architecture & API Guide

High-performance, async RESTful backend built with **FastAPI**, **SQLAlchemy**, **Pydantic v2**, and **Python 3.12+**.

---

## 🏗️ Architecture & Service Layer

The backend follows clean layered architecture principles, isolating business logic into dedicated services with dependency-injected SQLAlchemy sessions:

```
backend/
├── app/
│   ├── api/                     # REST API routers & endpoint definitions
│   │   ├── auth.py              # JWT authentication & user session management
│   │   ├── resumes.py           # Resume uploads, parsing, & PDF downloads
│   │   ├── jobs.py              # Job postings, scraping & application tracking
│   │   ├── analysis.py          # Vector RAG, semantic scoring & ATS stress-testing
│   │   ├── interviews.py        # Speech sessions, STAR turn evaluation, & CV telemetry
│   │   ├── career_path.py       # Knowledge graph traversal, Dijkstra bridges, & salary
│   │   ├── xai.py               # SHAP attributions, bias scanner, & blind recruitment
│   │   ├── coding.py            # Challenge execution & Big-O complexity analyzer
│   │   ├── github_verifier.py   # Claim-to-code verification & SHA-256 badge generator
│   │   └── placement.py         # University cohort analytics & CSV roster exporter
│   ├── models/                  # SQLAlchemy ORM database models
│   ├── schemas/                 # Pydantic v2 request/response validation schemas
│   ├── services/                # Pure business logic & algorithmic engines
│   │   ├── vector_rag_service.py       # Chunking, cross-encoder cosine similarity & ATS filters
│   │   ├── interview_service.py        # Voice sessions, STAR evaluation, & speech metrics
│   │   ├── career_graph_service.py     # Directed graph (Dijkstra/A* shortest path)
│   │   ├── salary_benchmark_service.py # 19-country localized salary prediction bands
│   │   ├── xai_bias_service.py         # SHAP feature attribution & DEI bias scanner
│   │   ├── github_verifier_service.py  # Repository commit & claim verification
│   │   ├── coding_challenge_service.py # Challenge runner & AST Big-O analyzer
│   │   └── placement_service.py        # University placement telemetry & deficit alerts
│   ├── core/                    # Config, database engine, & security utilities
│   └── main.py                  # Application entrypoint & CORS middleware
└── tests/                       # Comprehensive pytest suite (78 tests, 100% passing)
```

---

## ⚡ Core Algorithmic & Deep-Tech Engines

1. **Hybrid Vector RAG & ATS Stress-Testing (`vector_rag_service.py`)**:
   - Tokenizes and vectorizes resume bullet points and job descriptions.
   - Computes normalized cosine similarity $\frac{\vec{v}_R \cdot \vec{v}_J}{\|\vec{v}_R\| \|\vec{v}_J\|}$.
   - Simulates parsing behavior across 4 enterprise ATS engines (Workday, Greenhouse, Taleo, Lever) detecting table distortions, multi-column order corruption, and missing section headers.

2. **Explainable AI & Algorithmic Bias Auditor (`xai_bias_service.py`)**:
   - Computes token-level Shapley marginal contribution scores ($\phi_i$).
   - Scans text for DEI unconscious bias (gender-coded terms, ageism markers, elitism criteria).
   - Generates blind recruitment profiles by masking candidate names, emails, phone numbers, pronouns, and graduation years.

3. **Multimodal Audio & CV Non-Verbal Telemetry (`interview_service.py`)**:
   - Analyzes candidate answers against the STAR method (Situation, Task, Action, Result).
   - Tracks speech pacing (WPM), pause durations, and verbal fillers ("um", "like", "you know").
   - Integrates with frontend Computer Vision HUD to track eye-contact consistency, posture alignment, and fidget frequency.

4. **Live Coding & AST Big-O Complexity Analyzer (`coding_challenge_service.py`)**:
   - Executes algorithmic solutions against public and private test cases with timeout limits.
   - Parses code AST to detect loop nesting depths and recursive calls to infer $O(1)$, $O(\log n)$, $O(n)$, $O(n \log n)$, or $O(n^2)$ time/space complexity.

5. **GitHub Proof-of-Work Verifier (`github_verifier_service.py`)**:
   - Scans candidate repositories against claims made on resumes.
   - Generates deterministic SHA-256 cryptographic verification hashes (`CL-POW-XXXX`) stamped with timestamp and proof signature.

6. **Placement Cell Telemetry & Analytics (`placement_service.py`)**:
   - Aggregates student cohort placement readiness, average ATS scores, and interview performance.
   - Identifies high-risk curriculum gaps (e.g., missing distributed systems or cloud skills) and provides 1-click CSV roster exports.

---

## 🧪 Testing & Verification

The test suite covers all endpoints, services, edge cases, and algorithmic engines with **78 unit and integration tests**:

```bash
# Activate virtual environment
# Windows:
.\venv\Scripts\Activate.ps1
# Unix:
source venv/bin/activate

# Run full pytest suite
pytest -v
```

All 78 tests pass with 0 failures:
- `test_backend.py` (Auth, Resumes, Jobs, Analysis, ATS)
- `test_interviews.py` (Voice sessions, STAR scoring, Speech telemetry)
- `test_vector_rag_and_ats.py` (Vector similarity, ATS parsing stress-tests)
- `test_career_navigator.py` (Knowledge graph pathfinding, role requirements)
- `test_navigator_sources.py` (Skill gap calculations, prerequisite bridges)
- `test_salary_benchmark_service.py` (19-country salary percentiles, purchasing power parity)
- `test_cv_upgrade.py` (CV non-verbal metrics, posture and gaze tracking)
- `test_major_project_modules.py` (XAI attributions, DEI bias, Blind masking, GitHub verification, Coding challenges, Placement telemetry)

---

## 🚀 Running the Server Locally

```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
Interactive OpenAPI / Swagger docs are automatically available at:
`http://127.0.0.1:8000/docs`
