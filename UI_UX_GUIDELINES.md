# CareerLens AI - UI/UX Design System & Theme Guidelines

## 1. Visual Theme & Palette Tokens

CareerLens AI utilizes a professional executive palette featuring royal blue, deep navy, and emerald accents.

### 1.1 Color Tokens

| Semantic Token | Light Mode Value | Dark Mode Value | Usage |
|---|---|---|---|
| `--bg-page` | `#f8fafc` (Slate 50) | `#0b1120` (Navy Dark) | Page background |
| `--bg-surface` | `#ffffff` (Pure White) | `#0f172a` (Slate 900) | Cards, panels, modals |
| `--bg-surface-elevated`| `#ffffff` | `#1e293b` (Slate 800) | Tooltips, dropdowns |
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
1. **System (Default)**: Follows the browser and operating system preference via `window.matchMedia('(prefers-color-scheme: dark)')`. Automatically responds to live OS changes without a reload.
2. **Light**: Bright, document-friendly design optimized for reading resumes and formal previews.
3. **Dark**: Deep navy surfaces with high-contrast text and luminous score meters.

### 2.2 Flash-Free Early Initialization
To prevent any flash of unstyled theme on initial load, `index.html` executes an inline JavaScript snippet in `<head>` that parses `careerlens_theme` from `localStorage` and applies `.dark` to `<html>` before DOM painting occurs.

### 2.3 Print Stylesheet
When printing or exporting a resume preview to paper or PDF, `@media print` rules apply pure white backgrounds (`#ffffff`), dark typography (`#000000`), suppress non-printable sidebars and navigation, and preserve typography hierarchy.

---

## 3. Responsive Breakpoints

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

## 4. Animation Principles

CareerLens AI utilizes subtle, fresh animations powered by Framer Motion:
- **Page Transitions**: Smooth vertical opacity reveals (`opacity: 0, y: 10` $\rightarrow$ `opacity: 1, y: 0`).
- **Interactive Score Meters**: Radial SVG gauge animations with spring physics.
- **Card Hover Effects**: Micro-elevations (`y: -2px` to `y: -3px`) with smooth shadow transitions.
- **Offer Celebration**: Lightweight particle confetti triggers upon advancing any application to the "Offer" stage.
- **Modal Transitions**: Backdrop blur with scale-in dialog physics.
