# CareerLens AI - Frontend Architecture & Application Guide

Modern, responsive Single-Page Application (SPA) built with **React 19**, **TypeScript**, **Vite 6**, and **Tailwind CSS**.

---

## 🚀 Key Modules & UI Views

| View / Module | Route / Component | Description |
| :--- | :--- | :--- |
| **Dashboard** | `DashboardView.tsx` | High-level metrics, upcoming interview schedules, active job applications, and quick actions. |
| **Resume Studio & Builder** | `ResumesView.tsx`, `ResumeBuilderStudio.tsx` | Drag-and-drop section reordering, 4 templates (Executive, Academic, Tech Modern, Minimalist), live Typst/PDF preview, and ATS score emulator. |
| **Application Pipeline** | `JobsView.tsx`, `KanbanBoard.tsx` | Drag-and-drop Kanban workflow (Saved, Applied, Screening, Interview, Offer, Rejected) with real-time stage updates. |
| **Voice & CV Interview Studio** | `InterviewsView.tsx`, `VoiceInterviewStudio.tsx` | Real-time speech-to-text (STT) + text-to-speech (TTS) audio interview simulation, STAR response evaluator, and live Computer Vision (CV) non-verbal coach. |
| **Career Path Navigator** | `CareerNavigatorView.tsx` | Interactive D3.js knowledge graph, Dijkstra/A* shortest-path career bridge, and 19-country localized salary predictor. |
| **Explainable AI & Bias Auditor** | `AIAssistantView.tsx`, `XaiBiasAuditorStudio.tsx` | Token-level SHAP attribution heatmaps, DEI unconscious bias scanner (gendered words, ageism, elitism), and blind recruitment masking engine. |
| **Live Coding Sandbox** | `AIAssistantView.tsx`, `LiveCodingSandbox.tsx` | In-browser algorithm sandbox with automated test case evaluation and AST-based Big-O time/space complexity analysis. |
| **Placement Cell SaaS Portal** | `PlacementPortalView.tsx` | Multi-tenant university administration dashboard, cohort telemetry, curriculum deficit alerts, and one-click candidate CSV exports. |
| **GitHub Proof-of-Work Verifier** | `ProfileView.tsx`, `GithubProofOfWorkModal.tsx` | Automated commit verification against resume claims with SHA-256 cryptographic verification badge (`CL-POW-XXXX`). |

---

## 🛠️ Tech Stack & Libraries

- **Framework**: React 19 (`react`, `react-dom`)
- **Build Tool**: Vite 6 with Hot Module Replacement (HMR)
- **Language**: TypeScript 5.8
- **Styling**: Tailwind CSS 3.4 with custom glassmorphism, responsive widescreen grids, and zero-flash theme persistence
- **Icons**: `lucide-react`
- **Charts & Graphs**: D3.js v7 for force-directed and hierarchical knowledge graph rendering
- **Linter**: Oxlint (`oxlint`) with 0 warnings / 0 errors policy

---

## 🎨 Theme & Accessibility System

The application implements a robust theme context (`ThemeContext.tsx`) supporting:
- **Light Mode**: High-contrast, clean slate aesthetic with WCAG AA compliance.
- **Dark Mode**: Rich zinc/slate dark surfaces (`#090d16`, `#111827`) with soft glowing accents.
- **System Mode**: Dynamically follows the user's OS color scheme preferences (`prefers-color-scheme`).
- **Zero-Flicker Boot**: Inline theme script in `index.html` prevents white-flash on page load.

---

## 📦 Getting Started

### Prerequisites
- Node.js >= 18.0.0 (v24.x recommended)
- npm or yarn

### Installation
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install
```

### Development Server
```bash
npm run dev
```
The client will start at `http://localhost:5173`. API calls are automatically routed to the backend at `http://127.0.0.1:8000`.

### Production Build & Linting
```bash
# Run ultra-fast oxlint checks
npm run lint

# Compile production bundle
npm run build
```
Build output is generated into `frontend/dist/` in `< 750ms`.
