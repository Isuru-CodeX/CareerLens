import pytest
import os
import sys

# Ensure backend root is on PYTHONPATH
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.core.database import Base, get_db
from app.services.parsing_service import ParsingService
from app.services.analysis_service import AnalysisService
from app.services.matching_service import MatchingService
from app.services.ai_service import AIService

# In-memory test SQLite DB
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(autouse=True, scope="module")
def setup_database():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)
    if os.path.exists("./test.db"):
        try:
            os.remove("./test.db")
        except Exception:
            pass

client = TestClient(app)

def test_health():
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "healthy"

def test_auth_flow():
    # 1. Register
    reg_payload = {
        "email": "testuser@careerlens.ai",
        "password": "Password123!",
        "full_name": "Alex Developer",
        "appearance_preference": "dark"
    }
    r = client.post("/api/auth/register", json=reg_payload)
    assert r.status_code == 200, r.text
    data = r.json()
    assert "access_token" in data
    assert data["user"]["email"] == "testuser@careerlens.ai"
    assert data["user"]["appearance_preference"] == "dark"
    token = data["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Duplicate registration fails
    r_dup = client.post("/api/auth/register", json=reg_payload)
    assert r_dup.status_code == 400

    # 3. Login
    login_payload = {
        "email": "testuser@careerlens.ai",
        "password": "Password123!"
    }
    r_log = client.post("/api/auth/login", json=login_payload)
    assert r_log.status_code == 200
    assert "access_token" in r_log.json()

    # 4. Get Current User Me
    r_me = client.get("/api/auth/me", headers=headers)
    assert r_me.status_code == 200
    assert r_me.json()["email"] == "testuser@careerlens.ai"

    # 5. Update appearance
    r_app = client.patch("/api/auth/appearance", json={"appearance_preference": "light"}, headers=headers)
    assert r_app.status_code == 200
    assert r_app.json()["appearance_preference"] == "light"

    # 6. Forgot Password flow
    r_forgot = client.post("/api/auth/forgot-password", json={"email": "testuser@careerlens.ai"})
    assert r_forgot.status_code == 200
    forgot_data = r_forgot.json()
    assert "message" in forgot_data
    reset_token = forgot_data.get("reset_token")
    assert reset_token is not None

    # 7. Reset Password
    r_reset = client.post("/api/auth/reset-password", json={
        "token": reset_token,
        "new_password": "NewSecretPassword2026!"
    })
    assert r_reset.status_code == 200
    assert "successfully reset" in r_reset.json()["message"]

    # 8. Verify Login with New Password
    r_new_log = client.post("/api/auth/login", json={
        "email": "testuser@careerlens.ai",
        "password": "NewSecretPassword2026!"
    })
    assert r_new_log.status_code == 200
    assert "access_token" in r_new_log.json()

def test_parsing_service():
    sample_text = """
    Jane Doe
    jane.doe@example.com | (555) 019-2834 | linkedin.com/in/janedoe | github.com/janedoe
    San Francisco, CA

    Professional Summary
    Senior Full-Stack Engineer with 6 years experience architecting high-scale Python, TypeScript, and React applications.

    Experience
    Senior Software Engineer - Acme Corp (2021 - Present)
    - Spearheaded migration of legacy monolith to microservices using FastAPI and Docker, reducing API latency by 45%.
    - Optimized PostgreSQL query execution plans, saving $12,000 monthly in database compute costs.
    - Mentored 5 junior engineers and introduced CI/CD automated test suites.

    Education
    B.S. in Computer Science - University of California, Berkeley (2018)

    Skills
    Python, TypeScript, React, FastAPI, Docker, PostgreSQL, AWS, Redis, Git, CI/CD, Agile
    """
    parsed = ParsingService.parse_resume(sample_text)
    assert parsed["contact"]["email"] == "jane.doe@example.com"
    assert "janedoe" in parsed["contact"]["linkedin"]
    assert len(parsed["skills"]) >= 5
    assert len(parsed["experience"]) >= 1

def test_analysis_service():
    sample_text = """
    Jane Doe
    jane.doe@example.com | 555-019-2834
    Summary
    Experienced developer with a background in software.
    Experience
    Software Engineer (2022 - Present)
    - Responsible for managing web servers and helped with frontend development.
    - Worked on internal tools and was a great team player.
    Skills
    Python, JavaScript, Docker
    Education
    BS in Computer Science
    """
    parsed = ParsingService.parse_resume(sample_text)
    analysis = AnalysisService.analyze_resume(parsed, sample_text)
    assert "overall_score" in analysis
    assert analysis["overall_score"] > 0
    # Check vague phrases detected
    vague_phrases = [v["phrase"] for v in analysis["vague_phrases"]]
    assert any("responsible for" in vp for vp in vague_phrases)

def test_matching_service():
    resume_text = "Experienced with Python, React, TypeScript, FastAPI, PostgreSQL, and Docker."
    skills = [{"name": "Python"}, {"name": "React"}, {"name": "Docker"}]
    job_text = """
    We are looking for a Senior Full Stack Engineer.
    Requirements:
    - 4+ years of Python and React experience.
    - Experience with Docker and PostgreSQL.
    - Excellent problem solving and communication skills.
    Nice to have:
    - Kubernetes and GraphQL.
    """
    matched = MatchingService.match_resume_to_job(resume_text, skills, job_text)
    assert matched["overall_score"] > 50
    matched_names = [m["name"].lower() for m in matched["matched_skills"]]
    assert "python" in matched_names
    assert "react" in matched_names

def test_ai_service():
    # 1. Rewrite bullet
    weak_bullet = "Responsible for building customer APIs and helped with unit tests."
    res = AIService.rewrite_content(weak_bullet, "bullet")
    assert "Spearheaded" in res["improved"]
    assert len(res["changes"]) > 0

    # 2. Cover Letter with Contact Info & Social Links
    cl = AIService.generate_cover_letter(
        resume_name="Alex Developer",
        resume_summary="Experienced engineer",
        resume_skills=["Python", "FastAPI", "React"],
        recent_experience="Engineered high-throughput microservices",
        job_description="Looking for senior backend developer",
        company_name="Stripe",
        job_title="Senior Engineer",
        candidate_email="alex@example.com",
        candidate_phone="+1 (555) 019-2834",
        linkedin_url="https://linkedin.com/in/alex",
        github_url="https://github.com/alex",
        portfolio_url="https://alex.dev"
    )
    assert "Stripe" in cl["cover_letter"]
    assert "Alex Developer" in cl["cover_letter"]
    assert "alex@example.com" in cl["cover_letter"]
    assert "+1 (555) 019-2834" in cl["cover_letter"]
    assert "linkedin.com/in/alex" in cl["cover_letter"]
    assert "github.com/alex" in cl["cover_letter"]
    assert "alex.dev" in cl["cover_letter"]

    # 3. Interview prep
    prep = AIService.generate_interview_questions("Python developer job description")
    assert len(prep) >= 3

def test_application_tracker_api():
    # Register user
    reg = client.post("/api/auth/register", json={
        "email": "appuser@careerlens.ai",
        "password": "Password123!",
        "full_name": "App Tracker User"
    })
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create Application
    create_payload = {
        "company": "Google",
        "role": "Software Engineer III",
        "stage": "applied",
        "location": "Mountain View, CA",
        "source": "Referral",
        "salary_range": "$160k - $210k",
        "notes": "Passed initial resume review."
    }
    r = client.post("/api/applications", json=create_payload, headers=headers)
    assert r.status_code == 200
    app_id = r.json()["id"]
    assert r.json()["company"] == "Google"
    assert r.json()["stage"] == "applied"

    # 2. Update Stage
    patch_payload = {"stage": "interview", "notes": "Technical screen scheduled."}
    r_patch = client.patch(f"/api/applications/{app_id}", json=patch_payload, headers=headers)
    assert r_patch.status_code == 200
    assert r_patch.json()["stage"] == "interview"

    # 3. Add Reminder
    rem_payload = {
        "title": "Review system design notes",
        "due_date": "2026-11-10T10:00:00Z"
    }
    r_rem = client.post(f"/api/applications/{app_id}/reminders", json=rem_payload, headers=headers)
    assert r_rem.status_code == 200
    rem_id = r_rem.json()["id"]

    # 4. Toggle Reminder
    r_toggle = client.patch(f"/api/applications/reminders/{rem_id}/toggle", headers=headers)
    assert r_toggle.status_code == 200
    assert r_toggle.json()["is_completed"] == True

    # 5. Application Stats
    r_stats = client.get("/api/applications/stats", headers=headers)
    assert r_stats.status_code == 200
    assert r_stats.json()["total_applications"] == 1
    assert r_stats.json()["active_interviews"] == 1

    # 6. Dashboard endpoint
    r_dash = client.get("/api/dashboard", headers=headers)
    assert r_dash.status_code == 200
    dash_data = r_dash.json()
    assert dash_data["application_stats"]["total_applications"] == 1

