# CareerLens AI - System Architecture & Design Specification

> **Enterprise Multi-Tier Architecture**: Scalable, asynchronous architecture integrating dense vector search, multimodal interview audio/vision streams, knowledge graphs, and explainable AI.

---

## 1. High-Level Architecture Overview

CareerLens AI is architected as an event-driven, decoupled system comprising a modern reactive web frontend, a Manifest V3 browser extension, high-throughput asynchronous FastAPI microservices, and multi-tier persistence.

```mermaid
flowchart TD
    subgraph Client_Tier ["🌐 Presentation & Client Tier"]
        SPA["React 19 SPA (Vite 6 + Tailwind CSS 4)"]
        Ext["Manifest V3 Chrome Extension<br/>(1-Click Clipper & In-Page Badge)"]
        AudioStream["Web Audio API & VU Meter<br/>(Live Sensitivity Feedback)"]
        CVCoach["MediaStream CV Video Coach<br/>(Webcam Gaze & Posture HUD)"]
        CodingUI["In-Browser Coding Sandbox<br/>(Algorithmic Runner & Big-O Analyzer)"]
    end

    subgraph Ingress_Tier ["🛡️ Ingress & Security Gateway"]
        Gateway["FastAPI Asynchronous Gateway<br/>/api/v1 (CORS, JWT & Rate Limiting)"]
        WS["WebSocket Gateway<br/>/ws/interview (Real-Time Duplex Audio)"]
        RBAC["Multi-Tenant RBAC Middleware<br/>(Candidate / Mentor / Placement Officer)"]
    end

    subgraph Intelligence_Tier ["🧠 AI, Vector & Machine Learning Engines"]
        VectorRAG["Vector RAG Engine<br/>256-D Dense Embeddings + Cosine Match"]
        ATSEmulator["4-Tier ATS Stress-Test Engine<br/>(Workday · Greenhouse · Taleo · Lever)"]
        GraphEngine["Career Knowledge Graph<br/>46 Roles · Dijkstra Shortest-Path Bridge"]
        SalaryML["ML Salary Regressor<br/>XGBoost Percentile Bands & Location Multipliers"]
        VoiceStudio["Voice Interview Simulator<br/>STAR Rubric Scoring & Exemplar Answers"]
        XAIEngine["Explainable AI & Bias Auditor<br/>SHAP Attributions & Blind Recruitment Masking"]
        CodeSandbox["Code Evaluation Engine<br/>AST Complexity Analyzer & Test Runner"]
        GitVerifier["GitHub Proof-of-Work Verifier<br/>Claim-to-Code Matcher & SHA-256 Badge"]
    end

    subgraph Storage_Tier ["🗄️ Persistence & Storage"]
        DB[("Relational Database<br/>SQLite / PostgreSQL + pgvector")]
        DocVault["Private Encrypted Storage<br/>UUID Document Vault"]
    end

    subgraph External_Providers ["🌍 External AI & Cloud Integrations"]
        Gemini["Google Gemini API<br/>(gemini-2.5-flash / Pro)"]
        JobBoards["Job Platforms<br/>LinkedIn · Indeed · Glassdoor"]
        GitHubAPI["GitHub REST API<br/>Repository Profiling"]
    end

    SPA --> Gateway
    Ext --> Gateway
    AudioStream --> WS
    CVCoach --> SPA
    CodingUI --> Gateway

    Gateway --> RBAC
    WS --> VoiceStudio

    RBAC --> VectorRAG
    RBAC --> ATSEmulator
    RBAC --> GraphEngine
    RBAC --> SalaryML
    RBAC --> XAIEngine
    RBAC --> CodeSandbox
    RBAC --> GitVerifier

    VectorRAG --> DB
    ATSEmulator --> DocVault
    GraphEngine --> DB
    SalaryML --> DB
    Gateway --> DB

    VoiceStudio --> Gemini
    VectorRAG --> Gemini
    Ext --> JobBoards
    GitVerifier --> GitHubAPI
```

---

## 2. Key Architecture Design Decisions

### 2.1 Multi-Tier Appearance System
- **Mandatory 3 Modes**: `System`, `Light`, and `Dark`.
- **Zero Flash of Wrong Theme**: An inline initialization script executes in `<head>` before HTML parsing begins to read `localStorage` or `window.matchMedia('(prefers-color-scheme: dark)')` and immediately toggles `.dark` on `document.documentElement`.
- **CSS Variable Tokens**: Central semantic variables (`--bg-page`, `--bg-surface`, `--text-primary`, `--brand-primary`, `--emerald-primary`) dictate all styling across components.

### 2.2 Hybrid Vector Search & Algorithmic RAG (Pillar 1)
- Resumes and job postings are decomposed into semantic accomplishment chunks.
- Combines 256-D normalized vector cosine similarity ($0.55$), BM25 exact keyword overlap ($0.30$), and domain/seniority fit ($0.15$).
- **Mathematical Cosine Similarity**:
  $$\text{SemanticMatch}(R, J) = \frac{\mathbf{v}_R \cdot \mathbf{v}_J}{\|\mathbf{v}_R\|_2 \|\mathbf{v}_J\|_2}$$

### 2.3 Dual-Channel Audio & Computer Vision Interview Pipeline (Pillar 2 & Module 8)
- Simultaneous in-browser live streaming via Web Speech API and hardware-buffered audio capture via native `MediaRecorder`.
- Server-side fallback audio transcription using bundled FFmpeg and Google Speech.
- Client-side Computer Vision HUD monitoring eye contact gaze percentage, head pose posture alignment, and nervous fidget indicators during spoken answers.

### 2.4 Graph-Theoretic Career Progression (Pillar 3)
- Models 46 canonical roles across 9 industries as a directed graph $G = (V, E)$.
- Applies **Dijkstra's Shortest Path Algorithm** with edge weights proportional to prerequisite skill gaps and estimated difficulty to compute personalized upskilling roadmaps.

### 2.5 Supervised Machine Learning Salary Prediction (Pillar 5)
- Multi-tier regression model generating calibrated compensation bands: 25th (Entry), 50th (Median), 75th (Top Quartile), and 90th (Lead/Staff).
- Calibrated against 5 global cost-of-living tiers ($US_{\text{Tier 1}} = 1.0$, $US_{\text{Tier 2}} = 0.88$, $UK/\text{EU} = 0.76$, $\text{Remote} = 0.65$).

### 2.6 Explainable AI (XAI) & Fairness Governance (Module 7)
- Computes Shapley value approximations ($\phi_i = \text{Score}(S \cup \{i\}) - \text{Score}(S)$) for token-level attribution heatmaps.
- Scans job postings and resumes for gender-coded jargon, ageism, and elitism.
- De-identifies candidate summaries (masking names, emails, phones, pronouns, and graduation years) for blind initial screening.

### 2.7 Cryptographic Technical Proof-of-Work (Module 10)
- Ingests public GitHub profiles and performs claim-to-code cross-verification.
- Generates a SHA-256 verifiable credential badge:
  $$\text{BadgeHash} = \text{SHA256}(\text{candidate\_id} + \text{username} + \text{verified\_skills} + \text{salt})$$

---

## 3. End-to-End Component Sequence Flows

### 3.1 Vector RAG & ATS Stress-Test Sequence

```mermaid
sequenceDiagram
    autonumber
    actor Candidate
    participant SPA as React Client
    participant API as FastAPI Backend
    participant VectorEngine as Vector RAG Service
    participant ATSEmulator as ATS Emulator Service
    participant DB as Relational Database

    Candidate->>SPA: Selects Resume & Enters Job Description
    SPA->>API: POST /api/matches/vector-rag
    API->>VectorEngine: Generate 256-D Embeddings for Chunks
    VectorEngine->>VectorEngine: Calculate Cosine Similarity & BM25 Overlap
    VectorEngine-->>API: Return Overall Hybrid Match Score & Concept Gaps
    API-->>SPA: Render Interactive Vector Alignment Breakdown
    Candidate->>SPA: Clicks "Run 4-Tier ATS Stress Test"
    SPA->>API: POST /api/jobs/ats-stress-test/resume/{id}
    API->>ATSEmulator: Simulate Workday, Greenhouse, Taleo, Lever Filters
    ATSEmulator-->>API: Parsing Scores & Layout Distortion Warnings
    API-->>SPA: Display Per-System Scorecards & Actionable Fixes
```

### 3.2 Spoken Mock Interview & Video Coaching Flow

```mermaid
sequenceDiagram
    autonumber
    actor Candidate
    participant SPA as React Voice Studio
    participant Audio as Web Audio / MediaRecorder
    participant CV as Video Stream HUD
    participant API as FastAPI Backend
    participant Sim as Interview Simulator Engine

    Candidate->>SPA: Starts Voice Mock Interview Session
    SPA->>API: POST /api/interviews/sessions
    API-->>SPA: Returns Question 1 with STAR Guidance
    SPA->>SPA: Synthesizes Question via TTS (Web Speech)
    Candidate->>SPA: Toggles Webcam & Clicks "Record Answer"
    CV->>CV: Tracks Eye Contact (94%) & Posture Alignment
    Audio->>Audio: Streams Live Speech + Buffers MediaRecorder Chunks
    Candidate->>SPA: Clicks "Submit Answer"
    SPA->>API: POST /api/interviews/turns/evaluate
    API->>Sim: Compute STAR Rubric & Linguistic WPM/Fillers
    Sim->>Sim: Generate Tri-Perspective Exemplar Model Answers
    API-->>SPA: Returns Turn Score, Exemplars & Coach Feedback
```
