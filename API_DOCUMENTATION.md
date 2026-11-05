# CareerLens AI - REST API Documentation

CareerLens AI exposes a fully versioned RESTful API under the `/api` prefix. Interactive Swagger UI is available at `/docs` and ReDoc at `/redoc`.

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
- **Response** `200 OK`: Returns JWT token and user profile.

### `GET /api/auth/me`
Returns authenticated user session details.
- **Headers**: `Authorization: Bearer <token>`

### `PATCH /api/auth/appearance`
Persists the user's theme selection to their account.
- **Request Body**: `{"appearance_preference": "dark"}` (allowed: `system`, `light`, `dark`).

---

## 2. Resume Library & Parsing Endpoints

### `POST /api/resumes/upload`
Uploads a new resume in PDF, DOCX, or TXT format.
- **Form Data**:
  - `file`: Resume binary file (Max: 10MB)
  - `title`: Optional custom document label
  - `target_role`: Optional target title (e.g., "Senior Full-Stack Engineer")
- **Response** `200 OK`: Returns the created `Resume` entity with all parsed sections.

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
- **Response** `200 OK`:
  - `overall_score`: 86.0
  - `matched_skills`: Skills found with resume quote evidence
  - `missing_skills`: Gap competencies with recommendations
  - `partial_skills`: Related skills bridging the gap
  - `match_explanations`: Transparent scoring rationale

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

