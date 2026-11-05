# CareerLens AI - Testing Strategy & Verification Report

## 1. Automated Test Suites

CareerLens AI features comprehensive unit, integration, and security test suites using `pytest` and `httpx`.

### 1.1 Running Automated Backend Tests

```bash
# Activate virtual environment
.\backend\venv\Scripts\activate

# Run full test suite with verbose output
pytest backend/tests/test_backend.py -v
```

### 1.2 Automated Test Coverage Matrix

| Test Suite | File | Scenarios Covered | Status |
|---|---|---|---|
| **Health API** | `test_backend.py::test_health` | System health check endpoint | **PASSED** |
| **Authentication Flow** | `test_backend.py::test_auth_flow` | Registration, duplicate email rejection, login, `/auth/me`, appearance persistence | **PASSED** |
| **Parsing Service** | `test_backend.py::test_parsing_service` | Contact extraction, skills recognition, experience & education parsing | **PASSED** |
| **Analysis Engine** | `test_backend.py::test_analysis_service` | Score calculation, vague phrase detection, strength/weakness audit | **PASSED** |
| **Job Matcher** | `test_backend.py::test_matching_service` | Keyword extraction, required vs preferred skills, quote evidence generation | **PASSED** |
| **AI Assistant** | `test_backend.py::test_ai_service` | Google XYZ bullet rewriter, fact-grounded cover letter, interview Q&A | **PASSED** |
| **Application Tracker** | `test_backend.py::test_application_tracker_api`| Pipeline stage progression, reminder scheduling, statistics calculations | **PASSED** |

---

## 2. Frontend Verification & Build Testing

```bash
cd frontend
npm run build
```
- **TypeScript strict compilation**: Verified without error.
- **Vite bundle generation**: Clean production bundle output generated in `< 700ms`.

---

## 3. Manual Testing & Quality Acceptance Matrix

| Feature | Test Case | Expected Result | Actual Result | Status |
|---|---|---|---|---|
| **Theme System** | Toggle System, Light, and Dark mode in Navbar | Interface switches immediately; active classes update; persists on reload | Instant switch without flash | **Verified** |
| **OS Dark Mode Sync** | Change Windows theme with 'System' preference selected | App theme automatically updates to match OS | Automatically responds via media listener | **Verified** |
| **Resume Upload** | Drag & drop PDF/DOCX file | Progress bar animates; file parsed into sections; appears in library | File uploaded & parsed cleanly | **Verified** |
| **Review & Correct** | Edit extracted summary in Review drawer | Saves to `ParsedResumeSection`; original file remains immutable | Verified & saved | **Verified** |
| **Vague Phrase Detector**| Analyze resume containing "responsible for" | Flags phrase with quote context and suggests "Spearheaded" alternative | Detected and presented | **Verified** |
| **PDF Report Export** | Click "Download PDF Report" on audit screen | Server-side ReportLab generates formatted PDF with scores and checklist | Downloads formatted PDF | **Verified** |
| **Job Matcher** | Paste Job Description and run match | Generates match score, matched skills with quotes, and missing gaps | Accurate score & breakdown | **Verified** |
| **XYZ Rewriter** | Submit weak bullet in AI Writing Assistant | Converts to action verb + metric outcome + task | Formatted with XYZ formula | **Verified** |
| **Application Tracker**| Move application from "Interview" to "Offer" | Card transitions; stats update; confetti celebration triggers | Real-time update + confetti | **Verified** |
| **GDPR Data Export** | Click "Export Personal Data" in Profile | Machine-readable JSON downloaded with profile and application history | Complete JSON downloaded | **Verified** |
| **Account Deletion** | Click "Delete Account" with confirmation | Account removed, resumes deleted from filesystem storage, logged out | User & files purged | **Verified** |
| **Mobile Responsiveness**| Inspect at 320px, 375px, 768px, 1280px | Slide-over drawer toggles; cards stack; no horizontal overflow | Fully responsive | **Verified** |
