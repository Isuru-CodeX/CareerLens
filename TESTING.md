# CareerLens AI - Testing Strategy & Verification Report

## 1. Automated Test Suites (78 Automated Tests)

CareerLens AI enforces rigorous test coverage across both API routes and client bundles using `pytest`, `httpx`, `oxlint`, and `tsc`.

### 1.1 Running Automated Backend Tests

```bash
# Run full automated test suite with verbose output
backend\venv\Scripts\pytest.exe backend\tests -v
```

### 1.2 Automated Test Coverage Matrix (78 / 78 Passed ✅)

| Test Suite | Test File | Scenarios Covered | Tests | Status |
|---|---|---|:---:|:---:|
| **Core API & Auth** | `test_backend.py` | Health check, JWT authentication, appearance persistence, resume parsing, XYZ rewriting, application tracker | 13 | **PASSED** |
| **Career Knowledge Graph** | `test_career_navigator.py` | 46-role directed graph, Dijkstra shortest-path career bridges, difficulty weighting, prerequisite trees | 7 | **PASSED** |
| **Profile & CV Enrichment** | `test_cv_upgrade.py` | Multi-candidate selection, education presets (University, Diplomas, Certs), contact enrichment | 12 | **PASSED** |
| **Deep Job Matcher** | `test_deep_match.py` | ATS skill gap scoring, quote evidence extraction, transferrable skill detection, 3-phase roadmaps | 18 | **PASSED** |
| **Voice Mock Interviewer** | `test_interviews.py` | Full session lifecycle, audio transcription via bundled FFmpeg, STAR rubrics, exemplar model answers | 3 | **PASSED** |
| **Deep-Tech Major Modules** | `test_major_project_modules.py` | SHAP token attribution heatmaps, DEI unconscious bias scanner, blind recruitment redaction, GitHub claim-to-code verifier with SHA-256 badge, Live coding Big-O complexity analyzer, Placement cohort telemetry & CSV export | 6 | **PASSED** |
| **Live Job Aggregators** | `test_navigator_sources.py` | External job board parsers (Remotive, Arbeitnow, Adzuna), work-mode classification, salary IQR trimming | 9 | **PASSED** |
| **ML Salary Benchmark** | `test_salary_benchmark_service.py` | Supervised compensation regression percentiles (25th, 50th, 75th, 90th), location multipliers, skill ROI boosters | 4 | **PASSED** |
| **Vector RAG & ATS Stress**| `test_vector_rag_and_ats.py` | 256-D normalized vector embeddings, cosine similarity, 4-tier ATS parser filters (Workday, Greenhouse, Taleo, Lever), fact-preserving resume tailoring | 6 | **PASSED** |

---

## 2. Frontend Verification & Code Quality

```bash
# 1. Run strict production TypeScript compilation
npm run build --prefix frontend

# 2. Run static code linter (oxlint)
npm run lint --prefix frontend
```
- **TypeScript Strict Compilation**: Verified with zero compilation errors in `736ms`.
- **Linter Verification**: 0 warnings and 0 errors across 64 source files.

---

## 3. Manual Testing & Quality Acceptance Matrix

| Feature | Test Case | Expected Result | Actual Result | Status |
|---|---|---|---|---|
| **Theme Engine** | Toggle System, Light, and Dark modes | UI switches immediately; active classes update; zero flash on reload | Instant switch without flash | **Verified** |
| **Vector RAG Engine** | Match resume against job description | Computes 256-D embeddings, cosine similarity, and semantic concept overlap | Verified alignment score | **Verified** |
| **4-Tier ATS Stress Test** | Test resume against Workday, Greenhouse, Taleo, Lever | Detects table flattening, multi-column corruption, non-standard bullets | Generates per-system scores & fixes | **Verified** |
| **Voice Mock Interviewer** | Spoken response via microphone | Transcribes speech live, analyzes WPM, filler words, and STAR compliance | Live feedback + model answers | **Verified** |
| **CV Non-Verbal Coach** | Toggle webcam during interview | Displays real-time eye-contact gauge, posture alignment HUD, and fidget tracking | HUD active with video feed | **Verified** |
| **Dijkstra Career Graph** | Calculate transition from Jr. to Lead | Computes shortest-path trajectory with difficulty weights and time-to-learn | Verified graph path | **Verified** |
| **ML Salary Predictor** | Select role and location tier | Predicts 25th, 50th, 75th, 90th percentile compensation bands | Dynamic calibrated bands | **Verified** |
| **Chrome Extension Clipper**| Clip job posting from LinkedIn/Indeed | Ingests job parameters, adds Kanban card, computes instant match score | 1-Click ingestion in <1.2s | **Verified** |
| **Explainable AI (SHAP)** | Inspect sentence-level feature attributions | Token attribution heatmap displays positive and negative impact weights | Transparent mathematical breakdown | **Verified** |
| **DEI Bias Auditor** | Audit job posting for unconscious bias | Flags masculine jargon ("rockstar"), ageism markers, and suggests inclusive replacements | Flags findings with DEI score | **Verified** |
| **Blind Recruitment Mask** | Anonymize candidate resume | Masks name, email, phone, gender pronouns, and academic graduation years | Redacted compliant dossier | **Verified** |
| **GitHub Proof of Work** | Verify GitHub profile claims | Scans repos, cross-verifies skills, and generates SHA-256 signed badge | Cryptographic badge generated | **Verified** |
| **Live Coding Sandbox** | Submit algorithmic solution | Runs test suites, evaluates Big-O complexity, and generates AI critique | Instant pass/fail + complexity | **Verified** |
| **Placement Cell Portal** | Inspect cohort readiness & export CSV | Displays batch readiness analytics, skill deficit alerts, and downloads CSV roster | Live telemetry & clean CSV | **Verified** |
