# CareerLens AI - REST API Documentation

CareerLens AI exposes a fully versioned, secure RESTful API under the `/api` prefix. Interactive Swagger UI documentation is available at `/docs` and ReDoc at `/redoc`.

---

## 1. Authentication & Session Endpoints

### `POST /api/auth/register`
Creates a new candidate account.
- **Request Body**:
```json
{
  "email": "user@example.com",
  "password": "Password123!",
  "full_name": "Alex Rivera",
  "appearance_preference": "system"
}
```
- **Response** `200 OK`:
```json
{
  "access_token": "eyJhbGciOi...",
  "token_type": "bearer",
  "user": {
    "id": "c869e943-...",
    "email": "user@example.com",
    "full_name": "Alex Rivera",
    "appearance_preference": "system",
    "is_active": true,
    "created_at": "2026-11-05T14:00:00Z"
  }
}
```

### `POST /api/auth/login`
Authenticates email and password.
- **Request Body**:
```json
{
  "email": "user@example.com",
  "password": "Password123!"
}
```
- **Response** `200 OK`: Returns JWT access token and user entity.

### `GET /api/auth/me`
Returns authenticated user session details.
- **Headers**: `Authorization: Bearer <token>`

### `PATCH /api/auth/appearance`
Persists the user's theme preference to their account.
- **Request Body**: `{"appearance_preference": "dark"}` (allowed: `system`, `light`, `dark`).

---

## 2. Resume Library & Parsing Endpoints

### `POST /api/resumes/upload`
Uploads a resume file in PDF, DOCX, or TXT format.
- **Form Data**:
  - `file`: Resume binary file (Max: 10MB)
  - `title`: Optional custom document label
  - `target_role`: Optional target title (e.g., "Senior Full-Stack Engineer")
- **Response** `200 OK`: Returns created `Resume` entity with parsed sections.

### `GET /api/resumes`
Lists all active uploaded resumes for the authenticated user.

### `GET /api/resumes/{id}`
Retrieves full resume metadata, structured parsed sections, and version history.

### `PATCH /api/resumes/{id}/sections/{section_id}`
Allows the user to review and correct an extracted section without modifying the original uploaded file.

### `POST /api/resumes/{id}/analyse`
Executes heuristic analysis on the resume. Calculates structure, readability, impact, and skills scores, detects vague phrases, and generates recommendations.

### `GET /api/resumes/{id}/analyses/{analysis_id}/pdf`
Downloads a professionally formatted PDF analysis audit report generated server-side via ReportLab.

### `DELETE /api/resumes/{id}`
Permanently deletes the resume record and removes the file from private storage.

---

## 3. Job Description & Matching Endpoints

### `POST /api/job-descriptions/analyse`
Extracts required and preferred skills, seniority level, and requirements from job posting text.

### `POST /api/matches`
Computes deep alignment between a candidate's resume and a job description.
- **Request Body**:
```json
{
  "resume_id": "c869e943-...",
  "job_text": "Requirements: 5+ years Python, React, Docker...",
  "job_title": "Senior Engineer",
  "company": "TechFlow"
}
```
- **Response** `200 OK`: Returns `overall_score`, `matched_skills`, `missing_skills`, `partial_skills`, and scoring rationale.

---

## 4. AI Writing Assistant Endpoints

### `POST /api/ai/rewrite`
Rewrites weak bullets, summaries, or project highlights using the Google XYZ formula: *"Accomplished [X] as measured by [Y] by doing [Z]"*.

### `POST /api/ai/cover-letter`
Drafts a customized cover letter grounded strictly in the candidate's verified resume facts and target job requirements.

### `POST /api/ai/interview-prep`
Generates targeted behavioral, technical, and situational interview questions with STAR hints based on candidate skills and job posting criteria.

---

## 5. Application Tracker Endpoints

### `GET /api/applications`
Queries tracked job applications with optional filters:
- `?stage=interview`: Filter by pipeline stage
- `?q=google`: Search by company, role, or notes
- `?sort_by=company`: Sort by company name or application date

### `POST /api/applications`
Creates a new application record in the tracking pipeline.

### `PATCH /api/applications/{id}`
Updates application stage (advances Kanban column), salary, interview date, or recruiter contact notes.

### `GET /api/applications/stats`
Returns aggregated pipeline statistics, including counts by stage, active interview tally, and response rate percentage.

---

## 6. Dashboard & User Data Endpoints

### `GET /api/dashboard`
Aggregated endpoint returning recent resumes, recent analyses, pipeline stats, upcoming interview reminders, and recommended skills to learn.

### `GET /api/users/export`
GDPR compliance endpoint returning a complete JSON archive of all personal data, resumes, analyses, and job applications.

### `DELETE /api/users/account`
Permanently deletes user account, profile, all uploaded resume files, and activity logs.

---

## 7. Career Navigator & Live Market Job Feeds

### `GET /api/navigator/industries`
Returns all supported career industries with canonical role counts and live job opening tallies.

### `GET /api/navigator/roles`
Retrieves roles with live vacancy counts, work-mode breakdowns (`remote`, `hybrid`, `onsite`), and latest normalized salary snapshots.

### `GET /api/navigator/roles/{role_id}/salary`
Returns latest salary quartile snapshot (`p25`, `median`, `p75`, `sample_size`), 30-day historical trend, and freshness flag.

### `GET /api/navigator/roles/{role_id}/jobs`
Returns real live job postings for the role with direct source attribution links (Remotive, Arbeitnow, Adzuna).

### `POST /api/navigator/refresh`
Triggers an immediate background crawl of stalest roles across live job boards. Protected by authentication and a 10-minute cooldown window. Returns `202 Accepted`.

---

## 8. Vector RAG & 4-Tier ATS Stress Test Endpoints (Pillar 1)

### `POST /api/matches/vector-rag`
Calculates multi-dimensional 256-D dense vector embeddings and cosine similarity matching between resume accomplishments and job posting requirements.
- **Request Body**:
```json
{
  "resume_id": "c869e943-...",
  "job_text": "We are seeking a Senior Distributed Systems Engineer...",
  "job_title": "Senior Distributed Systems Engineer",
  "company": "Acme Cloud"
}
```
- **Response** `200 OK`:
  - `overall_hybrid_score`: 88.5
  - `vector_cosine_similarity`: 0.892
  - `bm25_keyword_overlap_score`: 84.0
  - `semantic_chunk_matches`: Matched requirement-to-bullet vectors
  - `semantic_gap_analysis`: Missing conceptual competencies

### `POST /api/jobs/ats-stress-test/raw`
Stress-tests raw resume text against the top 4 enterprise ATS platforms: **Workday**, **Greenhouse**, **Taleo**, and **Lever**.
- **Request Body**: `{"text": "...", "file_name": "resume.pdf"}`
- **Response** `200 OK`: Returns per-system parsing scores (0–100), layout distortion warnings (tables, multi-column headers), and mitigation checklist.

### `POST /api/jobs/ats-stress-test/resume/{resume_id}`
Stress-tests an existing stored resume in the user's vault against Workday, Greenhouse, Taleo, and Lever parsing filters.

---

## 9. Real-Time Voice Mock Interview Simulator (Pillar 2 & Module 8)

### `POST /api/interviews/sessions`
Spins up a new interactive spoken interview session tailored to candidate's target role and company.
- **Request Body**:
```json
{
  "role_title": "Senior Full-Stack Engineer",
  "company": "TechFlow Labs",
  "format_type": "mixed",
  "total_questions": 4,
  "resume_id": "c869e943-..."
}
```

### `POST /api/interviews/turns/speech`
Handles dual-channel audio upload (WAV/WebM) and performs server-side bundled FFmpeg speech-to-text transcription fallback.

### `POST /api/interviews/turns/evaluate`
Scores candidate spoken responses on:
- Speech delivery metrics: Words-Per-Minute (WPM), pause cadence, filler words (*"um"*, *"like"*, *"basically"*).
- 5-Criterion STAR Scoring Rubric (Situation, Task, Action, Result, Relevance).
- Generates 3 Benchmark Model Answers (*Senior Leadership & ROI*, *Deep Technical Architecture*, *Agile Incident Recovery*) with instant text-to-speech audio synthesis.

### `POST /api/interviews/sessions/{id}/complete`
Generates comprehensive performance scorecard with hiring recommendation (*Strong Hire*, *Hire*, *Needs Coaching*) and spider radar chart data.

---

## 10. Career Knowledge Graph & ML Salary Engine (Pillars 3 & 5)

### `GET /api/career-graph/roles`
Retrieves directed career knowledge graph containing 46 canonical roles across 9 industries and 5 seniority tiers.

### `POST /api/career-graph/bridge`
Computes the **Dijkstra Shortest-Path Career Bridge** connecting current baseline role to target dream role with estimated transition months, difficulty weighting, and prerequisite trees.

### `POST /api/career-graph/salary-predictor`
Supervised machine learning compensation regression estimating 25th, 50th, 75th, and 90th percentile salary bands calibrated against 5 global cost-of-living location multipliers.

### `POST /api/career-graph/negotiate`
Interactive multi-turn recruiter game-theory negotiation coach evaluating candidate leverage, firmness vs. politeness, and concession gains.

---

## 11. Chrome Extension Clipper & Inbound Webhooks (Pillar 4)

### `POST /api/applications/extension/clip`
1-Click ingestion endpoint for the Manifest V3 Chrome Extension. Ingests job title, company name, location, salary, and description from LinkedIn/Indeed, computes instant candidate vector match, and adds a card to the Kanban pipeline.

### `POST /api/applications/inbound-webhook`
Inbound email parser webhook classifying forwarded recruiter emails (*Interview Scheduled, Acknowledged, Rejection*) and auto-updating application stages.

---

## 12. 1-Click Targeted Resume Adaptation & Tailoring (Pillar 6)

### `POST /api/resumes/{resume_id}/tailor`
Auto-tailors resume accomplishments for a specific job posting. Re-ranks bullet points based on vector similarity and elevates matching keywords while strictly enforcing a **zero-hallucination fact-preservation guarantee**.

---

## 13. Explainable AI (XAI) & Algorithmic Bias Auditor (Module 7)

### `POST /api/xai/attributions`
Calculates token- and sentence-level Shapley value attributions ($\phi_i = \text{Score}(S \cup \{i\}) - \text{Score}(S)$), rendering positive/negative feature importance heatmaps.

### `POST /api/xai/bias-audit`
Scans job descriptions or resumes for unconscious bias, masculine-coded jargon (*"rockstar"*, *"ninja"*, *"dominate"*), ageism markers, and socio-economic elitism, producing a DEI Fairness Score (0–100).

### `POST /api/xai/blind-profile`
De-identifies candidate summaries by redacting Personally Identifiable Information (PII), gender pronouns, graduation years, and locations for fair first-round evaluations.

---

## 14. GitHub & Technical Artifact "Proof of Work" Verifier (Module 10)

### `POST /api/verification/github-audit`
Performs **Claim-to-Code Cross-Verification** matching self-declared resume skills against tangible GitHub repository code, commit history, and test suites. Generates a verifiable SHA-256 cryptographic competency badge (`CL-POW-XXXX`).

---

## 15. In-Browser Live Coding & System Design Assessment Sandbox (Module 11)

### `GET /api/coding/challenges`
Returns dynamic algorithmic and system design coding challenges tailored to candidate target roles.

### `GET /api/coding/challenges/{challenge_id}`
Retrieves challenge constraints, starter code, test suites, and expected Big-O complexity targets.

### `POST /api/coding/evaluate`
Executes submitted solution against test suites, analyzes Big-O Time Complexity (e.g., $\mathcal{O}(1)$ vs. $\mathcal{O}(N)$ vs. $\mathcal{O}(N^2)$), and produces AI code quality feedback.

---

## 16. University Placement Cell & Multi-Tenant SaaS Portal (Module 12)

### `GET /api/placement/telemetry`
Aggregates cohort-level readiness analytics, average ATS readiness scores, interview conversion rates, and curriculum deficit alerts (e.g., *"68% lack Kubernetes skills"*).

### `GET /api/placement/export-csv`
Generates a downloadable CSV roster of pre-vetted candidates with readiness scores and verified skills for campus corporate recruiters.
