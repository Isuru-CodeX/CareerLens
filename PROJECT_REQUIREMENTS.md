# CareerLens AI - Project Requirements & Product Scope

## AI Resume Analyzer, Job Matcher and Application Tracker

### 1. Product Vision and Goals
Help users understand and improve their resumes, compare resume content against job descriptions, generate tailored suggestions and track job applications. Do not promise guaranteed ATS results or employment outcomes.

---

### 2. Visual Theme and Design Direction
Professional career platform using royal blue, navy and emerald accents. Light mode is bright and document-friendly; dark mode uses navy surfaces and carefully contrasted score indicators. Resume previews should remain readable and printable in either theme.

---

### 3. Mandatory Appearance System
• Provide three appearance preferences: System, Light, and Dark.
• System is the default for first-time visitors and follows the operating system/browser `prefers-color-scheme` setting.
• Users can manually choose Light or Dark at any time. Apply the change immediately without a full-page reload.
• Persist authenticated users' preference in their account settings; persist anonymous users' preference locally.
• When System is selected, listen for operating-system appearance changes and update the interface automatically.
• Apply the selected theme consistently to every route and component, including navigation, forms, dialogs, tables, charts, notifications, document previews, and third-party UI components.
• Apply the theme before the first visible render to avoid a flash of the wrong theme.
• Use central design tokens/CSS variables. Do not scatter hard-coded colour values throughout components.
• Check colour contrast, focus states, disabled states, borders, shadows, and status colours in both themes.

---

### 4. Responsive Design Requirements
• Use a mobile-first layout and test at 320, 375, 480, 768, 1024, 1280, 1440, and wider viewport widths.
• Use responsive navigation: collapsible sidebar or drawer on smaller screens; compact navigation where appropriate.
• Make tables usable on phones through responsive cards, prioritised columns, or controlled horizontal scrolling.
• Ensure forms, dialogs, menus, charts, cards, and file upload controls fit small screens.
• Use touch-friendly controls, readable typography, and adequate spacing.
• Prevent clipped content, overlapping controls, layout shifts, and unintended horizontal scrolling.
• Verify both portrait and landscape mobile layouts where relevant.

---

### 5. Functional Requirements

#### Accounts and Career Profile
• Registration, login, password reset and profile management.
• Store career interests, preferred roles, skills, education and experience with user control.
• Allow users to view, export and permanently delete their personal data and uploaded resumes.

#### Resume Library and Parsing
• Upload PDF and DOCX resumes; show upload progress, preview and parsing status.
• Store multiple resume versions and label each version for a target role.
• Extract contact details, summary, education, experience, projects, skills and certifications where detectable.
• Allow users to review and correct extracted fields; parsing must not silently overwrite the original file.

#### Resume Analysis
• Review completeness, clarity, grammar, consistency, measurable achievements and section structure.
• Identify vague phrases and suggest stronger, truthful alternatives.
• Identify missing or underrepresented skills based on the user's supplied target role or job description.
• Show an explanation and evidence for each suggestion; do not invent qualifications, employers or achievements.

#### Scoring and Job Matching
• Provide clearly labelled heuristic/AI guidance scores for structure, readability, skills coverage and job relevance.
• Let users paste or upload a job description and extract required/preferred skills.
• Show matching skills, missing skills and relevant resume evidence.
• Explain score limitations; do not describe the score as an actual employer ATS score or guarantee an interview.

#### AI Writing Assistant
• Improve a professional summary, bullet points and project descriptions while preserving factual meaning.
• Tailor suggestions to a specific job description and allow side-by-side comparison with original wording.
• Generate a cover-letter draft using only user-confirmed details and the supplied job description.
• Require user review and editing before exporting or using generated content.

#### Application Tracker
• Save company, role, job URL, location, source, salary range if supplied, application date and notes.
• Track stages such as Interested, Applied, Assessment, Interview, Offer, Rejected and Withdrawn.
• Add interview dates, reminders, contacts and follow-up notes.
• Show application statistics and filter/sort applications.

#### Dashboard and Development Recommendations
• Show resume versions, recent analyses, saved job matches and application pipeline.
• Recommend skills to learn based on selected roles and gaps, clearly distinguishing suggestions from requirements.
• Generate interview practice questions from a supplied job description.

---

### 6. Recommended Technology Stack
- **Frontend**: React + TypeScript, Vite, Tailwind CSS, Lucide icons, Framer Motion, Recharts, Canvas-Confetti.
- **Backend**: Python + FastAPI, Pydantic, SQLAlchemy.
- **Database**: SQLite (local) / PostgreSQL (production).
- **Parsing**: PyPDF, python-docx.
- **PDF Report Generation**: ReportLab.
- **Tests**: Pytest, HTTPX.
- **Deployment**: Docker and private object/filesystem storage.

---

### 7. Universal Definition of Done
1. All stated features have working UI, backend logic and persistent data where required.
2. Authentication and authorisation are enforced server-side; user data is isolated.
3. System, Light and Dark appearance modes work and persist correctly.
4. Critical workflows are tested automatically and manually.
5. Mobile, tablet and desktop layouts are verified.
6. Loading, empty, success, error and confirmation states are implemented.
7. No secrets are committed; production configuration is documented.
8. README, API, database, testing and deployment documentation is accurate.
9. The application has been run and verified; incomplete features and limitations are disclosed.
