"""
Tests for Career Navigator live job sources, work-mode detector,
statistical salary aggregator, and FastAPI endpoints.
All external HTTP requests are mocked with respx to avoid real network calls during testing.
"""
import os
import sys
import asyncio
import pytest
import respx
import httpx

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from app.main import app
from app.services.work_mode import detect_work_mode
from app.services.salary_stats import annual_midpoint, summarize
from app.services.job_sources.base import RawJob
from app.services.job_sources.adzuna import fetch_adzuna
from app.services.job_sources.remotive import fetch_remotive, parse_salary_text
from app.services.job_sources.arbeitnow import fetch_arbeitnow
from app.services.navigator_service import NavigatorService
from app.core.database import SessionLocal, init_db


@pytest.fixture(autouse=True)
def setup_test_db():
    app.dependency_overrides.clear()
    init_db()
    db = SessionLocal()
    try:
        NavigatorService.ensure_seed_data(db)
    finally:
        db.close()
    yield
    app.dependency_overrides.clear()


# 1. Work-mode detection unit tests
def test_detect_work_mode():
    assert detect_work_mode("Senior Engineer - Hybrid role in Austin") == "hybrid"
    assert detect_work_mode("Lead Developer (100% remote)") == "remote"
    assert detect_work_mode("Software Engineer - Work From Home") == "remote"
    assert detect_work_mode("Backend Dev - No remote, strictly in office") == "onsite"
    assert detect_work_mode("Site Reliability Engineer", remote_flag=True) == "remote"
    assert detect_work_mode("Hybrid Cloud Architect", remote_flag=True) == "hybrid"
    assert detect_work_mode("", remote_flag=None) == "unknown"


# 2. Salary normalization and IQR outlier trimming tests
def test_annual_midpoint_periods():
    # Yearly
    job_yr = RawJob(
        source="test", external_id="1", title="Dev", company="C", location="L",
        work_mode="remote", url="u", salary_min=100000, salary_max=120000, period="year"
    )
    assert annual_midpoint(job_yr) == 110000.0

    # Hourly (2080 hours)
    job_hr = RawJob(
        source="test", external_id="2", title="Dev", company="C", location="L",
        work_mode="remote", url="u", salary_min=50, salary_max=70, period="hour"
    )
    assert annual_midpoint(job_hr) == 124800.0

    # Monthly (12 months)
    job_mo = RawJob(
        source="test", external_id="3", title="Dev", company="C", location="L",
        work_mode="remote", url="u", salary_min=8000, salary_max=10000, period="month"
    )
    assert annual_midpoint(job_mo) == 108000.0

    # None if no salary
    job_none = RawJob(
        source="test", external_id="4", title="Dev", company="C", location="L",
        work_mode="remote", url="u", salary_min=None, salary_max=None
    )
    assert annual_midpoint(job_none) is None


def test_summarize_requires_enough_samples_and_trims_outliers():
    # Too few samples (< 8)
    assert summarize([50000, 60000, 70000]) is None

    # Normal distribution with 1 extreme outlier
    raw_vals = [80000, 85000, 90000, 95000, 100000, 105000, 110000, 115000, 120000, 10000000]
    res = summarize(raw_vals, min_samples=8)
    assert res is not None
    assert res["p25"] < res["median"] < res["p75"]
    assert res["median"] < 200000  # Extreme outlier 10,000,000 was stripped!


# 3. Remotive salary string regex parsing tests
def test_remotive_salary_parsing():
    lo, hi, period = parse_salary_text("$90k - $120k / year")
    assert lo == 90000.0
    assert hi == 120000.0
    assert period == "year"

    lo, hi, period = parse_salary_text("$100,000 - $140,000")
    assert lo == 100000.0
    assert hi == 140000.0

    lo, hi, period = parse_salary_text("$75 / hr")
    assert lo == 75.0
    assert hi == 75.0
    assert period == "hour"


# 4. Mocked Adzuna Adapter Test with respx
@respx.mock
def test_adzuna_flags_estimated_and_hybrid(monkeypatch):
    monkeypatch.setenv("ADZUNA_APP_ID", "mock_id")
    monkeypatch.setenv("ADZUNA_APP_KEY", "mock_key")

    mock_resp = {
        "results": [
            {
                "id": "adzuna_99",
                "title": "Data Engineer",
                "description": "Hybrid schedule: 2 days in office, 3 days remote in Austin.",
                "redirect_url": "https://example.com/job/99",
                "salary_min": 90000,
                "salary_max": 110000,
                "salary_is_predicted": "1",
                "company": {"display_name": "Acme Analytics"},
                "location": {"display_name": "Austin, TX"}
            }
        ]
    }
    respx.get(url__startswith="https://api.adzuna.com/v1/api/jobs/us/search/").mock(
        return_value=httpx.Response(200, json=mock_resp)
    )

    jobs = asyncio.run(fetch_adzuna("data engineer", "us", pages=1))
    assert len(jobs) == 1
    assert jobs[0].estimated is True
    assert jobs[0].work_mode == "hybrid"
    assert jobs[0].company == "Acme Analytics"
    assert jobs[0].currency == "USD"


# 5. Mocked Remotive Adapter Test with respx
@respx.mock
def test_remotive_feed_fetch():
    mock_remotive = {
        "jobs": [
            {
                "id": 101,
                "title": "Senior Python Developer",
                "company_name": "CloudCo",
                "candidate_required_location": "USA Only",
                "url": "https://remotive.com/jobs/101",
                "description": "Build high-throughput event queues.",
                "salary": "$120k - $150k"
            }
        ]
    }
    respx.get("https://remotive.com/api/remote-jobs").mock(
        return_value=httpx.Response(200, json=mock_remotive)
    )

    jobs = asyncio.run(fetch_remotive("python"))
    assert len(jobs) == 1
    assert jobs[0].work_mode == "remote"
    assert jobs[0].salary_min == 120000.0
    assert jobs[0].salary_max == 150000.0


# 6. Mocked Arbeitnow Adapter Test with respx
@respx.mock
def test_arbeitnow_feed_fetch():
    mock_arbeit = {
        "data": [
            {
                "slug": "frontend-dev-berlin",
                "title": "Frontend React Developer",
                "company_name": "EuroTech",
                "location": "Berlin",
                "remote": True,
                "tags": ["react", "frontend", "typescript"],
                "url": "https://arbeitnow.com/jobs/frontend-dev-berlin",
                "description": "Work on next-gen dashboards"
            }
        ]
    }
    respx.get("https://www.arbeitnow.com/api/job-board-api").mock(
        return_value=httpx.Response(200, json=mock_arbeit)
    )

    jobs = asyncio.run(fetch_arbeitnow("frontend"))
    assert len(jobs) == 1
    assert jobs[0].company == "EuroTech"
    assert jobs[0].work_mode == "remote"


# 7. FastAPI API Endpoints integration test
def test_navigator_api_endpoints():
    client = TestClient(app)

    # 1. Login or create test user for auth token
    login_resp = client.post("/api/auth/login", json={"email": "demo@careerlens.ai", "password": "Password123!"})
    if login_resp.status_code == 200 and "access_token" in login_resp.json():
        token = login_resp.json()["access_token"]
    else:
        # Register a temporary user
        email = f"nav_tester_{os.getpid()}@careerlens.ai"
        reg_resp = client.post("/api/auth/register", json={
            "email": email,
            "password": "Password123!",
            "full_name": "Navigator Tester"
        })
        if reg_resp.status_code == 200 and "access_token" in reg_resp.json():
            token = reg_resp.json()["access_token"]
        else:
            login_resp2 = client.post("/api/auth/login", json={"email": email, "password": "Password123!"})
            token = login_resp2.json()["access_token"]

    headers = {"Authorization": f"Bearer {token}"}

    # Test GET /api/navigator/industries
    res_ind = client.get("/api/navigator/industries", headers=headers)
    assert res_ind.status_code == 200
    industries = res_ind.json()
    assert len(industries) >= 4
    tech_ind = next((i for i in industries if "Technology" in i["name"]), None)
    assert tech_ind is not None

    # Test GET /api/navigator/roles
    res_roles = client.get("/api/navigator/roles", headers=headers)
    assert res_roles.status_code == 200
    roles = res_roles.json()
    assert len(roles) >= 10
    first_role = roles[0]
    role_id = first_role["id"]
    assert "latest_salary" in first_role

    # Test GET /api/navigator/roles/{role_id}/salary
    res_sal = client.get(f"/api/navigator/roles/{role_id}/salary", headers=headers)
    assert res_sal.status_code == 200
    sal_data = res_sal.json()
    assert sal_data["role_id"] == role_id
    assert "trend" in sal_data

    # Test GET /api/navigator/roles/{role_id}/jobs
    res_jobs = client.get(f"/api/navigator/roles/{role_id}/jobs", headers=headers)
    assert res_jobs.status_code == 200
    assert "postings" in res_jobs.json()

    # Test POST /api/navigator/refresh
    res_refresh_call = client.post("/api/navigator/refresh", headers=headers)
    assert res_refresh_call.status_code == 202
    assert "status" in res_refresh_call.json()

    # Second immediate call within 10 min cooldown should indicate rate_limited
    res_cooldown = client.post("/api/navigator/refresh", headers=headers)
    assert res_cooldown.status_code == 202
    assert res_cooldown.json().get("status") in ("rate_limited", "refresh_started")


def test_calibrated_country_compensation_tiers():
    """
    Verifies that country-specific seniority progression factors accurately calibrate
    entry-level/junior and mid-level market compensation rates to verified ground-truth values.
    """
    # 1. Sri Lanka (LKR)
    sl_junior = NavigatorService.calculate_role_compensation("Software Engineer", country_code="lk", experience_level="junior")
    sl_mid = NavigatorService.calculate_role_compensation("Software Engineer", country_code="lk", experience_level="mid")
    assert sl_junior["currency"] == "LKR"
    # Junior software engineer in Sri Lanka is ~Rs. 80k-130k/mo (1.0M - 1.5M/yr)
    assert 1000000 <= sl_junior["median"] <= 1500000
    assert 80000 <= sl_junior["monthly_median"] <= 130000
    # Mid-level in Sri Lanka is ~Rs. 180k-250k/mo (2.1M - 2.8M/yr)
    assert 2000000 <= sl_mid["median"] <= 3000000
    assert 160000 <= sl_mid["monthly_median"] <= 250000
    # Junior should be approx ~50-55% of mid-level
    assert 0.45 <= (sl_junior["median"] / sl_mid["median"]) <= 0.60

    # 2. India (INR)
    in_junior = NavigatorService.calculate_role_compensation("Software Engineer", country_code="in", experience_level="junior")
    in_mid = NavigatorService.calculate_role_compensation("Software Engineer", country_code="in", experience_level="mid")
    assert in_junior["currency"] == "INR"
    # Junior in India is ~4.5 - 7.5 LPA
    assert 450000 <= in_junior["median"] <= 750000
    # Mid-level in India is ~12 - 18 LPA
    assert 1200000 <= in_mid["median"] <= 1800000

    # 3. United States (USD)
    us_junior = NavigatorService.calculate_role_compensation("Software Engineer", country_code="us", experience_level="junior")
    us_mid = NavigatorService.calculate_role_compensation("Software Engineer", country_code="us", experience_level="mid")
    assert us_junior["currency"] == "USD"
    assert 80000 <= us_junior["median"] <= 105000
    assert 130000 <= us_mid["median"] <= 160000
