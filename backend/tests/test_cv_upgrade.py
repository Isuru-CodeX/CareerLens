"""
backend/tests/test_cv_upgrade.py - Tests for CV Auto-Fill and AI Upgrade features.
Covers: Year calculation, Email gate, Profile Experiences & Skills, Presets,
Cover letter regeneration with change requests, and Polish number guardrail.
"""
import pytest
import os
import sys

# Ensure backend root is on PYTHONPATH
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from app.main import app
from app.core.database import get_db, Base, engine, init_db
from app.services.years_service import years_count, total_years, canonical_skill, split_compound_skills
from app.services.cv_extraction_service import check_email_gate, clean_url, label_for, split_links, normalize_phone_number
from app.services.location_service import suggest_industry_domain, enrich_address_data
from app.services.polish_service import extract_digits_fingerprint

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_test_db():
    if get_db in app.dependency_overrides:
        del app.dependency_overrides[get_db]
    init_db()
    yield

def test_years_calculation():
    # 2023 to 2025 is 2
    assert years_count(2023, 2025, False, today_year=2026) == 2
    # 2023 to 2026 is 3
    assert years_count(2023, 2026, False, today_year=2026) == 3
    # Current job grows with current year
    assert years_count(2023, None, True, today_year=2026) == 3
    assert years_count(2023, None, True, today_year=2027) == 4
    # Overlapping periods merged: [2020-2024] and [2022-2025] is 5 years (2020 to 2025)
    periods = [(2020, 2024, False), (2022, 2025, False)]
    assert total_years(periods, today_year=2026) == 5

def test_canonical_skills():
    assert canonical_skill("js") == "JavaScript"
    assert canonical_skill("node js") == "Node.js"
    assert canonical_skill("postgres") == "PostgreSQL"
    assert canonical_skill("k8s") == "Kubernetes"
    assert canonical_skill("reactjs") == "React"

def test_email_gate():
    # Mismatch blocked
    ok, mismatch_email, _ = check_email_gate("me@careerlens.ai", "other@victim.com", "Contact: other@victim.com")
    assert ok is False
    assert mismatch_email == "other@victim.com"

    # Match accepted
    ok, _, _ = check_email_gate("me@careerlens.ai", "me@careerlens.ai", "My email is me@careerlens.ai")
    assert ok is True

    # Glued text in PDF accepted
    ok, _, _ = check_email_gate("me@careerlens.ai", None, "Contact: me@careerlens.aiLinkedIn")
    assert ok is True

    # Longer email not accepted
    ok, _, _ = check_email_gate("me@careerlens.ai", None, "Contact: notme@careerlens.ai")
    assert ok is False

    # No email in CV allowed
    ok, _, no_email = check_email_gate("me@careerlens.ai", None, "Candidate Name with no email written")
    assert ok is True
    assert no_email is True

def test_links_extraction_helpers():
    assert clean_url("http://github.com/Isuru-CodeX/") == "https://github.com/Isuru-CodeX"
    assert label_for("https://medium.com/@isuru") == "Medium"
    assert label_for("https://behance.net/isuru") == "Behance"

    links = [
        "https://linkedin.com/in/isururathnayaka",
        "https://github.com/Isuru-CodeX",
        "https://isuru-portfolio.vercel.app",
        "https://medium.com/@isuru"
    ]
    li, gh, port, add = split_links(links)
    assert li == "https://linkedin.com/in/isururathnayaka"
    assert gh == "https://github.com/Isuru-CodeX"
    assert port == "https://isuru-portfolio.vercel.app"
    assert any(item["label"] == "Medium" for item in add)

def test_polish_number_guardrail():
    # Numbers fingerprint extracts all digits and decimals in sorted order
    s1 = "Increased API throughput by 45% and reduced latency from 250ms to 35ms in 2024."
    s2 = "Boosted throughput by 45% while decreasing response times from 250ms down to 35ms in 2024."
    assert extract_digits_fingerprint(s1) == extract_digits_fingerprint(s2)

    s3_hallucinated = "Increased API throughput by 65% in 2025."
    assert extract_digits_fingerprint(s1) != extract_digits_fingerprint(s3_hallucinated)

def test_profile_experiences_and_presets_api():
    # Register/login demo test user
    email = "cvtest@careerlens.ai"
    reg_resp = client.post("/api/auth/register", json={
        "email": email,
        "password": "Password123!",
        "full_name": "CV Tester"
    })
    token = reg_resp.json().get("access_token")
    if not token:
        login_resp = client.post("/api/auth/login", json={"email": email, "password": "Password123!"})
        token = login_resp.json()["access_token"]

    headers = {"Authorization": f"Bearer {token}"}

    # 1. Add Experience
    exp_resp = client.post("/api/profile/experiences", json={
        "job_title": "Full-Stack Developer",
        "company": "Apex Software",
        "industry": "Software & SaaS",
        "start_year": 2023,
        "end_year": 2025,
        "is_current": False,
        "description": "Architected web platforms and APIs.",
        "highlights": ["Designed microservices", "Optimized queries"]
    }, headers=headers)
    assert exp_resp.status_code == 201
    exp_data = exp_resp.json()
    assert exp_data["years_count"] == 2
    exp_id = exp_data["id"]

    # 2. Add Skills
    sk_resp = client.post("/api/profile/skills", json={
        "names": ["node js", "reactjs", "postgres"]
    }, headers=headers)
    assert sk_resp.status_code == 201
    skills = sk_resp.json()
    skill_names = [s["name"] for s in skills]
    assert "Node.js" in skill_names
    assert "React" in skill_names
    assert "PostgreSQL" in skill_names

    # 3. Create Preset
    preset_resp = client.post("/api/presets", json={
        "name": "Backend Engineering",
        "target_role": "Backend Lead",
        "include_manual": True,
        "resume_ids": []
    }, headers=headers)
    assert preset_resp.status_code == 201
    preset_id = preset_resp.json()["id"]

    # 4. Generate Cover Letter
    cl_resp = client.post("/api/cover-letters", json={
        "preset_id": preset_id,
        "job_title": "Backend Engineer",
        "company": "CloudTech",
        "job_description": "We need an engineer skilled in Node.js, React, and databases.",
        "style": "professional",
        "variant": "en-GB"
    }, headers=headers)
    assert cl_resp.status_code == 201
    cl_data = cl_resp.json()
    assert cl_data["current_version"]["version_no"] == 1
    assert "CloudTech" in cl_data["current_version"]["body"]
    cl_id = cl_data["id"]

    # 5. Regenerate with change request
    regen_resp = client.post(f"/api/cover-letters/{cl_id}/regenerate", json={
        "current_text": cl_data["current_version"]["body"],
        "change_request": "Make the opening more concise and emphasize Node.js experience.",
        "style": "human",
        "variant": "en-GB"
    }, headers=headers)
    assert regen_resp.status_code == 200
    regen_data = regen_resp.json()
    assert regen_data["current_version"]["version_no"] == 2
    assert len(regen_data["versions"]) == 2

    # 6. Polish text endpoint
    pol_resp = client.post("/api/text/polish", json={
        "text": "I am working at Apex software since 2023 with 2 years of experience.",
        "style": "professional",
        "variant": "en-GB",
        "mode": "fix"
    }, headers=headers)
    assert pol_resp.status_code == 200
    assert "text" in pol_resp.json()

    # Clean up test experience
    del_resp = client.delete(f"/api/profile/experiences/{exp_id}", headers=headers)
    assert del_resp.status_code == 204

def test_split_compound_skills():
    raw = ["HTML/CSS", "React/Next.js", "CI/CD", "UI/UX", "Java, Python, C++", "Docker / Kubernetes"]
    split = split_compound_skills(raw)
    assert "HTML" in split
    assert "CSS" in split
    assert "React" in split
    assert "Next.js" in split
    # Protected compound terms preserved
    assert "CI/CD" in split
    assert "UI/UX Design" in split or "UI/UX" in split
    assert "Java" in split
    assert "Python" in split
    assert "C++" in split
    assert "Docker" in split
    assert "Kubernetes" in split

def test_normalize_phone_number():
    assert normalize_phone_number("+123-456-7890").startswith("+")
    assert normalize_phone_number("(860) 612 2918") == "+1 (860) 612-2918"
    assert normalize_phone_number("+44 20 7946 0919") == "+44 20 7946 0919"
    assert normalize_phone_number("+1 (970) 333-3833") == "+1 (970) 333-3833"

def test_location_and_industry_intelligence():
    # Industry suggestion
    ind1 = suggest_industry_domain("Senior Software Engineer", ["FastAPI", "PostgreSQL", "Docker"])
    assert "Software" in ind1 or "Cloud" in ind1
    ind2 = suggest_industry_domain("Marketing Manager", ["SEO", "Public Relations"])
    assert "Marketing" in ind2 or "Media" in ind2
    ind3 = suggest_industry_domain("Automotive Technician", [])
    assert "Automotive" in ind3

@pytest.mark.anyio
async def test_enrich_address_service():
    enriched = await enrich_address_data({"line1": "177 Great Portland Street", "city": "London"})
    assert enriched.get("country") == "United Kingdom"
    assert enriched.get("region") == "Greater London"
    assert bool(enriched.get("postalCode") or enriched.get("postal_code"))

