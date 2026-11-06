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

    # 2. Cover Letter with Contact Info & Social Links (Template 1: GitHub + Portfolio)
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
        portfolio_url="https://alex.dev",
        include_project_links_body=True
    )
    assert "Stripe" in cl["cover_letter"]
    assert "Alex Developer" in cl["cover_letter"]
    assert "alex@example.com" in cl["cover_letter"]
    assert "+1 (555) 019-2834" in cl["cover_letter"]
    assert "linkedin.com/in/alex" in cl["cover_letter"]
    assert "github.com/alex" in cl["cover_letter"]
    assert "alex.dev" in cl["cover_letter"]
    assert "explore my development projects and technical work through my GitHub profile and portfolio" in cl["cover_letter"]

    # Template 2: GitHub only
    cl_gh = AIService.generate_cover_letter(
        resume_name="Isuru Rathnayaka",
        resume_summary="Software Engineering undergraduate",
        resume_skills=["Java", "JavaScript", "React"],
        recent_experience="Academic software projects",
        job_description="Junior Developer",
        company_name="Acme Corp",
        job_title="Software Engineer",
        github_url="https://github.com/Isuru-CodeX",
        include_project_links_body=True
    )
    assert "explore some of my development projects and review my code through my GitHub profile" in cl_gh["cover_letter"]
    assert "https://github.com/Isuru-CodeX" in cl_gh["cover_letter"]

    # Template 3: Without links body
    cl_no_links = AIService.generate_cover_letter(
        resume_name="Jane Doe",
        resume_summary="Software Engineer",
        resume_skills=["Python"],
        recent_experience="Backend dev",
        job_description="Developer",
        company_name="TechCo",
        job_title="Backend Dev",
        github_url="https://github.com/janedoe",
        include_project_links_body=False
    )
    assert "explore my development projects" not in cl_no_links["cover_letter"]
    assert "TechCo" in cl_no_links["cover_letter"]

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

def test_user_profile_and_contact_info():
    # Register user
    reg = client.post("/api/auth/register", json={
        "email": "contactuser@careerlens.ai",
        "password": "Password123!",
        "full_name": "Jordan Casey"
    })
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Update Career Profile with Contact Coordinates & Custom Links
    profile_data = {
        "target_title": "Staff Cloud Architect",
        "target_industry": "Fintech & Distributed Systems",
        "years_of_experience": 8,
        "phone": "+1 (555) 789-0123",
        "linkedin_url": "https://linkedin.com/in/jordancasey",
        "github_url": "https://github.com/jordancasey",
        "portfolio_url": "https://jordancasey.tech",
        "other_links": [
            {"label": "Substack Newsletter", "url": "https://jordancasey.substack.com"}
        ],
        "summary": "Accomplished cloud infrastructure leader."
    }
    r_put = client.put("/api/users/profile", json=profile_data, headers=headers)
    assert r_put.status_code == 200
    res_data = r_put.json()
    assert res_data["phone"] == "+1 (555) 789-0123"
    assert res_data["linkedin_url"] == "https://linkedin.com/in/jordancasey"
    assert res_data["github_url"] == "https://github.com/jordancasey"
    assert res_data["portfolio_url"] == "https://jordancasey.tech"
    assert len(res_data["other_links"]) == 1
    assert res_data["other_links"][0]["label"] == "Substack Newsletter"

    # 2. Get Profile
    r_get = client.get("/api/users/profile", headers=headers)
    assert r_get.status_code == 200
    assert r_get.json()["phone"] == "+1 (555) 789-0123"

    # 3. GDPR Data Export
    r_export = client.get("/api/users/export", headers=headers)
    assert r_export.status_code == 200
    export_json = r_export.json()
    assert "user_profile" in export_json
    assert export_json["user_profile"]["phone"] == "+1 (555) 789-0123"
    assert export_json["user_profile"]["linkedin_url"] == "https://linkedin.com/in/jordancasey"
    assert export_json["user_profile"]["github_url"] == "https://github.com/jordancasey"
    assert len(export_json["user_profile"]["other_links"]) == 1

def test_resume_upload_analysis_and_pdf():
    # Register user
    reg = client.post("/api/auth/register", json={
        "email": "resumetest@careerlens.ai",
        "password": "Password123!",
        "full_name": "Taylor Morgan"
    })
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Upload TXT resume
    sample_resume_bytes = b"""Taylor Morgan\ntaylor@example.com | (555) 444-3322\nProfessional Summary\nSenior Software Architect with 7 years experience.\nExperience\nArchitect at TechCorp\nBuilt high throughput APIs with Python and Docker.\nSkills\nPython, Docker, FastAPI, Kubernetes, AWS\n"""
    files = {"file": ("taylor_resume.txt", sample_resume_bytes, "text/plain")}
    data = {"title": "Taylor Resume 2026", "target_role": "Senior Cloud Architect"}
    r_upload = client.post("/api/resumes/upload", files=files, data=data, headers=headers)
    assert r_upload.status_code == 200
    resume_id = r_upload.json()["id"]

    # 2. Download Uploaded Resume
    r_download = client.get(f"/api/resumes/{resume_id}/download", headers=headers)
    assert r_download.status_code == 200
    assert b"Taylor Morgan" in r_download.content

    # 3. Analyse Resume
    r_analyse = client.post(f"/api/resumes/{resume_id}/analyse", headers=headers)
    assert r_analyse.status_code == 200
    analysis_id = r_analyse.json()["id"]

    # 4. Download PDF Analysis Report
    r_pdf = client.get(f"/api/resumes/{resume_id}/analyses/{analysis_id}/pdf", headers=headers)
    assert r_pdf.status_code == 200
    assert r_pdf.headers["content-type"] == "application/pdf"
    assert len(r_pdf.content) > 500

    # 5. Delete Resume
    r_del = client.delete(f"/api/resumes/{resume_id}", headers=headers)
    assert r_del.status_code == 200

def test_job_url_extraction():
    reg = client.post("/api/auth/register", json={
        "email": "urlextract@careerlens.ai",
        "password": "Password123!",
        "full_name": "Job Seeker"
    })
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Invalid URL rejects with 400
    r_bad = client.post("/api/job-descriptions/extract-url", json={"url": "not-a-valid-url"}, headers=headers)
    assert r_bad.status_code == 400

    # 2. LinkedIn URL extraction
    r_extract = client.post("/api/job-descriptions/extract-url", json={
        "url": "https://www.linkedin.com/jobs/view/4463126127/"
    }, headers=headers)
    assert r_extract.status_code == 200
    data = r_extract.json()
    assert "job_title" in data
    assert "company_name" in data
    assert len(data["job_description"]) > 100
    assert len(data["job_title"]) > 0

def test_avatar_upload_and_removal():
    reg = client.post("/api/auth/register", json={
        "email": "avatar_tester@careerlens.ai",
        "password": "Password123!",
        "full_name": "Avatar Tester"
    })
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Invalid file format returns 400
    r_bad = client.post(
        "/api/users/me/avatar",
        files={"file": ("test.txt", b"plain text is not an image", "text/plain")},
        headers=headers
    )
    assert r_bad.status_code == 400

    # 2. Upload valid dummy PNG
    dummy_png = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
    r_upload = client.post(
        "/api/users/me/avatar",
        files={"file": ("avatar.png", dummy_png, "image/png")},
        headers=headers
    )
    assert r_upload.status_code == 200
    upload_data = r_upload.json()
    assert "avatar_url" in upload_data

    # 3. Retrieve user profile to check avatar_url
    r_me = client.get("/api/users/me", headers=headers)
    assert r_me.status_code == 200
    assert r_me.json()["avatar_url"] is not None

    # 4. Fetch the avatar image (both authenticated and public URL)
    r_img = client.get("/api/users/me/avatar/image", headers=headers)
    assert r_img.status_code == 200
    assert r_img.headers["content-type"] == "image/png"

    # Verify public access without auth header using the avatar_url path
    public_url = upload_data["avatar_url"]
    assert public_url.startswith("/api/users/avatar/")
    r_pub = client.get(public_url)
    assert r_pub.status_code == 200
    assert r_pub.headers["content-type"] == "image/png"

    # 5. Delete avatar
    r_del = client.delete("/api/users/me/avatar", headers=headers)
    assert r_del.status_code == 200

    r_img_after = client.get("/api/users/me/avatar/image", headers=headers)
    assert r_img_after.status_code == 404

def test_activity_logging_and_pagination():
    reg = client.post("/api/auth/register", json={
        "email": "activity_user@careerlens.ai",
        "password": "Password123!",
        "full_name": "Activity User"
    })
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Profile update generates activity
    client.put("/api/users/profile", json={"phone": "+1 555 123 4567"}, headers=headers)

    # Activity endpoint returns the recorded activity
    r_act = client.get("/api/activity?limit=10&page=1", headers=headers)
    assert r_act.status_code == 200
    data = r_act.json()
    assert data["total"] >= 1
    assert any(item["event_type"] == "profile_updated" for item in data["items"])

    # Test stats endpoint
    r_stats = client.get("/api/activity/stats", headers=headers)
    assert r_stats.status_code == 200
    stats_data = r_stats.json()
    assert "total_activities" in stats_data
    assert "total_time_spent_minutes" in stats_data
    assert "models" in stats_data
    assert len(stats_data["models"]) >= 3

def test_experience_intelligence_engine_and_verification():
    reg = client.post("/api/auth/register", json={
        "email": "exp_tester@careerlens.ai",
        "password": "Password123!",
        "full_name": "Experience Tester"
    })
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    cv_text = """
    Jane Developer
    jane.developer@example.com

    WORK EXPERIENCE
    Senior Full Stack Engineer
    Acme Tech Ltd | Jan 2023 - Present
    - Architected scalable React and Python microservices.
    - Mentored 4 junior engineers and improved sprint velocity.

    Software Engineer
    Beta Solutions | June 2021 - December 2022
    - Developed enterprise REST APIs using Node.js and PostgreSQL.

    INTERNSHIP
    Software Development Intern
    Startup Hub | Jan 2021 - May 2021
    - Built responsive frontend components.

    ACADEMIC PROJECTS
    University Capstone: Smart Traffic
    Jan 2020 - Dec 2020
    - Machine learning model for traffic prediction.
    """

    r_up = client.post(
        "/api/resumes/upload",
        files={"file": ("jane_cv.txt", cv_text.encode("utf-8"), "text/plain")},
        data={"title": "Jane Resume", "target_role": "Full Stack Engineer"},
        headers=headers
    )
    assert r_up.status_code == 200
    resume_id = r_up.json()["id"]

    # Retrieve parsed experiences
    r_exp = client.get(f"/api/resumes/{resume_id}/experiences", headers=headers)
    assert r_exp.status_code == 200
    exp_data = r_exp.json()
    assert len(exp_data["experiences"]) >= 2
    summary = exp_data["summary"]
    assert summary["professional_duration_months"] > 0
    assert summary["non_overlapping_roles_count"] >= 1

    # Verify an experience item
    first_exp_id = exp_data["experiences"][0]["id"]
    r_ver = client.post(f"/api/resumes/{resume_id}/experiences/{first_exp_id}/verify", headers=headers)
    assert r_ver.status_code == 200
    assert r_ver.json()["verified_by_user"] is True
    assert r_ver.json()["needs_user_verification"] is False

    # Check dashboard includes experience summary and recent activity
    r_dash = client.get("/api/dashboard", headers=headers)
    assert r_dash.status_code == 200
    dash_data = r_dash.json()
    assert "recent_activities" in dash_data
    assert len(dash_data["recent_activities"]) > 0
    assert "experience_summary" in dash_data
    assert dash_data["experience_summary"] is not None




