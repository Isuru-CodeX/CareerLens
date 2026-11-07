# CareerLens AI - Project Requirements & Product Scope

## Autonomous Career Intelligence, ATS Resume Elevation & Interview Co-Pilot

### 1. Product Vision and Goals
Help users understand and improve their resumes, compare resume content against job descriptions using dense semantic embeddings, generate tailored evidence-grounded proposals, prepare for high-stakes interviews with real-time speech and video analysis, and navigate data-backed career trajectories. The platform delivers algorithmic guidance and heuristic scoring without guaranteeing employment outcomes or private employer ATS results.

---

### 2. Visual Theme and Design Direction
Professional executive platform utilizing royal blue, deep navy, and emerald accents. Light mode provides bright, document-friendly readability; dark mode utilizes deep navy slate surfaces (`#0f172a`) with luminous score indicators. Document previews and resume builders remain readable and printable in either theme.

---

### 3. Mandatory Appearance System
- Provide three appearance preferences: **System**, **Light**, and **Dark**.
- System is the default for first-time visitors and automatically follows the operating system/browser `prefers-color-scheme` setting via media listeners.
- Users can manually switch to Light or Dark at any time with immediate visual effect and zero page reload.
- Persist authenticated users' preference in the database; persist anonymous users' preference in `localStorage`.
- Execute an inline theme initialization script in `<head>` before the first visible paint to guarantee **zero flash of the wrong theme**.
- Centralize all styling around semantic CSS variables (`--bg-page`, `--bg-surface`, `--text-primary`, `--brand-primary`, `--emerald-primary`).

---

### 4. Responsive Design Requirements
- Mobile-first responsive architecture tested across 320px, 375px, 480px, 768px, 1024px, 1280px, and 1440px+ viewports.
- Responsive navigation: collapsible slide-over drawer on mobile/tablet viewports; persistent left sidebar on widescreen desktop.
- Touch-friendly controls, readable typography, and zero horizontal scrolling on mobile viewports.

---

### 5. Functional Scope & Feature Pillars

#### 5.1 Accounts, Candidate Profiles & Presets
- User registration, JWT authentication, and profile management.
- Multi-candidate selector and education history presets (*University, High School, Diplomas, Certifications*).
- Complete GDPR data export (`GET /api/users/export`) and permanent account erasure (`DELETE /api/users/account`).

#### 5.2 Resume Parsing & Heuristic Audit
- Lossless text extraction across PDF, DOCX, and TXT resumes.
- Structured section segmentation (`contact`, `summary`, `experience`, `education`, `skills`, `projects`).
- User review drawer allowing field corrections without modifying original immutable files.
- Bi-directional candidate profile synchronization:
  - **Apply Profile Details to Resume**: Injects verified user profile details (target role, summary, verified skills, and employment history) directly into the resume document, updating child records and rebuilding raw text.
  - **Create Resume from Profile**: 1-click ATS-ready resume document compilation from verified profile metadata.
  - **Review & Import CV to Profile**: Extracts candidate skills, work history, education, and avatar from an uploaded resume into the career profile.
- Heuristic scoring across structure, readability, quantified impact, and skills coverage.
- Passive/vague phrase detector suggesting high-impact action verbs.

#### 5.3 Hybrid Semantic Search & Vector RAG (Pillar 1)
- 256-D normalized vector embeddings and cosine similarity matching between resume accomplishments and job posting requirements:
  $$\text{SemanticMatch}(R, J) = \frac{\mathbf{v}_R \cdot \mathbf{v}_J}{\|\mathbf{v}_R\|_2 \|\mathbf{v}_J\|_2}$$
- Hybrid scoring architecture combining dense vector embeddings (55%), exact BM25 keyword overlap (30%), and seniority fit (15%).
- 4-Tier Enterprise ATS Stress-Test Engine simulating **Workday**, **Greenhouse**, **Taleo**, and **Lever** parsing filters.

#### 5.4 Real-Time Voice AI Mock Interview Simulator (Pillar 2 & Module 8)
- Spoken interview studio with natural question delivery via text-to-speech.
- Dual-channel audio capture (in-browser Web Speech API + native `MediaRecorder` with server-side bundled FFmpeg fallback).
- Real-time Web Audio API decibel equalizer (VU meter 0–100%).
- Multimodal performance scorecard tracking Words-Per-Minute (WPM), pause pacing, filler words, and 5-criterion STAR scoring.
- Tri-perspective exemplar benchmark answers (*Executive*, *Technical*, *Agile*).
- Real-time Computer Vision (CV) HUD tracking eye-contact percentage, head pose posture alignment, and fidget cadence.

#### 5.5 Career Knowledge Graph & ML Salary Predictor (Pillars 3 & 5)
- Directed knowledge graph of 46 technical roles across 9 industries and 5 seniority tiers.
- Dijkstra shortest-path career bridges with transition difficulty weighting and prerequisite trees.
- Supervised compensation regression estimating 25th, 50th, 75th, and 90th percentile salary bands calibrated against 5 global location tiers.
- Interactive game-theory negotiation simulator with 5 battle-tested counter-offer scripts.

#### 5.6 Browser Extension & Automated Application Ingestion (Pillar 4)
- Manifest V3 Chrome Extension auto-detecting job postings on LinkedIn, Indeed, Glassdoor, and Wellfound.
- 1-Click job clipping directly into the application Kanban pipeline.
- In-page floating match badge showing candidate vector alignment score without leaving the tab.
- Inbound recruiter email parser webhook classifying email intent.

#### 5.7 Fact-Preserving Dynamic Resume Tailor (Pillar 6)
- 1-Click targeted adaptation re-ordering accomplishments based on vector similarity.
- Strict zero-hallucination factuality invariant preserving verified metrics and employers.

#### 5.8 Explainable AI (XAI) & DEI Bias Auditor (Module 7)
- Token- and sentence-level Shapley value attribution heatmaps ($\phi_i = \text{Score}(S \cup \{i\}) - \text{Score}(S)$).
- DEI unconscious bias scanner detecting masculine-coded jargon, ageism markers, and elitism.
- 1-Click blind recruitment de-identifier masking candidate PII, pronouns, and graduation years.

#### 5.9 GitHub Artifact "Proof of Work" Verifier (Module 10)
- Automated claim-to-code cross-verification matching resume skills against public GitHub repository codebases.
- Cryptographic SHA-256 verifiable competency badge.

#### 5.10 In-Browser Live Coding Sandbox (Module 11)
- Interactive algorithmic coding challenges tailored to candidate target roles.
- Test suite runner and automated Big-O time and space complexity reviewer.

#### 5.11 University Placement Cell & Multi-Tenant Portal (Module 12)
- Cohort readiness analytics, average ATS scores, and systemic curriculum deficit alerts.
- Candidate roster management and 1-click CSV export for campus hiring partners.

#### 5.12 CV-to-Profile Review & Provenance Sync (Spec 4.1)
- Side-by-side diff review screen comparing extracted CV data against existing profile fields.
- Confidence scoring and collision detection. Non-destructive guarantee: never silently overwrites candidate data without explicit user confirmation.
- Writes field-level audit trail to `ProfileFieldSource`.

#### 5.13 Evidence-Aware Skill Profile & Multi-Source Verification (Spec 4.2)
- Hierarchical skill classification: `mentioned` (CV keyword, $\le 75\%$ confidence) vs. `demonstrated` (production code, verified quiz $\ge 66\%$, or project proof, $\ge 85\%$ confidence) vs. `unverified`.
- Multi-source evidence tracking (`UserSkillEvidence`). Candidate dispute trigger automatically recalculates parent skill metrics.
- **GitHub & LinkedIn AI Skill Discovery Engine**: Automated profile scanner extracting legitimate technical, engineering, and professional competencies with an immutable **Zero-PII Policy** (strictly rejecting phone numbers, emails, addresses, personal names, dates, or arbitrary prose).
- Bulk skill import automatically connects extracted competencies to `ProfileSkill` with provenance `source="github_linkedin"` and generates `UserSkillEvidence` audit records.

#### 5.14 Empirical Information Retrieval Matching Benchmark (Spec 4.3)
- Formalized benchmark framework computing `NDCG@K`, `Precision@K`, and `Recall@K` across annotated candidate-job pairs.
- Validates that hybrid semantic search consistently outranks naive keyword baselines (+2.1% relative NDCG@3 lift).

#### 5.15 54-Role Career Trajectory Comparator & Milestones (Spec 4.4)
- Searchable dropdown supporting all 54 platform roles across 8 domains (Software Engineering, Data Science & AI, Cloud & DevOps, Cybersecurity, Product Management, UI/UX Design, Enterprise & Business, Mobile Engineering).
- Interactive side-by-side comparison of 1–6 trajectories simultaneously.
- **"My Current Profile" Baseline Integration**: Allows setting candidate's active profile (`CareerProfile`, `ProfileSkill`, `ProfileExperience`) as the baseline comparison card.
- **AI Semantic Skill Alignment**: Calculates alignment via exact matches, synonym ontologies, and token overlaps ($75\%$ skill alignment $+ 25\%$ experience tenure fit).
- Displays verified skills, transferrable/partial skills with explanatory rationale, missing prerequisites, real-time salary deltas, and 3-phase transition roadmaps.
- Persistent `CareerGoal` with milestone tracking and progress completion metrics.

#### 5.16 Adaptive Learning Plan & Quiz Verification (Spec 4.5)
- Personalized study curriculum targeted at missing skill gaps, constrained by weekly study availability.
- Assessment quiz runner: achieving $\ge 66\%$ score automatically elevates the targeted skill to **Demonstrated** in candidate's profile.

#### 5.17 6-Pillar Evidence-Weighted Career Readiness (Spec 5.3 & 5.4)
- Transparent mathematical formulation: Role Alignment (25%), Evidence Depth (20%), Project Proof (15%), CV Quality (15%), Mock Interviews (15%), Learning Progress (10%).
- Actionable next steps and explanations for every category.

#### 5.18 Categorized Project Capabilities Matrix
- Clean dashboard matrix organizing all 25 system capabilities into 5 distinct architectural pillars:
  1. *User Data & Statistics* (Profile, Resume Sync, Education Presets, GDPR Vault, Placement Telemetry)
  2. *AI Writing & Generation* (ATS Resume Tailor, Cover Letter Studio, Grammar Fixer, Exemplar Answers, Script Generator)
  3. *Career Trajectory & Analytics* (54-Role Comparator, Knowledge Graph, Salary Predictor, Information Retrieval Benchmark, Readiness Scorecard)
  4. *Multimodal AI & Simulation* (Voice Interview Studio, Decibel Equalizer, Non-Verbal Eye/Posture Coach, Negotiation Simulator, Live Coding Sandbox)
  5. *Verification, Auditing & Compliance* (GitHub Proof of Work, ATS Parser & Stress-Tester, Bias & DEI Auditor, Quiz Assessor, Social Skill Extractor)

---

### 6. Technology Stack
- **Frontend**: React 19, TypeScript, Vite 6, Tailwind CSS 4, Lucide React, Framer Motion, Recharts, Canvas-Confetti.
- **Backend API**: Python 3.12+, FastAPI, Uvicorn, Pydantic v2, SQLAlchemy 2.0.
- **Audio & Media**: Web Audio API, Web Speech API, `MediaRecorder`, bundled FFmpeg (`imageio-ffmpeg`), SpeechRecognition.
- **Document Processing**: `pypdf`, `python-docx`, `reportlab`, `beautifulsoup4`.
- **Database**: SQLite (development) / PostgreSQL + `pgvector` (production).
- **Testing**: `pytest`, `httpx`, `oxlint`, `tsc` (87 backend tests passed, 0 lint warnings).
- **Browser Extension**: Manifest V3, Content Scripts, Service Worker.
