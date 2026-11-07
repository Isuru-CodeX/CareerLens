# CareerLens AI - UI/UX Design System & Theme Guidelines

## 1. Visual Theme & Palette Tokens

CareerLens AI utilizes a professional executive palette featuring royal blue, deep navy, and emerald accents.

### 1.1 Color Tokens

| Semantic Token | Light Mode Value | Dark Mode Value | Usage |
|---|---|---|---|
| `--bg-page` | `#f8fafc` (Slate 50) | `#0b1120` (Navy Dark) | Page background |
| `--bg-surface` | `#ffffff` (Pure White) | `#0f172a` (Slate 900) | Cards, panels, modals |
| `--bg-surface-elevated`| `#ffffff` | `#1e293b` (Slate 800) | Tooltips, dropdowns, code editors |
| `--border-subtle` | `#e2e8f0` (Slate 200) | `#1e293b` (Slate 800) | Component borders |
| `--text-primary` | `#0f172a` (Slate 900) | `#f8fafc` (Slate 50) | Primary headings & body |
| `--text-muted` | `#64748b` (Slate 500) | `#94a3b8` (Slate 400) | Subtitles, labels |
| `--brand-primary` | `#2563eb` (Royal Blue) | `#3b82f6` (Light Royal) | Primary buttons, active tabs |
| `--emerald-primary`| `#10b981` (Emerald) | `#10b981` (Emerald) | Success indicators, high scores |
| `--warning-primary`| `#f59e0b` (Amber) | `#f59e0b` (Amber) | Attention areas, warnings |
| `--danger-primary` | `#ef4444` (Rose Red) | `#ef4444` (Rose Red) | Vague phrase alerts, deletion |

---

## 2. Mandatory Appearance System

### 2.1 The Three Modes
1. **System (Default)**: Automatically follows operating system preference via `window.matchMedia('(prefers-color-scheme: dark)')` without page reload.
2. **Light**: Bright, document-friendly design optimized for reading resumes, code, and formal previews.
3. **Dark**: Deep navy slate surfaces (`#0f172a`) with high-contrast text and luminous score meters.

### 2.2 Flash-Free Early Initialization
To prevent any flash of unstyled theme on initial load, `index.html` executes an inline JavaScript snippet in `<head>` that reads `careerlens_theme` from `localStorage` and immediately applies `.dark` to `<html>` before DOM painting occurs.

### 2.3 Print Stylesheet
When printing or exporting a resume preview to paper or PDF, `@media print` rules apply pure white backgrounds (`#ffffff`), dark typography (`#000000`), suppress non-printable sidebars and navigation, and preserve typography hierarchy.

---

## 3. Component Design Patterns

### 3.1 Explainable AI (SHAP) Token Heatmap
- **Positive Attributions**: Soft emerald highlight (`bg-emerald-50/50`, `border-emerald-200`) with high-contrast green delta pill (`+14.2%`).
- **Improvement Areas**: Soft rose highlight (`bg-rose-50/50`, `border-rose-200`) with negative delta pill (`-8.5%`).
- **Neutral Elements**: Monospaced clean typography with standard slate border.

### 3.2 In-Browser Live Coding Sandbox
- Dark monospaced code editing workspace (`bg-slate-900`, `text-slate-100`, `font-mono`) with syntax contrast.
- Execution panel displaying instant test pass/fail indicators, milliseconds latency, and Big-O complexity target comparisons.

### 3.3 Computer Vision (CV) Interview Studio HUD
- Mirrored video feed with rounded corners and high-contrast status overlays.
- Real-time indicator pills: 🟢 Eye Contact % (Optimal), 🟢 Upright & Centered Posture, 🟡 Fidget Cadence.

### 3.4 University Placement Cell Portal
- 4-Column executive KPI stat cards with clear numerical hierarchy.
- Curriculum Deficit Alert cards with gap percentages, severity tags, and actionable recommendations.
- Filterable candidate roster table with responsive wrapping and status pills.

### 3.5 CV-to-Profile Side-by-Side Review Screen (Spec 4.1)
- Side-by-side diff comparison cards displaying extracted metadata alongside current profile fields.
- Color-coded confidence pills (🟢 High $\ge 80\%$, 🟡 Medium $50–79\%$, 🔴 Low $<50\%$).
- Individual field toggles: Accept, Keep Current, Edit, or Merge.
- Sticky action bar with confirmed count, collision badges, and explicit "Apply Confirmed Import" trigger.

### 3.6 Multi-Source Skill Evidence & Dispute Modal (Spec 4.2)
- Visual chip indicators: `Demonstrated` (emerald badge $\ge 85\%$ confidence) vs. `Mentioned` (indigo badge $\le 75\%$).
- Evidence inspection modal listing source types (GitHub, production project, quiz assessment, resume bullet).
- Interactive dispute button allowing candidates to flag inaccurate claims, automatically recalculating skill proficiency.

### 3.7 Career Readiness 6-Pillar Scorecard (Spec 5.3 & 5.4)
- 6-Pillar diagnostic grid: Role Alignment (25%), Evidence Depth (20%), Project Proof (15%), CV Quality (15%), Mock Interviews (15%), Learning Progress (10%).
- Status indicators: `Strong` (emerald), `Satisfactory` (blue), `Needs Work` (amber).
- Every category box includes a transparent explanation and an actionable next-step button linking directly to the relevant workspace.

---

## 4. Responsive Breakpoints

CareerLens AI follows a mobile-first responsive architecture tested across all specified viewports:

| Breakpoint | Viewport Width | Navigation Pattern | Layout Structure |
|---|---|---|---|
| **Mobile XS** | 320px - 374px | Compact Topbar + Slide-over Drawer | 1-Column stacked cards |
| **Mobile SM** | 375px - 479px | Full Topbar + Slide-over Drawer | 1-Column stacked cards |
| **Mobile MD** | 480px - 767px | Full Topbar + Slide-over Drawer | 1-Column with 2-col stat rows |
| **Tablet** | 768px - 1023px | Topbar + Persistent Left Sidebar | 2-Column grid layouts |
| **Desktop** | 1024px - 1279px| Topbar + Left Sidebar | Multi-column grid & Kanban |
| **Wide Desktop**| 1280px - 1440px+| Topbar + Left Sidebar | 6-Column Kanban, 4-Col stats |

---

## 5. Animation Principles

- **Page Transitions**: Smooth vertical opacity reveals (`opacity: 0, y: 10` $\rightarrow$ `opacity: 1, y: 0`).
- **Interactive Score Meters**: Radial SVG gauge animations with spring physics.
- **Card Hover Effects**: Micro-elevations (`y: -2px` to `y: -3px`) with smooth shadow transitions.
- **Offer Celebration**: Lightweight particle confetti triggers upon advancing any application to the "Offer" stage.
